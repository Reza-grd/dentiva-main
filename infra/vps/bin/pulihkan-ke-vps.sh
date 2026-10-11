#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pulihkan salinan Supabase Cloud (hasil salin-dari-supabase.sh) ke database VPS.
#
#    /opt/dentiva/bin/pulihkan-ke-vps.sh <folder-salinan>
#
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

D="${1:?pakai: pulihkan-ke-vps.sh <folder-salinan>}"
[ -d "$D" ] || D="/opt/dentiva/migrasi/$D"
for f in schema.sql data.sql storage-extra.sql hitungan.tsv .selesai; do
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

say "Statistik planner (ANALYZE)…"
admin -c "analyze"
ok "selesai"

say "Verifikasi jumlah baris (sumber vs VPS)…"
q=$(awk -F'\t' -v sq="'" '{printf "%sselect %s%s%s, %s%s%s, (select count(*) from \"%s\".\"%s\")\n", (NR>1 ? "union all " : ""), sq, $1, sq, sq, $2, sq, $1, $2}' "$D/hitungan.tsv")
admin -tA -F $'\t' -c "$q" | sort > "$D/hitungan-vps.tsv"
selisih=$(join -t $'\t' <(awk -F'\t' '{print $1"."$2"\t"$3}' "$D/hitungan.tsv" | sort) \
                         <(awk -F'\t' '{print $1"."$2"\t"$3}' "$D/hitungan-vps.tsv" | sort) | awk -F'\t' '$2 != $3')
if [ -z "$selisih" ]; then
  ok "$(wc -l < "$D/hitungan.tsv") tabel cocok, total $(awk -F'\t' '{s+=$3} END {print s+0}' "$D/hitungan-vps.tsv") baris"
else
  echo "  Ada selisih (tabel  sumber  vps):"; echo "$selisih" | sed 's/^/    /'
  echo "  Catatan: data sumber bisa bertambah antara dump & hitung (gladi, aplikasi masih jalan)."
fi

if [ -s "$D/sidik-acl.tsv" ]; then
  say "Verifikasi hak akses (sidik GRANT sumber vs VPS)…"
  admin -tA -F $'\t' < /opt/dentiva/bin/acl-sidik.sql > "$D/sidik-acl-vps.tsv"
  if cmp -s "$D/sidik-acl.tsv" "$D/sidik-acl-vps.tsv"; then
    ok "identik ($(awk -F'\t' '$1 == "SEMUA" {print $2}' "$D/sidik-acl-vps.tsv") entri)"
  else
    echo "  ✗ BERBEDA — jangan dipakai sebelum diperiksa:"; diff "$D/sidik-acl.tsv" "$D/sidik-acl-vps.tsv" | sed 's/^/    /' || true
  fi
fi

trap - ERR
say "Pemulihan selesai. Catatan: $LOG"
