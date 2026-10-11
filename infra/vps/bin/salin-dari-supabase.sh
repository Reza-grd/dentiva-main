#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Salin database Dentiva dari Supabase Cloud (Seoul) ke server ini — HANYA MEMBACA.
#  Tidak mengubah apa pun di Supabase lama. Kata sandi diminta tersembunyi, tidak
#  ditampilkan, tidak disimpan ke disk, dan tidak muncul di daftar proses.
#
#  Jalankan dari laptop pemilik:
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/salin-dari-supabase.sh
#
#  - Berjalan di dalam tmux: kalau koneksi SSH putus, proses tetap jalan. Sambung lagi
#    dengan perintah yang sama untuk melihatnya.
#  - Bisa dilanjutkan: kalau gagal di tengah, jalankan perintah yang sama lagi — langkah
#    yang sudah lengkap dilewati (berlaku untuk folder yang belum selesai, maks. 6 jam).
#  - Semua keluaran dicatat di <folder>/log.txt (tanpa kata sandi).
#
#  Hasil: /opt/dentiva/migrasi/<waktu>/ (izin 700)
#    schema.sql        struktur skema Dentiva (public, private, platform, backup_20260929, supabase_migrations)
#    data.sql          isi tabel + akun login (auth.users/identities/mfa_factors) + metadata storage,
#                      satu snapshot yang konsisten
#    storage-extra.sql aturan keamanan storage & trigger pelindung bucket
#    hitungan.tsv      jumlah baris tiap tabel di sumber (untuk verifikasi setelah dipulihkan)
#    sidik-acl.tsv     sidik (md5) seluruh hak akses tabel/fungsi/skema (untuk verifikasi)
#    files/           berkas storage dari bucket publik
#    .selesai          penanda semua langkah lengkap
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077

# Jalankan di dalam tmux supaya tidak ikut mati kalau SSH terputus.
if [ -z "${TMUX:-}" ] && [ -t 0 ] && command -v tmux >/dev/null; then
  exec tmux new-session -A -s salin-db "$0" "$@"
fi

SRC_REF="ggwratzhpukgsiduqely"
SRC_CONN="host=aws-1-ap-northeast-2.pooler.supabase.com port=5432 user=postgres.${SRC_REF} dbname=postgres sslmode=require connect_timeout=20 keepalives=1 keepalives_idle=30 application_name=dentiva-migrasi"
SCHEMAS=(public private platform backup_20260929 supabase_migrations)
AUTH_TABLES=(auth.users auth.identities auth.mfa_factors storage.buckets storage.objects)
BASE="/opt/dentiva/migrasi"
DB="supabase-db"

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
jeda() { if [ -n "${TMUX:-}" ]; then read -r -p "Tekan Enter untuk menutup jendela ini…" _ || true; fi; }

# Folder: lanjutkan folder terakhir yang belum selesai (< 6 jam), atau buat baru.
OUT=""
if [ -n "${1:-}" ]; then
  OUT="$BASE/$1"
else
  last=$(find "$BASE" -mindepth 1 -maxdepth 1 -type d -mmin -360 2>/dev/null | sort | tail -n 1)
  if [ -n "$last" ] && [ ! -e "$last/.selesai" ]; then OUT="$last"; fi
fi
[ -n "$OUT" ] || OUT="$BASE/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT/files"
LOG="$OUT/log.txt"
exec > >(tee -a "$LOG") 2>&1
LANGKAH="persiapan"
trap 'rc=$?; [ "$BASHPID" = "$$" ] || exit "$rc"; printf "\n\033[1;31m✗ Gagal di langkah: %s (kode %s)\033[0m\n" "$LANGKAH" "$rc";
      echo "  Catatan lengkap: $LOG";
      echo "  Jalankan perintah yang sama lagi — langkah yang sudah lengkap akan dilewati.";
      jeda' ERR

printf '\n\033[1mSalin database Dentiva dari Supabase Cloud\033[0m  (%s)\nFolder: %s\n' "$(date '+%d %b %Y %H:%M')" "$OUT"

