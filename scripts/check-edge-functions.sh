#!/usr/bin/env bash
# Type-check setiap Edge Function (menangkap deklarasi ganda, import rusak, salah tipe)
# sebelum deploy. Dipakai CI; lokal: `npm run check:functions` (butuh deno atau npx deno).
set -uo pipefail
DENO=${DENO:-deno}
command -v "$DENO" >/dev/null 2>&1 || DENO="npx -y deno"
fail=0
for dir in supabase/functions/*/; do
  name=$(basename "$dir")
  [ -f "$dir/index.ts" ] || continue
  cfg=""
  [ -f "$dir/deno.json" ] && cfg="--config $dir/deno.json"
  if $DENO check $cfg "$dir/index.ts" >"/tmp/deno-check-$name.log" 2>&1; then
    echo "ok     $name"
  else
    echo "GAGAL  $name"
    cat "/tmp/deno-check-$name.log"
    fail=1
  fi
done
exit $fail
