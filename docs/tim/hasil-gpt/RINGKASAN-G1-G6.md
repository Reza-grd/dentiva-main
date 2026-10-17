# Ringkasan Serah Terima G1–G6
Tanggal: 17 Oktober 2026 · Pembuat: GPT · Cabang: `gpt/g1-g6-paket`.
Worktree: `D:/dentiva/gpt-g1-g6` · Basis sumber: `36ba347` dari `origin/console` setelah fetch.

Seluruh keluaran diminta telah diserahkan sebagai artefak untuk tinjauan. Ini tidak
menyatakan semua spesifikasi sudah diimplementasikan, lolos gerbang integrasi,
atau disahkan sebagai kebijakan/harga/kontrak produksi. Tidak ada push atau deploy.

## Status dan jumlah berkas
Jumlah mencakup dokumen utama, skrip reproduksi, data validasi dan bukti visual;
tidak termasuk node_modules atau keluaran build aplikasi.

| Paket | Isi utama | Berkas dalam folder | Status |
|---|---|---:|---|
| [G1](G1/serah-terima.md) | 18 SVG, 12 sketsa, art direction, LOD, palet, rig, 8 PNG | 42 | diserahkan; integrasi animasi belum diuji |
| [G2](G2/serah-terima.md) | 125 token, 25 komponen, 58 pasangan kontras, contoh dashboard | 32 | diserahkan; migrasi UI/merek menunggu tinjauan |
| [G3](G3/serah-terima.md) | 10 layar ×9 bagian, desktop/375 px, pola global dan prioritas | 15 | diserahkan; implementasi milik Antigravity/Ketua |
| [G4](G4/serah-terima.md) | STRIDE, 93 kontrol, 9 kebijakan, DR/pentest/vendor, 4 draf hukum | 27 | DRAF; perlu advokat/DPO/auditor dan pengesahan |
| [G5](G5/serah-terima.md) | 7 dokumen produk dan model harga/biaya terhitung | 10 | USULAN; harga/SLA/kapasitas belum disahkan |
| [G6](G6/serah-terima.md) | 150 skenario, 32×5 mikrocopy, hasil harness asli | 25 | selftest150/150; model produksi belum dievaluasi |

Total151 berkas dalam G1–G6 +6 laporan di `docs/tim/serah-terima/` +ringkasan ini
= **158 berkas serahan**. Sebagian berkas G1 menggantikan draf awal yang sudah ada.
Enam commit paket diikuti commit penutup untuk penyempurnaan/verifikasi lintas paket.

## Hasil verifikasi nyata
- `npm run lint`: lulus, exit0. Bukti `G6/bukti/proyek-lint.txt`.
- `npm run typecheck`: lulus, exit0. Bukti `G6/bukti/proyek-typecheck.txt`.
- `npm run build:clinic`: lulus, exit0. Bukti `G6/bukti/proyek-build.txt`; peringatan
  chunk besar masih ada pada baseline. Dokumentasi tidak masuk bundel runtime.
- `npm test`: **590 tes lulus** (clinic545/24 berkas, console9, shared10, API26),
  bukti `G6/bukti/proyek-test-sintetis.txt`. Percobaan pertama tanpa variabel
  Supabase gagal memuat6 suite; disimpan jujur di `proyek-test.txt`.
- Pengulangan tes menggunakan variabel proses sintetis, bukan `.env`: URL
  `http://127.0.0.1:9` dan nilai `dummy-anon-key-for-offline-tests`. Tidak ada
  kredensial produksi yang dibaca. Dependency dipasang dari lockfile secara offline,
  tanpa dependency baru/perubahan package.json atau lockfile.
- `npm run eval:agen:selftest`: baseline45/45. `G6/bukti/baseline-45.json`.
- Harness produksi dengan array baru: **150/150 lulus**, tanpa jaringan/model,
  database sintetis PGlite. `G6/bukti/selftest-150.json`.
- Uji negatif: **119/119** skenario yang memerlukan alat terdeteksi gagal ketika
  panggilan alat sengaja dibuang. 31 skenario tanpa kebutuhan alat masih lolos,
  sesuai desain penilai. `G6/bukti/negative-150.txt`.
- Validasi lintas paket: JSON terurai, 18 SVG +12 sketsa valid XML, 188 kelas rig
  sumber dipertahankan, 93 state terdaftar, namespace/ref SVG diperiksa, stroke
  mini≥13, gradien mini0/standar1/hero3, 58 pasangan G2 dihitung ulang dan lulus.
  `G6/bukti/verifikasi-paket.json`; `python docs/tim/hasil-gpt/G6/verifikasi-paket.py`.
- Adapter namespace diuji untuk dua instans pada seluruh18 aset tanpa benturan
  ID; `G6/bukti-validasi.json`. Pemeriksaan cakupan diff menemukan0 perubahan di
  luar area dokumentasi yang diizinkan; pencarian pola kunci privat/API menemukan0
  kecocokan pada artefak teks (pemeriksaan pola terbatas, bukan jaminan universal).
- Delapan render Chrome: terang/gelap ×375/1440 px ×DPR1/2, tidak overflow;
  `G1/bukti/render.json`. Ini galeri aset statis, bukan screenshot aplikasi yang
  sudah memakai aset baru. Perbandingan A1 dipakai sebagai bukti historis.

## Lima hal terpenting untuk Ketua
1. **Aset Denti mempertahankan robot dan rig.** SVG adalah snapshot mandiri dengan
   CSS yang menghentikan animasi; Antigravity mengambil defs/rig, menerapkan
   perubahan material secara selektif, lalu menguji93×3 state. Jangan menyalin
   CSS snapshot ke produksi. Namespace setiap instans tetap melalui helper `g()`.
