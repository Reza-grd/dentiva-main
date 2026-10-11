#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pulihkan salinan Supabase Cloud (hasil salin-dari-supabase.sh) ke database VPS.
#
#    /opt/dentiva/bin/pulihkan-ke-vps.sh <folder-salinan> [--izinkan-selisih-baris] [--tanpa-sidik]
#
#  - GAGAL KERAS (exit 1) bila verifikasi tidak lolos: himpunan tabel berbeda, jumlah baris berbeda,
#    sidik keamanan (GRANT, pemilik, RLS, policy, trigger, publikasi) berbeda atau tidak tersedia.
#    --izinkan-selisih-baris hanya untuk gladi saat sumber masih dipakai; --tanpa-sidik untuk salinan lama.
#    --verifikasi-saja: TIDAK memulihkan apa pun — hanya membandingkan database sekarang dengan
#    hitungan.tsv & sidik-acl.tsv di folder (uji gerbang verifikasi / cek pascapemulihan).
#  - Hanya untuk database yang masih kosong (menolak jika skema Dentiva sudah ada).
#  - Struktur dibuat sebagai role `postgres` (pemilik objek sama seperti di Supabase Cloud);
#    data dimuat sebagai `supabase_admin` dengan trigger dimatikan sementara
#    (session_replication_role = replica) supaya urutan & FK melingkar tidak masalah.
#  - Setiap langkah satu transaksi: gagal = tidak ada yang berubah di langkah itu.
#  - TIDAK membuat jadwal pg_cron (dibuat saat pindah resmi, agar tidak dobel kirim WA/SATUSEHAT).
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077
export LC_ALL=C

D="${1:?pakai: pulihkan-ke-vps.sh <folder-salinan> [--izinkan-selisih-baris] [--tanpa-sidik]}"
shift
IZINKAN_SELISIH=false; TANPA_SIDIK=false; VERIFIKASI_SAJA=false
for o in "$@"; do
  case "$o" in
    --izinkan-selisih-baris) IZINKAN_SELISIH=true ;;
    --verifikasi-saja) VERIFIKASI_SAJA=true ;;
    --tanpa-sidik) TANPA_SIDIK=true ;;
    *) echo "Opsi tidak dikenal: $o"; exit 1 ;;
  esac
done
[ -d "$D" ] || D="/opt/dentiva/migrasi/$D"
if $VERIFIKASI_SAJA; then perlu=(hitungan.tsv); else perlu=(schema.sql data.sql storage-extra.sql hitungan.tsv .selesai); fi
for f in "${perlu[@]}"; do
  [ -e "$D/$f" ] || { echo "Berkas $D/$f tidak ada — salinan belum lengkap."; exit 1; }
done
LOG="$D/pulihkan.log"
exec > >(tee -a "$LOG") 2>&1

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
trap 'printf "\n\033[1;31m✗ Gagal (baris %s). Catatan: %s\033[0m\n" "$LINENO" "$LOG"' ERR