LANGKAH="kata sandi"
PGPASSWORD=""
for percobaan in 1 2 3; do
  printf 'Masukkan kata sandi database Supabase (tulisan tidak akan tampil): '
  read -rs PGPASSWORD; echo
  if [ -z "$PGPASSWORD" ]; then echo "  Kata sandi kosong — tempel mungkin gagal. Coba ketik manual, atau klik kanan untuk tempel."; continue; fi
  printf '  (diterima %s karakter)\n' "${#PGPASSWORD}"
  export PGPASSWORD
  if err=$(docker exec -i -e PGPASSWORD "$DB" psql "$SRC_CONN" -tAc "select 1" 2>&1 >/dev/null); then break; fi
  echo "  ✗ Ditolak: $(printf %s "$err" | grep -oE '(FATAL|error):.*' | head -1)"
  PGPASSWORD=""
  if [ "$percobaan" = 3 ]; then
    echo "  Tips: tunggu 2–3 menit setelah reset kata sandi di Supabase; ketik manual bila tempel tidak berfungsi."
    jeda; exit 1
  fi
done
[ -n "$PGPASSWORD" ] || { echo "Tidak ada kata sandi yang diterima — dibatalkan."; jeda; exit 1; }
export PGPASSWORD

# Semua perintah klien Postgres dijalankan di dalam container (pg_dump 17, sama dengan server).
# `-e PGPASSWORD` tanpa nilai → diteruskan dari lingkungan, tidak tampil di daftar proses.
pgx() { docker exec -i -e PGPASSWORD "$DB" "$@"; }

lengkap() { [ -s "$1" ] && tail -c 300 "$1" | grep -q 'PostgreSQL database dump complete'; }

# dump <berkas> <argumen pg_dump…> — tulis ke .tmp, pindahkan hanya bila lengkap; coba ulang 3×.
dump() {
  local out="$1"; shift
  if lengkap "$out"; then ok "$(basename "$out") sudah lengkap — dilewati"; return 0; fi
  local n
  for n in 1 2 3; do
    if pgx pg_dump "$SRC_CONN" "$@" > "$out.tmp" && lengkap "$out.tmp"; then
      mv "$out.tmp" "$out"
      ok "$(basename "$out") ($(du -h "$out" | cut -f1))"
      return 0
    fi
    warn "percobaan $n gagal ($(du -b "$out.tmp" 2>/dev/null | cut -f1 || echo 0) byte tertulis)"
    [ "$n" = 3 ] || sleep 5
  done
  rm -f "$out.tmp"
  return 1
}

LANGKAH="uji koneksi"
say "Menguji koneksi ke Supabase lama…"
ver=$(pgx psql "$SRC_CONN" -tAc "select current_setting('server_version')")
ok "terhubung (PostgreSQL $ver)"

LANGKAH="struktur skema"
say "Menyalin struktur skema…"
nargs=(); for s in "${SCHEMAS[@]}"; do nargs+=(-n "$s"); done
dump "$OUT/schema.sql" --schema-only --no-owner "${nargs[@]}"

# Catatan: pg_dump mengabaikan -n bila ada -t, jadi semua tabel dipilih lewat pola -t
# ('skema.*' = semua tabel & sequence di skema itu) agar isi data satu snapshot.
LANGKAH="isi data"
say "Menyalin isi data + akun login + metadata storage…"
targs=(); for s in "${SCHEMAS[@]}"; do targs+=(-t "$s.*"); done
for t in "${AUTH_TABLES[@]}"; do targs+=(-t "$t"); done
dump "$OUT/data.sql" --data-only --no-owner "${targs[@]}"
ok "$(grep -c '^COPY ' "$OUT/data.sql") tabel berisi data"

