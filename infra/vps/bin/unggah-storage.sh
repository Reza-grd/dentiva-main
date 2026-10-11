#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Unggah berkas storage hasil salinan ke Storage VPS lewat API resmi
#  (service role, hanya lewat 127.0.0.1 — kunci tidak tampil & tidak masuk daftar proses).
#
#    /opt/dentiva/bin/unggah-storage.sh <folder-salinan>
#
#  Baris storage.objects sudah ada dari data.sql; unggahan "upsert" menulis berkasnya
#  dan memperbarui metadata (ukuran, eTag, versi). Pemilik, waktu dibuat & user_metadata
#  asli dikembalikan setelahnya. Hasil dicek sha256 lewat https://api.dentiva.id.
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077

D="${1:?pakai: unggah-storage.sh <folder-salinan>}"
[ -d "$D" ] || D="/opt/dentiva/migrasi/$D"
ENV=/opt/dentiva/supabase/.env
PUBLIK=$(grep -m1 '^SUPABASE_PUBLIC_URL=' "$ENV" | cut -d= -f2-)
SRK=$(grep -m1 '^SERVICE_ROLE_KEY=' "$ENV" | cut -d= -f2-)
[ -n "$SRK" ] || { echo "SERVICE_ROLE_KEY tidak ditemukan di $ENV"; exit 1; }

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
sql() { docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
hdr() { printf 'Authorization: Bearer %s\napikey: %s\n' "$SRK" "$SRK"; }
enc() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

say "Menyimpan pemilik & waktu asli berkas…"
sql <<'SQL'
create schema if not exists _migrasi;
drop table if exists _migrasi.objects_asli;
create table _migrasi.objects_asli as
  select bucket_id, name, owner, owner_id, created_at, user_metadata from storage.objects;
SQL
ok "$(sql -tAc 'select count(*) from _migrasi.objects_asli') baris"

say "Mengunggah berkas ke Storage VPS…"
daftar=$(sql -tA -F $'\t' -c "select bucket_id, name, coalesce(metadata->>'mimetype', 'application/octet-stream'),
                                      coalesce(metadata->>'cacheControl', 'max-age=3600') from storage.objects order by 1, 2")
gagal=0
while IFS=$'\t' read -r -u 3 bucket name mime cache; do
  [ -n "$bucket" ] || continue
  f="$D/files/$bucket/$name"
  if [ ! -f "$f" ]; then echo "  ! $bucket/$name tidak ada di salinan"; gagal=$((gagal + 1)); continue; fi
  kode=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:8000/storage/v1/object/$bucket/$(enc "$name")" \
           -H @<(hdr) -H "x-upsert: true" -H "content-type: $mime" -H "cache-control: $cache" --data-binary @"$f")
  if [ "$kode" = "200" ]; then ok "$bucket/$name ($(du -h "$f" | cut -f1))"; else echo "  ✗ $bucket/$name → HTTP $kode"; gagal=$((gagal + 1)); fi
done 3<<< "$daftar"

say "Mengembalikan pemilik & waktu asli…"
sql <<'SQL'
update storage.objects o
   set owner = a.owner, owner_id = a.owner_id, created_at = a.created_at, user_metadata = a.user_metadata
  from _migrasi.objects_asli a
 where o.bucket_id = a.bucket_id and o.name = a.name;
drop schema _migrasi cascade;
SQL
ok "selesai"

say "Cek isi berkas publik lewat $PUBLIK (sha256)…"
while IFS=$'\t' read -r -u 3 bucket name _ _; do
  [ -n "$bucket" ] || continue
  publik=$(sql -tAc "select public from storage.buckets where id = '$bucket'")
  [ "$publik" = "t" ] || continue
  asli=$(sha256sum "$D/files/$bucket/$name" | cut -d' ' -f1)
  kini=$(curl -fsS "$PUBLIK/storage/v1/object/public/$bucket/$(enc "$name")" | sha256sum | cut -d' ' -f1)
  if [ "$asli" = "$kini" ]; then ok "$bucket/$name identik"; else echo "  ✗ $bucket/$name BERBEDA"; gagal=$((gagal + 1)); fi
done 3<<< "$daftar"

[ "$gagal" = 0 ] || { echo; echo "✗ $gagal berkas bermasalah"; exit 1; }
say "Semua berkas storage terpasang."
