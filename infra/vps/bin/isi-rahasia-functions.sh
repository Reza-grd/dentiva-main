#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Isi rahasia & konfigurasi edge function Dentiva di VPS → /opt/dentiva/supabase/functions.env
#  Dijalankan PEMILIK dari laptop:
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/isi-rahasia-functions.sh
#
#  - Rahasia diketik tersembunyi; tidak pernah ditampilkan (hanya jumlah karakter).
#  - Kosongkan (langsung Enter) = pakai nilai yang sudah ada / lewati.
#  - Nilai SUPABASE_* dibuat otomatis oleh server, tidak perlu diisi.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077
F=/opt/dentiva/supabase/functions.env
touch "$F"; chmod 600 "$F"

ada()  { grep -q "^$1=" "$F"; }
set_() { # set_ NAMA NILAI — tulis sebagai 'nilai' (literal, tanpa interpolasi)
  local k="$1" v="$2" tmp
  case "$v" in *"'"*|*$'\n'*) echo "  ✗ nilai $k mengandung tanda kutip tunggal/baris baru — tidak disimpan"; return 0;; esac
  tmp=$(mktemp); grep -v "^$k=" "$F" > "$tmp" || true
  printf "%s='%s'\n" "$k" "$v" >> "$tmp"; mv "$tmp" "$F"; chmod 600 "$F"
}
nilai() { grep -m1 "^$1=" "$F" | cut -d= -f2- | sed "s/^'//; s/'$//"; }

# cek NAMA NILAI — uji key langsung ke layanannya (key dikirim lewat header dari stdin, tidak
# masuk daftar proses). Cetak keterangan; kode keluar 1 = ditolak.
cek() {
  local k="$1" v="$2" kode base
  case "$k" in
    GEMINI_API_KEY)
      kode=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -H @<(printf 'x-goog-api-key: %s\n' "$v") \
             "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1") || kode=000
      [ "$kode" = 200 ] && { echo "diterima Google"; return 0; }
      echo "ditolak Google (HTTP $kode)"; return 1 ;;
    MIDTRANS_SERVER_KEY)
      [ "$(nilai MIDTRANS_ENVIRONMENT)" = production ] && base=https://api.midtrans.com || base=https://api.sandbox.midtrans.com
      kode=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' \
             -H @<(printf 'Accept: application/json\nAuthorization: Basic %s\n' "$(printf '%s:' "$v" | base64 -w0)") \
             "$base/v2/dentiva-cek-kunci/status") || kode=000
      [ "$kode" = 401 ] || [ "$kode" = 000 ] && { echo "ditolak Midtrans $(nilai MIDTRANS_ENVIRONMENT) (HTTP $kode)"; return 1; }
      echo "diterima Midtrans $(nilai MIDTRANS_ENVIRONMENT)"; return 0 ;;
    WHAPI_TOKEN)
      kode=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -H @<(printf 'Authorization: Bearer %s\n' "$v") \
             "https://gate.whapi.cloud/health") || kode=000
      [ "$kode" = 200 ] && { echo "diterima Whapi"; return 0; }
      echo "ditolak Whapi (HTTP $kode)"; return 1 ;;
  esac
  return 0
}

