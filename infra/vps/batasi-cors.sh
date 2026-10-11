#!/usr/bin/env bash
# Batasi CORS gateway API (Envoy) hanya untuk asal resmi Dentiva — sebelumnya regex ".*" memantulkan asal mana pun.
# Aplikasi memakai token Bearer (bukan cookie) sehingga bukan celah langsung, tetapi asal tak dikenal tidak perlu diizinkan.
# Asal: dentiva.id & subdomain, dentiva-main(-console)[-preview].vercel.app, localhost (dev), aplikasi desktop (Tauri).
# Beberapa pola pendek (satu regex panjang ditolak Envoy: batas ukuran program RE2). Idempoten; cadangan lds.template.yaml.bak-cors;
# bila envoy tidak sehat setelah perubahan, cadangan dipulihkan otomatis.
#   bash infra/vps/batasi-cors.sh
set -euo pipefail
HOST="${DENTIVA_VPS:-dentiva@202.74.74.163}"
KEY="${DENTIVA_VPS_KEY:-$HOME/.ssh/dentiva_vps}"
ssh -i "$KEY" -o BatchMode=yes "$HOST" 'python3 - <<"PY"
import shutil, sys
p = "/opt/dentiva/supabase/volumes/api/envoy/lds.template.yaml"
s = open(p).read()
old = """                    cors:
                      allow_origin_string_match:
                        - safe_regex:
                            regex: ".*"
"""
I = " " * 24
items = [
  ("exact", "https://dentiva.id"), ("exact", "https://www.dentiva.id"), ("exact", "https://tauri.localhost"),
  ("exact", "http://tauri.localhost"), ("exact", "tauri://localhost"),
  ("re", r"https://[a-z0-9-]+\.dentiva\.id"), ("re", r"https://dentiva-main(-console)?\.vercel\.app"),
  ("re", r"https://dentiva-main[a-z0-9-]*-reza-grds-projects\.vercel\.app"), ("re", r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?"),
]
lines = []
for kind, v in items:
    lines.append(I + "- exact: \x27" + v + "\x27\n" if kind == "exact" else I + "- safe_regex:\n" + I + "    regex: \x27" + v + "\x27\n")
repl = "                    cors:\n                      allow_origin_string_match:\n" + "".join(lines)
if "reza-grds-projects" in s:
    print("sudah dibatasi"); sys.exit(0)
if s.count(old) != 1:
    print("pola lama tidak ditemukan / ganda — batal"); sys.exit(1)
shutil.copy(p, p + ".bak-cors")
open(p, "w").write(s.replace(old, repl))
print("diubah")
PY'
ssh -i "$KEY" -o BatchMode=yes "$HOST" 'cd /opt/dentiva/supabase/volumes/api/envoy && docker restart supabase-envoy >/dev/null
for i in $(seq 1 25); do
  # sehat DAN konfigurasi listener tidak ditolak
  if [ "$(docker inspect -f "{{.State.Health.Status}}" supabase-envoy)" = healthy ] && ! docker logs --since 2m supabase-envoy 2>&1 | grep -q "config rejected"; then echo "envoy healthy"; exit 0; fi
  sleep 2
done
echo "envoy GAGAL — memulihkan cadangan"; cp lds.template.yaml.bak-cors lds.template.yaml; docker restart supabase-envoy >/dev/null; exit 1'
