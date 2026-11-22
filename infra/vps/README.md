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
| `reset-gladi.sh --ya-hapus-semua [--simpan-rahasia]` | Kosongkan DB & storage VPS; tanpa `--simpan-rahasia` juga membuat ulang semua rahasia server |
| `isi-rahasia-functions.sh` | Dijalankan pemilik: isi rahasia/konfigurasi edge function (prompt tersembunyi) → `functions.env` (600) |
| `atur-whatsapp-meta.sh` | Dijalankan pemilik: token Meta (diuji ke Graph API), Phone number ID, template, jalur per jenis pesan → `functions.env` |
| `pasang-functions.sh` | Terima arsip edge function dari `infra/vps/deploy-functions.sh` (laptop, dari commit HEAD) dan pasang |
| `jadwal-cron.sql`, `buat-jadwal-cron.sh --pindah-resmi` | 6 jadwal pg_cron (salinan persis Cloud) — hanya saat pindah resmi |
| `backup-harian.sh` | Backup harian 01:30 WIB (crontab user `dentiva`), terenkripsi `age` ke kunci publik pemilik; simpan 14 hari di `/opt/dentiva/backup` |
| `acl-sidik.sql` | Sidik md5 seluruh GRANT tabel/fungsi/skema Dentiva (dipakai salin & pulihkan) |

Pelajaran gladi 11 Okt 2026:
- `pg_dump` mengabaikan `-n` bila ada `-t` → semua tabel dipilih dengan pola `-t 'skema.*'`.
- Default privilege bawaan server baru memberi akses `anon`/`authenticated` saat objek dibuat, sebelum REVOKE di dump
  berlaku (+139 hak tabel, +100 hak fungsi) → `pulihkan-ke-vps.sh` mengembalikan ke bawaan lalu memutar ulang GRANT/REVOKE
  dump; hasil diverifikasi identik dengan sumber (3.042 entri).
- `docker exec -i` di dalam loop `while read` ikut menghabiskan stdin → loop membaca dari fd 3.
- Hasil gladi pertama: 143 tabel / 1.563 baris cocok, 119 fungsi, 222 aturan RLS, 155 trigger, 290 indeks, 23 aturan storage,
  4 berkas storage identik (sha256).

## Migrasi database (pengganti `supabase db push`)
- `bash infra/vps/terapkan-migrasi.sh` untuk melihat daftar migrasi yang belum diterapkan.
- `… --uji` menjalankannya dalam transaksi lalu ROLLBACK.
- `… --terapkan` menerapkannya sebagai `postgres` (satu transaksi per berkas) dan mencatatnya di `supabase_migrations.schema_migrations`.
- Uji perilaku keamanan di `infra/vps/uji/`, selalu di-rollback. Uji itu menyamar sebagai akun nyata lewat klaim JWT (`sub` + `app_metadata` asli), dan keluarannya hanya benar/salah.
- Uji gerbang pemulihan: `bash /opt/dentiva/bin/uji-gerbang-verifikasi.sh`.
- Uji pengunci item kunjungan lunas (L01, rollback otomatis): `psql … -f infra/vps/uji/uji-guard-item-lunas.sql` setelah migrasi `20261012090000`.

## Pengerasan hasil audit 12 Okt 2026
- `bash infra/vps/batasi-cors.sh`: CORS gateway API hanya untuk asal Dentiva (dentiva.id, dentiva-main(-console)[-preview].vercel.app, localhost, Tauri). Otomatis rollback bila Envoy menolak konfigurasi
  (satu regex panjang ditolak: batas program RE2 → dipakai beberapa pola pendek). **Pasang ulang setelah `update.sh` Supabase** (berkas `volumes/api/envoy/lds.template.yaml` ditimpa).
- Migrasi `20261012100000`: `anon` tanpa hak tabel/urutan di `public`; `authenticated` tanpa TRUNCATE/TRIGGER/REFERENCES; default privileges objek baru; indeks FK.
- **Skrip `infra/vps/uji/*.sql` mengubah data (peran, status, izin) untuk disimulasikan.** Sekarang masing-masing memuat `begin;` sendiri dan berakhir `rollback;`. Jangan pernah
  menjalankannya lewat cara yang memecah transaksi (mis. `psql -c` per pernyataan atau autocommit) — perubahan akan permanen.

