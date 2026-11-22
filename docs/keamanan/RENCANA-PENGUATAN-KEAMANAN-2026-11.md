# Rencana Penguatan Keamanan Dentiva — November 2026

Disusun 22 Nov 2026. Lanjutan dari [AUDIT-KEAMANAN-2026-11-15.md](AUDIT-KEAMANAN-2026-11-15.md).
Acuan: **OWASP Top 10:2025** dan **OWASP ASVS 5.0.0** (rilis 30 Mei 2025), ditambah OWASP API Security Top 10 (2023) untuk fungsi API.

Status: `[ ]` belum · `[~]` sedang dikerjakan · `[x]` selesai · **P1** = dikerjakan lebih dulu.

---

## A. Rencana yang disepakati pemilik

### A1. Batas percobaan login bertingkat (per akun & per IP) — P1 · OWASP A07
Temuan 22 Nov: GoTrue (auth) tidak diberi tahu IP asli pengunjung (`GOTRUE_RATE_LIMIT_HEADER` kosong), jadi semua
pengunjung kemungkinan dihitung sebagai satu IP (proxy). Belum ada penguncian per akun.

- [x] 22 Nov: `GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For` (sebelumnya kosong = batas per IP bawaan GoTrue MATI). Diuji: header
      palsu dari klien diganti Caddy, GoTrue mencatat IP asli.
- [x] 22 Nov: **per akun** lewat hook *password verification attempt* (`20261122130000_kunci_login_bertingkat.sql`):
      5 salah → 1 menit, 10 → 5 menit, 15 → 30 menit, 20 → 24 jam; selama terkunci password benar pun ditolak (pesan sama);
      reset saat login berhasil / 24 jam tanpa gagal / ganti password.
- [ ] Email peringatan ke pemilik akun saat terkunci 24 jam (sementara: peringatan WA ke pemilik Dentiva lewat pantau.sh).
- [x] 22 Nov: **kode MFA** lewat hook *MFA verification attempt*, jeda sama (server sekaligus mengakhiri sesi saat terkunci).
- [x] **Per IP**: batas bawaan GoTrue (login/refresh 150 per 5 menit, verifikasi 30 per 5 menit per IP) + CAPTCHA.
- [ ] (Opsional, ditunda) fail2ban dengan durasi berlipat — butuh log akses Caddy + aturan DOCKER-USER; nilai tambahnya
      kecil setelah CAPTCHA aktif.
- [x] Layar login & kode MFA (klinik + console) menampilkan "Terlalu banyak percobaan masuk. Coba lagi dalam N menit/jam."
- [x] Uji PGlite `npm run db:kunci-login` (9 uji, ikut CI). [ ] Uji manual oleh pemilik (5× salah password).

### A2. CAPTCHA — Cloudflare Turnstile · OWASP A07 / A06
- [x] Pemilik membuat widget Turnstile (22 Nov; mode Managed; hostname dentiva.id, app., console., localhost).
- [x] Widget terpasang di login klinik & console, daftar klinik, lupa password, ganti password (Pengaturan → Keamanan).
      CSP web klinik, console, dan desktop mengizinkan `https://challenges.cloudflare.com`.
- [ ] Rilis desktop baru berisi widget; uji di `tauri.localhost` (tercakup hostname `localhost`).
- [x] 22 Nov: CAPTCHA GoTrue AKTIF (pemilik memilih fokus web dulu; desktop 1.13.0 menyusul). Diuji: login & lupa
      password tanpa token / token palsu ditolak `captcha_failed`. Matikan darurat: `atur-captcha.sh mati`.
- [ ] (catatan awal) pemilik mengisi Secret Key, lalu aktifkan CAPTCHA
      GoTrue (`GOTRUE_SECURITY_CAPTCHA_ENABLED/PROVIDER=turnstile/SECRET`). CAPTCHA GoTrue berlaku untuk SEMUA login,
      jadi desktop versi lama tanpa widget tidak bisa login lagi setelah diaktifkan.
