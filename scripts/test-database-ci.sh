#!/usr/bin/env bash
# Isolated local PostgreSQL built from a data-free catalog snapshot; no production connection.
set -euo pipefail
repo_root=$(pwd)
task_dir=$(mktemp -d)
trap 'supabase --workdir "$task_dir" stop --no-backup >/dev/null 2>&1 || true' EXIT
supabase --workdir "$task_dir" init
supabase --workdir "$task_dir" db start
psql_command=(psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -X -v ON_ERROR_STOP=1)
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
