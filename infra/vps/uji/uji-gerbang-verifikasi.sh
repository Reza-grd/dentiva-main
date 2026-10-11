#!/usr/bin/env bash
# Uji gerbang verifikasi pulihkan-ke-vps.sh (temuan audit A2) — TANPA mengubah database:
# memakai --verifikasi-saja terhadap database sekarang.
#   1. acuan dibuat dari kondisi sekarang      → harus LOLOS (exit 0)
#   2. satu jumlah baris & satu sidik diubah   → harus GAGAL (exit 1)
#   3. sidik acuan tidak ada                    → harus GAGAL (exit 1)
#   4. hitungan acuan kosong                    → harus GAGAL (exit 1)
# Jalankan di server: bash /opt/dentiva/bin/uji-gerbang-verifikasi.sh
set -uo pipefail
T=$(mktemp -d /dev/shm/uji-gerbang.XXXXXX); trap 'rm -rf "$T"' EXIT
q() { docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -U supabase_admin -d postgres "$@"; }
jalan() { /opt/dentiva/bin/pulihkan-ke-vps.sh "$T" --verifikasi-saja "$@" >/dev/null 2>&1; echo $?; }
hasil=0
cek() { if [ "$2" = "$3" ]; then echo "✓ $1 (exit $2)"; else echo "✗ $1 (exit $2, seharusnya $3)"; hasil=1; fi; }

q -tA -F $'\t' > "$T/hitungan.tsv" <<'SQL'
select table_schema, table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint
from information_schema.tables
where table_type = 'BASE TABLE'
  and (table_schema in ('public','private','platform','supabase_migrations','backup_20260929')
       or (table_schema, table_name) in (('auth','users'),('auth','identities'),('auth','mfa_factors'),('storage','buckets'),('storage','objects')))
order by 1, 2;
SQL
q -tA -F $'\t' < /opt/dentiva/bin/acl-sidik.sql > "$T/sidik-acl.tsv"
cp "$T/hitungan.tsv" "$T/hitungan.asli"; cp "$T/sidik-acl.tsv" "$T/sidik.asli"

cek "1. acuan benar → lolos" "$(jalan)" 0

awk -F'\t' -v OFS='\t' 'NR == 1 { $3 = $3 + 1 } 1' "$T/hitungan.asli" > "$T/hitungan.tsv"
cek "2a. selisih jumlah baris → gagal" "$(jalan)" 1
cp "$T/hitungan.asli" "$T/hitungan.tsv"
awk -F'\t' -v OFS='\t' '$1 == "pol" { $3 = "00000000000000000000000000000000" } 1' "$T/sidik.asli" > "$T/sidik-acl.tsv"
cek "2b. sidik policy berbeda → gagal" "$(jalan)" 1

rm -f "$T/sidik-acl.tsv"
cek "3. sidik acuan tidak ada → gagal" "$(jalan)" 1
cek "3b. … kecuali --tanpa-sidik" "$(jalan --tanpa-sidik)" 0

cp "$T/sidik.asli" "$T/sidik-acl.tsv"; : > "$T/hitungan.tsv"
cek "4. hitungan acuan kosong → gagal" "$(jalan)" 1

exit $hasil
