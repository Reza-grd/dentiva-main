#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pasang SMTP untuk email login otomatis Dentiva (konfirmasi daftar, reset sandi,
#  undangan staf) di Supabase self-host → /opt/dentiva/supabase/.env, lalu muat ulang auth.
#  Dijalankan PEMILIK dari laptop:
#    scp -i ~/.ssh/dentiva_vps infra/vps/bin/atur-smtp.sh dentiva@202.74.74.163:/opt/dentiva/bin/
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 bash /opt/dentiva/bin/atur-smtp.sh
#
#  - Kata sandi mailbox diketik tersembunyi; tidak pernah ditampilkan.
#  - Kata sandi diuji dulu ke server SMTP; bila ditolak, .env tidak diubah.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077
cd /opt/dentiva/supabase
F=.env
[ -f "$F" ] || { echo "✗ $PWD/$F tidak ada"; exit 1; }

HOST=smtp.hostinger.com
PORT=465
read -r -p "Alamat email pengirim [info@dentiva.id]: " USER_; USER_=${USER_:-info@dentiva.id}
read -r -p "Nama pengirim [Dentiva]: " NAME_; NAME_=${NAME_:-Dentiva}
read -r -s -p "Kata sandi mailbox $USER_ (tidak tampil): " PASS_; echo
[ -n "$PASS_" ] || { echo "✗ kata sandi kosong — batal"; exit 1; }
case "$PASS_" in *"'"*|*'"'*|*' '*|*'$'*|*'`'*|*'\'*) echo "✗ kata sandi berisi ' \" spasi \$ \` atau \\ — ganti sandi mailbox di Hostinger tanpa karakter itu"; exit 1;; esac

echo "• Menguji login SMTP ke $HOST:$PORT …"
NETRC=$(mktemp); printf 'machine %s login %s password %s\n' "$HOST" "$USER_" "$PASS_" > "$NETRC"
if ! curl -sS -m 25 --netrc-file "$NETRC" --url "smtps://$HOST:$PORT" -X NOOP >/dev/null 2>&1; then
  rm -f "$NETRC"; echo "✗ Login SMTP ditolak — periksa alamat & kata sandi mailbox. .env tidak diubah."; exit 1
fi
rm -f "$NETRC"
echo "  ✓ login diterima"

set_() { # set_ NAMA NILAI
  local k="$1" v="$2" tmp; tmp=$(mktemp)
  grep -v "^$k=" "$F" > "$tmp" || true
  printf '%s=%s\n' "$k" "$v" >> "$tmp"; cat "$tmp" > "$F"; rm -f "$tmp"; chmod 600 "$F"
}
set_ SMTP_HOST "$HOST"
set_ SMTP_PORT "$PORT"
set_ SMTP_USER "$USER_"
set_ SMTP_PASS "$PASS_"
set_ SMTP_ADMIN_EMAIL "$USER_"
set_ SMTP_SENDER_NAME "$NAME_"
unset PASS_
echo "  ✓ .env diperbarui (SMTP_*)"

echo "• Memuat ulang layanan auth …"
docker compose -f docker-compose.yml -f docker-compose.dentiva.yml up -d auth >/dev/null 2>&1
sleep 5
docker compose -f docker-compose.yml -f docker-compose.dentiva.yml ps auth --format '{{.Status}}' | sed 's/^/  status auth: /'
echo "✓ Selesai. Uji dengan 'Lupa kata sandi' di aplikasi memakai email Anda sendiri."
