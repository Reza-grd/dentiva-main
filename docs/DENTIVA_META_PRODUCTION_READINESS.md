# Kesiapan Produksi Meta & WhatsApp Dentiva — 24 Oktober 2026

**Status akhir: TECHNICALLY IMPLEMENTED — PRODUCTION ACTIVATION PENDING.** Dentiva belum siap produksi untuk WhatsApp Cloud API. Lihat bagian I dan J.

## A. Audit proyek
| Komponen | Kenyataan |
|---|---|
| Situs publik `dentiva.id` | Repo **`Reza-grd/dentiva_website`**: HTML statis di Vercel (`cleanUrls`), tanpa build |
| Aplikasi | Repo **`Reza-grd/dentiva-main`** (monorepo): klinik (React/Vite, Vercel), console, desktop (Tauri) |
| Backend | Supabase **self-hosted** di VPS Biznet Gio (Jawa Barat). Callback `api.dentiva.id` (Caddy) → edge runtime. **Bukan** Supabase Cloud, dan tidak ada project ref `*.supabase.co` |
| Rahasia | `/opt/dentiva/supabase/functions.env` (600), diisi pemilik lewat `isi-rahasia-functions.sh` dan `atur-whatsapp-meta.sh` |
| Email `halo@dentiva.id` | **BLOCKED**: domain `dentiva.id` **tidak punya MX record** (dicek lewat 8.8.8.8 dan 1.1.1.1), jadi email ke alamat ini terpental |

## B. Status konfigurasi Meta
| Item | Status |
|---|---|
| App 2567459477050313, use case WhatsApp | COMPLETED (pemilik) |
| Domain `dentiva.id` diverifikasi (TXT) | COMPLETED (pemilik), tidak diubah |
| Verifikasi bisnis PT Dentiva Teknologi Nusantara | PENDING EXTERNAL ACTION (*In review*) |
| Webhook + field `messages` | COMPLETED & TESTED (lihat D) |
| WABA ID 1454841946751009 | PENDING: perlu dicek di WhatsApp Manager → Account info |
| Nomor +62 823-9610-0960 | BLOCKED: terdaftar di aplikasi WhatsApp lain, OTP dibatasi |
| Nomor +1 711-659-4698 | Registered. **Display name approval belum dicek**, karena Registered tidak sama dengan Approved |
| Billing | PENDING EXTERNAL ACTION (pemilik) |
| App Settings → Basic dan Publish | PENDING: menunggu halaman legal tayang dan email aktif |
| Token System User | NOT STARTED: token dashboard yang terlihat di tangkapan layar dianggap bocor dan tidak dipakai |

## C. Halaman legal
| URL target | Berkas (repo situs, cabang `legal-pages`, commit `1632be4`) | Status |
|---|---|---|
| https://dentiva.id/privacy-policy | `privacy-policy.html` | TESTED lokal, **PENDING APPROVAL** untuk tayang |
| https://dentiva.id/terms-of-service | `terms-of-service.html` | TESTED lokal, **PENDING APPROVAL** |
| https://dentiva.id/data-deletion | `data-deletion.html` | TESTED lokal, **PENDING APPROVAL** |

Perubahan pendukung:
- `legal.css` dan `sitemap.xml`.
- `index.html`: bagian legal lama yang masih berisi isian kosong dibuang, tautan lama dialihkan, identitas PT dan Banda Aceh diisi.
- Klaim "AES-256" dikoreksi. Kode memakai `pgp_sym_encrypt` tanpa opsi cipher, dan bawaannya AES-128.
- `unduh.html` mendapat tautan footer baru.

Isi halaman disusun dari audit praktik data **aktual**:
- server di Indonesia;
- Gemini sebagai satu-satunya kunci AI yang terpasang;
- asisten AI dirancang tanpa identitas atau rekam medis pasien;
- WhatsApp lewat sidecar dan Meta, termasuk retensi pesan masuk 90 hari;
- Midtrans dan SATUSEHAT (sandbox);
- Sentry hanya bila DSN dipasang;
- cadangan harian 14 hari.

Tidak ada klaim sertifikasi, enkripsi end-to-end, atau SLA.

