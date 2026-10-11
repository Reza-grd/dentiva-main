#!/usr/bin/env bash
# Terapkan migrasi supabase/migrations/*.sql yang belum ada di database VPS
# (pengganti `supabase db push` sejak database pindah ke VPS Indonesia).
#
#   bash infra/vps/terapkan-migrasi.sh              # daftar migrasi yang belum diterapkan
#   bash infra/vps/terapkan-migrasi.sh --uji        # jalankan dalam transaksi lalu ROLLBACK (aman)
#   bash infra/vps/terapkan-migrasi.sh --terapkan   # terapkan + catat di supabase_migrations.schema_migrations
#
# Setiap berkas dijalankan sebagai role `postgres` dalam SATU transaksi (gagal = tidak ada yang berubah).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
HOST="${DENTIVA_VPS:-dentiva@202.74.74.163}"
KEY="${DENTIVA_VPS_KEY:-$HOME/.ssh/dentiva_vps}"
MODE="${1:-}"
remote() { ssh -i "$KEY" -o BatchMode=yes "$HOST" "docker exec -i supabase-db psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres $*"; }

applied=$(remote -tA -c "'select version from supabase_migrations.schema_migrations'" < /dev/null)
pending=()
for f in supabase/migrations/*.sql; do
  base=$(basename "$f" .sql)
  grep -qx "${base%%_*}" <<< "$applied" || pending+=("$f")
done

if [ ${#pending[@]} -eq 0 ]; then echo "✓ Semua migrasi sudah diterapkan."; exit 0; fi
printf 'Belum diterapkan (%s):\n' "${#pending[@]}"; printf '  %s\n' "${pending[@]}"
[ -n "$MODE" ] || exit 0
case "$MODE" in --uji|--terapkan) ;; *) echo "Mode tidak dikenal: $MODE"; exit 1;; esac

for f in "${pending[@]}"; do
  base=$(basename "$f" .sql); version="${base%%_*}"; name="${base#*_}"
  tag="migrasi_$(date +%s%N)"
  {
    echo "begin;"
    cat "$f"
    echo
    if [ "$MODE" = --uji ]; then
      echo "rollback;"
    else
      printf "insert into supabase_migrations.schema_migrations(version, name, statements, created_by) values ('%s', '%s', array[\$%s\$%s\$%s\$], 'terapkan-migrasi.sh');\n" \
        "$version" "$name" "$tag" "$(cat "$f")" "$tag"
      echo "commit;"
    fi
  } | remote
  [ "$MODE" = --uji ] && echo "✓ uji lolos (di-rollback): $base" || echo "✓ diterapkan: $base"
done