- [ ] Form booking online pasien (fungsi edge `online-booking`, verifikasi token sendiri lewat siteverify).

### A3. Verifikasi dua langkah (MFA) yang tidak melelahkan — OWASP A07 · *menunggu keputusan pemilik*
Usulan (belum diputuskan):
- [ ] Wajib untuk manajer/admin klinik (console sudah wajib). Dokter & resepsionis opsional.
- [ ] "Percayai perangkat ini 30 hari": kode hanya diminta di perangkat baru / sebulan sekali. Penegakan tetap di
      database (`mfa_terpenuhi()` menerima sesi dari perangkat tepercaya yang tercatat). Perangkat bisa dicabut dari
      "Perangkat saya" atau oleh manajer.
- [ ] (Bila satu komputer dipakai bergantian) **ganti pengguna cepat** dengan PIN.
- [ ] (Nanti) sidik jari / Windows Hello (WebAuthn) sebagai pengganti kode 6 digit.

---

## B. Tambahan dari pencocokan OWASP Top 10:2025

Ringkasan kondisi saat ini per kategori, lalu yang belum.

| OWASP 2025 | Sudah ada | Yang belum (masuk rencana) |
|---|---|---|
| A01 Broken Access Control | RLS per klinik di semua tabel, MFA ditegakkan di DB, console khusus operator | B1 |
| A02 Security Misconfiguration | Header keamanan lengkap di web klinik (CSP, HSTS, X-Frame), Studio tidak terbuka, SSH tanpa password, firewall aktif, CORS dibatasi | B2 |
| A03 Software Supply Chain Failures | Lockfile npm, CI | B3 |
| A04 Cryptographic Failures | HTTPS + HSTS, backup terenkripsi `age` | B4 |
| A05 Injection | Kueri berparameter, CSP ketat, nota cetak di-escape | — (pertahankan) |
| A06 Insecure Design | Usulan agen AI perlu persetujuan, webhook bertanda tangan | B5 |
| A07 Authentication Failures | MFA tersedia, password min. 8, reset oleh manajer, daftar perangkat | A1–A3, B6 |
| A08 Software or Data Integrity Failures | Webhook Midtrans & WhatsApp diverifikasi tanda tangan | B7 |
| A09 Security Logging and Alerting Failures | Audit log aksi penting, pemantauan server tiap 5 menit dengan peringatan WA | B8 |
| A10 Mishandling of Exceptional Conditions | Webhook menolak bila rahasia belum diisi (fail-closed) | B9 |

### B1. Akses (A01 / API1)
- [ ] Uji otomatis "klinik A tidak bisa membaca klinik B" juga untuk **fungsi edge** (bukan hanya tabel), terutama fungsi yang memakai service role.

### B2. Konfigurasi (A02)
- [ ] Header `X-Frame-Options`/`frame-ancestors` dan `Referrer-Policy` juga di `api.dentiva.id` (saat ini hanya HSTS & nosniff).
- [ ] Samakan header keamanan di console dan situs dentiva.id dengan web klinik.

### B3. Rantai pasok perangkat lunak (A03) — P1
- [ ] Perbarui paket rentan: `npm audit` (produksi) 22 Nov = 1 tinggi (`vite`), 5 sedang (`esbuild`, `glob`, `minimatch`, `vite-plugin-pwa`, `workbox-build`) — semua ada perbaikannya.
- [ ] Aktifkan Dependabot (pembaruan keamanan otomatis) untuk npm + GitHub Actions.
- [ ] Tambahkan pemindaian di CI: `npm audit --omit=dev --audit-level=high` dan pemindai rahasia (gitleaks).
- [ ] Kunci versi GitHub Actions ke commit SHA.

