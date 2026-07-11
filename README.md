# NeuroDent — Paket Perbaikan SQL & Bug Fix

## Isi Paket

```
neurodent-bugfix/
├── 1_JALANKAN_PERTAMA_master.sql        ← SQL utama (fresh install)
├── 2_JALANKAN_KEDUA_jadwal_dokter.sql   ← Tambahan jadwal dokter + bugfix RLS
├── 3_OPSIONAL_seed_data.sql             ← Data awal treatment (opsional)
├── src/
│   ├── App.jsx                          ← Bug #5: route /pasien/:id/kunjungan
│   ├── utils/
│   │   └── dateUtils.js                 ← Bug #10: timezone-safe date utils
│   ├── services/
│   │   ├── visitService.js              ← Bug #6: order by jam_kunjungan
│   │   └── doctorScheduleService.js     ← Service jadwal dokter
│   └── components/
│       ├── payment/
│       │   └── PaymentForm.jsx          ← Bug #3: tanggal_pembayaran + visit status
│       ├── schedule/
│       │   ├── SchedulePage.jsx         ← Bug #4: takenSlots sinkron tanggal form
│       │   └── VisitHistory.jsx         ← Bug #11: patientId dari route params
│       └── common/
│           └── Sidebar.jsx              ← Bug #9: icon duplikat diperbaiki
└── README.md
```

---

## Langkah 1 — Jalankan SQL di Supabase

### Fresh Install (DB kosong)
1. Buka **Supabase Dashboard → SQL Editor**
2. Copy-paste isi `1_JALANKAN_PERTAMA_master.sql` → Run
3. Copy-paste isi `2_JALANKAN_KEDUA_jadwal_dokter.sql` → Run
4. _(Opsional)_ Copy-paste `3_OPSIONAL_seed_data.sql` untuk data contoh

### DB Sudah Ada (upgrade dari versi lama)
1. Jalankan `2_JALANKAN_KEDUA_jadwal_dokter.sql` saja
2. Kedua file idempoten — aman dijalankan ulang

### File SQL Lama — Arsipkan / Hapus
File-file ini **tidak perlu dijalankan lagi**:
- ❌ `supabase_schema.sql`
- ❌ `supabase_migration_v1.2.sql` sampai `v1.7.sql`
- ❌ `migrations/part5a1_doctor_schedules.sql` (duplikat)
- ❌ `migrations/part5_final_migration.sql` (digantikan file 2)

---

## Langkah 2 — Replace File Frontend

Copy file-file dari folder `src/` ke dalam proyek Anda (overwrite file lama):

```bash
# Dari root proyek Anda:
cp neurodent-bugfix/src/App.jsx                                  src/
cp neurodent-bugfix/src/utils/dateUtils.js                       src/utils/
cp neurodent-bugfix/src/services/visitService.js                 src/services/
cp neurodent-bugfix/src/services/doctorScheduleService.js        src/services/
cp neurodent-bugfix/src/components/payment/PaymentForm.jsx       src/components/payment/
cp neurodent-bugfix/src/components/schedule/SchedulePage.jsx     src/components/schedule/
cp neurodent-bugfix/src/components/schedule/VisitHistory.jsx     src/components/schedule/
cp neurodent-bugfix/src/components/common/Sidebar.jsx            src/components/common/
```

---

## Daftar Bug yang Diperbaiki

### Bug Database / Supabase

| # | Bug | Dampak | Fix |
|---|-----|--------|-----|
| B1 | RLS `users` memblokir dokter & resepsionis | Dropdown dokter kosong, `getAllDoctors()` selalu error | Tambah policy `users_read_staff_directory` |
| B2 | `generate_no_rm()` race condition (`SELECT MAX`) | Dua pasien bisa dapat No. RM yang sama | Ganti dengan PostgreSQL SEQUENCE (atomic) |
| B3 | `generate_invoice_number()` CAST error | Semua pembayaran baru gagal jika ada data lama | Ganti dengan tabel `invoice_counters` (atomic UPSERT) |
| B4 | `visit_number` race condition di frontend | Dua kunjungan pasien sama bisa nomor sama | Pindahkan logika ke trigger `BEFORE INSERT` di DB |
| B5 | `v_patient_summary` double-counting | `total_spent` pasien tampil 2x–3x lebih besar | Pisahkan subquery visits & payments sebelum JOIN |

### Bug Frontend

| # | Bug | Dampak | File |
|---|-----|--------|------|
| #3 | `PaymentForm`: `tanggal_pembayaran` tidak dikirim | **Semua pembayaran gagal** (kolom NOT NULL di DB) | `PaymentForm.jsx` |
| #3b | `PaymentForm`: visit status tidak diupdate setelah bayar | Kunjungan tetap `scheduled` selamanya | `PaymentForm.jsx` |
| #4 | `SchedulePage`: `takenSlots` tidak sinkron saat tanggal form berubah | Slot terpakai tampil sebagai tersedia | `SchedulePage.jsx` |
| #5 | `App.jsx`: route `/pasien/:id/kunjungan` tidak ada | Tombol "Lihat Semua Kunjungan" → 404 | `App.jsx` |
| #6 | `visitService.getVisitsByDate`: order by kolom yang salah | Urutan antrian kunjungan acak | `visitService.js` |
| #9 | `Sidebar`: icon duplikat `ClipboardList` di resepsionis | Dua menu tidak bisa dibedakan | `Sidebar.jsx` |
| #10 | Timezone-unsafe date parsing di 6 file | Tanggal lahir/kunjungan bisa mundur 1 hari | `dateUtils.js` (utility baru) |
| #11 | `VisitHistory`: `patientId` dari route tidak dibaca | Halaman kunjungan terbuka tanpa filter pasien | `VisitHistory.jsx` |

---

## Catatan

- Semua file SQL **idempoten** — aman dijalankan lebih dari sekali
- `src/utils/dateUtils.js` adalah **file baru** (belum ada di proyek lama), pastikan sudah ada di `src/utils/`
- Bucket storage `patient-photos` dibuat otomatis oleh file SQL 1. Jika error permission, buat manual di Dashboard Supabase → Storage → New Bucket (name: `patient-photos`, Public: ON, Size: 5MB)
