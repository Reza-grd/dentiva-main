#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Aktifkan / matikan CAPTCHA Cloudflare Turnstile di server login (GoTrue).
#  Dijalankan PEMILIK dari laptop:
#    scp -i ~/.ssh/dentiva_vps infra/vps/bin/atur-captcha.sh dentiva@202.74.74.163:/opt/dentiva/bin/
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 bash /opt/dentiva/bin/atur-captcha.sh        # aktifkan
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 bash /opt/dentiva/bin/atur-captcha.sh mati   # matikan darurat
#
#  - Secret Key diketik tersembunyi; tidak pernah ditampilkan, hanya disimpan di .env (izin 600).
#  - Kunci diuji dulu ke Cloudflare; bila ditolak, .env tidak diubah.
#  - Berlaku untuk SEMUA login/daftar/lupa password: aplikasi (web & desktop) harus sudah memuat widget.
#  - Butuh blok GOTRUE_SECURITY_CAPTCHA_* di docker-compose.dentiva.yml (layanan auth).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077
cd /opt/dentiva/supabase
F=.env
[ -f "$F" ] || { echo "✗ $PWD/$F tidak ada"; exit 1; }
grep -q 'GOTRUE_SECURITY_CAPTCHA_ENABLED' docker-compose.dentiva.yml \
  || { echo "✗ docker-compose.dentiva.yml belum memuat GOTRUE_SECURITY_CAPTCHA_* — pasang dulu"; exit 1; }

setel() { # setel KUNCI NILAI (ganti bila ada, tambah bila belum)
  local k=$1 v=$2 tmp
  tmp=$(mktemp)
  grep -v "^$k=" "$F" > "$tmp" || true
  printf '%s=%s\n' "$k" "$v" >> "$tmp"
  cat "$tmp" > "$F"; rm -f "$tmp"
}

muat_ulang() {
  echo "• Memuat ulang layanan login …"
  docker compose up -d auth </dev/null >/dev/null 2>&1
  sleep 6
  local a
  a=$(docker exec supabase-auth printenv GOTRUE_SECURITY_CAPTCHA_ENABLED </dev/null || true)
  echo "  CAPTCHA aktif di server: ${a:-false}"
}

cp "$F" "$F.bak-captcha-$(date +%Y%m%d-%H%M%S)"

if [ "${1:-}" = "mati" ]; then
  setel CAPTCHA_ENABLED false
  muat_ulang
  echo "✓ CAPTCHA dimatikan. Login kembali tanpa pemeriksaan CAPTCHA."
  exit 0
fi

read -r -s -p "Secret Key Turnstile dari dasbor Cloudflare (tidak tampil): " SK; echo
SK=$(printf '%s' "$SK" | tr -d '[:space:]')
[ -n "$SK" ] || { echo "✗ kosong — batal"; exit 1; }
case "$SK" in *[!A-Za-z0-9_-]*) echo "✗ format Secret Key tidak dikenali — salin ulang dari Cloudflare"; exit 1;; esac

echo "• Menguji Secret Key ke Cloudflare …"
# Token palsu: kunci sah → 'invalid-input-response'; kunci salah → 'invalid-input-secret'.
HASIL=$(curl -sS -m 20 https://challenges.cloudflare.com/turnstile/v0/siteverify \
  --data-urlencode "secret=$SK" --data-urlencode "response=uji-kunci-dentiva" || true)
case "$HASIL" in
  *invalid-input-secret*) echo "✗ Cloudflare menolak Secret Key ini. .env tidak diubah."; exit 1;;
  *invalid-input-response*|*timeout-or-duplicate*) echo "  ✓ Secret Key dikenali Cloudflare";;
  *) echo "✗ Jawaban Cloudflare tidak terduga — .env tidak diubah."; exit 1;;
esac

setel CAPTCHA_SECRET "$SK"
setel CAPTCHA_ENABLED true
unset SK
muat_ulang
echo "✓ Selesai. Uji: buka https://app.dentiva.id/login lalu masuk seperti biasa."
echo "  Bila ada masalah: jalankan skrip ini dengan argumen 'mati'."
