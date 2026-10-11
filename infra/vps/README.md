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

## Skrip migrasi (`bin/` → `/opt/dentiva/bin/`, izin 700)

| Skrip | Fungsi |
|---|---|
| `salin-dari-supabase.sh` | Salin dari Supabase Cloud (hanya membaca). Dijalankan pemilik: kata sandi DB diketik tersembunyi. Jalan di tmux, bisa dilanjutkan, log di `<folder>/log.txt`. Hasil: `schema.sql`, `data.sql` (satu snapshot), `storage-extra.sql`, `hitungan.tsv`, `sidik-acl.tsv`, `files/` |
| `pulihkan-ke-vps.sh <folder>` | Pulihkan ke DB VPS yang masih kosong: ekstensi → struktur (sebagai `postgres`) → hak akses disamakan → data (trigger dimatikan sementara) → aturan storage → verifikasi jumlah baris & sidik hak akses |
| `unggah-storage.sh <folder>` | Unggah berkas storage lewat API (service role, lokal), kembalikan pemilik asli, cek sha256 lewat HTTPS |
| `buat-vault.sh` | Rahasia Vault `dentiva_project_url` & `dentiva_service_role_key` dari `.env` (tanpa menampilkan nilai). **Tidak** membuat jadwal pg_cron |
| `reset-gladi.sh --ya-hapus-semua` | Hanya gladi: kosongkan DB & storage VPS dan buat ulang semua rahasia server |
| `acl-sidik.sql` | Sidik md5 seluruh GRANT tabel/fungsi/skema Dentiva (dipakai salin & pulihkan) |

Pelajaran gladi 11 Okt 2026:
- `pg_dump` mengabaikan `-n` bila ada `-t` → semua tabel dipilih dengan pola `-t 'skema.*'`.
- Default privilege bawaan server baru memberi akses `anon`/`authenticated` saat objek dibuat, sebelum REVOKE di dump
  berlaku (+139 hak tabel, +100 hak fungsi) → `pulihkan-ke-vps.sh` mengembalikan ke bawaan lalu memutar ulang GRANT/REVOKE
  dump; hasil diverifikasi identik dengan sumber (3.042 entri).
- `docker exec -i` di dalam loop `while read` ikut menghabiskan stdin → loop membaca dari fd 3.
- Hasil gladi pertama: 143 tabel / 1.563 baris cocok, 119 fungsi, 222 aturan RLS, 155 trigger, 290 indeks, 23 aturan storage,
  4 berkas storage identik (sha256).

## Catatan pemasangan
- **Jangan mencetak `docker compose config`** (atau env container) walau difilter: `SUPABASE_DB_URL` berisi kata sandi DB
  dan `SUPABASE_JWKS` berisi JWT secret (kunci HS256). (Kejadian 11 Okt → proxy HTTPS dihentikan sampai semua rahasia server dibuat ulang.)
- `utils/*.sh --update-env` meninggalkan `.env.old` berizin 644 berisi rahasia lama → `shred -u .env.old`.
- Jangan menjalankan `setup.sh` dengan `umask 077`: file `volumes/db/*.sql` harus bisa dibaca container (644);
  hanya `.env` yang 600. (Kejadian 11 Okt: init database berhenti di `98-webhooks.sql: Permission denied`.)
- `utils/generate-keys.sh` mencetak semua rahasia — jalankan dengan output dibuang (`>/dev/null`).
- Image Ubuntu Biznet mematikan layanan ufw saat boot → `systemctl enable ufw`.
