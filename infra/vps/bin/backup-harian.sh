#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Backup harian terenkripsi Dentiva (cron 01:30 WIB).
#
#  Isi backup = format yang sama dengan salinan migrasi, jadi bisa dipulihkan dengan
#  pulihkan-ke-vps.sh + unggah-storage.sh (jalur yang sudah teruji):
#    schema.sql, data.sql, storage-extra.sql, hitungan.tsv, sidik-acl.tsv, publikasi.tsv, files/,
#    files.sha256 (manifest), + lengkap.dump (pg_dump -Fc seluruh database, cadangan kedua).
#  KONSISTEN: semua artefak database (dump, skema, data, hitungan, sidik, daftar berkas storage)
#  diambil dari SATU snapshot PostgreSQL (pg_export_snapshot) — merujuk ke saat yang sama persis.
#  Berkas storage diunduh sesuai daftar snapshot itu; backup GAGAL bila ada yang tidak terunduh.
#  Dienkripsi dengan age ke kunci publik pemilik (penerima.txt). Kunci pembuka HANYA ada
#  di laptop pemilik (~/.ssh/dentiva_backup) — server tidak bisa membuka backup-nya sendiri.
#  Teks polos hanya ada di RAM (/dev/shm) selama proses.
#
#  Hasil: /opt/dentiva/backup/dentiva-<waktu>.tar.age (disimpan SIMPAN_HARI hari).
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
umask 077
export LC_ALL=C

B=/opt/dentiva/backup
BIN=/opt/dentiva/bin
PENERIMA="$B/penerima.txt"
SIMPAN_HARI="${SIMPAN_HARI:-14}"
ENV=/opt/dentiva/supabase/.env
SCHEMAS=(public private platform backup_20260929 supabase_migrations)
AUTH_TABLES=(auth.users auth.identities auth.mfa_factors storage.buckets storage.objects)

[ -s "$PENERIMA" ] || { echo "$(date '+%F %T') ✗ $PENERIMA tidak ada"; exit 1; }
TS=$(date +%Y%m%d-%H%M)
W=$(mktemp -d /dev/shm/dentiva-backup.XXXXXX)
O="$W/dentiva-$TS"; mkdir -p "$O/files"
SNAP_PID=""; SNAP_BG=""

