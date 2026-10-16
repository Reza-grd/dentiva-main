# Serah Terima G1 — Draf Art Direction Denti HD
- Pembuat: GPT
- Tanggal: 2026-10-17
- Cabang/berkas: docs/tim/hasil-gpt/G1/art-direction.md
- Status: PARSIAL — tinjauan arah desain; G1 belum selesai

## Ringkasan (≤ 5 kalimat)
Diserahkan kritik berbasis temuan teknis Ketua dan usulan arah desain Denti.
Kritik terhadap bentuk aktual belum dilakukan karena sumber maskot belum
dilampirkan. Arah yang diusulkan adalah enamel bersih, siluet kuat, ekspresi
tenang, dan detail yang disesuaikan dengan ukuran tampil.
Belum ada SVG yang diterbitkan atau klaim kompatibilitas rig.

## Yang berubah / diserahkan (daftar berkas)
- art-direction.md
- serah-terima.md — laporan parsial ini

## Cara memverifikasi (perintah + langkah klik)
Tahap ini berupa tinjauan dokumen; belum ada kode atau aset untuk diuji.
1. Tinjau karakter, material, palet calon, dan bahasa gerak.
2. Konfirmasi definisi ukuran widget 58 px: lebar atau tinggi.
3. Cocokkan temuan blur dengan bukti render dari Antigravity.
4. Setelah sumber diterima, periksa kait rig sebelum pembuatan SVG.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
- Sumber konteks: lampiran 00, 01, dan aturan 03 dalam percakapan.
- Perhitungan stroke menggunakan skala seragam viewBox 400×480.
- Belum tersedia tangkapan layar, hasil pengukuran kontras, atau hasil tes.
- Tidak ada perubahan repo maupun produksi.

## Keputusan desain & alasan
- Mengusulkan tiga LOD dengan konstruksi karakter yang sama.
- Menghilangkan filter pada semua LOD untuk mengurangi kompleksitas render.
- Mengusulkan kontur mini 13 unit agar memenuhi 1,5 piksel perangkat
  pada tinggi 58 CSS px, termasuk DPR 1.
- Memisahkan warna dekoratif dari warna informasi agar klaim aksesibilitas
  mengacu pada pasangan penggunaan yang benar.

## Risiko, batasan, dan hal yang belum selesai
- Bentuk lama dan 93 state belum diperiksa.
- Kode rig, pivot, dan ukuran render aktual belum tersedia.
- Palet masih kandidat; belum dinyatakan lolos AA.
- Belum diserahkan lod-aturan.md, palet.json, 18 SVG, ekspresi.md,
  dan catatan-rig.md.
- Efek filter dan scale terhadap blur belum direproduksi.

## Pertanyaan untuk Ketua
1. Apakah arah enamel bersih, teal terkendali, dan ekspresi tenang disetujui?
2. Apakah ukuran 58 px pada widget merupakan lebar atau tinggi?
3. Mohon lampirkan sumber SVG, CSS rig, komponen maskot, dan dokumentasinya.

## Daftar centang gerbang mutu (1–7)
- [ ] 1. Lint, typecheck, tes, build — belum dijalankan; belum ada implementasi.
- [ ] 2. Tes perilaku — menunggu implementasi.
- [ ] 3. Bukti visual — menunggu aset dan render aplikasi.
- [ ] 4. Aksesibilitas — persyaratan ditulis; belum diverifikasi.
- [ ] 5. Keamanan — belum ada diff implementasi untuk diperiksa.
- [ ] 6. Performa — batas desain diusulkan; belum diukur.
- [ ] 7. Dokumentasi — draf arah tersedia; dokumentasi paket belum lengkap.

## Temuan lain
Tidak ada.
