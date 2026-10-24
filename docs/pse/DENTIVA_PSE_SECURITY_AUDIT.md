# Audit Keamanan Informasi Dentiva — 24–25 Oktober 2026

**Metode:** pemeriksaan kode, konfigurasi server (hanya nilai yang tidak rahasia), metadata database (tanpa isi data pasien), header HTTP/TLS dari luar, uji otomatis, dan pemindaian dependensi.
- Tidak ada uji agresif atau uji beban terhadap produksi.
- Nilai rahasia tidak dibaca. Yang diperiksa hanya panjang dan bentuknya.

Ini **audit internal**, bukan sertifikasi atau penilaian pihak ketiga.

## A. Kontrol yang sudah ada dan terbukti
| Area | Bukti |
|---|---|
| Isolasi antar-klinik (RLS) | Semua tabel `public` memakai RLS. Ada 264 kebijakan dengan pola `(select get_user_clinic_id())`. Tabel klinis memakai `tenant_isolation` RESTRICTIVE ditambah pembatasan peran/izin. Uji smoke 175 lulus, termasuk isolasi lintas klinik |
| **SEC-01** | **Tertutup.** Satu-satunya kebijakan `true` ada di `users` ("Authenticated can view users"), tetap dibatasi `tenant_isolation` sehingga hanya terlihat staf klinik sendiri |
| Pembatasan akses rekam medis | `medical_dokter_only` / `is_medical_reader()`; admin non-medis ditolak membaca data pasien (`tolak_admin_data_pasien`); pencabutan izin per pengguna (`is_permission_revoked`) |
| Enkripsi kolom | Envelope `pgp_sym_encrypt` per klinik (cipher bawaan pgcrypto, AES-128) untuk identitas pasien, NIK staf, dan isi rekam medis utama; kunci di Vault server |
| Transport | TLS 1.3, HSTS di semua endpoint, CSP ketat dan `frame-ancestors 'none'` di aplikasi |
| Jaringan server | Firewall ufw: hanya 22/80/443. Database, Studio, dan halaman QR WhatsApp hanya bisa diakses lokal atau lewat terowongan SSH |
| Rahasia | Kunci layanan pihak ketiga hanya di `functions.env` (izin 600) di VPS. Tidak ada service role key di frontend. Rahasia diisi pemilik lewat skrip dengan input tersembunyi |
| Autentikasi | GoTrue: konfirmasi email wajib, panjang kata sandi minimal 8, JWT 1 jam, MFA TOTP aktif di server (dipakai **console** admin platform) |
| Audit trail | `audit_logs` berantai hash (hanya tambah) dan `medical_record_versions` |
| Webhook WhatsApp | Verifikasi HMAC-SHA256 `X-Hub-Signature-256` (perbandingan waktu-konstan), token verifikasi, anti-duplikat `wamid`, log tanpa isi pesan. Teruji di produksi |
| Fungsi server | `verify_jwt` aktif kecuali webhook; pemeriksaan peran dan klinik di setiap fungsi pengirim data |
| Kualitas kode | Lint dan typecheck bersih; 595 uji aplikasi, 90 uji Deno, cek tipe 15 fungsi |

