#!/usr/bin/env bash
# Isolated local PostgreSQL built from a data-free catalog snapshot; no production connection.
set -euo pipefail
repo_root=$(pwd)
task_dir=$(mktemp -d)
cleanup() {
  db_container=$(docker ps -a --filter 'name=supabase_db_' --format '{{.Names}}' | head -n 1)
  if [[ -n "$db_container" ]]; then
    docker logs --tail 80 "$db_container" || true
  fi
  supabase --workdir "$task_dir" stop --no-backup >/dev/null 2>&1 || true
}
trap cleanup EXIT
supabase --workdir "$task_dir" init
supabase --workdir "$task_dir" db start
psql_command=(psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -X -v ON_ERROR_STOP=1)
# Avoid LLVM compilation overhead in the disposable schema/permission fixture.
"${psql_command[@]}" -c 'alter database postgres set jit=off;'
"${psql_command[@]}" --single-transaction --file "$repo_root/supabase/tests/baseline/20261009170624_schema.sql"
# The snapshot already includes earlier migrations. Apply only newer migrations.
for migration in supabase/migrations/*.sql; do
  version=$(basename "$migration" | cut -d_ -f1)
  if [[ "$version" > "20261009170624" ]]; then
    "${psql_command[@]}" --single-transaction --file "$repo_root/$migration"
  fi
done
"${psql_command[@]}" --file "$repo_root/supabase/tests/audit/regression.sql"
mkdir -p "$task_dir/supabase/tests"
cp -R supabase/tests/database "$task_dir/supabase/tests/"
supabase --workdir "$task_dir" test db
