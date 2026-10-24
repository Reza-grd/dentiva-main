# Inventaris Data Pribadi Dentiva

Disusun dari skema database produksi, memakai nama kolom saja tanpa isi data. Diperiksa 24 Okt 2026.
- Database: 67 tabel di skema `public`, ditambah skema auth, storage, dan platform.
- Peran: **klinik adalah pengendali data pasien; Dentiva adalah prosesor**. Untuk data akun dan langganan, Dentiva adalah pengendali. Penetapan peran ini **PERLU KONFIRMASI HUKUM**.
- Jenis data menurut UU PDP: **U** = Data Pribadi umum, **S** = Data Pribadi spesifik (data kesehatan, termasuk data anak).

## Ringkasan per kategori
| # | Kategori | Tabel / kolom (contoh) | U/S | Tujuan | Sumber | Dasar pemrosesan (perlu konfirmasi hukum) | Akses | Pihak ketiga | Retensi | Koreksi / hapus | Pengamanan |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Identitas pasien | `patients`: nama_lengkap, nik, nik_ibu, tanggal_lahir, jenis_kelamin, agama, pendidikan, pekerjaan, status_pernikahan, nama_kk | U (S bila pasien anak) | rekam medis, identifikasi | input staf klinik | instruksi klinik; kewajiban rekam medis klinik | staf klinik sesuai izin `patient.read`; admin non-medis ditolak | SATUSEHAT (bila aktif) | mengikuti retensi rekam medis (Permenkes 24/2022: ≥25 th sejak kunjungan terakhir) | lewat klinik; hapus lunak (`deleted_at`) | nama, NIK, alamat, no WA terenkripsi kolom; **12 pasien lama masih polos (H1)** |
| 2 | Kontak pasien | `patients`: alamat(+detail, wilayah), no_wa, no_telepon, wa_consent | U | layanan, notifikasi | staf klinik | instruksi klinik; persetujuan WA | idem | jaringan WhatsApp/Meta (nomor, isi pesan notifikasi) | idem | idem; persetujuan WA bisa dicabut | idem; `no_telepon` & kolom wilayah tidak terenkripsi |
| 3 | Kesehatan pasien | `visits` (keluhan, diagnosa, kode_icd10, terapi, catatan_dokter), `medical_history` (penyakit penyerta, alergi, obat), `clinical_data`, `intra_oral_data`, `periodontal_data`, `tooth_conditions` (odontogram), `visit_obat`, `informed_consents` (termasuk tanda tangan) | **S** | pelayanan & rekam medis | dokter/staf | instruksi klinik; kewajiban rekam medis | dokter (`is_medical_reader`); admin non-medis ditolak (RLS) | SATUSEHAT (bila aktif) | idem RME | koreksi tercatat di versi & audit; tidak dihapus permanen karena kewajiban retensi | diagnosa/terapi terenkripsi (PGPM); keluhan terenkripsi kecuali **18 kunjungan lama (H1)**; kolom pemeriksaan gigi struktural tidak terenkripsi; tanda tangan persetujuan tidak terenkripsi (M5) |
| 4 | Pembayaran pasien | `payments` (total, metode, status, invoice) | U | kasir & laporan | kasir | instruksi klinik | peran kasir/dokter + izin `finance.read` | penerima struk via WhatsApp | mengikuti kewajiban pajak/administrasi klinik | lewat klinik | RLS per klinik & peran |
| 5 | Akun & staf | `users` (nama, email, telepon, peran, gelar, STR/SIP, NIK, foto), `auth.users` | U | akses & profil tenaga kesehatan | pendaftaran/undangan | perjanjian layanan | staf klinik sendiri (RLS); admin platform | SATUSEHAT (data praktisi, bila aktif) | selama berlangganan + kewajiban hukum | lewat admin klinik / email Dentiva | NIK terenkripsi; kata sandi di-hash GoTrue |
| 6 | Log aktivitas | `audit_logs` (user, peran, modul, aksi, nilai sebelum/sesudah, IP, user-agent) | U (memuat S bila nilai klinis) | keamanan & akuntabilitas | otomatis | kewajiban keamanan / kepentingan sah | admin klinik (RLS), server | — | **belum ditetapkan (M2)** | tidak dapat diubah (berantai hash) | hanya tambah |
| 7 | Notifikasi WhatsApp | `notification_logs` (jenis, status, sidik nomor HMAC, ID pesan), `whatsapp_inbound` (ID, jenis, tindakan — tanpa isi/nomor) | U | pengingat, struk, edukasi | sistem | persetujuan pasien (wa_consent) | admin/dokter/resepsionis klinik; inbound hanya admin | Meta/WhatsApp; sidecar menyimpan riwayat chat di VPS | inbound 90 hari otomatis; log kirim belum ditetapkan | pasien: minta klinik / BERHENTI (nomor resmi) | tanpa isi & nomor di DB |
| 8 | Asisten AI | `ai_usage` (pertanyaan, jawaban, token, biaya), `ai_actions`, `ai_insights` | U (berisiko S bila pengguna mengetik data pasien) | asisten operasional | pengguna | perjanjian layanan | pengguna/admin klinik; server | Google Gemini (pertanyaan + data operasional ringkas; tanpa identitas pasien menurut desain) | **belum ditetapkan (M2)** — 98 baris per 24 Okt | lewat email Dentiva | pengguna diminta tidak mengetik data pasien |
| 9 | Booking online | `booking_requests` (nama, telepon, keluhan, phone_hash) | U/S (keluhan) | permintaan janji temu dari publik | calon pasien | persetujuan/permintaan | staf klinik | — | belum ditetapkan | lewat klinik | nama & telepon tidak terenkripsi (M5) |
| 10 | Pengunjung situs | formulir demo (tidak disimpan; membuka WhatsApp pengunjung) | U | permintaan demo | pengunjung | permintaan sendiri | — | Google Fonts (IP), Vercel (log) | — | — | — |
| 11 | Berkas | storage: avatars (publik), klinik, patient-photos, radiologi (privat) | U/S | foto profil, foto klinis, radiologi | pengguna | instruksi klinik | kebijakan storage per klinik | — | idem RME | lewat klinik | bucket klinis privat |

