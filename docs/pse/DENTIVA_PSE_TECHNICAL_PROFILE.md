# Profil Teknis Sistem Elektronik Dentiva

Dokumen ini dikumpulkan dari pemeriksaan langsung pada 24–25 Oktober 2026. Status setiap fakta: **TERVERIFIKASI** (dicek langsung), **DARI DOKUMEN INTERNAL**, atau **PERLU KONFIRMASI**.

## 1. Identitas
| | |
|---|---|
| Nama sistem | Dentiva — Sistem Manajemen Klinik Digital Pintar |
| Penyelenggara | PT DENTIVA TEKNOLOGI NUSANTARA, Banda Aceh, Aceh |
| Situs | https://dentiva.id |
| Model | SaaS berlangganan untuk klinik gigi (rekam medis elektronik, jadwal, kasir, stok, laporan, notifikasi WhatsApp, asisten AI, integrasi SATUSEHAT) |
| Lingkungan | **Produksi** dan pengembangan lokal. **Tidak ada lingkungan staging terpisah** (temuan M7) |

## 2. Arsitektur aktual
```
Pengguna klinik (browser / aplikasi desktop Windows-macOS)
   │  HTTPS
   ├──► dentiva-main.vercel.app ........ tampilan aplikasi klinik (berkas statis, Vercel)
   ├──► dentiva-main-console.vercel.app  console admin platform (berkas statis, Vercel)
   │
   └──► api.dentiva.id (202.74.74.163) ── VPS Ubuntu 24.04 (KVM), PT Biznet Gio Nusantara
          Caddy (TLS Let's Encrypt) → Supabase self-hosted:
            • PostgreSQL 17 (database utama, RLS, enkripsi kolom pgcrypto)
            • GoTrue (autentikasi) • PostgREST (API data) • Realtime
            • Storage (berkas di disk VPS) • Edge Functions (Deno)
            • Supavisor (pooler) • Studio/meta (hanya lokal, akses lewat SSH)
            • dentiva-wa (perangkat WhatsApp tertaut / sidecar)
          Cron: backup harian terenkripsi 01.30 WIB, pemantauan 5 menit, jadwal pg_cron
          │
          ├──► Google Gemini API ........ asisten AI (data operasional, tanpa identitas pasien)
          ├──► Meta WhatsApp Cloud API ... dikonfigurasi, belum dipakai mengirim ke pasien
          ├──► jaringan WhatsApp ........ lewat sidecar (saat ini jalur pengiriman notifikasi pasien)
          ├──► Midtrans .................. pembayaran langganan (mode sandbox)
          └──► SATUSEHAT Kemenkes ........ kode siap, kredensial belum diisi (sandbox)
Situs publik dentiva.id → Vercel (HTML statis, tanpa data pasien)
DNS → Hostinger (apollo.dns-parking.com, athena.dns-parking.com)
```
Browser memanggil `api.dentiva.id` **secara langsung**, jadi data pasien tidak melewati server Vercel. Vercel hanya menyajikan berkas aplikasi dan mencatat log permintaan (IP, user-agent).

## 3. DNS, IP, dan TLS (TERVERIFIKASI, resolver 8.8.8.8, 24 Okt 2026)
| Komponen | Domain | IP / DNS | Penyedia | Lokasi | Bukti |
|---|---|---|---|---|---|
| Situs publik | dentiva.id, www.dentiva.id (308 → dentiva.id) | A 216.198.79.1 | Vercel Inc. (anycast) | Jaringan global; RDAP: blok ARIN | nslookup, header `Server: Vercel` |
| Aplikasi klinik | dentiva-main.vercel.app | A 64.29.17.67 | Vercel | Global | nslookup, header |
| Console | dentiva-main-console.vercel.app | A 64.29.17.131 | Vercel | Global | nslookup |
| API, Auth, Storage, Webhook | api.dentiva.id | A 202.74.74.163 (server asal, tanpa CDN/proxy) | PT Biznet Gio Nusantara (VPS) | Indonesia. RDAP: `GLOBALPORT-ID`, negara ID. Dokumen internal: Biznet Gio NEO Lite, Jawa Barat — **lokasi pusat data PERLU KONFIRMASI** dari akun/kontrak Biznet | nslookup, RDAP APNIC, `infra/vps/README.md` |
| Database | (tidak terbuka ke internet) | sama dengan VPS di atas, port 5432 tidak dibuka | Supabase self-hosted di VPS | idem | `ufw status`: hanya 22, 80, 443 |
| Storage berkas | api.dentiva.id/storage/v1 | 202.74.74.163 | disk VPS | idem | bucket: avatars, downloads (publik); klinik, patient-photos, radiologi (privat) |
| Nameserver | dentiva.id | apollo.dns-parking.com, athena.dns-parking.com | Hostinger | — | nslookup NS |
| Email domain | dentiva.id | **tidak ada MX record** | — | — | nslookup MX (temuan H2) |
| AAAA (IPv6) | semua domain di atas | tidak ada record AAAA | — | — | nslookup |