### B4. Kriptografi (A04)
- [ ] Pastikan rahasia TOTP di `auth.mfa_factors` terenkripsi (opsi enkripsi kolom GoTrue) — cek & aktifkan.
- [ ] **Backup offsite** (temuan tinggi audit 15 Nov, masih terbuka): butuh bucket S3 dari pemilik; skrip `salin-backup-offsite.sh` siap.
- [ ] Uji pemulihan backup terjadwal (mis. sebulan sekali) dan catat hasilnya.

### B5. Desain (A06 / API4 — konsumsi sumber daya)
- [ ] **Midtrans sandbox di Production**: siapa pun bisa mengaktifkan paket berbayar dengan kartu uji. Tutup begitu kunci production Midtrans aktif (ganti `VITE_MIDTRANS_ENV`/`MIDTRANS_ENVIRONMENT`).
- [ ] Batas pemakaian per pengguna/per klinik untuk fungsi yang memakan biaya: Eira AI (`ai-assistant`, kredit Claude), `send-whatsapp`, pendaftaran klinik, booking online.
- [ ] Dokumen model ancaman singkat (aset, pelaku, jalur serangan) untuk fitur baru.

### B6. Autentikasi tambahan (A07)
- [ ] Tolak password yang pernah bocor (pemeriksaan HaveIBeenPwned bawaan GoTrue) — rekomendasi audit 15 Nov.
- [ ] Batas waktu sesi: keluar otomatis bila tidak aktif (mis. 8–12 jam) dan masa sesi maksimum.
- [ ] Email pemberitahuan saat login dari perangkat baru, ganti password, atau MFA dimatikan.

### B7. Integritas (A08)
- [ ] Pastikan installer desktop (Tauri) & pembaruan otomatisnya ditandatangani; catat cara verifikasinya.
- [ ] Script pihak ketiga (Midtrans Snap) hanya dari domain resmi — sudah dibatasi CSP; pertahankan.

### B8. Log & peringatan keamanan (A09) — P1 bersama A1
- [x] 22 Nov: tabel `keamanan.kejadian` (login gagal + IP, akun terkunci, ditolak saat terkunci, MFA gagal/terkunci,
      kunci dibuka). MFA dimatikan & ganti password tercatat di `auth.audit_log_entries` bawaan GoTrue.
- [ ] Peran staf berubah / aksi operator console sensitif → peringatan.
- [x] 22 Nov: `pantau.sh` (tiap 5 menit) memperingatkan lewat WA bila: ≥30 login gagal/10 menit, akun terkunci ≥30 menit,
      MFA dimatikan/dihapus, ≥20 permintaan kena batas per IP/10 menit (dedup 6 jam per jenis).
- [x] `keamanan.kejadian` disimpan 90 hari (pg_cron harian) dan ikut backup database. [ ] Backup offsite (B4).

### B9. Penanganan galat (A10)
- [ ] Fungsi edge jangan mengirim pesan galat mentah ke pengguna (ditemukan ±4 tempat `error.message` di respons); kirim pesan umum + kode, detail hanya di log.
- [ ] Tinjau titik "fail-open": bila layanan pihak ketiga (CAPTCHA, Midtrans, WA) gagal, sistem menolak dengan aman, tidak melewati pemeriksaan.

---

## C. Urutan pengerjaan yang diusulkan

1. **A1 + B8** — batas percobaan login + log/peringatan keamanan (tidak butuh apa pun dari pemilik).
2. **B3** — perbarui paket rentan + Dependabot + pemindaian CI.
3. **B9, B2, B6** — perbaikan kecil (pesan galat, header, password bocor, batas sesi).
4. **A2** — CAPTCHA (setelah pemilik punya akun Cloudflare).
5. **A3** — MFA (setelah pemilik memutuskan kebijakan).
6. **B4, B5** — backup offsite (bucket S3), Midtrans production (kunci production), batas pemakaian AI/WA.

Setiap butir yang selesai: centang di sini, catat commit, dan perbarui laporan audit bila menutup temuan.
