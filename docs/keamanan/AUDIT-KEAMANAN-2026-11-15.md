# Audit Keamanan Dentiva — 15 November 2026

**Lingkup:** aplikasi klinik (web, desktop), Dentiva Console, API & database (Supabase self-host di VPS Indonesia), fungsi server (edge functions), WhatsApp & email, infrastruktur server, cadangan data.
**Metode:** pemeriksaan konfigurasi langsung di server produksi (hanya metadata, tanpa membaca data pasien), pemeriksaan kode, uji otomatis (database 224 uji, aplikasi 599 uji), uji akses dari internet.
**Penilai:** tim pengembang Dentiva (dibantu Claude Code).

---

## 1. Ringkasan

| Area | Nilai | Catatan singkat |
|---|---|---|
| Isolasi data antarklinik | **Kuat** | RLS + kebijakan *restrictive* per klinik di semua tabel; diuji otomatis |
| Akun & login | **Kuat** (setelah perbaikan) | MFA kini tersedia untuk semua akun klinik dan ditegakkan di database |
| Data medis | **Kuat** | Isi SOAP terenkripsi, rekam medis hanya dokter, log audit tidak bisa diubah |
| Server & jaringan | **Kuat** | Hanya port 22/80/443, firewall + fail2ban, SSH kunci saja, update otomatis |
| Aplikasi web | **Kuat** | HSTS, CSP, larangan iframe, source map tidak diunggah |
| Cadangan data | **Perlu tindakan** | Backup harian terenkripsi, **tetapi hanya tersimpan di server yang sama** |
| Email | **Baik** | SMTP aktif, SPF & DKIM benar; DMARC masih mode pantau |

**Temuan:** 11 temuan — 1 tinggi terbuka (cadangan luar server), selebihnya **diperbaiki** atau berisiko rendah dan diterima.

---

## 2. Kontrol keamanan yang sudah ada (dipertahankan)

**Data & database**
- Row Level Security aktif di **semua** tabel `public` dan `platform` (0 tabel tanpa RLS).
- Kebijakan `tenant_isolation` (RESTRICTIVE) memastikan setiap baris hanya terbaca klinik pemiliknya, termasuk berkas radiologi, foto pasien, dan dokumen klinik di storage.
- Semua fungsi `SECURITY DEFINER` memakai `search_path` tetap (mencegah pembajakan fungsi).
- Fungsi yang bisa dipanggil tanpa login hanya fungsi publik yang disengaja (halaman booking, layar antrean, kirim permintaan booking).
- Isi SOAP rekam medis disimpan terenkripsi (PGP); NIK pengguna terenkripsi.
- **Log audit tambah-saja & berantai hash**: tidak bisa diubah/dihapus, aktor diisi server (tidak bisa dipalsukan), data sensitif disamarkan otomatis.
- Rekam medis hanya bisa dibuka peran **dokter**; perubahan rekam medis berversi dengan alasan (Permenkes 24/2022).

**Akun & sesi**
- Password minimal 8 karakter, wajib huruf + angka.
- Logout otomatis setelah 15 menit tidak aktif (aplikasi klinik), 30 menit (Console).
- Console: khusus operator, **wajib MFA**, semua aksi tercatat di audit log.
- Pembatas percobaan login bawaan layanan Auth.

**Server**
- Port terbuka ke internet hanya 22 (SSH), 80, 443; database, Kong, Studio tidak terekspos (diuji: 404/401).
- Firewall `ufw` aktif, `fail2ban` aktif, SSH: login root ditolak, login password ditolak (kunci saja), maks. 4 percobaan.
- Pembaruan keamanan otomatis (`unattended-upgrades`) aktif.
- Pemantauan tiap 5 menit (`pantau.sh`), backup harian 01.30 terenkripsi `age` (kunci pembuka hanya di laptop pemilik).