## Edge function
- Deploy dari laptop: `bash infra/vps/deploy-functions.sh [nama…]` (pengganti `supabase functions deploy`).
- Router `infra/vps/functions-main/index.ts` (dipasang ke `volumes/functions/main`): JWT diverifikasi per fungsi
  (`FUNCTIONS_VERIFY_JWT=true`, kecuali `FUNCTIONS_NO_VERIFY_JWT=whatsapp-webhook,midtrans-webhook`), import map
  `deno.json` per fungsi, batas 256 MB / 150 detik seperti Cloud. **Pasang ulang setelah `update.sh` Supabase.**

## WhatsApp
Satu pintu pengirim di `supabase/functions/_shared/whatsapp.ts`, dipilih lewat `WA_PROVIDER` di `functions.env`:

| Mode | Status | Kunci di `functions.env` |
|---|---|---|
| `sidecar`: WhatsApp Web asli di VPS (tidak resmi) | **aktif**, nomor klinik tertaut 11 Okt 13:29 WIB | `WA_SIDECAR_URL=http://wa-sidecar:3000`, `WA_SIDECAR_KEY` (sama dengan `wa-sidecar.env`) |
| `meta`: WhatsApp Cloud API (resmi) | kode siap, menunggu pendaftaran Meta | `META_WA_TOKEN`, `META_WA_PHONE_NUMBER_ID`, `META_WA_TEMPLATE_PENGINGAT`, opsional `META_WA_API_VERSION` (bawaan v22.0), `META_WA_TEMPLATE_LANG` (bawaan `id`) |
| `whapi`: Whapi.cloud (lama) | tidak dipakai | `WHAPI_TOKEN` |

**Sidecar** (`infra/vps/wa-sidecar`, container `dentiva-wa`, profil compose `wa-sidecar`):
- **Mesin:** whatsapp-web.js dari commit resmi 2026-09-28, terkunci di lockfile, dengan Chromium headless. Pemakaian memori ±450 MB.
- **Akses:** tidak ada port publik. Fungsi edge memanggilnya lewat jaringan Docker. Halaman QR hanya di 127.0.0.1:3002 (lewat terowongan SSH).
- **Data sesi:** profil WhatsApp Web di `volumes/wa-sidecar/wwebjs` (izin 700). Profil ini memuat riwayat chat nomor tersebut, jadi perlakukan sebagai data rahasia.
- **Pesan dan log:** nomor disamarkan di log. Pesan kiriman tidak menandai chat sebagai "dibaca". Pengiriman diberi jeda acak dan batas 200/jam.
- **Gangguan sementara:** kalau WhatsApp belum tersambung, pengingat **ditunda**, tidak dicatat gagal, dan dicoba lagi di putaran cron berikutnya.
- **Menautkan nomor** (pakai nomor klinik, bukan nomor pribadi):
  1. Di laptop, buka terowongan: `ssh -N -L 3002:127.0.0.1:3002 dentiva@202.74.74.163`.
  2. Di server, buat tautan halaman QR: `docker exec dentiva-wa node cli.mjs pair-link`.
  3. Buka tautan itu di browser, lalu di HP: **Perangkat tertaut → Tautkan perangkat** dan scan QR.
  4. Cara lain tanpa QR, dengan kode tautan: `docker exec -it dentiva-wa node cli.mjs login 08xx…`.
- **Perintah lain:** `docker exec dentiva-wa node cli.mjs status`, atau `… logout` untuk melepas nomor.
- **11 Okt — Baileys 7 rc ditinggalkan:** QR maupun kode tautannya tidak pernah menghasilkan `pair-success`.
- **11 Okt — penyebab "Tidak dapat menautkan perangkat" (sudah diperbaiki):**
  1. whatsapp-web.js menyusun QR format LAMA tanpa awalan `https://wa.me/settings/linked_devices#`. Kelima bagian isinya identik, hanya awalan yang berbeda. HP bisa membacanya, tapi WhatsApp menolak penautan. Kini QR yang tampil sama persis dengan QR asli WhatsApp Web (dicocokkan ke `data-ref` halaman).
  2. Sidik browser: Chromium kini berjalan non-headless di Xvfb, dengan UA dan Client Hints asli dan tanpa `navigator.webdriver`.
  3. Setelah "authenticated", `ready` tak pernah datang karena cache versi WA Web ditulis ke `/app` (milik root). Gagalnya EACCES dan galatnya tertelan diam-diam. Kini cache disimpan di `/data/wwebjs-cache`, dan galat async dicatat ke log.
  4. Chromium gagal start setelah container dibuat ulang karena kunci profil `Singleton*` dari hostname lama. Kini kunci itu dibersihkan sebelum start, hostname dibuat tetap, dan `/health` menjawab 503 kalau macet.
