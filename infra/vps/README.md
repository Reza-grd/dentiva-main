# VPS Dentiva (Biznet Gio NEO Lite MM 8.4 · West Java)

Konfigurasi Supabase self-host Dentiva. **Tanpa rahasia** — rahasia hanya ada di `/opt/dentiva/supabase/.env` di server (izin 600).

| File | Dipasang di server |
|---|---|
| `docker-compose.dentiva.yml` | `/opt/dentiva/supabase/docker-compose.dentiva.yml` — semua port dikunci ke 127.0.0.1 |
| `Caddyfile` | `/opt/dentiva/supabase/volumes/proxy/caddy/Caddyfile` — hanya jalur API; Studio tidak publik |

## Kondisi server (11 Okt 2026)
- Ubuntu 24.04.4 LTS, zona waktu Asia/Jakarta, swap 4 GB.
- SSH: hanya kunci (`~/.ssh/dentiva_vps`), login kata sandi & root dimatikan, fail2ban aktif.
- Firewall ufw (aktif saat boot): hanya 22, 80, 443.
- Docker 29 + Supabase self-host `self-hosted/v0.8.2` (PostgreSQL 17.6), 11 layanan sehat.
- Port 3000 (Studio), 5432/6543 (database/pooler), 8000 (API) hanya `127.0.0.1`.
- HTTPS: Caddy + Let's Encrypt di `https://api.dentiva.id` (perpanjang otomatis). `COMPOSE_FILE=docker-compose.yml:docker-compose.caddy.yml:docker-compose.dentiva.yml`.
- Uji dari internet (11 Okt): `/` & Studio → 404, API tanpa kunci → 401, dengan kunci → 200 (±0,37 dtk), http → https 308,
  port 3000/5432/8000 tertutup.

## Perintah harian (di server, `cd /opt/dentiva/supabase`)
```sh
sh run.sh status        # status layanan
sh run.sh logs auth     # log satu layanan
sh run.sh restart       # mulai ulang
```

## Membuka Studio (dashboard) dengan aman
Dari laptop pemilik:
```sh
ssh -i ~/.ssh/dentiva_vps -L 3000:127.0.0.1:3000 dentiva@202.74.74.163
```
lalu buka `http://localhost:3000` (Studio tidak pernah dibuka ke internet).

## Catatan pemasangan
- Jangan menjalankan `setup.sh` dengan `umask 077`: file `volumes/db/*.sql` harus bisa dibaca container (644);
  hanya `.env` yang 600. (Kejadian 11 Okt: init database berhenti di `98-webhooks.sql: Permission denied`.)
- `utils/generate-keys.sh` mencetak semua rahasia — jalankan dengan output dibuang (`>/dev/null`).
- Image Ubuntu Biznet mematikan layanan ufw saat boot → `systemctl enable ufw`.