psq() { docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
selesai_snapshot() {
  [ -n "$SNAP_PID" ] && psq -tAc "select pg_terminate_backend($SNAP_PID)" < /dev/null > /dev/null 2>&1 || true
  [ -n "$SNAP_BG" ] && kill "$SNAP_BG" 2> /dev/null || true
  SNAP_PID=""; SNAP_BG=""
}
trap 'selesai_snapshot; rm -rf "$W"' EXIT
trap 'echo "$(date "+%F %T") ✗ backup gagal (baris $LINENO)"; echo "GAGAL $(date "+%F %T")" > "$B/terakhir.txt"' ERR

# ── Satu snapshot untuk semua artefak database ──────────────────────────────
( printf "begin isolation level repeatable read read only;\nselect pg_backend_pid();\nselect pg_export_snapshot();\nselect pg_sleep(1800);\ncommit;\n" \
    | docker exec -i supabase-db psql -X -q -U supabase_admin -d postgres -tA > "$W/.snap" 2>&1 ) &
SNAP_BG=$!
SNAP=""
for _ in $(seq 1 60); do
  SNAP=$(grep -m1 -E '^[0-9A-F]+-[0-9A-F]+-[0-9]+$' "$W/.snap" 2> /dev/null || true)
  [ -n "$SNAP" ] && break
  sleep 0.5
done
[ -n "$SNAP" ] || { echo "$(date '+%F %T') ✗ snapshot database tidak didapat"; false; }
SNAP_PID=$(head -n 1 "$W/.snap")

pgd() { docker exec -i supabase-db pg_dump -U supabase_admin -d postgres --snapshot="$SNAP" "$@" < /dev/null; }
# psnap: jalankan kueri (stdin) di snapshot yang sama
psnap() { { printf "begin isolation level repeatable read read only;\nset transaction snapshot '%s';\n" "$SNAP"; cat; printf "\ncommit;\n"; } | psq -tA -F $'\t'; }
lengkap() { tail -c 300 "$1" | grep -q 'PostgreSQL database dump complete'; }

nargs=(); for s in "${SCHEMAS[@]}"; do nargs+=(-n "$s"); done
targs=(); for s in "${SCHEMAS[@]}"; do targs+=(-t "$s.*"); done
for t in "${AUTH_TABLES[@]}"; do targs+=(-t "$t"); done

pgd --schema-only --no-owner "${nargs[@]}" > "$O/schema.sql";  lengkap "$O/schema.sql"
pgd --data-only --no-owner "${targs[@]}" > "$O/data.sql";      lengkap "$O/data.sql"
pgd -Fc > "$O/lengkap.dump"

psnap > "$O/storage-extra.sql" <<'SQL'
select format('DROP POLICY IF EXISTS %I ON %I.%I;', policyname, schemaname, tablename) || E'\n' ||
       format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;', policyname, schemaname, tablename, permissive, cmd,
              (select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') from unnest(roles) r),
              coalesce(' USING (' || qual || ')', ''), coalesce(' WITH CHECK (' || with_check || ')', ''))
from pg_policies where schemaname = 'storage' order by policyname;
select format('DROP TRIGGER IF EXISTS %I ON %I.%I;', t.tgname, n.nspname, c.relname) || E'\n' || pg_get_triggerdef(t.oid) || ';'
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('auth', 'storage') and not t.tgisinternal and t.tgname like 'protect_bucket_control%';
SQL

psnap > "$O/hitungan.tsv" <<SQL
select table_schema, table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables
where table_type = 'BASE TABLE'
  and (table_schema in ($(printf "'%s'," "${SCHEMAS[@]}" | sed 's/,$//'))
       or (table_schema, table_name) in (('auth','users'),('auth','identities'),('auth','mfa_factors'),('storage','buckets'),('storage','objects')))
order by 1, 2;
SQL
psnap < "$BIN/acl-sidik.sql" > "$O/sidik-acl.tsv"
psnap > "$O/publikasi.tsv" <<'SQL'
select schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname in ('public','private','platform') order by 1, 2;
SQL
psnap > "$W/objek.tsv" <<'SQL'
select bucket_id, name from storage.objects order by 1, 2;
SQL
selesai_snapshot   # sisa langkah tidak perlu menahan transaksi

# ── Berkas storage sesuai daftar snapshot (API lokal, service role, termasuk bucket privat) ──
SRK=$(grep -m1 '^SERVICE_ROLE_KEY=' "$ENV" | cut -d= -f2-)
hdr() { printf 'Authorization: Bearer %s\napikey: %s\n' "$SRK" "$SRK"; }
nb=0; hilang=0
while IFS=$'\t' read -r -u 3 bucket name; do
  [ -n "$bucket" ] || continue
  mkdir -p "$O/files/$bucket/$(dirname "$name")"
  enc=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$name")
  if curl -fsS --retry 2 -H @<(hdr) "http://127.0.0.1:8000/storage/v1/object/authenticated/$bucket/$enc" -o "$O/files/$bucket/$name"; then
    nb=$((nb + 1))
  else
    echo "$(date '+%F %T') ! berkas storage tidak terunduh: $bucket/<nama disembunyikan>"; hilang=$((hilang + 1))
  fi
done 3< "$W/objek.tsv"
unset SRK
[ "$hilang" = 0 ] || { echo "$(date '+%F %T') ✗ $hilang berkas storage tidak terunduh — backup tidak lengkap"; false; }
(cd "$O/files" && find . -type f -print0 | sort -z | xargs -0 -r sha256sum) > "$O/files.sha256"
date '+%F %T' > "$O/.selesai"

tar -C "$W" -cf - "dentiva-$TS" | age -R "$PENERIMA" > "$B/dentiva-$TS.tar.age.tmp"
mv "$B/dentiva-$TS.tar.age.tmp" "$B/dentiva-$TS.tar.age"
find "$B" -maxdepth 1 -name 'dentiva-*.tar.age' -mtime +"$SIMPAN_HARI" -delete

ringkas="$(date '+%F %T') ✓ dentiva-$TS.tar.age $(du -h "$B/dentiva-$TS.tar.age" | cut -f1) — $(wc -l < "$O/hitungan.tsv") tabel, $(awk -F'\t' '{s+=$3} END {print s+0}' "$O/hitungan.tsv") baris, $nb berkas (snapshot $SNAP)"
echo "$ringkas"; echo "OK $ringkas" > "$B/terakhir.txt"
