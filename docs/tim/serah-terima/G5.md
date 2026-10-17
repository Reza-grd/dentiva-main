# Serah Terima G5 — Produk dan harga premium
- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
Positioning, usulan empat paket, onboarding, ROI, copy situs, demo 15 menit dan templat studi kasus.
Status: keluaran dokumentasi siap ditinjau; bukan pernyataan siap produksi.

## Yang berubah / diserahkan (daftar berkas)
- `copy-situs.md`
- `model-harga.json`
- `naskah-demo.md`
- `onboarding-whiteglove.md`
- `paket-harga.md`
- `positioning.md`
- `roi-kalkulator.md`
- `studi-kasus-templat.md`
- `susun.py`

## Cara memverifikasi (perintah + langkah klik)
`python docs/tim/hasil-gpt/G5/susun.py`
Buka dokumen utama paket dan telusuri rujukan ke paket sebelumnya serta bukti.
Jalankan pemeriksaan akhir di hasil-gpt/RINGKASAN-G1-G6.md untuk hasil lint/typecheck/test/build.
Jangan menjalankan skrip migrasi atau operasi server sebagai bagian tinjauan dokumentasi ini.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
Harga, kuota dan contoh biaya dihitung dari satu model; angka ilustrasi diberi label.

## Keputusan desain & alasan
Mengikuti MASTER yang telah diotorisasi pengguna; asumsi dicatat, bukan dijadikan fakta.
Hanya keluaran dokumentasi dan laporan yang diubah. Istilah peran, palet G1,
token G2, dan batas agen dipertahankan konsisten pada paket ini.

## Risiko, batasan, dan hal yang belum selesai
Harga merupakan usulan, bukan konfigurasi billing aktif. Tidak menjanjikan SLA ketersediaan, 24/7, integrasi SATUSEHAT produksi, atau sertifikasi.

## Pertanyaan untuk Ketua
Setujui harga/kuota, biaya dukungan, pajak, kapasitas onboarding dan SLA sebelum penawaran.

## Daftar centang gerbang mutu (1–7)
- [x] 1. Lint/typecheck/build lulus dan 590 tes aplikasi lulus dengan konfigurasi uji sintetis; bukti di ringkasan akhir. Ini tidak membuktikan implementasi spesifikasi.
- [x] 2. Validasi artefak sesuai paket dilakukan; tanpa perubahan perilaku aplikasi.
- [ ] 3. Uji visual aplikasi tidak berlaku bagi dokumen; G1 memiliki bukti aset statis tersendiri.
- [ ] 4. Audit axe/keyboard implementasi belum dilakukan; kebutuhan dicantumkan untuk Antigravity.
- [x] 5. Hanya area dokumentasi, tidak membaca .env/rahasia atau mengubah kontrol keamanan.
- [x] 6. Tidak menambah dependency atau kode ke bundel runtime aplikasi.
- [x] 7. Dokumen, batas klaim, sumber dan langkah verifikasi disediakan.