**Aplikasi web (dentiva-main & Console)**
- `Strict-Transport-Security` (2 tahun, preload), `Content-Security-Policy` ketat, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- Source map tidak dapat diunduh (403); tidak ada kunci rahasia di kode (dipindai: kunci Anthropic, Google, service role, private key, token Meta/GitHub — **0 temuan**).
- Kunci rahasia hanya di server (`.env`, `functions.env` izin 600) dan Environment Variables Vercel.

**WhatsApp**
- Webhook Meta wajib tanda tangan HMAC; nomor WA tidak disimpan utuh (sidik HMAC + versi tersamar).
- Penautan nomor ke akun lewat kode sekali pakai (hash, 10 menit, maks. 5 salah/jam).
- Isi rekam medis tidak pernah dikirim lewat WhatsApp.

---

## 3. Temuan & tindak lanjut

Tingkat: **Tinggi** (bisa langsung berdampak pada data), **Sedang**, **Rendah**, **Info**.

| ID | Tingkat | Temuan | Status |
|---|---|---|---|
| K-01 | Tinggi | Akun klinik (manajer, dokter, resepsionis) hanya dilindungi password; bila password bocor, data klinik terbuka. | **Diperbaiki** — MFA (TOTP) untuk semua akun klinik, ditegakkan di database |
| K-02 | Tinggi | Backup harian hanya tersimpan di VPS yang sama. Bila server rusak/terkunci, backup ikut hilang. | **Terbuka** — perlu penyimpanan luar server (lihat §5) |
| K-03 | Sedang | Pengguna tidak bisa melihat atau mengeluarkan perangkat lain yang masuk ke akunnya. | **Diperbaiki** — daftar perangkat + keluar dari perangkat lain |
| K-04 | Sedang | Kebijakan baca tabel `users` mengandung klausa `true`. Saat ini tetap aman karena dibatasi kebijakan restrictive per klinik, tetapi rapuh bila kebijakan itu berubah. | **Diperbaiki** — klausa `true` dihapus |
| K-05 | Sedang | Staf yang lupa password tidak punya jalan pemulihan saat email belum aktif; HP staf yang hilang tidak bisa dicabut MFA-nya oleh klinik. | **Diperbaiki** — manajer bisa atur ulang password & mematikan MFA staf (sesi staf dicabut, tercatat di audit) |
| K-06 | Rendah | Bucket `avatars` (publik) tanpa batas ukuran & jenis berkas. | **Diperbaiki** — hanya JPG/PNG/WEBP ≤ 2 MB |
| K-07 | Rendah | CORS `*` di fungsi `admin-create-user` dan `send-whatsapp`. | **Diperbaiki** — hanya asal aplikasi Dentiva. `send-visit-notifications` tetap `*` (dipanggil juga dari aplikasi desktop; tetap wajib token login) — **diterima** |
| K-08 | Rendah | `npm audit`: 1 tinggi (Vite), 5 sedang (esbuild, glob, workbox). Semuanya **alat build/server pengembangan**, tidak ikut ke aplikasi yang dipakai klinik. | **Dipantau** — jadwalkan naik versi Vite |
| K-09 | Rendah | DMARC `p=none` (hanya memantau); email palsu atas nama @dentiva.id belum ditolak penerima. | **Rekomendasi** — naikkan ke `p=quarantine` setelah 2–4 minggu |
| K-10 | Info | Pengecekan password bocor (daftar password yang pernah bocor) belum aktif. | **Rekomendasi** |
| K-11 | Info | Email undangan/reset sebelumnya gagal karena SMTP belum terpasang. | **Diperbaiki** (15 Nov) — SMTP Hostinger, SPF & DKIM valid |

---

## 4. Sistem keamanan baru (15 Nov 2026)

