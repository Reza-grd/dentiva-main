#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Pasang edge function Dentiva di VPS (pengganti `supabase functions deploy`).
#  Menerima arsip tar berisi supabase/functions/ (+ infra/vps/functions-main/) dari stdin.
#  Dipanggil dari laptop lewat infra/vps/deploy-functions.sh.
#
#    … | pasang-functions.sh                  # semua fungsi
#    … | pasang-functions.sh ai-assistant     # fungsi tertentu (+ _shared)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
D=/opt/dentiva/supabase/volumes/functions
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
tar -x -C "$T"
[ -d "$T/supabase/functions" ] || { echo "Arsip tidak berisi supabase/functions"; exit 1; }

if [ -f "$T/infra/vps/functions-main/index.ts" ]; then
  cp "$T/infra/vps/functions-main/index.ts" "$D/main/index.ts"
  echo "✓ router main (JWT per fungsi, import map per fungsi)"
fi

n=0
for src in "$T"/supabase/functions/*/; do
  f=$(basename "$src")
  case "$f" in main|hello) continue;; esac
  if [ $# -gt 0 ] && [ "$f" != _shared ]; then printf '%s\n' "$@" | grep -qx "$f" || continue; fi
  rm -rf "$D/.$f.baru"; cp -r "$src" "$D/.$f.baru"
  rm -rf "$D/$f"; mv "$D/.$f.baru" "$D/$f"
  n=$((n + 1)); echo "✓ $f"
done

cd /opt/dentiva/supabase && docker compose restart functions >/dev/null 2>&1
echo "✓ $n folder dipasang, edge runtime dimulai ulang"
