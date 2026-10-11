#!/usr/bin/env bash
# Buat rahasia Vault yang dipakai jadwal pg_cron (URL API & kunci service role) dari .env server.
# Nilai tidak pernah ditampilkan dan tidak masuk daftar proses (dikirim lewat stdin).
# Jadwal pg_cron TIDAK dibuat di sini.
set -euo pipefail
ENV=/opt/dentiva/supabase/.env
psqlx() { docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"; }

ada=$(psqlx -U supabase_admin -tAc "select count(*) from vault.secrets where name in ('dentiva_project_url','dentiva_service_role_key')" < /dev/null)
if [ "$ada" = "0" ]; then
  URL=$(grep -m1 '^SUPABASE_PUBLIC_URL=' "$ENV" | cut -d= -f2-)
  SRK=$(grep -m1 '^SERVICE_ROLE_KEY=' "$ENV" | cut -d= -f2-)
  printf "select vault.create_secret(\$v\$%s\$v\$, 'dentiva_project_url', 'URL API Dentiva (dipakai pg_cron)');\nselect vault.create_secret(\$v\$%s\$v\$, 'dentiva_service_role_key', 'Kunci service role untuk pg_cron');\n" "$URL" "$SRK" \
    | psqlx -U postgres -o /dev/null
  unset SRK
  echo "✓ rahasia vault dibuat"
else
  echo "• rahasia vault sudah ada ($ada) — tidak diubah"
fi

psqlx -U postgres -tA -F " | " <<'SQL'
select name, case when name = 'dentiva_project_url' then decrypted_secret
                  else 'tersimpan (' || length(decrypted_secret) || ' karakter)' end
from vault.decrypted_secrets where name like 'dentiva_%' order by 1;
select 'jadwal cron aktif', count(*)::text from cron.job;
SQL