### 4.1 Verifikasi dua langkah (MFA) untuk akun klinik
- **Profil → Verifikasi dua langkah**: pindai QR dengan Google/Microsoft Authenticator, masukkan kode → aktif.
- Saat masuk: password → **kode 6 digit** → baru data klinik terbuka.
- **Ditegakkan di database**, bukan hanya di tampilan: fungsi `get_user_clinic_id()` (dasar seluruh RLS) menolak sesi tanpa verifikasi kedua bagi pengguna yang mengaktifkan MFA. Password yang bocor + akses API langsung tetap **tidak bisa** membaca data.
- Tindakan sensitif juga mensyaratkan MFA terpenuhi: ganti email, atur password staf, membuat kode tautan WhatsApp, daftar perangkat.
- HP hilang: manajer klinik mematikan MFA staf lewat **Kelola Pengguna → 🔑**; untuk manajer sendiri lewat tim Dentiva.

### 4.2 Perangkat yang sedang masuk
- **Profil → Perangkat yang sedang masuk**: jenis perangkat & browser, waktu aktif terakhir, IP **tersamar** (hanya dua oktet pertama).
- Tombol **Keluar dari perangkat lain** mencabut semua sesi kecuali perangkat yang sedang dipakai.

### 4.3 Pemulihan akun tanpa email
- **Kelola Pengguna → 🔑 Atur ulang password**: manajer menetapkan password baru (≥ 8 huruf+angka), opsi mematikan MFA staf; staf otomatis keluar dari semua perangkat; tercatat di audit log.

### 4.4 Ganti email dengan konfirmasi ganda
- Butuh password saat ini; tautan konfirmasi dikirim ke **email lama dan email baru**; berlaku setelah keduanya diklik.

### 4.5 Perapian lain
- Kebijakan baca `users` tanpa klausa `true`; batas berkas avatar; CORS fungsi sensitif dibatasi asal aplikasi Dentiva.

---

## 5. Rekomendasi lanjutan (urut prioritas)

| No | Tindakan | Siapa | Upaya |
|---|---|---|---|
| 1 | **Aktifkan backup luar server** (K-02): buat bucket S3 (mis. Backblaze B2 / Cloudflare R2 / Biznet NEO), isi `/opt/dentiva/backup/offsite.env`, pasang cron `salin-backup-offsite.sh` (skrip sudah ada). Berkas sudah terenkripsi sebelum dikirim. | Pemilik + tim teknis | 30 menit |
| 2 | **Uji pemulihan backup** sekali per bulan ke server uji (skrip `pulihkan-ke-vps.sh`). Backup yang belum pernah diuji pulih belum terjamin. | Tim teknis | 1 jam/bulan |
| 3 | **Wajibkan MFA untuk manajer klinik** (kebijakan per klinik) setelah fitur MFA dipakai 2–4 minggu tanpa kendala. | Pemilik (keputusan) | Kecil |
| 4 | Naikkan DMARC ke `p=quarantine; rua=mailto:…` (K-09). | Pemilik (DNS Hostinger) | 10 menit |
| 5 | Aktifkan pengecekan password bocor di layanan Auth (K-10). | Tim teknis | Kecil |
| 6 | Naik versi Vite & plugin PWA (K-08). | Tim teknis | Sedang |
| 7 | Uji penetrasi eksternal oleh pihak independen sebelum jumlah klinik besar; tinjau ulang audit ini setiap 6 bulan. | Pemilik | — |

---

## 6. Cara memverifikasi ulang

- Database: `npm run db:smoke` (224 uji: isolasi klinik, MFA, sesi, invoice, WhatsApp, log audit).
- Aplikasi: `npm test -w @dentiva/clinic` (599 uji).
- RLS & MFA di produksi: lihat kueri audit di bagian lampiran berkas ini (hanya metadata).
- Header web: `curl -sI https://dentiva-main.vercel.app/`.

### Lampiran — kueri pemeriksaan (metadata saja)
```sql
-- Tabel tanpa RLS (harus kosong)
select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname in ('public','platform') and not c.relrowsecurity;
-- Fungsi SECURITY DEFINER tanpa search_path (harus kosong)
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','platform') and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');
-- Fungsi yang bisa dipanggil tanpa login
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute');
```
