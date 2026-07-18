# Changelog — Dentiva EMR

Dokumen ini mencatat riwayat perubahan dan perbaikan bug historis pada proyek Dentiva.

---

## [1.9.2] — Feature Implementations

### Ditambahkan / Diperbaiki
- **Manajemen Pengguna:** Laman `/admin/pengguna` untuk kelola staf, deactivation akun, dan Deno Edge Function `admin-create-user`.
- **Pencarian Global:** Komponen `<GlobalSearch />` pada TopBar untuk mencari pasien dari mana saja.
- **Pendaftaran Pasien Lama:** Mode "Pasien Lama" di Pendaftaran untuk menjadwalkan ulang pasien secara cepat.
- **Perbaikan UI Backup:** Menghilangkan status kesuksesan hardcoded pada Automatic Backup di Pengaturan.
- **Kapasitas Jadwal Dokter:** Admin dapat mengatur kapasitas pasien harian pada Jadwal Dokter; sistem akan menghitung interval waktu per kunjungan secara dinamis (fallback ke 30 menit jika kapasitas tidak diatur).

---
## [1.9.1] — UI/UX Bug Fixes

### Bug Frontend

| # | Bug | Dampak | File |
|---|-----|--------|------|
| UI1 | Tema default fallback `'dark'` | Pengguna baru selalu mendapat tema gelap di awal | `ThemeContext.jsx` |
| UI2 | Odontogram popup (UnifiedCodePopup) terpotong (clipped) | Popup pada gigi tertentu tidak dapat diklik sebagian karena ancestor `glass-panel` & `overflow-hidden` | `Odontogram.jsx` |
| UI3 | Potensi clipping pada popup `ImageViewer` | `fixed` elemen bisa terpotong jika berada di dalam `glass-panel` yang memiliki `overflow-hidden` | `ImageViewer.jsx` |
| UI4 | Accessibility (A11y) tidak memadai pada tombol icon & gambar | Screen reader tidak membaca deskripsi dengan baik | `Navbar.jsx`, `Sidebar.jsx`, `ToastNotification.jsx`, `ConfirmDialog.jsx`, `PatientAvatar.jsx`, dkk. |

---

## [1.9.0] — 2026-07 (Fasa 4–7)

### Ditambahkan
- **Phase 4 — Medical Record Privacy & Locking:** Role-based access control pada rekam medis (hanya dokter bisa melihat data klinis), mekanisme kunci/buka kunci kunjungan oleh dokter. Migration `31_medical_record_locking.sql`.
- **Phase 5 — Radiology/X-Ray Viewer:** Slider brightness dan contrast pada `ImageViewer.jsx` untuk manipulasi gambar radiologi.
- **Phase 6 — Digital Informed Consent:** Modal tanda tangan digital berbasis HTML5 Canvas, penyimpanan ke tabel `informed_consents`, export PDF otomatis. Migration `32_informed_consents.sql`.
- **Phase 7 — Queue & Waiting Room Display:** Halaman `/queue-display` fullscreen untuk Smart TV ruang tunggu, dengan Supabase Realtime, statistik, dan jam digital.

### Diperbaiki
- Ambiguous join `users` pada query `visits` (PGRST201) — spesifikasi `!dokter_id`.
- `informed_consents` menggunakan referensi ke tabel `clinics` yang tidak ada — dihapus, diganti dengan RLS berbasis `auth.role()`.

### Keamanan
- Hapus file `test_query.js` dan `scratch_test_wa2.js` yang berisi hardcoded Supabase credentials.
- Hapus fallback encryption key default di `scripts/verify_encryption_security.js`.
- Perkuat `.gitignore` dengan pola proteksi untuk file debug/scratch.
- Hapus 8 file debug/script Python dan PowerShell dari root repo.

---

## [1.8.x] — 2026-06 (Fasa 1–3)

### Ditambahkan
- **Phase 1 — Enterprise Security:** Enkripsi data medis server-side via Supabase RPC (`encrypt_batch`/`decrypt_batch`), RLS multi-tenant, audit logging.
- **Phase 2 — ICD-10 & E-Prescription:** Integrasi kode diagnosis ICD-10 dental, modul resep elektronik.
- **Phase 3 — SOAP & Medical Record:** Dokumentasi SOAP lengkap (Subjective, Objective, Assessment, Plan), rekam medis terstruktur.

---

## [1.7.x] — Perbaikan Bug Historis (Awal 2026)

### Bug Database / Supabase

| # | Bug | Dampak | Fix |
|---|-----|--------|-----|
| B1 | RLS `users` memblokir dokter & resepsionis | Dropdown dokter kosong | Tambah policy `users_read_staff_directory` |
| B2 | `generate_no_rm()` race condition (`SELECT MAX`) | Dua pasien bisa dapat No. RM yang sama | Ganti dengan PostgreSQL SEQUENCE (atomic) |
| B3 | `generate_invoice_number()` CAST error | Semua pembayaran baru gagal | Ganti dengan tabel `invoice_counters` (atomic UPSERT) |
| B4 | `visit_number` race condition di frontend | Dua kunjungan bisa nomor sama | Pindahkan ke trigger `BEFORE INSERT` di DB |
| B5 | `v_patient_summary` double-counting | `total_spent` tampil 2–3x lebih besar | Pisahkan subquery visits & payments sebelum JOIN |

### Bug Frontend

| # | Bug | Dampak | File |
|---|-----|--------|------|
| #3 | `PaymentForm`: `tanggal_pembayaran` tidak dikirim | **Semua pembayaran gagal** (kolom NOT NULL) | `PaymentForm.jsx` |
| #3b | `PaymentForm`: visit status tidak diupdate setelah bayar | Kunjungan tetap `scheduled` selamanya | `PaymentForm.jsx` |
| #4 | `SchedulePage`: `takenSlots` tidak sinkron saat tanggal form berubah | Slot terpakai tampil sebagai tersedia | `SchedulePage.jsx` |
| #5 | `App.jsx`: route `/pasien/:id/kunjungan` tidak ada | Tombol "Lihat Semua Kunjungan" → 404 | `App.jsx` |
| #6 | `visitService.getVisitsByDate`: order by kolom yang salah | Urutan antrian kunjungan acak | `visitService.js` |
| #9 | `Sidebar`: icon duplikat `ClipboardList` di resepsionis | Dua menu tidak bisa dibedakan | `Sidebar.jsx` |
| #10 | Timezone-unsafe date parsing di 6 file | Tanggal lahir/kunjungan bisa mundur 1 hari | `dateUtils.js` |
| #11 | `VisitHistory`: `patientId` dari route tidak dibaca | Halaman kunjungan terbuka tanpa filter pasien | `VisitHistory.jsx` |