## B. Temuan
| ID | Risiko | Temuan | Bukti | Tindakan | Status |
|---|---|---|---|---|---|
| D1 | **CRITICAL** | DOMPurify (pembersih HTML) rentan bypass | `npm audit --omit=dev` | `npm audit fix` (non-breaking), dibarengi uji dan build ulang | **DIPERBAIKI di kode** (commit `2d642e1`). **Tayang setelah push ke main** (Vercel build ulang) |
| D2 | HIGH | zod rentan kehabisan memori pada input besar | idem | idem | DIPERBAIKI di kode, menunggu tayang |
| H1 | HIGH | Data lama tanpa enkripsi: nama, alamat, dan no WA **12 pasien** (dibuat Mei–Juni 2026, sebelum enkripsi), serta keluhan **18 kunjungan** | hitungan agregat per bulan; pasien sejak Juli 2026 terenkripsi 100% | Skrip `infra/vps/sql/enkripsi-data-lama.sql`: satu transaksi, mode uji (ROLLBACK) atau terapkan, verifikasi sesudah, trigger versi dimatikan agar teks polos tidak tersalin | **SIAP, menunggu pemilik** menjalankan uji lalu terapkan |
| H2 | HIGH | Email belum berfungsi. SMTP server masih nilai contoh (`supabase-mail`), jadi konfirmasi pendaftaran, lupa kata sandi, dan undangan staf tidak terkirim. `dentiva.id` juga tidak punya MX, padahal `halo@dentiva.id` adalah kontak privasi resmi | konfigurasi GoTrue; nslookup MX | Pemilik mengaktifkan email Hostinger dan penyedia SMTP. Saya memasang konfigurasi SMTP setelah kredensial ada | TERBUKA |
| H3 | HIGH | Backup hanya di VPS yang sama (tidak ada salinan di luar server). Belum ada uji pulih rutin dari berkas backup | `crontab`, `/opt/dentiva/backup`; `docs/backup-dr.md` | Jadwalkan `salin-backup-offsite.sh` ke penyimpanan lain (keputusan pemilik), lalu gladi pulih bulanan | TERBUKA |
| H4 | HIGH | Peringatan pemantauan tidak aktif (`pantau.env` tidak ada). Belum ada pemantau dari luar server | `ls /opt/dentiva/pantau` | Isi nomor WA peringatan, pasang pemantau eksternal (mis. UptimeRobot) | TERBUKA |
| H5 | HIGH | Jalur notifikasi pasien saat ini memakai sidecar WhatsApp Web (tidak resmi): risiko pemblokiran, riwayat chat tersimpan di VPS | `infra/vps/README.md`, kode `_shared/whatsapp.ts` | Pindah ke WhatsApp Cloud API resmi (webhook, token, nomor sudah siap; menunggu billing, template, dan verifikasi bisnis) | SEBAGIAN |
| M1 | MEDIUM | Skema `backup_20260929` menyimpan salinan 13 pasien. Tidak terbuka ke API, tapi melanggar prinsip minimisasi | metadata hak akses | Hapus setelah disetujui pemilik | TERBUKA |
| M2 | MEDIUM | Belum ada retensi untuk `ai_usage` (pertanyaan dan jawaban AI), `audit_logs`, `notification_logs` | skema | Tetapkan masa simpan, lalu tambah pembersihan terjadwal | TERBUKA |
| M3 | MEDIUM | Pendaftaran publik terbuka dengan batas laju bawaan GoTrue, tanpa CAPTCHA. Aplikasi klinik belum menawarkan MFA ke pengguna klinik | konfigurasi GoTrue; kode aplikasi | Tambah CAPTCHA/batas laju, dan MFA opsional untuk admin/dokter | TERBUKA |
| M4 | MEDIUM | Hosting frontend di Vercel paket Hobby (non-komersial menurut syarat Vercel) | catatan internal deploy | Naik ke Vercel Pro | TERBUKA |
| M5 | MEDIUM | Tanda tangan persetujuan tindakan, serta nama dan telepon di `booking_requests`, tidak terenkripsi | agregat prefiks | Masukkan ke daftar enkripsi kolom | TERBUKA |
| M6 | MEDIUM | `statement_timeout` dan `idle_in_transaction_session_timeout` = 0. Parameter memori Postgres masih bawaan | `pg_settings` (audit 24 Okt) | Penyetelan dengan izin pemilik | TERBUKA |
| M7 | MEDIUM | Tidak ada lingkungan staging; perubahan diuji di uji otomatis/PGlite lalu langsung produksi | inventaris deploy | Siapkan staging untuk uji keamanan dan kelaikan | TERBUKA |
| L1 | LOW | vite/esbuild (hanya server pengembangan, tidak ikut ke produksi) dan quill (XSS pada ekspor HTML, low) | npm audit | Upgrade besar terjadwal | TERBUKA |
| L2 | LOW | Laporan pengeluaran bisa terpotong di atas 1000 baris per permintaan | `financialService.js` | Agregasi di database | TERBUKA |
| L3 | LOW | CORS `*` pada beberapa fungsi pengirim WhatsApp (tetap wajib JWT dan peran) | kode fungsi | Seragamkan ke daftar origin (`corsHelper`) | TERBUKA |

## C. Uji ulang setelah perbaikan
| Uji | Hasil |
|---|---|
| `npm audit --omit=dev` | sebelum: 1 critical, 2 high, 2 moderate, 3 low. Sesudah: 0 critical, 1 high (vite, hanya server pengembangan), 1 moderate, 2 low |
| 595 uji aplikasi, lint, typecheck, build klinik dan console | lulus semua setelah pembaruan dependensi |
| Uji smoke migrasi (isolasi tenant, RLS, WhatsApp, KFA) | 175 lulus |
| Webhook WhatsApp produksi: token salah, tanda tangan salah, event uji Meta | 403, 401, tercatat tanpa isi |

## D. Belum diuji (butuh staging atau izin)
- Uji penetrasi aplikasi web.
- Uji beban.
- Uji pgTAP penuh (`supabase/tests/database`) terhadap salinan produksi.
- Uji pulih dari berkas backup harian.
