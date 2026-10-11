#!/usr/bin/env bash
# Deploy edge function Dentiva ke VPS dari commit HEAD (pengganti `supabase functions deploy`).
#   bash infra/vps/deploy-functions.sh                 # semua fungsi
#   bash infra/vps/deploy-functions.sh ai-assistant    # fungsi tertentu
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
HOST="${DENTIVA_VPS:-dentiva@202.74.74.163}"
KEY="${DENTIVA_VPS_KEY:-$HOME/.ssh/dentiva_vps}"

if ! git diff --quiet HEAD -- supabase/functions infra/vps/functions-main; then
  echo "Ada perubahan belum di-commit di supabase/functions atau infra/vps/functions-main — commit dulu."
  exit 1
fi
echo "Deploy edge function dari $(git rev-parse --short HEAD) ke $HOST…"
git archive --format=tar HEAD supabase/functions infra/vps/functions-main |
  ssh -i "$KEY" -o BatchMode=yes "$HOST" /opt/dentiva/bin/pasang-functions.sh "$@"