LANGKAH="aturan storage"
say "Menyalin aturan keamanan storage & trigger bucket…"
pgx psql "$SRC_CONN" -v ON_ERROR_STOP=1 -tA > "$OUT/storage-extra.sql.tmp" <<'SQL'
select format('DROP POLICY IF EXISTS %I ON %I.%I;', policyname, schemaname, tablename) || E'\n' ||
       format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename, permissive, cmd,
              (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(roles) r),
              coalesce(' USING (' || qual || ')', ''), coalesce(' WITH CHECK (' || with_check || ')', ''))
from pg_policies where schemaname = 'storage' order by policyname;
select format('DROP TRIGGER IF EXISTS %I ON %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' || pg_get_triggerdef(t.oid) || ';'
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('auth', 'storage') and not t.tgisinternal and t.tgname like 'protect_bucket_control%';
SQL
mv "$OUT/storage-extra.sql.tmp" "$OUT/storage-extra.sql"
ok "storage-extra.sql ($(grep -c 'CREATE POLICY' "$OUT/storage-extra.sql" || true) aturan, $(grep -c 'CREATE TRIGGER' "$OUT/storage-extra.sql" || true) trigger)"

LANGKAH="hitung baris"
say "Menghitung jumlah baris di sumber (untuk verifikasi)…"
pgx psql "$SRC_CONN" -v ON_ERROR_STOP=1 -tA -F $'\t' > "$OUT/hitungan.tsv.tmp" <<SQL
select table_schema, table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables
where table_type = 'BASE TABLE'
  and (table_schema in ($(printf "'%s'," "${SCHEMAS[@]}" | sed 's/,$//'))
       or (table_schema, table_name) in (('auth','users'),('auth','identities'),('auth','mfa_factors'),('storage','buckets'),('storage','objects')))
order by 1, 2;
SQL
mv "$OUT/hitungan.tsv.tmp" "$OUT/hitungan.tsv"
ok "$(wc -l < "$OUT/hitungan.tsv") tabel, total $(awk -F'\t' '{s+=$3} END {print s+0}' "$OUT/hitungan.tsv") baris"

LANGKAH="sidik hak akses"
say "Mencatat sidik hak akses (GRANT) di sumber…"
pgx psql "$SRC_CONN" -v ON_ERROR_STOP=1 -tA -F $'\t' < /opt/dentiva/bin/acl-sidik.sql > "$OUT/sidik-acl.tsv.tmp"
mv "$OUT/sidik-acl.tsv.tmp" "$OUT/sidik-acl.tsv"
ok "$(awk -F'\t' '$1 == "SEMUA" {print $2}' "$OUT/sidik-acl.tsv") entri hak akses"

LANGKAH="berkas storage"
say "Mengunduh berkas storage dari bucket publik…"
daftar=$(pgx psql "$SRC_CONN" -v ON_ERROR_STOP=1 -tA -F $'\t' -c "select o.bucket_id, o.name from storage.objects o join storage.buckets b on b.id = o.bucket_id where b.public order by 1, 2")
while IFS=$'\t' read -r -u 3 bucket name; do
  [ -n "$bucket" ] || continue
  tujuan="$OUT/files/$bucket/$name"
  if [ -s "$tujuan" ]; then ok "$bucket/$name sudah ada — dilewati"; continue; fi
  mkdir -p "$(dirname "$tujuan")"
  enc=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$name")
  curl -fsS --retry 3 "https://${SRC_REF}.supabase.co/storage/v1/object/public/${bucket}/${enc}" -o "$tujuan"
  ok "$bucket/$name ($(du -h "$tujuan" | cut -f1))"
done 3<<< "$daftar"
priv=$(pgx psql "$SRC_CONN" -tAc "select count(*) from storage.objects o join storage.buckets b on b.id = o.bucket_id where not b.public")
if [ "$priv" = "0" ]; then ok "bucket privat: tidak ada berkas"; else warn "$priv berkas di bucket privat perlu disalin terpisah"; fi

unset PGPASSWORD
date '+%F %T' > "$OUT/.selesai"
chmod -R go-rwx "$OUT"
trap - ERR
say "Selesai. Hasil di $OUT"
printf 'Kabari Claude: "salinan selesai".\n\n'
jeda
