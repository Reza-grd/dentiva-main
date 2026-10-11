# Briefing untuk GPT — Migrasi Dentiva ke server Indonesia (11 Okt 2026)

> Tempel seluruh dokumen ini ke GPT sebagai pesan pertama.

## Konteks
- **Dentiva** adalah aplikasi rekam medis elektronik (EMR) SaaS untuk klinik gigi, dengan komponen:
  - web klinik `https://dentiva-main.vercel.app`;
  - console admin `https://dentiva-main-console.vercel.app`;
  - aplikasi desktop Windows/macOS;
  - website `https://dentiva.id`.
- Hari ini backend dipindahkan **permanen** dari Supabase Cloud (Seoul) ke Supabase self-host di VPS Biznet Gio, Jakarta.
  - Alamat API baru: `https://api.dentiva.id`.
  - Alasannya: rekam medis wajib disimpan di Indonesia (Permenkes 24/2022, PP 71/2019, UU PDP).
- Pembagian kerja:
  - **Claude (Claude Code)** memegang server, database, migrasi data, edge function, backup, jadwal otomatis, dan perubahan kode aplikasi.
  - **Kamu (GPT)** mengerjakan tugas pendamping di bawah. Kamu bekerja bersama **pemilik** (pemilik Dentiva, bukan programmer).
- Gunakan Bahasa Indonesia yang ringkas. Pemilik bukan programmer, jadi beri langkah klik-demi-klik.

## Aturan keras
1. **Jangan pernah meminta atau menerima** kata sandi, API key, token, isi `.env`, kunci SSH, atau kode OTP.
   - Kalau pemilik terlanjur menempelkannya, katakan bahwa rahasia itu harus segera diganti, dan jangan mengulang nilainya.
   - Rahasia selalu diketik pemilik sendiri ke prompt tersembunyi yang disiapkan Claude di server.
2. **Jangan meminta atau memproses data pasien maupun data klinik**: nama, NIK, nomor RM, nomor HP, diagnosis.
3. Kamu **tidak punya akses ke server atau database**, dan jangan menyarankan perintah yang mengubah server atau database. Semua itu lewat Claude.
4. **Jika bekerja di repo** (`github.com/Reza-grd/dentiva-main`):
   - kerjakan hanya path yang disebut di tugasmu;
   - pakai branch sendiri `gpt/<nama-tugas>` dan jangan push ke `main` atau `console`;
   - **jangan mengubah** `infra/vps/bin/**`, `supabase/**`, `apps/**/vercel.json`, `apps/desktop/**`, maupun file `.env*` (sedang dikerjakan Claude).
5. Jangan menghapus atau mengubah record DNS yang sudah ada, kecuali yang disebut di tugas.
   - `A api → 202.74.74.163` dan semua record Vercel **wajib tetap**.

## Tugas (urut prioritas)

### T1 · SMTP pengirim email `no-reply@dentiva.id` (prioritas tertinggi; pendampingan pemilik)
- **Tujuan:** server baru bisa mengirim email login otomatis (konfirmasi daftar, reset kata sandi, undangan staf).
- **Langkah:**
  1. Bantu pemilik memilih penyedia SMTP. Syaratnya:
     - SMTP standar (port 587 STARTTLS atau 465 SSL);
     - bisa verifikasi domain `dentiva.id`;
     - kuota gratis atau murah minimal ±100 email per hari;
     - reputasi pengiriman baik.
     Jika pemilik sudah punya email di Hostinger untuk `dentiva.id`, pertimbangkan itu dulu. Bandingkan maksimal 3 opsi beserta harga.
  2. Pandu pemilik membuat akun sendiri dan memverifikasi domain.
  3. Pandu penambahan record DNS di panel **Hostinger** (DNS `dentiva.id` ada di sana):
     - **SPF:** harus *satu* TXT `v=spf1 …`; gabungkan jika sudah ada.
     - **DKIM** sesuai penyedia.
     - **DMARC:** mulai dari `p=none` dengan alamat laporan milik pemilik.
  4. Uji kirim dari panel penyedia ke email pribadi pemilik. Pastikan email masuk inbox, bukan spam.
