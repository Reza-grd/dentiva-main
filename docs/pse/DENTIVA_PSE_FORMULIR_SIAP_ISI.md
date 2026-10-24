# Jawaban Formulir Pendaftaran PSE Lingkup Privat — Dentiva

Disusun 25 Okt 2026 dari bukti di `docs/pse/`. Status:
- **SIAP**: terverifikasi.
- **BELUM TERVERIFIKASI — JANGAN DIAJUKAN SEBAGAI FAKTA**: perlu dilengkapi dulu.
- **PERLU KEPUTUSAN PEMILIK/HUKUM**.

Dasar pendaftaran yang dirujuk Komdigi dalam pemberitahuan publik 2026 adalah **PM Kominfo No. 5 Tahun 2020**. Status dan isi Permenkomdigi 15/2025 belum dapat dipastikan dari sumber resmi, jadi perlu dicek di JDIH Komdigi.

| # | Pertanyaan Komdigi | Jawaban singkat (untuk kolom formulir) | Sumber / bukti | Status |
|---|---|---|---|---|
| 1 | Nama Sistem Elektronik | Dentiva — Sistem Manajemen Klinik Digital Pintar | — | SIAP |
| 2 | Sektor | Kesehatan | fungsi sistem: rekam medis elektronik klinik gigi | SIAP (pilih padanan terdekat di daftar formulir) |
| 3 | URL | https://dentiva.id | situs aktif, HTTPS | SIAP |
| 4 | DNS | Nameserver: apollo.dns-parking.com, athena.dns-parking.com (Hostinger). dentiva.id dan www → Vercel; api.dentiva.id → server aplikasi | nslookup 24 Okt | SIAP |
| 5 | IP server | 202.74.74.163 (server aplikasi, API, dan database, api.dentiva.id). Situs publik dan tampilan aplikasi dilayani CDN Vercel (dentiva.id = 216.198.79.1) | nslookup, RDAP | SIAP |
| 6 | Model bisnis | Perangkat lunak sebagai layanan (SaaS) berlangganan bagi klinik gigi dan tenaga kesehatan berwenang | — | SIAP. **Catatan: KBLI terdaftar 47901 tidak mencerminkan SaaS (lihat checklist)** |
| 7 | Fungsi aplikasi | Rekam medis elektronik gigi (odontogram, SOAP, ICD-10/ICD-9-CM, resep KFA), jadwal dan antrean, kasir, stok bahan, laporan, notifikasi WhatsApp kepada pasien yang setuju, asisten AI operasional, integrasi SATUSEHAT | kode aplikasi | SIAP |
| 8 | Proses bisnis | Klinik berlangganan → admin klinik membuat akun staf → staf mencatat pasien dan kunjungan → dokter mengisi rekam medis → kasir mencatat pembayaran → sistem mengirim pengingat/struk WhatsApp (atas persetujuan) dan, bila diaktifkan klinik, data kunjungan ke SATUSEHAT | kode aplikasi | SIAP |
| 9 | Jenis Data Pribadi | Umum: identitas, kontak, data akun staf, pembayaran, log aktivitas. Spesifik: data kesehatan (riwayat medis, diagnosis, tindakan, odontogram, periodontal, resep, persetujuan tindakan) dan data anak (pasien anak) | `DENTIVA_PSE_DATA_INVENTORY.md` | SIAP |
| 10 | Lokasi pengelolaan data | Indonesia — dikelola oleh PT DENTIVA TEKNOLOGI NUSANTARA, Banda Aceh | — | SIAP |
| 11 | Lokasi pemrosesan data | Pemrosesan utama di server Indonesia (VPS PT Biznet Gio Nusantara). Pemrosesan pendukung di luar negeri: Google Gemini (asisten AI, tanpa identitas pasien menurut desain), Meta/WhatsApp (pesan notifikasi), Vercel (penyajian aplikasi, log akses), Sentry (galat, bila diaktifkan) | profil teknis §4 | SIAP. **Lokasi pusat data Biznet: BELUM TERVERIFIKASI — JANGAN DIAJUKAN SEBAGAI FAKTA** sampai dikonfirmasi dari kontrak. Status Sentry perlu dicek |
| 12 | Lokasi penyimpanan data | Seluruh database, berkas, dan cadangan disimpan di server di Indonesia (VPS Biznet Gio) | profil teknis §4 | SIAP untuk "Indonesia". Kota/pusat data: **BELUM TERVERIFIKASI** |
| 13 | Mekanisme keamanan | TLS 1.3 + HSTS; firewall (hanya 22/80/443); RLS per klinik dan peran; enkripsi kolom data identitas dan rekam medis; kunci di vault server; MFA admin platform; audit log berantai hash; backup harian terenkripsi; verifikasi tanda tangan webhook | `DENTIVA_PSE_SECURITY_AUDIT.md` | SIAP **setelah H1 diterapkan**. Sebelum itu, jangan menyatakan "seluruh data identitas terenkripsi" |
| 14 | Pelindungan Data Pribadi | Kebijakan Privasi, Syarat Layanan, dan Prosedur Penghapusan Data dipublikasikan (dentiva.id/privacy-policy, /terms-of-service, /data-deletion); persetujuan WhatsApp per pasien; hak subjek data lewat klinik/email; pemberitahuan insiden 3×24 jam | situs, kode `wa_consent` | **BELUM SIAP:** email kontak `halo@dentiva.id` belum bisa menerima surat (H2) |
| 15 | Uji kelaikan sistem | Uji internal: 595 uji aplikasi, 90 uji fungsi server, 175 uji keamanan database, pemindaian dependensi. Bukan sertifikasi pihak ketiga | `DENTIVA_PSE_TEST_REPORT.md` | SIAP sebagai "uji internal". **Kewajiban uji kelaikan formal: PERLU KONFIRMASI KOMDIGI** |
| 16 | Pemberian akses sesuai peraturan | Dentiva bersedia memberikan akses atas Sistem dan Data Elektronik kepada instansi berwenang sesuai peraturan perundang-undangan, melalui prosedur tertulis (verifikasi kewenangan dan dasar hukum, persetujuan direksi, pembatasan cakupan, serah terima aman, jejak audit), tanpa pintu belakang | `DENTIVA_PSE_SOP_PERMINTAAN_AKSES.md` | SIAP (SOP perlu disahkan direksi) |

## Versi panjang untuk dokumen pendukung
Lampirkan atau rujuk dokumen berikut:
- `DENTIVA_PSE_TECHNICAL_PROFILE.md` untuk poin 4, 5, 10–12;
- `DENTIVA_PSE_DATA_INVENTORY.md` untuk poin 9 dan 14;
- `DENTIVA_PSE_SECURITY_AUDIT.md` untuk poin 13;
- `DENTIVA_PSE_TEST_REPORT.md` untuk poin 15;
- `DENTIVA_PSE_SOP_PERMINTAAN_AKSES.md` untuk poin 16.

Hapus catatan status internal (SIAP/BELUM) sebelum dokumen diserahkan.