rahasia() { # rahasia NAMA "keterangan"
  local k="$1" v status hasil
  while true; do
    ada "$k" && status="sudah ada — Enter untuk tetap" || status="kosong — Enter untuk lewati"
    printf '\n\033[1m%s\033[0m  (%s)\n  %s\n  Ketik/tempel (tidak tampil): ' "$k" "$status" "$2"
    read -rs v; echo
    v="${v#"${v%%[![:space:]]*}"}"; v="${v%"${v##*[![:space:]]}"}"   # buang spasi di awal/akhir
    [ -n "$v" ] || return 0
    if [[ $v =~ [[:space:]] ]]; then
      printf '  ✗ ada spasi di tengah (%s karakter) — sepertinya yang tertempel bukan key saja. Coba lagi.\n' "${#v}"
      continue
    fi
    if hasil=$(cek "$k" "$v"); then
      set_ "$k" "$v"; printf '  ✓ disimpan (%s karakter)%s\n' "${#v}" "${hasil:+ — $hasil}"; return 0
    fi
    printf '  ✗ %s — tidak disimpan. Tempel lagi, atau Enter untuk lewati.\n' "$hasil"
  done
}
biasa() { # biasa NAMA "keterangan" bawaan — nilai tidak rahasia, boleh tampil
  local v lama; lama=$(grep "^$1=" "$F" | head -1 | cut -d= -f2- | sed "s/^'//; s/'$//") || true
  printf '\n\033[1m%s\033[0m  %s\n  [%s]: ' "$1" "$2" "${lama:-$3}"
  read -r v; v="${v:-${lama:-$3}}"
  [ -n "$v" ] && set_ "$1" "$v" && printf '  ✓ %s\n' "$v"
}

printf '\n\033[1;36mRahasia & konfigurasi edge function Dentiva\033[0m\n'
printf 'Lihat daftar nama yang dipakai di: Supabase Dashboard → Edge Functions → Secrets.\n'

printf '\n\033[1;36m— Konfigurasi (tidak rahasia) —\033[0m\n'
biasa CLINIC_APP_URL "alamat web klinik" "https://dentiva-main.vercel.app"
biasa CONSOLE_URL "alamat console admin" "https://dentiva-main-console.vercel.app"
biasa CONSOLE_ALLOWED_ORIGINS "origin console yang diizinkan (pisah koma)" "https://dentiva-main-console.vercel.app,https://console.dentiva.co.id"
biasa ALLOWED_ORIGINS "origin tambahan web/desktop (pisah koma)" "https://app.dentiva.co.id,https://app.dentiva.id,http://tauri.localhost,tauri://localhost"
biasa MIDTRANS_ENVIRONMENT "sandbox atau production" "sandbox"
biasa SATUSEHAT_ENVIRONMENT "sandbox atau production" "sandbox"

printf '\n\033[1;36m— Rahasia (tidak tampil saat diketik) —\033[0m\n'
rahasia GEMINI_API_KEY "Google AI Studio → API keys (untuk asisten Denti)"
rahasia MIDTRANS_SERVER_KEY "Midtrans Dashboard → Settings → Access Keys → Server Key"
rahasia WHAPI_TOKEN "Whapi.cloud → Channel → Token"
rahasia WHATSAPP_VERIFY_TOKEN "token verifikasi webhook WhatsApp (sama dengan yang diisi di pengaturan webhook)"
rahasia WHATSAPP_APP_SECRET "App Secret Meta (jika dipakai; Enter untuk lewati)"
rahasia SATUSEHAT_CLIENT_ID "Client ID SATUSEHAT (jika diset sebagai secret; Enter untuk lewati)"
rahasia SATUSEHAT_CLIENT_SECRET "Client Secret SATUSEHAT (jika diset sebagai secret; Enter untuk lewati)"
rahasia GROQ_API_KEY "cadangan AI Groq (opsional; Enter untuk lewati)"
rahasia ANTHROPIC_API_KEY "cadangan AI Anthropic (opsional; Enter untuk lewati)"

printf '\n\033[1;36m— Opsional lain —\033[0m\n'
printf 'Nama secret lain di dashboard yang belum ditanyakan (pisah spasi, Enter jika tidak ada): '
read -r lain
for k in $lain; do
  [[ "$k" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "  ✗ nama tidak valid: $k"; continue; }
  case "$k" in SUPABASE_*) echo "  • $k dibuat otomatis server — dilewati"; continue;; esac
  rahasia "$k" "secret tambahan"
done

cd /opt/dentiva/supabase
docker compose up -d --force-recreate functions >/dev/null 2>&1
printf '\n\033[32m✓ Tersimpan di functions.env (%s nilai). Layanan edge function dimulai ulang.\033[0m\n' "$(grep -c '=' "$F")"
printf 'Kabari Claude: "rahasia functions selesai".\n\n'
