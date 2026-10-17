# Serah Terima G1 — Robot Porselen Denti HD
- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
Diserahkan 18 SVG mandiri, arah desain berbasis nomor baris, aturan LOD A1, palet terukur,
inventaris rig/pivot/93 state, serta 12 sketsa ekspresi tambahan.
Mini tanpa gradien/filter dan seluruh stroke atribut minimal 13 unit.
Seluruh kelas rig sumber dipertahankan; kompatibilitas animasi 93 state belum diklaim.
Status: hasil desain siap ditinjau, belum merupakan implementasi rilis.

## Yang berubah / diserahkan (daftar berkas)
Seluruh `docs/tim/hasil-gpt/G1/`: art-direction.md, lod-aturan.md, palet.json,
catatan-rig.md, ekspresi.md, svg/{idle,happy,talk,think,wave,sorry}.{mini,standar,hero}.svg,
skrip reproduksi/namespace, serta bukti JSON, HTML, dan delapan PNG.

## Cara memverifikasi (perintah + langkah klik)
1. `node docs/tim/hasil-gpt/G1/siapkan-sumber.mjs`
2. `python docs/tim/hasil-gpt/G1/buat-aset.py`
3. `python docs/tim/hasil-gpt/G1/susun-dokumen.py`
4. `node docs/tim/hasil-gpt/G1/render.mjs` (Playwright dan Chrome tersedia di mesin ini;
   lokasi pustaka dapat diatur melalui DENTIVA_NODE_DEPS; tidak ada dependency repo baru).
5. Buka bukti/pratinjau-light.html dan pratinjau-dark.html; bandingkan wajah dan pose.
6. Periksa bukti/validasi-struktur.json, palet.json, dan bukti/render.json.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
- XML: 18/18 diurai dengan ElementTree; referensi id lokal terhubung; seluruh kelas sumber ada.
- Palet: rumus luminans WCAG dalam buat-aset.py, enam pasangan penggunaan diuji.
- Render Chrome: 18 SVG × 8 konfigurasi 375/1440 px, terang/gelap, DPR 1/2; tanpa overflow.
- Tinjauan visual manual atas galeri terang desktop dan gelap ponsel; pose wave/think
  diperbaiki setelah ditemukan konflik spesifisitas CSS pada pratinjau pertama.
- Bukti A1 ditinjau sebagai sumber historis; angka CPU A1 tidak diuji ulang.

## Keputusan desain & alasan
Robot dipertahankan sesuai keputusan pengguna. MASTER terbaru mengotorisasi pembuatan
seluruh paket tanpa persetujuan antarbagian; tahapan tunggu pada prompt lama digantikan.
Gradien 0/1/3 dan kontur 13/7/4 memberi perbedaan LOD yang jelas.
Rig tersembunyi tetap ada; mini mengurangi kerumitan tampilan, bukan seluruh DOM.

## Risiko, batasan, dan hal yang belum selesai
SVG adalah snapshot pose dengan CSS internal yang menghentikan animasi. Antigravity
harus mengambil defs/rig dan menyelaraskan aturan material dengan CSS produksi;
jangan menyalin CSS snapshot yang menonaktifkan animasi ke aplikasi.
ID ekspor harus diberi namespace per instans melalui g(); contoh adapter disediakan.
Belum ada pengujian gerak 93×3, axe aplikasi, atau pengukuran bundel runtime aset baru.
Ukuran di bawah 58 px belum tervalidasi. Pemakaian aksesori yang berskala pada state
lain memerlukan pengukuran garis efektif tersendiri.

## Pertanyaan untuk Ketua
- Apakah material teal baru dipilih untuk integrasi A1b setelah perbandingan langsung?
- Siapa yang menyetujui matriks regresi 93×3 dan batas ukuran di bawah 58 px?

## Daftar centang gerbang mutu (1–7)
- [ ] 1. Gerbang aplikasi penuh: dicatat pada ringkasan akhir lint/typecheck/test/build; bukan bukti integrasi SVG.
- [x] 2. Pemeriksaan aset baru: parse XML, namespace referensi, inventaris kelas, stroke, gradien.
- [x] 3. Bukti visual statis 375/1440, terang/gelap, DPR 1/2. Gerak masih tugas integrasi.
- [ ] 4. Aksesibilitas aplikasi/keyboard/axe belum diuji; title, role, reduced motion tersedia pada aset.
- [x] 5. Hanya dokumentasi/aset sumber tepercaya; tanpa skrip SVG/image/rahasia/dependency baru.
- [ ] 6. Performa runtime belum diukur; CSS snapshot tidak dihitung sebagai bundel aplikasi.
- [x] 7. Spesifikasi dan batas klaim didokumentasikan.

## Temuan lain
Dokumentasi A1 menyebut beberapa ukuran CSS sebagai piksel fisik; laporan ini memakai
rumus eksplisit CSS px × DPR. Snapshot sumber memiliki 93 state terdaftar, bukan bukti
bahwa seluruh gerak state otomatis lolos setelah perubahan aset.
