# Serah Terima A1d — CPU orbit Denti

- Pembuat laporan pelengkap: GPT · Tanggal: 2026-10-17.
- Implementasi: Antigravity, commit `f2d4647`, sudah diterima Ketua dan digabung ke console.
- Cabang laporan: `antigravity/A1d-serah-terima`; worktree `D:/dentiva/antigravity-A1d-laporan`.

## Ringkasan (≤ 5 kalimat)

A1d menghentikan putaran orbit terus-menerus saat idle dan membatasi putaran pada state aktif.
Komponen menjeda animasi ketika tidak terlihat, tab tersembunyi, atau idle dalam waktu lama.
Ketua menerima pengukuran hero 0,35%, standar 0,32%, mini 0,14%, dan tujuh hero 1,79%.
Pengukuran ulang dengan alat resmi menghasilkan hero 0,32%, standar 0,33%, mini 0,10%, dan tujuh hero 0,96%; keluaran mentah dilampirkan.
Laporan ini melengkapi bukti implementasi yang sudah digabung, tanpa mengubah kode maskot.

## Yang berubah / diserahkan (daftar berkas)

Implementasi yang sudah digabung melalui `f2d4647`:

- `apps/clinic/src/components/mascot/denti.css`: orbit diam saat idle; satu putaran 1,8 detik dengan `steps(24, end)` pada state aktif; aturan jeda.
- `apps/clinic/src/components/mascot/DentiMascot.jsx`: pengamat keterlihatan, visibilitychange, timer idle 20 detik, dan pembersihan listener/observer/timer.
- `apps/clinic/src/test/dentiMascot.test.jsx`: satu uji regresi tambahan yang memeriksa beberapa kondisi orbit dan jeda; bukan tujuh tes tambahan.

Pelengkap pada cabang laporan ini:

- `docs/tim/serah-terima/A1d.md`.
- `docs/tim/serah-terima/A1d/ukur-cpu-mentah.txt`: stdout utuh delapan pengukuran, tidak dibulatkan ulang atau disunting.
- `docs/tim/serah-terima/A1d/ukur-cpu-mentah.json`: argumen perintah, stdout, stderr, kode keluar, lokasi eksekusi, dan waktu ukur.

## Cara memverifikasi (perintah + langkah klik)

Dengan dependency repositori dan Google Chrome tersedia, jalankan dari akar checkout yang memuat alat resmi:

```powershell
node docs/tim/alat/ukur-cpu-denti.mjs 86db5ac hero 220 1
node docs/tim/alat/ukur-cpu-denti.mjs 86db5ac standar 120 1
node docs/tim/alat/ukur-cpu-denti.mjs 86db5ac mini 58 1
node docs/tim/alat/ukur-cpu-denti.mjs 86db5ac hero 220 7
node docs/tim/alat/ukur-cpu-denti.mjs f2d4647 hero 220 1
node docs/tim/alat/ukur-cpu-denti.mjs f2d4647 standar 120 1
node docs/tim/alat/ukur-cpu-denti.mjs f2d4647 mini 58 1
node docs/tim/alat/ukur-cpu-denti.mjs f2d4647 hero 220 7
```

Alat membuat halaman lokal dari sumber maskot pada commit yang dipilih, Chrome DPR 2, pemanasan 1,5 detik dan sampel 5 detik, state idle. Tidak memuat aplikasi atau pasien produksi. Hindari menjalankan tes/browser berat lain bersamaan dengan pengukuran. Jalur eksekusi pengukuran ulang tercatat dalam JSON; dilakukan dari worktree A4c yang dependencynya tersedia, dengan commit maskot dipilih eksplisit.

## Bukti (tangkapan layar / hasil tes / tautan berkas)

[Stdout mentah](A1d/ukur-cpu-mentah.txt) · [Perintah dan hasil lengkap](A1d/ukur-cpu-mentah.json).

| Idle, DPR 2 | A1c `86db5ac` ukur ulang | A1d `f2d4647` ukur ulang | Hasil Ketua | Target |
|---|---|---|---|---|
| Hero 220 px ×1 | 11,21% | 0,32% | 0,35% | ≤1,0% |
| Standar 120 px ×1 | 10,02% | 0,33% | 0,32% | ≤1,0% |
| Mini 58 px ×1 | 0,10% | 0,10% | 0,14% | ≤0,5% |
| Hero 220 px ×7 | 72,20% | 0,96% | 1,79% | ≤3,0% |

Angka adalah proporsi `TaskDuration` main thread, bukan pemakaian CPU seluruh komputer. Variasi antar-run tidak dihapus. Semua pengukuran ulang selesai dengan kode keluar nol.

## Keputusan desain & alasan

Orbit idle tidak terus memperbarui geometri. Gerak singkat pada state aktif mempertahankan ekspresi, sementara jeda otomatis membatasi pekerjaan dekoratif. Ambang yang dipakai adalah target Ketua di atas, bukan toleransi 15% pada laporan terdahulu.

## Risiko, batasan, dan hal yang belum selesai

- Draf A1d yang ditemukan belum di-commit mengklaim Playwright 33/33 dan semua snapshot identik. Hasil tinjauan Ketua adalah 31/33: dua kegagalan dashboard mobile disebabkan sapaan/tanggal yang mengikuti jam. Laporan ini mengikuti hasil Ketua; A4c menutup cacat tes tersebut.
- Gerbang lint dan 552 tes clinic disebut lulus dalam tinjauan Ketua. Pengukuran ulang laporan ini tidak menjalankan kembali seluruh gerbang aplikasi; hasil A4c berikutnya dilaporkan terpisah.
- Alat resmi mengukur SVG+CSS idle; tidak menguji perilaku lifecycle React, seluruh 93 state, atau CPU state aktif. Tidak mengubah alat untuk mengklaim pengujian tersebut.
- Tidak ada deploy, merge, atau perubahan konfigurasi produksi pada pelengkapan laporan ini.

## Pertanyaan untuk Ketua

Tidak ada. Penerimaan A1d dan pencabutan larangan deploy sudah dicatat Ketua; A4c dikerjakan di cabangnya sendiri.

## Daftar centang gerbang mutu (1–7) — centang yang terpenuhi + catatan

- [ ] 1. Pelengkapan laporan tidak mengulang gerbang aplikasi penuh; hasil Ketua dipisahkan dari pengukuran ulang ini.
- [x] 2. Uji regresi orbit sudah termasuk implementasi yang digabung; tidak ada perilaku aplikasi baru dalam cabang laporan.
- [ ] 3. Dua kegagalan visual berbasis waktu pada tinjauan Ketua ditindaklanjuti dalam A4c; tidak diklaim selesai pada laporan A1d.
- [ ] 4. Tidak ada audit aksesibilitas baru pada pelengkapan laporan.
- [x] 5. Halaman ukur lokal tanpa jaringan aplikasi, rahasia, atau data pasien nyata.
- [x] 6. Empat skenario idle memenuhi target, dengan stdout mentah A1c/A1d dilampirkan; tanpa dependency/bundel tambahan.
- [x] 7. Laporan dan bukti mentah disimpan dengan sumber serta batas pengukuran yang jelas.