- **Serahkan ke Claude (tanpa rahasia):**
  - nama penyedia, SMTP host, port, username SMTP;
  - alamat pengirim `no-reply@dentiva.id` dan nama pengirim `Dentiva`;
  - status SPF/DKIM/DMARC.
  - Kata sandi SMTP **tidak** diserahkan. Pemilik mengetiknya sendiri saat Claude memintanya di terminal.

### T2 · Teks pengumuman untuk klinik pengguna
Tulis tiga pesan, masing-masing versi **WhatsApp** (pendek) dan **email**:
1. **Sebelum pemeliharaan.** Isinya:
   - jadwal (kosongkan sebagai `[TANGGAL/JAM]`) dan durasi ±30–60 menit;
   - selama itu aplikasi tidak bisa dipakai.
2. **Setelah selesai.** Isinya:
   - semua pengguna perlu **login ulang sekali** (kata sandi tetap sama);
   - pengguna **aplikasi desktop** wajib mengunduh dan memasang versi baru dari `https://dentiva.id` (tautan: `[LINK]`);
   - data kini disimpan di server dalam negeri sesuai Permenkes 24/2022.
3. **FAQ singkat**, 5 tanya-jawab. Contoh: "Apakah data saya hilang?", "Kenapa harus login ulang?", "Desktop saya tidak bisa masuk?".

Nada: profesional, hangat, tidak teknis. Kontak bantuan: `[KONTAK]`.

### T3 · Template email login Bahasa Indonesia (HTML)
- Buat template untuk: **confirmation** (daftar akun), **recovery** (reset kata sandi), **invite** (undangan staf), **email_change**, dan **magic_link**.
- Pakai variabel Go template GoTrue: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`.
- Tombol utama mengarah ke `{{ .ConfirmationURL }}`.
- CSS inline dengan lebar maksimal 600px. Tanpa gambar eksternal, tanpa pelacak.
- Tambahkan kalimat "Abaikan email ini jika Anda tidak memintanya".
- Sertakan **subjek** untuk tiap template.
- **Hasil:**
  - jika punya akses repo: `infra/vps/email-templates/<nama>.html` dan `infra/vps/email-templates/README.md` (daftar subjek), di branch `gpt/email-templates`;
  - jika tidak: kirim sebagai blok teks ke pemilik untuk diteruskan ke Claude.

### T4 · Panduan 1 halaman untuk staf klinik: "Memasang Dentiva Desktop versi baru"
- Windows dan macOS: unduh dari `https://dentiva.id`, pasang, lalu login ulang.
- Jelaskan juga apa yang harus dilakukan jika muncul peringatan keamanan Windows SmartScreen atau macOS Gatekeeper. Tanyakan pemilik apakah installer sudah ditandatangani.
- Bahasa awam, dengan langkah bernomor.

### T5 (opsional, jika punya akses repo) · Review independen skrip migrasi
- **Baca saja, jangan ubah:** `infra/vps/bin/*.sh` dan `infra/vps/bin/acl-sidik.sql`. Konteksnya ada di `infra/vps/README.md` dan `docs/migrasi-vps-indonesia.md`.
- **Cari:**
  - bug bash: quoting, `set -e` yang terlewat, stdin yang ikut terbaca;
  - risiko kehilangan data;
  - risiko rahasia tercetak ke layar atau log;
  - asumsi yang rapuh.
- **Laporkan** sebagai daftar: `file:baris — masalah — dampak — saran`, urut dari yang paling berbahaya.

## Format laporan ke pemilik (untuk diteruskan ke Claude)
```
Tugas: T…
Status: selesai / perlu keputusan / terhambat
Hasil: …
Perlu keputusan pemilik: …
Untuk Claude: … (tanpa rahasia)
```

## Yang TIDAK perlu kamu kerjakan (sudah ditangani Claude)
Server VPS, database & migrasi data, edge function, jadwal otomatis (cron), backup terenkripsi, perubahan kode aplikasi dan CSP, build installer desktop, serta pengaturan login di server.