## Alur data ke luar sistem
| Data | Asal | Tujuan | Penyedia | Lokasi | Kebutuhan | Risiko |
|---|---|---|---|---|---|---|
| Pertanyaan pengguna + ringkasan operasional (pendapatan, stok, jumlah) | Edge Function `ai-assistant` | Gemini API | Google LLC | dapat di luar Indonesia | fitur asisten | transfer lintas negara; pengguna bisa mengetik data pasien; tier API (berbayar/gratis) **PERLU KONFIRMASI** karena tier gratis dapat dipakai Google untuk pengembangan produk |
| Nama pasien, jadwal, dokter, klinik; rincian struk; edukasi pasca-tindakan | Edge Functions WhatsApp | WhatsApp | Meta / jaringan WhatsApp (sidecar) | dapat di luar Indonesia | notifikasi atas persetujuan | kanal sidecar tidak resmi (H5); edukasi menyiratkan tindakan |
| Data kunjungan FHIR (identitas, diagnosis, tindakan, resep, odontogram, OHIS) | Edge Functions SATUSEHAT | SATUSEHAT | Kemenkes | Indonesia | kewajiban RME klinik | belum aktif |
| Data pembayaran langganan klinik | Edge Function Midtrans | Midtrans | PT Midtrans | Indonesia | penagihan | sandbox |
| Log akses web | browser | Vercel | Vercel Inc. | global | hosting | metadata (IP) |
| Galat teknis | browser | Sentry (bila DSN diisi) | Functional Software Inc. | dapat di luar Indonesia | pemantauan | penyaringan PII dikodekan; aktivasi PERLU KONFIRMASI |

## Data yang perlu dibereskan
- **Salinan data lama di skema `backup_20260929`:** 63 tabel, 1,1 MB, berisi salinan 13 pasien dari 29 Sep 2026. Tidak dapat diakses API (tanpa izin anon/authenticated). Usul: dihapus setelah disetujui pemilik, karena backup harian sudah mencakup data aktif (M1).
- **12 pasien dan 18 kunjungan lama yang belum terenkripsi:** skrip `infra/vps/sql/enkripsi-data-lama.sql` sudah siap dan menunggu dijalankan pemilik (H1).