- **Teruji:** restart dan pembuatan ulang container tersambung lagi otomatis ±15 detik tanpa QR. Memori ±750 MB.

**Mode resmi Meta**: panduan lengkap, draf template, dan urutan aktivasi ada di [docs/whatsapp-cloud-api.md](../../docs/whatsapp-cloud-api.md).
- Webhook `https://api.dentiva.id/functions/v1/whatsapp-webhook` sudah terverifikasi Meta pada 24 Okt 2026.
- Pindah ke Meta dilakukan **per jenis pesan** lewat `atur-whatsapp-meta.sh`. Pengingat bisa pindah setelah template disetujui.
- Struk dan edukasi tetap lewat sidecar.
- **Jangan** mengubah `WA_PROVIDER=meta` secara global, karena struk dan edukasi berupa teks bebas yang ditolak Meta di luar jendela 24 jam.

## Backup
- Kunci pembuka hanya di laptop pemilik: `~/.ssh/dentiva_backup` (ed25519) — **salin juga ke USB/brankas**;
  tanpa kunci ini backup tidak bisa dibuka. Kunci publiknya di `/opt/dentiva/backup/penerima.txt`.
- Status terakhir: `/opt/dentiva/backup/terakhir.txt`; log: `/opt/dentiva/backup/backup.log`.
- Buka backup (uji): kunci dikirim lewat stdin, tidak disimpan di server:
  `ssh … 'age -d -i /dev/stdin /opt/dentiva/backup/<berkas>.tar.age | tar -t' < ~/.ssh/dentiva_backup`
- Uji buka 11 Okt: lolos (schema/data lengkap, `lengkap.dump` terbaca, sidik hak akses = sumber).
- Sejak 11 Okt siang, semua artefak database diambil dari **satu snapshot** (`pg_export_snapshot`) sehingga konsisten satu sama lain. Isinya: dump, skema, data, hitungan, sidik, publikasi Realtime, dan daftar storage. Berkas storage disertai manifest `files.sha256`. Backup **gagal** kalau ada berkas yang tidak terunduh.
- Pemulihan bersifat **fail-closed**: `pulihkan-ke-vps.sh` keluar dengan exit 1 kalau himpunan tabel, jumlah baris, atau sidik keamanan berbeda (GRANT, pemilik, RLS, policy, trigger, publikasi). `--verifikasi-saja` membandingkan database sekarang dengan sebuah backup tanpa memulihkan apa pun.
- Belum: salinan offsite (IDCloudHost Object Storage) dan uji pemulihan penuh di server terisolasi.

## Catatan pemasangan
- **Jangan mencetak `docker compose config`** (atau env container) walau difilter: `SUPABASE_DB_URL` berisi kata sandi DB
  dan `SUPABASE_JWKS` berisi JWT secret (kunci HS256). (Kejadian 11 Okt → proxy HTTPS dihentikan, lalu `reset-gladi.sh` membuat ulang semua rahasia server dan
  pemulihan diulang dari nol: lolos semua verifikasi dalam satu kali jalan.)
- `utils/*.sh --update-env` meninggalkan `.env.old` berizin 644 berisi rahasia lama → `shred -u .env.old`.
- Jangan menjalankan `setup.sh` dengan `umask 077`: file `volumes/db/*.sql` harus bisa dibaca container (644);
  hanya `.env` yang 600. (Kejadian 11 Okt: init database berhenti di `98-webhooks.sql: Permission denied`.)
- `utils/generate-keys.sh` mencetak semua rahasia — jalankan dengan output dibuang (`>/dev/null`).
- Image Ubuntu Biznet mematikan layanan ufw saat boot → `systemctl enable ufw`.
