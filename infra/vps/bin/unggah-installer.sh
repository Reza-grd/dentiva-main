#!/usr/bin/env bash
# Unggah installer desktop ke bucket publik "downloads" di Storage VPS (service role, lokal).
#   unggah-installer.sh /tmp/installer/Dentiva_1.11.0_x64-setup.exe /tmp/installer/Dentiva_1.11.0_universal.dmg
# Setelah itu ubah VERSION di dentiva_website/unduh.html.
set -euo pipefail
ENV=/opt/dentiva/supabase/.env
PUBLIK=$(grep -m1 '^SUPABASE_PUBLIC_URL=' "$ENV" | cut -d= -f2-)
SRK=$(grep -m1 '^SERVICE_ROLE_KEY=' "$ENV" | cut -d= -f2-)
hdr() { printf 'Authorization: Bearer %s\napikey: %s\n' "$SRK" "$SRK"; }
[ $# -gt 0 ] || { echo "Pakai: unggah-installer.sh <berkas>…"; exit 1; }
for f in "$@"; do
  n=$(basename "$f")
  case "$n" in *.exe) t=application/vnd.microsoft.portable-executable;; *.dmg) t=application/x-apple-diskimage;; *.msi) t=application/x-msi;; *) t=application/octet-stream;; esac
  kode=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:8000/storage/v1/object/downloads/$n" \
           -H @<(hdr) -H "x-upsert: true" -H "content-type: $t" -H "cache-control: max-age=300" --data-binary @"$f")
  [ "$kode" = 200 ] || { echo "✗ $n → HTTP $kode"; exit 1; }
  asli=$(sha256sum "$f" | cut -d' ' -f1)
  kini=$(curl -fsS "$PUBLIK/storage/v1/object/public/downloads/$n" | sha256sum | cut -d' ' -f1)
  [ "$asli" = "$kini" ] && echo "✓ $n ($(du -h "$f" | cut -f1)) → $PUBLIK/storage/v1/object/public/downloads/$n" || { echo "✗ $n isi berbeda"; exit 1; }
done