Lain-lain:
- **TLS:** TLS 1.3 di semua endpoint. Sertifikat dentiva.id dan api.dentiva.id dari Let's Encrypt (berlaku sampai 26 Des 2026 dan 8 Jan 2027, diperpanjang otomatis); \*.vercel.app dari Google Trust Services.
- **HSTS:** aktif di semua endpoint.
- **CSP:** ketat di aplikasi klinik dan console (`frame-ancestors 'none'`).
- **TXT:** `facebook-domain-verification`, `google-site-verification`. Tidak ada SPF karena belum ada email.
- **Subdomain `app.dentiva.id` dan `console.dentiva.id` belum dipakai** (tidak resolve). Aplikasi diakses lewat domain `vercel.app`.

## 4. Lokasi pengelolaan, pemrosesan, dan penyimpanan
| Data | Disimpan di | Diproses di | Catatan |
|---|---|---|---|
| Seluruh database (pasien, rekam medis, akun, pembayaran, audit) | VPS Biznet, Indonesia | VPS Biznet, Indonesia | Sumber kebenaran tunggal |
| Berkas (foto profil, unduhan installer; bucket klinis tersedia) | disk VPS, Indonesia | VPS | per 24 Okt: 1 avatar, 9 installer, 0 berkas klinis |
| Backup harian (terenkripsi age, 14 hari) | **disk VPS yang sama**, Indonesia | VPS | tidak ada salinan di luar server (temuan H3) |
| Pertanyaan asisten AI + data operasional ringkas | jawaban dan pertanyaan dicatat di `ai_usage` (VPS) | **Google (Gemini API), dapat di luar Indonesia** | dirancang tanpa identitas atau rekam medis pasien |
| Pesan WhatsApp ke pasien | log tanpa isi di VPS; sesi perangkat tertaut (riwayat chat) di VPS | jaringan WhatsApp/Meta, **dapat di luar Indonesia** | lihat inventaris data |
| Berkas aplikasi web dan log akses | Vercel | Vercel, global | tidak menyimpan data pasien |
| Pembayaran langganan | Midtrans | Indonesia | mode sandbox per 24 Okt 2026 |
| Data kunjungan ke SATUSEHAT | — | Kemenkes, Indonesia | belum aktif (kredensial kosong) |
| Galat aplikasi (Sentry) | — | dapat di luar Indonesia | aktif hanya bila `VITE_SENTRY_DSN` diisi di Vercel. **Status PERLU KONFIRMASI** |

## 5. Pemantauan, logging, dan cadangan
- **Log server:** log kontainer Docker di VPS. Log fungsi WhatsApp dan AI tidak memuat isi pesan atau nomor.
- **Audit log aplikasi:** tabel `audit_logs` berantai hash (`seq`, `prev_hash`, `row_hash`, hanya tambah) dan `medical_record_versions`.
- **Pemantauan:** `pantau.sh` berjalan tiap 5 menit (kontainer, API, disk, memori, umur backup, sertifikat). **Peringatan belum terkirim** karena `pantau.env` belum dibuat. Belum ada pemantau dari luar server (temuan H4).
- **Backup:** setiap hari 01.30 WIB dengan snapshot konsisten, terenkripsi age, disimpan 14 hari. Backup terakhir yang diperiksa: 24 Okt 2026 01.30 (48 MB, 144 tabel).
- **Gladi pemulihan:** pemulihan dari nol berhasil pada gladi migrasi 11 Okt 2026. Belum ada uji pulih rutin dari berkas backup harian.
