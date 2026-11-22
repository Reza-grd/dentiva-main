#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Atur pengiriman WhatsApp Cloud API (Meta) → /opt/dentiva/supabase/functions.env
#  Dijalankan PEMILIK dari laptop:
#    ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/atur-whatsapp-meta.sh
#
#  - Token diketik tersembunyi lalu langsung diuji ke Graph API (tidak pernah ditampilkan).
#  - Struk & edukasi SELALU tetap lewat sidecar (belum ada template Meta) — hanya pengingat yang bisa pindah.
#  - Enter = pakai nilai yang sudah ada. Webhook (WHATSAPP_VERIFY_TOKEN/APP_SECRET) diatur di isi-rahasia-functions.sh.
#  Panduan lengkap: docs/whatsapp-cloud-api.md
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
umask 077
F=/opt/dentiva/supabase/functions.env
touch "$F"; chmod 600 "$F"

set_() { # set_ NAMA NILAI — tulis sebagai 'nilai' (literal)
  local k="$1" v="$2" tmp
  case "$v" in *"'"*|*$'\n'*) echo "  ✗ nilai $k mengandung tanda kutip tunggal/baris baru — tidak disimpan"; return 0;; esac
  tmp=$(mktemp); grep -v "^$k=" "$F" > "$tmp" || true
  printf "%s='%s'\n" "$k" "$v" >> "$tmp"; mv "$tmp" "$F"; chmod 600 "$F"
}
nilai() { grep -m1 "^$1=" "$F" | cut -d= -f2- | sed "s/^'//; s/'$//"; }
tanya() { # tanya NAMA "keterangan" bawaan — nilai tidak rahasia
  local v lama; lama=$(nilai "$1" || true)
  printf '\n\033[1m%s\033[0m  %s\n  [%s]: ' "$1" "$2" "${lama:-$3}"
  read -r v; v="$(printf %s "${v:-${lama:-$3}}" | tr -d '[:space:]')"
  [ -n "$v" ] && set_ "$1" "$v" && printf '  ✓ %s\n' "$v"
  return 0
}

printf '\n\033[1;36mWhatsApp Cloud API (Meta) — pengaturan pengiriman\033[0m\n'

tanya META_WA_PHONE_NUMBER_ID "Phone number ID pengirim (WhatsApp Manager / API Setup, angka saja)" ""
tanya META_WA_API_VERSION "versi Graph API" "v26.0"

# Token System User: uji ke Graph API — sekaligus menampilkan nama & nomor pengirim (bukan rahasia).
while true; do
  if grep -q '^META_WA_TOKEN=' "$F"; then st="sudah ada — Enter untuk tetap"; else st="kosong — Enter untuk lewati"; fi
  printf '\n\033[1mMETA_WA_TOKEN\033[0m  (%s)\n  Token System User permanen (Business Settings → System users → Generate token)\n  Tempel sekali (tidak tampil): ' "$st"
  IFS= read -rs tok; echo
  tok="$(printf %s "$tok" | tr -d '[:space:][:cntrl:]')"
  [ -z "$tok" ] && tok="$(nilai META_WA_TOKEN || true)"
  [ -z "$tok" ] && { echo "  • dilewati"; break; }
  printf '  %s karakter — menguji ke Meta… ' "${#tok}"
  # Header dari stdin: token tidak masuk daftar proses.
  hasil=$(printf 'Authorization: Bearer %s\n' "$tok" | curl -sS -m 20 -H @- \
    "https://graph.facebook.com/$(nilai META_WA_API_VERSION)/$(nilai META_WA_PHONE_NUMBER_ID)?fields=display_phone_number,verified_name,quality_rating,code_verification_status" || true)
  if printf %s "$hasil" | grep -q '"display_phone_number"'; then
    echo "diterima"
    printf '  Pengirim: %s\n' "$(printf %s "$hasil" | tr -d '{}"' | tr ',' ' ')"
    set_ META_WA_TOKEN "$tok"; break
  fi
  echo "DITOLAK"
  printf '  Jawaban Meta: %s\n' "$(printf %s "$hasil" | grep -o '"message":"[^"]*"' | head -1)"
  printf '  Coba lagi? (y/n): '; read -r lagi; [ "$lagi" = y ] || break
done

tanya META_WA_TEMPLATE_PENGINGAT "nama template pengingat yang SUDAH Approved di WhatsApp Manager (kosongkan bila belum)" ""
tanya META_WA_TEMPLATE_LANG "kode bahasa template" "id"

printf '\n\033[1;36m— Jalur per jenis pesan —\033[0m\n'
printf 'Pengingat boleh lewat meta HANYA bila token & template di atas sudah siap; selain itu sidecar.\n'
tanya WA_PROVIDER_REMINDER "penyedia pengingat jadwal: sidecar atau meta" "sidecar"
if [ "$(nilai WA_PROVIDER_REMINDER)" = meta ] && { [ -z "$(nilai META_WA_TOKEN || true)" ] || [ -z "$(nilai META_WA_TEMPLATE_PENGINGAT || true)" ]; }; then
  echo "  ✗ token/template belum lengkap — pengingat dikembalikan ke sidecar"; set_ WA_PROVIDER_REMINDER sidecar
fi
set_ WA_PROVIDER_RECEIPT sidecar
set_ WA_PROVIDER_EDUCATION sidecar
echo "  ✓ struk & edukasi tetap sidecar"
tanya WA_BALAS_OTOMATIS "balas otomatis pesan pasien ke nomor Meta dengan kontak klinik: true/false" "false"

cd /opt/dentiva/supabase
docker compose up -d --force-recreate functions >/dev/null 2>&1
printf '\n\033[32m✓ Tersimpan. Layanan edge function dimulai ulang.\033[0m\n'
printf 'Kabari Claude: "atur whatsapp meta selesai".\n\n'
