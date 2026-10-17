# Serah Terima G3 — Spesifikasi sepuluh layar
- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
Sepuluh layar dengan bagian 1–9, wireframe desktop/375 px, pola global, dan urutan implementasi.
Status: keluaran dokumentasi siap ditinjau; bukan pernyataan siap produksi.

## Yang berubah / diserahkan (daftar berkas)
- `layar-antrean-tv.md`
- `layar-asisten-ai.md`
- `layar-biaya-stok.md`
- `layar-dashboard-admin.md`
- `layar-jadwal.md`
- `layar-login.md`
- `layar-pasien.md`
- `layar-pembayaran.md`
- `layar-pengaturan-keamanan.md`
- `layar-rekam-medis.md`
- `pola-global.md`
- `susun.py`
- `urutan-implementasi.md`
- `validasi.json`

## Cara memverifikasi (perintah + langkah klik)
`python docs/tim/hasil-gpt/G3/susun.py`
Buka dokumen utama paket dan telusuri rujukan ke paket sebelumnya serta bukti.
Jalankan pemeriksaan akhir di hasil-gpt/RINGKASAN-G1-G6.md untuk hasil lint/typecheck/test/build.
Jangan menjalankan skrip migrasi atau operasi server sebagai bagian tinjauan dokumentasi ini.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
Audit struktur memeriksa 10 layar, 9 bagian per layar, dan rujukan komponen G2.

## Keputusan desain & alasan
Mengikuti MASTER yang telah diotorisasi pengguna; asumsi dicatat, bukan dijadikan fakta.
Hanya keluaran dokumentasi dan laporan yang diubah. Istilah peran, palet G1,
token G2, dan batas agen dipertahankan konsisten pada paket ini.

## Risiko, batasan, dan hal yang belum selesai
MFA klinik, sesi perangkat, command palette dan auto-lock memerlukan implementasi serta server gate. Desain tidak memberi hak akses baru.

## Pertanyaan untuk Ketua
Tetapkan masa idle dan verifikasi ulang; selaraskan izin frontend RME dengan database.

## Daftar centang gerbang mutu (1–7)
- [ ] 1. Hasil gerbang proyek dicatat di ringkasan akhir; tidak membuktikan implementasi spesifikasi.
- [x] 2. Validasi artefak sesuai paket dilakukan; tanpa perubahan perilaku aplikasi.
- [ ] 3. Uji visual aplikasi tidak berlaku bagi dokumen; G1 memiliki bukti aset statis tersendiri.
- [ ] 4. Audit axe/keyboard implementasi belum dilakukan; kebutuhan dicantumkan untuk Antigravity.
- [x] 5. Hanya area dokumentasi, tidak membaca .env/rahasia atau mengubah kontrol keamanan.
- [x] 6. Tidak menambah dependency atau kode ke bundel runtime aplikasi.
- [x] 7. Dokumen, batas klaim, sumber dan langkah verifikasi disediakan.