2. **Keamanan punya gap operasional nyata.** TOTP/HIBP tersedia menurut kode/laporan,
   tetapi AAL2 klinik belum tuntas. Offsite/SMTP/monitor luar host dan pemulihan
   terukur perlu prioritas; backup lokal hilang bersama VPS tidak punya RPO pasti.
3. **G4 belum menjadi kepatuhan atau sertifikasi.** Semua berlabel DRAF, register
   ISO awal perlu naskah berlisensi dan auditor. Audit berantai tanpa jangkar
   independen tidak kebal superuser. Kanal pemberitahuan regulator perlu advokat.
4. **Harga dan SLA adalah usulan.** Starter/Group, batas akun/storage dan kuota grup
   belum dipasang. Angka biaya internal bukan harga vendor yang diverifikasi kini;
   ROI memisahkan kapasitas dari kas dan dapat negatif.
5. **Selftest bukan akurasi model.**150 skenario terbukti konsisten dengan alat/DB
   sintetis; Ketua tetap menjalankan eval penyedia setelah kredensial/biaya siap.

## Asumsi dan keputusan yang perlu disahkan
- ASUMSI ruang kerja baru dan snapshot sumber36ba347 menjadi acuan; tidak menyalin
  pekerjaan Antigravity yang masih di worktree/cabang lain atau mengklaim live main.
- MASTER terbaru menggantikan tahapan “tunggu lanjut” prompt lama; otorisasi pengguna
  dalam chat mencakup pembuatan seluruh paket, worktree, penulisan dan commit lokal.
- Kontur mini13 unit berlaku minimum lebar58 yang diuji; ukuran lebih kecil dan
  aksesori berskala membutuhkan verifikasi tersendiri. Rig lengkap tidak sama
  dengan ekspresi/gerak93 state sudah lulus.
- Migrasi warna violet→teal dan font Source Serif4 adalah rekomendasi G2, bukan
  keputusan mengubah kode. Font/lisensi dan format DTCG dirujuk ke sumber primer.
- Idle lock5 menit, peringatan30 detik, metrik tugas G3, usahaS/M/L dan target triase
  kerentanan adalah usulan internal; bukan tenggat hukum atau SLA aktif.
- Pemetaan klinik sebagai pengendali RME dan Dentiva prosesor adalah asumsi per
  tujuan yang perlu analisis advokat; akun/billing dan SATUSEHAT dapat berbeda peran.
- Status produksi berasal dari laporan Ketua yang diberi tanggal, bukan audit
  runtime baru. Konfigurasi HIBP gagal-terbuka dicatat, bukan klaim menolak semua
  sandi bocor pada semua keadaan.
- Target DR3–6 jam perkiraan, WAL15 menit/2 jam rencana. Offsite dan latihan baru
  diperlukan sebelum angka menjadi komitmen kontrak.
- Harga bulanan usulan1,49/2,99/6,49/14,9 juta; tahunan10×bulanan; pajak belum
  termasuk. Alokasi biaya tetap,1450 per unit kuota, kapasitas pengguna/storage,
  setup dan add-on merupakan asumsi model, bukan nilai DB/invoice aktual.
- Sapaan memakai zona klinik dan batas waktu usulan di G6/panduan-integrasi.md;
  tidak menganggap sapaan “malam” sebagai bukti klinik sedang tutup.

## Pertanyaan untuk Ketua (dikumpulkan)
| Paket | Keputusan yang dibutuhkan |
|---|---|
| G1 | Pilih material teal untuk integrasi A1b; tetapkan pemilik regresi93×3 dan ukuran<58. |
| G2 | Setujui migrasi aksen serentak dan jadwal self-host font; pertahankan legacy selama transisi. |
| G3 | Tetapkan idle/reautentikasi; selaraskan affordance RME frontend yang masih menyebut admin dengan kebijakan DB. |
| G4 | Isi entitas hukum/kontak privasi/DPO/pengganti insiden; pilih offsite; tinjau dasar/transfer/retensi dan kanal regulator. |
| G5 | Sahkan harga, kuota dan definisi unit, pajak, alokasi dukungan, setup dan SLA setelah kesiapan. |
| G6 | Integrasikan array pada cabang Ketua, jalankan eval penyedia dan bandingkan baseline per kelompok. |

## Urutan tinjauan yang disarankan
1. G4 sumber-dan-bukti + DR + respons insiden: tutup risiko operasi paling mendesak.
2. G1 galeri/rig/LOD: pilih arah visual sebelum Antigravity mencangkok aset.
3. G2 token dan komponen, lalu G3 login/MFA, kasir, RME dan kartu agen.
4. G6 matriks/hasil selftest, kemudian evaluasi penyedia oleh Ketua.
5. G5 harga/copy/onboarding setelah G4 dan kapasitas dukungan dapat dipenuhi.

## Batas gerbang mutu
Gerbang lint/typecheck/test/build lulus pada kode acuan dalam worktree ini.
Pemeriksaan aset/dokumen lulus sesuai bukti. Axe, keyboard, animasi93×3, metrik
performa aset saat integrasi, audit hukum dan penerimaan produksi belum dilakukan;
laporan paket mempertahankan kotak yang belum terpenuhi. Tidak ada status papan
tugas yang diubah atau pesan dikirim ke chat/anggota lain atas nama pengguna.
