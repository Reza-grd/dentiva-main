#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Kosongkan database & storage Supabase VPS (gladi, atau tepat sebelum pemulihan final saat
#  pindah resmi) dan — kecuali --simpan-rahasia — buat ulang SEMUA rahasia server
#  (JWT, kunci API, kata sandi DB, dll). Sertifikat HTTPS (caddy_data), kunci Vault/pgsodium
#  (db-config) dan functions.env dipertahankan. Tidak ada rahasia yang ditampilkan.
#
#    /opt/dentiva/bin/reset-gladi.sh --ya-hapus-semua                  # + rahasia baru
#    /opt/dentiva/bin/reset-gladi.sh --ya-hapus-semua --simpan-rahasia # rahasia tetap
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077
[ "${1:-}" = "--ya-hapus-semua" ] || { echo "Pakai: reset-gladi.sh --ya-hapus-semua (menghapus SEMUA data di Supabase VPS)"; exit 1; }
GANTI_RAHASIA=true
[ "${2:-}" = "--simpan-rahasia" ] && GANTI_RAHASIA=false
cd /opt/dentiva/supabase

ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }

docker compose down --remove-orphans >/dev/null 2>&1
ok "layanan dihentikan"

sudo rm -rf volumes/db/data volumes/storage
ok "data database & storage dihapus"

if $GANTI_RAHASIA; then
  sh utils/generate-keys.sh --update-env >/dev/null 2>&1
  sh utils/add-new-auth-keys.sh --update-env >/dev/null 2>&1
  for f in .env.old .env.bak .env~; do if [ -e "$f" ]; then shred -u "$f"; fi; done
  chmod 600 .env
  ok "semua rahasia server dibuat ulang (.env izin 600, cadangan lama dihancurkan)"
else
  ok "rahasia server tetap (kunci API di Vercel/desktop tidak berubah)"
fi

docker compose up -d >/dev/null 2>&1
for i in $(seq 1 60); do
  belum=$(docker compose ps --format '{{.Service}}|{{.Health}}|{{.State}}' | awk -F'|' '($2 != "" && $2 != "healthy") || $3 != "running"' | wc -l)
  [ "$belum" = 0 ] && break
  sleep 5
done
docker compose ps --format '{{.Service}}: {{.State}} {{.Health}}' | sed 's/^/    /'
[ "$belum" = 0 ] && ok "semua layanan sehat" || { echo "  ✗ $belum layanan belum sehat"; exit 1; }
