# Migrasi database Dentiva ke VPS di Indonesia

Tujuan: memindahkan seluruh backend (PostgreSQL + login + storage + edge function + jadwal otomatis) dari
Supabase Cloud (Seoul, `ap-northeast-2`) ke **Supabase self-host di VPS Indonesia**, tanpa mengubah kode aplikasi.

## Arsitektur tujuan

| Komponen | Lokasi | Keterangan |
|---|---|---|
| Server utama | **Biznet Gio NEO Lite MM 8.4** (4 vCPU · 8 GB · 60 GB), Jakarta | Ubuntu 24.04 LTS, Supabase self-host (Docker) |
| Alamat API | `https://api.dentiva.id` | HTTPS otomatis (Let's Encrypt) di depan Supabase |
| Dashboard Studio | tidak dibuka ke internet | diakses lewat terowongan SSH saja |
| Backup | **IDCloudHost Object Storage** (penyedia & lokasi berbeda) | harian, **terenkripsi**, simpan 30 hari — sesuai Permenkes 24/2022 |
| Aplikasi web / desktop / console | tetap (Vercel, installer) | hanya ganti `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` |

## Yang ikut pindah (hasil inventaris 11 Okt 2026)

- Database 72 MB: 40 migrasi, 31 fungsi RPC, RLS per klinik, pg_cron, pg_net, pg_trgm, pgcrypto.
- **Kunci enkripsi rekam medis** ada di `private.encryption_keys` → ikut pindah bersama data (tidak terikat ke Supabase Cloud).
  Konsekuensi: **file backup berisi kunci** → backup wajib dienkripsi dengan kunci backup terpisah yang dipegang pemilik.
- Akun login (`auth.users`, hash kata sandi ikut pindah → pengguna cukup login ulang sekali).
- Storage: 4 file (12 MB).
- 14 edge function + rahasia: `GEMINI_API_KEY`, `MIDTRANS_SERVER_KEY`, `WHAPI_TOKEN`, `WHATSAPP_VERIFY_TOKEN`,
  `CLINIC_APP_URL`, `CONSOLE_URL` (diisi ulang oleh pemilik; nilai `SUPABASE_*` dibuat otomatis di server baru).
- Vault (`dentiva_project_url`, `dentiva_service_role_key`) untuk pg_cron → **dibuat ulang** (Vault Supabase Cloud tidak bisa dibuka di server lain).
- Email otomatis (undangan staf, reset kata sandi, OTP, daftar) → butuh **SMTP** sendiri (mis. `no-reply@dentiva.id`).

## Tahapan

| Fase | Siapa | Isi | Waktu |
|---|---|---|---|
| 0 · Persiapan | Claude | kunci SSH (`~/.ssh/dentiva_vps`), inventaris, dokumen ini | ✅ selesai |
| 1 · Beli VPS | Pemilik | NEO Lite MM 8.4, Ubuntu 24.04, tempel kunci SSH publik; A record `api.dentiva.id` → IP VPS | ✅ VPS aktif `202.74.74.163`, DNS `api.dentiva.id` aktif (11 Okt) |
| 2 · Siapkan server | Claude | firewall (22/80/443), fail2ban, update otomatis, swap, Docker, Supabase self-host, HTTPS | ✅ selesai — HTTPS Let's Encrypt aktif di `https://api.dentiva.id` (lihat `infra/vps/README.md`) |
| 3 · Gladi migrasi | Claude + Pemilik | salin data dari Supabase Cloud (pemilik mengetik kata sandi DB di terminal), storage, edge function, rahasia, cron; uji 147 smoke test + 311 tes + uji alur utama dengan web staging | ± 1–2 hari |
| 4 · Backup & pantau | Claude | backup harian terenkripsi ke IDCloudHost, **uji pemulihan**, pemantau uptime | ± ½ hari |
| 5 · Pindah resmi | Claude + Pemilik | malam hari, jeda ± 1–2 jam: dump final → pulihkan → cek jumlah baris → ganti env Vercel/GitHub/console → uji | 1 malam |
| 6 · Masa transisi | Pemilik | Supabase lama disimpan 7–14 hari sebagai cadangan, lalu dihapus atas persetujuan pemilik | 2 minggu |

## Hal yang hanya bisa dilakukan pemilik

- Membeli VPS & object storage, menempelkan **kunci SSH publik** saat membuat VPS (bukan kata sandi).
- Menambah DNS A record di panel Hostinger.
- Mengetik kata sandi database Supabase lama, SMTP, dan API key langsung di terminal saat diminta (tidak lewat chat).
- Mengganti environment variable di Vercel & GitHub (atau memberi akses CLI).
- Menyimpan **kunci backup** di tempat aman (mis. pengelola kata sandi + cetakan di brankas).

## Keamanan server

- Login SSH hanya dengan kunci, login kata sandi dimatikan, fail2ban aktif.
- Port terbuka hanya 22, 80, 443. Port database (5432) dan Studio tidak dibuka ke internet.
- Rahasia server di `/opt/dentiva/supabase/.env` (izin 600), tidak pernah di-commit.
- Update keamanan Ubuntu otomatis; update Supabase dijadwalkan bulanan setelah uji di gladi.
