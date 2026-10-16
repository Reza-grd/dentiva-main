#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pemantau kesehatan server Dentiva (cron tiap 5 menit). Menulis /opt/dentiva/backup/../pantau/status.json dan
#  mengirim peringatan WhatsApp (sidecar POST /send, header x-api-key) ke pemilik BILA ada masalah baru (tidak spam: satu pesan per jenis masalah per 6 jam).
#
#  Yang diperiksa: kontainer inti sehat · API publik menjawab · disk · memori · umur backup lokal & offsite · sertifikat HTTPS ·
#  reboot kernel tertunda. Tidak ada rahasia dalam berkas ini; kanal peringatan dikonfigurasi di /opt/dentiva/pantau/pantau.env (600):
#      WA_NOMOR=62812xxxxxxx          # nomor pemilik (format internasional tanpa +)
#      WA_SIDECAR_URL=http://127.0.0.1:3002   WA_SIDECAR_KEY=…   (sidecar WhatsApp yang sudah ada; kosongkan = hanya tulis status)
#  Pasang: */5 * * * * /opt/dentiva/bin/pantau.sh >> /opt/dentiva/pantau/pantau.log 2>&1
#  Uji:    bash pantau.sh --uji   (cetak hasil, tidak mengirim peringatan)
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
D="${PANTAU_DIR:-/opt/dentiva/pantau}"; B="${BACKUP_DIR:-/opt/dentiva/backup}"
mkdir -p "$D"; chmod 700 "$D"
[ -f "$D/pantau.env" ] && { set -a; . "$D/pantau.env"; set +a; }
UJI=0; [ "${1:-}" = "--uji" ] && UJI=1
MASALAH=(); INFO=()

# 1) kontainer inti
for c in supabase-db supabase-auth supabase-rest supabase-envoy supabase-edge-functions supabase-storage realtime-dev.supabase-realtime supabase-caddy dentiva-wa; do
  s=$(docker inspect -f '{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' "$c" 2> /dev/null || echo "tidak-ada")
  case "$s" in running/healthy|running/-) ;; *) MASALAH+=("kontainer $c: $s");; esac
done
# 2) API publik
kode=$(curl -s -m 10 -o /dev/null -w '%{http_code}' https://api.dentiva.id/auth/v1/health 2> /dev/null || echo 000)
case "$kode" in 200|401) INFO+=("api=$kode");; *) MASALAH+=("API publik api.dentiva.id/auth/v1/health → HTTP $kode");; esac
# 3) disk & memori
dp=$(df --output=pcent / | tail -1 | tr -dc 0-9); [ "$dp" -lt 85 ] || MASALAH+=("disk / terisi ${dp}%"); INFO+=("disk=${dp}%")
mp=$(free | awk '/Mem:/{printf "%d", ($3/$2)*100}'); [ "$mp" -lt 92 ] || MASALAH+=("memori terpakai ${mp}%"); INFO+=("mem=${mp}%")
# 4) umur backup (lokal ≤ 30 jam; offsite ≤ 36 jam bila dikonfigurasi)
L=$(ls -1t "$B"/dentiva-*.tar.age 2> /dev/null | head -n 1 || true)
if [ -n "$L" ]; then ju=$(( ( $(date +%s) - $(stat -c %Y "$L") ) / 3600 )); [ "$ju" -le 30 ] || MASALAH+=("backup lokal terbaru berumur ${ju} jam"); INFO+=("backup_lokal=${ju}j")
else MASALAH+=("tidak ada backup lokal"); fi
if [ -f "$B/offsite.env" ]; then
  if [ -f "$B/offsite-terakhir.txt" ]; then
    head -c 4 "$B/offsite-terakhir.txt" | grep -q '^OK' || MASALAH+=("salin offsite terakhir GAGAL: $(head -c 120 "$B/offsite-terakhir.txt")")
    jo=$(( ( $(date +%s) - $(stat -c %Y "$B/offsite-terakhir.txt") ) / 3600 )); [ "$jo" -le 36 ] || MASALAH+=("status offsite usang (${jo} jam)")
  else MASALAH+=("offsite dikonfigurasi tetapi belum pernah berhasil"); fi
fi
# 5) sertifikat HTTPS (≥ 14 hari)
exp=$(echo | timeout 10 openssl s_client -servername api.dentiva.id -connect api.dentiva.id:443 2> /dev/null | openssl x509 -noout -enddate 2> /dev/null | cut -d= -f2)
if [ -n "$exp" ]; then hari=$(( ( $(date -d "$exp" +%s) - $(date +%s) ) / 86400 )); [ "$hari" -ge 14 ] || MASALAH+=("sertifikat HTTPS habis dalam ${hari} hari"); INFO+=("sertifikat=${hari}h")
else MASALAH+=("tidak bisa membaca sertifikat api.dentiva.id"); fi
# 6) reboot kernel tertunda (> 14 hari)
if [ -f /var/run/reboot-required ]; then r=$(( ( $(date +%s) - $(stat -c %Y /var/run/reboot-required) ) / 86400 )); [ "$r" -le 14 ] || MASALAH+=("reboot kernel tertunda ${r} hari"); INFO+=("reboot_tertunda=${r}h"); fi

printf '{"waktu":"%s","masalah":[%s],"info":"%s"}\n' "$(date -Is)" "$(printf '"%s",' "${MASALAH[@]:-}" | sed 's/,$//; s/^"",\?$//')" "${INFO[*]:-}" > "$D/status.json"
if [ "$UJI" = 1 ]; then echo "info: ${INFO[*]:-}"; [ ${#MASALAH[@]} -eq 0 ] && echo "✓ tidak ada masalah" || printf '✗ %s\n' "${MASALAH[@]}"; exit 0; fi

# Peringatan WhatsApp (dedup 6 jam per jenis masalah)
kirim() {
  [ -n "${WA_NOMOR:-}" ] && [ -n "${WA_SIDECAR_URL:-}" ] && [ -n "${WA_SIDECAR_KEY:-}" ] || return 0
  curl -s -m 15 -X POST "$WA_SIDECAR_URL/send" -H "x-api-key: $WA_SIDECAR_KEY" -H 'Content-Type: application/json' \
    -d "$(printf '{"to":"%s","text":"%s"}' "$WA_NOMOR" "$1")" > /dev/null 2>&1 || true
}
for m in "${MASALAH[@]:-}"; do
  [ -n "$m" ] || continue
  h=$(printf '%s' "$m" | sha1sum | cut -c1-12); f="$D/.kirim-$h"
  if [ ! -f "$f" ] || [ $(( $(date +%s) - $(stat -c %Y "$f") )) -gt 21600 ]; then kirim "⚠️ Dentiva server: $m"; : > "$f"; fi
done
find "$D" -name '.kirim-*' -mtime +2 -delete 2> /dev/null || true
