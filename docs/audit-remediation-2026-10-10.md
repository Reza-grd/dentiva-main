# Perbaikan audit Dentiva — 10 Oktober 2026

Rujukan: [audit awal](audit-2026-10-10.md). Perubahan kode dan lima migrasi baru menangani F01–F12 serta C01–C03.

| Temuan | Perbaikan |
|---|---|
| F01 | Klinik dan klasifikasi medis berada di dalam payload pgcrypto yang diautentikasi. Mengganti prefix ditolak; ciphertext klinik lain ditolak. Ciphertext lama dikonversi di dalam database, termasuk JSON versi/audit. |
| F02 | Policy Storage restrictive dokter untuk bucket radiologi. |
| F03 | Semua FK yang menunjuk tabel ber-klinik divalidasi pada INSERT dan UPDATE, termasuk clinic_id eksplisit dan ID obat warisan. |
| F04 | Queue global hanya untuk service role. Tombol manual admin/dokter aktif tetap bekerja pada kliniknya sendiri; ID target dalam payload juga diverifikasi terhadap klinik baris antrean. |
| F05 | Edge SATUSEHAT dan WhatsApp memeriksa status akun, status klinik, peran, serta kecocokan klaim tenant. |
| F06 | Baris Markdown berpipa tanpa divider dikonsumsi sebagai paragraf, sehingga renderer tidak berputar tanpa akhir. |
| F07 | Hanya jawaban panduan statis dengan provenance deterministik dikategorikan panduan. Jawaban data selalu dihitung ulang; panduan lama tanpa provenance ditandai data. |
| F08 | RPC kasir atomik meliputi detail, pembayaran, status selesai dan snapshot biaya. Detail yang sama mempertahankan ID dan catatan klinis; tindakan selesai tidak boleh diganti. |
| F09 | Nol tidak menjadi default total; pembayaran lunas dan sebagian divalidasi pada UI/RPC/trigger database. |
| F10 | Reservasi sebelum panggilan model menggunakan advisory lock per klinik, menghitung slot berlangsung, membatasi permintaan, dan menahan pembuatan brief bersamaan. Pencatatan gagal tidak menghasilkan respons sukses. |
| F11 | Baseline skema lengkap tanpa data, job pgTAP wajib, serta unit test Deno di CI. |
| F12 | Trigger menolak perubahan SOAP/detail terkunci, tanggal/dokter, serta penghapusan langsung maupun soft-delete. Membuka kunci wajib dokter dan alasan; metadata kunci ditentukan server. |
| C01 | Dua constraint pembayaran disatukan untuk mendukung partial. |
| C02 | Webhook memverifikasi status langsung melalui GET Midtrans sebelum settlement; status notifikasi tidak dipercaya. |
| C03 | Costing memakai tier/overhead/BOM klinik sendiri, menghitung quantity, mengunci stok, dan idempoten. Pembelian mengunci material sebelum menghitung stok/rata-rata biaya. |

Kolom nama pasien dan kode ICD diperlebar agar envelope terenkripsi baru muat. RPC layar antrean tetap menggunakan token untuk mengakses inisial terenkripsi, termasuk pembaruan maskot yang dikerjakan terpisah.

## Validasi sebelum deployment

- Lint, typecheck, build clinic dan console lulus.
- Unit test npm: 121 lulus; Deno: 19 lulus; pemeriksaan tipe tujuh Edge Functions lulus.
- Smoke migrasi: 147 lulus.
- Seluruh migrasi dan uji `supabase/tests/audit/regression.sql` lulus pada PostgreSQL terkait dengan pgcrypto asli dalam **transaksi ROLLBACK**. Cakupan: prefix palsu, tenant ciphertext, FK lintas klinik, radiologi admin, SOAP terkunci, kasir partial/lunas/nol, ID detail, quantity biaya/stok, snapshot idempoten, provenance cache, reservasi slot kuota terakhir, dan brief bersamaan.
- Docker tidak tersedia di komputer ini. Suite pgTAP penuh dijalankan di CI dengan database kosong dan lulus (47 pemeriksaan); seluruh regresi pgcrypto dan job web/Edge Functions juga lulus. Probe ACL efektif menggantikan dua pemanggilan fungsi terlarang di dalam exception handler yang memicu segmentation fault pada image PostgreSQL lokal. Izin fungsi tetap ditolak untuk pengguna klinik.

Reproduksi historis `supabase/tests/audit/audit-2026-10-10.mjs` dibatasi pada migrasi sebelum perbaikan. Gunakan `regression.sql` untuk memeriksa perilaku setelah perbaikan.

## Deployment

- Kode dikirim ke GitHub branch `console`; commit perbaikan terakhir `4d5b13e`.
- [Seluruh CI lulus](https://github.com/Reza-grd/dentiva-main/actions/runs/38052331385): web, Edge Functions, dan database/pgTAP.
- Lima migrasi diterapkan ke proyek Supabase `ggwratzhpukgsiduqely`; metadata migrasi dan policy/ACL diverifikasi kembali.
- Tujuh Edge Functions aktif setelah deployment: `ai-assistant`, `midtrans-webhook`, `satusehat-sync`, `satusehat-sync-visit`, `satusehat-outbox-processor`, `satusehat-healthcheck`, dan `send-whatsapp`. Worker manual tetap memakai klinik pemanggil aktif; worker service dapat memproses queue global.
- Tipe TypeScript database disinkronkan dan typecheck lulus.
- Regresi PostgreSQL setelah deployment lulus. Seluruh data sintetis di-ROLLBACK; pemeriksaan akhir memastikan tidak ada klinik fixture tertinggal.
- Perubahan frontend tersedia di `console`; penggabungan ke `main` dan publikasi frontend tidak dilakukan dalam tugas ini. Backend/database sudah diperbarui.