**REQUIRES OWNER/LEGAL REVIEW sebelum tayang:**
1. Kontak resmi: aktifkan email `halo@dentiva.id` (MX di Hostinger) atau tentukan alamat lain.
2. Peran pengendali/prosesor: klinik sebagai pengendali data pasien, Dentiva sebagai prosesor.
3. Retensi rekam medis "paling singkat 25 tahun" (Permenkes 24/2022). Juga masa simpan data akun setelah langganan berakhir, yang ditulis "selama diperlukan untuk kewajiban hukum".
4. Tenggat tanggapan permintaan hak subjek data, yang ditulis "dalam tenggat yang diatur UU PDP". Perlu SLA internal.
5. Batasan tanggung jawab (ToS §13), forum sengketa "pengadilan negeri yang berwenang", dan pembatasan akses saat pembayaran terlambat. Tidak ada harga, refund, atau SLA yang dikarang.
6. Tanggal berlaku (24 Okt 2026) disesuaikan dengan tanggal tayang.
7. Tier Gemini API: pastikan berbayar. Tier gratis dapat memakai prompt untuk pengembangan produk Google.
8. Alamat lengkap dan NIB bila ingin dicantumkan. Saat ini hanya "Banda Aceh, Aceh".

## D. Webhook WhatsApp
`https://api.dentiva.id/functions/v1/whatsapp-webhook`, fungsi yang sudah ada (tidak ada fungsi duplikat), `verify_jwt=false`.

| Pemeriksaan | Hasil |
|---|---|
| HTTPS dan routing ke edge runtime | TESTED (produksi) |
| GET challenge: token benar / salah | TESTED: verifikasi Meta hijau; salah → 403 |
| HMAC `X-Hub-Signature-256` dari raw body, perbandingan waktu-konstan | TESTED: tanda tangan salah/tanpa tanda tangan/isi diubah → 401 |
| Event uji Meta `messages` | TESTED (produksi): tercatat di `whatsapp_inbound` tanpa isi/nomor |
| Duplikat | TESTED: `wamid` unik, kiriman ulang dari Meta tidak dicatat dua kali |
| Status delivered/read/failed | TESTED di PGlite; produksi menunggu pesan nyata |
| Log | hanya jumlah event, tanpa isi pesan, nomor, atau rahasia |
| Event produksi (bukan uji) | **PENDING**: app belum dipublikasikan |

## E. Layanan pengiriman
`supabase/functions/_shared/whatsapp.ts`:
- jalur per jenis pesan (`WA_PROVIDER_<JENIS>`);
- pengingat lewat Meta wajib template;
- struk/edukasi diblokir dari Meta;
- peta kode galat Meta (boleh diulang atau tidak), validasi nomor, Graph v26.0;
- pencegah dobel dengan klaim unik di `notification_logs`;
- consent `wa_consent`;
- otorisasi per peran di fungsi pengirim.

Status: **TESTED** (unit dan smoke). **Pengiriman nyata lewat Meta NOT TESTED**: belum ada token, billing, dan template. Pengingat ke pasien tetap lewat sidecar, dan jalur Meta mati secara default.

Belum diimplementasikan (NOT IMPLEMENTED):
- notifikasi konfirmasi, perubahan, dan pembatalan jadwal (draf template ada di `docs/whatsapp-cloud-api.md`);
- pemrosesan BERHENTI untuk pesan dari **sidecar**, karena sidecar tidak membaca pesan masuk. Halaman legal sudah ditulis sesuai kondisi ini.

## F. Database & keamanan
- Migration `20261024120000_whatsapp_cloud_api` **diterapkan di produksi** (24 Okt 2026) setelah `--uji`:
  - kolom status Meta;
  - trigger anti-pemalsuan;
  - `wa_catat_status` dan `wa_cabut_persetujuan` (hanya service_role, terverifikasi);
  - `whatsapp_inbound` (RLS: admin klinik sendiri).
- **SEC-01: tertutup.**
  - Tabel `patients`, `visits`, `payments`, `clinical_data`, `periodontal_data` memakai `tenant_isolation` RESTRICTIVE, ditambah pembatasan peran dan izin. Admin non-medis ditolak membaca data pasien.
  - Satu-satunya kebijakan `true` ada di `users` ("Authenticated can view users"), tetap dibatasi `tenant_isolation`, jadi hanya bisa membaca staf di klinik sendiri.
