#!/usr/bin/env bash
# Pasang 5 template email Dentiva (bahasa Indonesia) ke layanan auth Supabase self-host.
# Template dibaca server dari https://dentiva.id/email/<nama> (repo dentiva_website, folder email/).
# Dijalankan PEMILIK:
#   scp -i ~/.ssh/dentiva_vps infra/vps/bin/pasang-template-email.sh dentiva@202.74.74.163:/opt/dentiva/bin/
#   ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 bash /opt/dentiva/bin/pasang-template-email.sh
set -euo pipefail
cd /opt/dentiva/supabase
F=.env
set_() { local tmp; tmp=$(mktemp); grep -v "^$1=" "$F" > "$tmp" || true; printf '%s=%s\n' "$1" "$2" >> "$tmp"; cat "$tmp" > "$F"; rm -f "$tmp"; chmod 600 "$F"; }
B=https://dentiva.id/email
for n in confirmation recovery invite magic_link email_change; do
  kode=$(curl -s -o /dev/null -w '%{http_code}' "$B/$n"); [ "$kode" = 200 ] || { echo "✗ $B/$n tidak bisa dibuka ($kode)"; exit 1; }
done
echo "✓ 5 template dapat dibaca"

# Override compose khusus email (aman dari perubahan file lain)
cat > docker-compose.email.yml <<'YML'
services:
  auth:
    environment:
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://dentiva.id/email/confirmation
      GOTRUE_MAILER_TEMPLATES_RECOVERY: https://dentiva.id/email/recovery
      GOTRUE_MAILER_TEMPLATES_INVITE: https://dentiva.id/email/invite
      GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: https://dentiva.id/email/magic_link
      GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE: https://dentiva.id/email/email_change
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "Konfirmasi email akun Dentiva Anda"
      GOTRUE_MAILER_SUBJECTS_RECOVERY: "Atur ulang kata sandi Dentiva Anda"
      GOTRUE_MAILER_SUBJECTS_INVITE: "Undangan bergabung di Dentiva"
      GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Tautan masuk ke Dentiva"
      GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE: "Konfirmasi perubahan email Dentiva"
YML
# Agar setiap 'docker compose' berikutnya ikut memakai override ini
set_ COMPOSE_FILE "docker-compose.yml:docker-compose.dentiva.yml:docker-compose.email.yml"
docker compose up -d auth >/dev/null 2>&1
sleep 5
docker compose ps auth --format '{{.Status}}' | sed 's/^/  status auth: /'
echo "✓ Selesai. Uji 'Lupa kata sandi' — email harus berjudul 'Atur ulang kata sandi Dentiva Anda'."
