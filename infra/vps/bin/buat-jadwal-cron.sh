#!/usr/bin/env bash
# Pasang jadwal pg_cron Dentiva di VPS (HANYA saat pindah resmi, setelah jadwal Cloud dimatikan).
#   /opt/dentiva/bin/buat-jadwal-cron.sh --pindah-resmi
set -euo pipefail
[ "${1:-}" = "--pindah-resmi" ] || { echo "Pakai: buat-jadwal-cron.sh --pindah-resmi (pastikan jadwal di Supabase Cloud sudah dimatikan)"; exit 1; }
ada=$(docker exec -i supabase-db psql -X -q -U postgres -d postgres -tAc \
      "select count(*) from vault.decrypted_secrets where name in ('dentiva_project_url','dentiva_service_role_key')" < /dev/null)
[ "$ada" = "2" ] || { echo "Rahasia Vault belum lengkap — jalankan buat-vault.sh dulu."; exit 1; }
docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres -tA -F " | " \
  < "$(dirname "$0")/jadwal-cron.sql" | grep -vE '^\s*$|^[0-9]+$|^t$'
echo "✓ jadwal pg_cron aktif di VPS"