- Tidak ada service role key atau token Meta di frontend atau repo.

## G. Berkas yang diubah
- **Repo situs** (`legal-pages`): `privacy-policy.html`, `terms-of-service.html`, `data-deletion.html`, `legal.css` (baru); `index.html`, `unduh.html`, `sitemap.xml`.
- **Repo aplikasi** (`feat/wa-cloud-api`, commit `8c4c691` + laporan ini): lihat `docs/DENTIVA_WHATSAPP_INTEGRATION_REPORT.md`.

## H. Bukti pengujian
| Perintah / uji | Hasil |
|---|---|
| `deno test` (seperti CI) | 81 lulus |
| `scripts/check-edge-functions.sh` | 15/15 ok |
| `npm run db:smoke` | 174 lulus |
| Webhook produksi: GET token salah, event uji Meta | 403; event tercatat |
| Cron setelah deploy (`send-visit-notifications`, 18.50 WIB) | HTTP 200 |
| Situs lokal (`serve`, meniru cleanUrls) | `/privacy-policy`, `/terms-of-service`, `/data-deletion` 200; tautan internal dan jangkar valid; `/#kebijakan-privasi` dialihkan; ponsel 375px tanpa luapan; mode gelap ok; beranda tanpa galat konsol |
| Situs produksi | **NOT TESTED**: belum di-deploy (`/privacy-policy` di produksi masih 404) |

## I. Persyaratan eksternal yang tertunda
1. Verifikasi bisnis Meta.
2. Billing WhatsApp.
3. Nomor pengirim Indonesia dan persetujuan display name.
4. Token System User.
5. Template `pengingat_jadwal` Approved.
6. Publikasi app (butuh URL legal yang tayang).
7. **Email kontak aktif.**
8. Nomor WhatsApp bisnis asli untuk situs. Formulir demo saat ini mengarah ke `6280000000000`, dan footer menampilkan `WhatsApp [nomor]`.

## J. Tindakan pemilik (berurutan)
1. **Hostinger → Email**: aktifkan kotak surat atau penerusan untuk `halo@dentiva.id`. MX ditambahkan otomatis oleh Hostinger. Kirim email uji dari luar.
2. Tinjau poin REQUIRES REVIEW di bagian C, lalu setujui. Merge `legal-pages` → `main` dan push repo `dentiva_website` (Vercel men-deploy otomatis).
3. Pastikan ketiga URL terbuka publik (status 200, tanpa login).
4. **Meta → App settings → Basic**:
   - App domains `dentiva.id`;
   - Privacy policy URL `https://dentiva.id/privacy-policy`;
   - Terms of Service URL `https://dentiva.id/terms-of-service`;
   - User data deletion → *Data deletion instructions URL* `https://dentiva.id/data-deletion`;
   - Contact email (alamat yang aktif);
   - App icon `dentiva-app-icon.png` (1024×1024, dari repo situs);
   - Category: *Business and pages*. Pilih kategori bisnis/produktivitas yang tersedia di daftar Meta.
5. Selesaikan persyaratan *Required actions* dan *Publish* sesuai daftar Meta. Jangan publish sebelum poin 1–4 selesai.
6. Billing, System User dan token (`atur-whatsapp-meta.sh`), lalu template `pengingat_jadwal`. Uji ke nomor staf sebelum `WA_PROVIDER_REMINDER=meta`.

## K. Status kesiapan akhir
| Area | Status |
|---|---|
| Webhook aman dan terverifikasi | TESTED |
| Layanan pengiriman (kode) | TESTED (tanpa kirim nyata) |
| Database dan RLS | COMPLETED & TESTED (produksi) |
| Halaman legal | TESTED lokal, PENDING APPROVAL |
| Email kontak | BLOCKED |
| Meta: verifikasi, billing, publikasi, template, nomor | PENDING EXTERNAL ACTION |
| Pengiriman produksi end-to-end | NOT TESTED |
| Konfirmasi/perubahan/pembatalan jadwal, BERHENTI lewat sidecar | NOT IMPLEMENTED |
