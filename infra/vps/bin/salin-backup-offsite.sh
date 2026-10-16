#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Salin backup harian Dentiva ke penyimpanan LUAR server (offsite) — jalan lewat cron setelah backup-harian.sh.
#
#  Aman dikirim keluar: berkas *.tar.age SUDAH terenkripsi (age) dengan kunci publik pemilik; kunci pembukanya hanya ada di laptop pemilik.
#  Yang dikirim hanya: dentiva-*.tar.age terbaru + terakhir.txt. Server tidak pernah memegang kunci pembuka.
#
#  Konfigurasi (BUKAN di repo): /opt/dentiva/backup/offsite.env  (izin 600), contoh:
#      OFFSITE_REMOTE=offsite:dentiva-backup          # nama remote rclone : bucket/folder
#      OFFSITE_SIMPAN_HARI=60                         # hapus berkas lebih tua dari ini di tujuan
#      RCLONE_CONFIG_OFFSITE_TYPE=s3
#      RCLONE_CONFIG_OFFSITE_PROVIDER=Other           # Cloudflare / Backblaze B2 (S3) / Biznet NEO / Wasabi, dst.
#      RCLONE_CONFIG_OFFSITE_ENDPOINT=https://<endpoint-s3>
#      RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID=…
#      RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY=…
#  Pasang: apt install rclone ; cron:  45 2 * * * /opt/dentiva/bin/salin-backup-offsite.sh >> /opt/dentiva/backup/offsite.log 2>&1
#
#  Uji tanpa jaringan:  OFFSITE_REMOTE=/tmp/tujuan-uji bash salin-backup-offsite.sh   (tujuan folder lokal)
#  Hasil status: /opt/dentiva/backup/offsite-terakhir.txt  (dibaca pantau.sh → peringatan bila usang)
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077
B="${BACKUP_DIR:-/opt/dentiva/backup}"
ENV_FILE="${OFFSITE_ENV:-$B/offsite.env}"
STATUS="$B/offsite-terakhir.txt"
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
: "${OFFSITE_REMOTE:?OFFSITE_REMOTE belum diisi (lihat komentar di skrip)}"
SIMPAN="${OFFSITE_SIMPAN_HARI:-60}"
RCLONE="${RCLONE:-rclone}"
command -v "$RCLONE" > /dev/null || { echo "$(date '+%F %T') ✗ rclone belum terpasang (apt install rclone)"; echo "GAGAL $(date '+%F %T') rclone tidak ada" > "$STATUS"; exit 1; }
trap 'echo "$(date "+%F %T") ✗ salin offsite gagal (baris $LINENO)"; echo "GAGAL $(date "+%F %T") baris $LINENO" > "$STATUS"' ERR

TERBARU=$(ls -1t "$B"/dentiva-*.tar.age 2> /dev/null | head -n 1 || true)
[ -n "$TERBARU" ] || { echo "$(date '+%F %T') ✗ tidak ada backup untuk disalin"; false; }
NAMA=$(basename "$TERBARU")
# Jangan menyalin backup yang lebih tua dari 36 jam (berarti backup harian gagal) — status GAGAL agar terlihat.
UMUR_JAM=$(( ( $(date +%s) - $(stat -c %Y "$TERBARU") ) / 3600 ))
[ "$UMUR_JAM" -le 36 ] || { echo "$(date '+%F %T') ✗ backup terbaru berumur ${UMUR_JAM} jam — backup harian bermasalah"; false; }

"$RCLONE" copyto "$TERBARU" "$OFFSITE_REMOTE/$NAMA" --s3-no-check-bucket --retries 5 --low-level-retries 10
[ -f "$B/terakhir.txt" ] && "$RCLONE" copyto "$B/terakhir.txt" "$OFFSITE_REMOTE/terakhir.txt" --s3-no-check-bucket
# Verifikasi: ukuran di tujuan harus sama persis dengan lokal.
UK_LOKAL=$(stat -c %s "$TERBARU")
UK_JAUH=$("$RCLONE" lsjson "$OFFSITE_REMOTE/$NAMA" --s3-no-check-bucket 2> /dev/null | grep -o '"Size":[0-9]*' | head -n 1 | cut -d: -f2 || true)
[ "$UK_LOKAL" = "${UK_JAUH:-x}" ] || { echo "$(date '+%F %T') ✗ ukuran tujuan (${UK_JAUH:-?}) ≠ lokal ($UK_LOKAL)"; false; }
# Retensi di tujuan
"$RCLONE" delete "$OFFSITE_REMOTE" --min-age "${SIMPAN}d" --include "dentiva-*.tar.age" --s3-no-check-bucket || true
JUMLAH=$("$RCLONE" lsf "$OFFSITE_REMOTE" --include "dentiva-*.tar.age" --s3-no-check-bucket 2> /dev/null | wc -l)
MSG="OK $(date '+%F %T') ✓ $NAMA ($(numfmt --to=iec "$UK_LOKAL")) → offsite, $JUMLAH berkas tersimpan (retensi ${SIMPAN} hari)"
echo "$MSG" | tee "$STATUS"