sql()   { docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"; }
admin() { sql -U supabase_admin "$@"; }
pg()    { sql -U postgres "$@"; }

if ! $VERIFIKASI_SAJA; then
say "Memeriksa database tujuan masih kosong…"
ada=$(admin -tAc "select (select count(*) from pg_namespace where nspname in ('private','platform','supabase_migrations','backup_20260929'))
                       + (select count(*) from pg_tables where schemaname = 'public') + (select count(*) from auth.users)")
[ "$ada" = "0" ] || { echo "  Database VPS sudah berisi data Dentiva ($ada objek) — dibatalkan agar tidak tertimpa."; exit 1; }
ok "kosong"

say "Ekstensi & hak akses pg_cron…"
admin -1 <<'SQL'
create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres with grant option;
grant all on all tables in schema cron to postgres with grant option;
grant all on all sequences in schema cron to postgres with grant option;
grant all on all functions in schema cron to postgres with grant option;
SQL
ok "pg_trgm, pg_cron siap (tanpa jadwal)"

say "Membuat struktur (tabel, fungsi, RLS, indeks) sebagai postgres…"
# Skema public sudah ada di server baru; default privilege milik supabase_admin dijalankan terpisah.
grep -v -e '^CREATE SCHEMA public;$' -e '^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ' "$D/schema.sql" | pg -1
grep -e '^ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ' "$D/schema.sql" | admin -1

# Default privilege bawaan server baru sudah memberi akses anon/authenticated saat objek dibuat,
# sebelum REVOKE di dump dijalankan. Kembalikan hak akses tabel & fungsi ke bawaan Postgres,
# lalu putar ulang GRANT/REVOKE dari dump → hasilnya persis sama dengan sumber.
{ cat <<'SQL'
do $$
declare r record; g text;
begin
  for r in
    select format('TABLE %I.%I', n.nspname, c.relname) as obj, c.relacl as acl, c.relowner as own, false as fungsi
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public','private','platform','supabase_migrations','backup_20260929') and c.relkind in ('r','p','v','m','f')
    union all
    select format('ROUTINE %I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), p.proacl, p.proowner, true
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','private','platform','supabase_migrations','backup_20260929')
  loop
    for g in
      select distinct case a.grantee when 0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end
      from aclexplode(r.acl) a where a.grantee <> r.own
    loop
      execute format('REVOKE ALL ON %s FROM %s CASCADE', r.obj, g);
    end loop;
    if r.fungsi then execute format('GRANT EXECUTE ON %s TO PUBLIC', r.obj); end if;
  end loop;
end $$;
SQL
  grep -E '^(GRANT|REVOKE) .* ON (TABLE|FUNCTION|PROCEDURE) ' "$D/schema.sql"
} | pg -1
ok "$(admin -tAc "select count(*) from pg_tables where schemaname in ('public','private','platform','supabase_migrations','backup_20260929')") tabel, $(admin -tAc "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private','platform')") fungsi, $(admin -tAc "select count(*) from pg_policies where schemaname in ('public','private','platform')") aturan RLS"

say "Memuat data + akun login + metadata storage…"
{ echo "SET session_replication_role = replica;"; cat "$D/data.sql"; } | admin -1
ok "data dimuat"

say "Aturan keamanan storage…"
admin -1 < "$D/storage-extra.sql"
ok "$(admin -tAc "select count(*) from pg_policies where schemaname = 'storage'") aturan storage aktif"

if [ -s "$D/publikasi.tsv" ]; then
  say "Publikasi Realtime…"
  while IFS=$'\t' read -r -u 3 sch tbl; do
    [ -n "$tbl" ] || continue
    admin -c "do \$\$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='$sch' and tablename='$tbl') then alter publication supabase_realtime add table \"$sch\".\"$tbl\"; end if; end \$\$"
  done 3< "$D/publikasi.tsv"
  ok "$(wc -l < "$D/publikasi.tsv") tabel di supabase_realtime"
fi

say "Statistik planner (ANALYZE)…"
admin -c "analyze"
ok "selesai"
fi

GAGAL=0
gagal() { printf '  \033[31m✗ %s\033[0m\n' "$*"; GAGAL=$((GAGAL + 1)); }

say "Verifikasi himpunan tabel (sumber vs VPS)…"
[ -s "$D/hitungan.tsv" ] || gagal "hitungan.tsv kosong — tidak ada acuan jumlah baris"
admin -tA -F $'\t' -c "select table_schema, table_name from information_schema.tables
  where table_type = 'BASE TABLE'
    and (table_schema in ('public','private','platform','supabase_migrations','backup_20260929')
         or (table_schema, table_name) in (('auth','users'),('auth','identities'),('auth','mfa_factors'),('storage','buckets'),('storage','objects')))" \
  | sort > "$D/tabel-vps.tsv"
cut -f1,2 "$D/hitungan.tsv" | sort > "$D/tabel-sumber.tsv"
hilang=$(comm -23 "$D/tabel-sumber.tsv" "$D/tabel-vps.tsv" | tr '\t' '.')
lebih=$(comm -13 "$D/tabel-sumber.tsv" "$D/tabel-vps.tsv" | tr '\t' '.')
[ -z "$hilang" ] || gagal "tabel ada di sumber tapi TIDAK ada di VPS: $(echo $hilang)"
[ -z "$lebih" ] || gagal "tabel ada di VPS tapi tidak ada di sumber: $(echo $lebih)"
[ -n "$hilang$lebih" ] || ok "$(wc -l < "$D/tabel-vps.tsv") tabel, himpunan sama"

say "Verifikasi jumlah baris (sumber vs VPS)…"
q=$(comm -12 "$D/tabel-sumber.tsv" "$D/tabel-vps.tsv" | awk -F'\t' -v sq="'" '{printf "%sselect %s%s%s, %s%s%s, (select count(*) from \"%s\".\"%s\")\n", (NR>1 ? "union all " : ""), sq, $1, sq, sq, $2, sq, $1, $2}')
admin -tA -F $'\t' -c "$q" | sort > "$D/hitungan-vps.tsv"
selisih=$(join -t $'\t' -a1 -e HILANG -o 0,1.2,2.2 <(awk -F'\t' '{print $1"."$2"\t"$3}' "$D/hitungan.tsv" | sort) \
                         <(awk -F'\t' '{print $1"."$2"\t"$3}' "$D/hitungan-vps.tsv" | sort) | awk -F'\t' '$2 != $3')
if [ -z "$selisih" ]; then
  ok "$(wc -l < "$D/hitungan.tsv") tabel cocok, total $(awk -F'\t' '{s+=$3} END {print s+0}' "$D/hitungan-vps.tsv") baris"
elif $IZINKAN_SELISIH; then
  echo "  ! Ada selisih (diizinkan untuk gladi — sumber masih dipakai):"; echo "$selisih" | sed 's/^/    /'
else
  gagal "jumlah baris berbeda (tabel  sumber  vps):"; echo "$selisih" | sed 's/^/    /'
fi

say "Verifikasi sidik keamanan (GRANT, pemilik, RLS, policy, trigger, publikasi)…"
if [ ! -s "$D/sidik-acl.tsv" ]; then
  if $TANPA_SIDIK; then echo "  ! sidik sumber tidak ada — dilewati atas permintaan (--tanpa-sidik)"
  else gagal "sidik sumber (sidik-acl.tsv) tidak ada — tidak bisa dibuktikan identik"; fi
else
  admin -tA -F $'\t' < /opt/dentiva/bin/acl-sidik.sql > "$D/sidik-acl-vps.tsv"
  if cmp -s "$D/sidik-acl.tsv" "$D/sidik-acl-vps.tsv"; then
    ok "identik ($(awk -F'\t' '$1 == "SEMUA" {print $2}' "$D/sidik-acl-vps.tsv") entri)"
  else
    gagal "sidik keamanan BERBEDA:"; diff "$D/sidik-acl.tsv" "$D/sidik-acl-vps.tsv" | sed 's/^/    /' || true
  fi
fi

trap - ERR
if [ "$GAGAL" -gt 0 ]; then
  printf '\n\033[1;31m✗ Pemulihan TIDAK lolos verifikasi (%s masalah) — jangan dipakai sebelum diperiksa. Catatan: %s\033[0m\n' "$GAGAL" "$LOG"
  exit 1
fi
say "Pemulihan selesai & lolos semua verifikasi. Catatan: $LOG"
