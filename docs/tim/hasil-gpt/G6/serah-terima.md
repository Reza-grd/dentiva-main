# Serah Terima G6 — Skenario agen dan mikrocopy
- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
150 skenario mencakup bahasa, ambigu, multi-langkah, keselamatan dan analitik; mikrocopy JSON/Markdown.
Status: keluaran dokumentasi siap ditinjau; bukan pernyataan siap produksi.

## Yang berubah / diserahkan (daftar berkas)
- `bukti/baseline-45.json`
- `bukti/baseline-45.txt`
- `bukti/diff-check.txt`
- `bukti/harness.mjs`
- `bukti/negative-150.json`
- `bukti/negative-150.txt`
- `bukti/proyek-build.txt`
- `bukti/proyek-lint.txt`
- `bukti/proyek-test-sintetis.txt`
- `bukti/proyek-test.txt`
- `bukti/proyek-typecheck.txt`
- `bukti/scenarios.mjs`
- `bukti/selftest-150.json`
- `bukti/selftest-150.txt`
- `bukti/verifikasi-paket.json`
- `bukti-validasi.json`
- `komposisi.json`
- `mikrocopy.json`
- `mikrocopy.md`
- `panduan-integrasi.md`
- `skenario.js`
- `susun.mjs`
- `verifikasi-paket.py`
- `verifikasi.mjs`

## Cara memverifikasi (perintah + langkah klik)
`node docs/tim/hasil-gpt/G6/verifikasi.mjs`
Buka dokumen utama paket dan telusuri rujukan ke paket sebelumnya serta bukti.
Jalankan pemeriksaan akhir di hasil-gpt/RINGKASAN-G1-G6.md untuk hasil lint/typecheck/test/build.
Jangan menjalankan skrip migrasi atau operasi server sebagai bagian tinjauan dokumentasi ini.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
Lihat bukti-validasi.json dan hasil selftest artefak; pengujian skrip tanpa model dibedakan dari evaluasi penyedia sungguhan.

## Keputusan desain & alasan
Mengikuti MASTER yang telah diotorisasi pengguna; asumsi dicatat, bukan dijadikan fakta.
Hanya keluaran dokumentasi dan laporan yang diubah. Istilah peran, palet G1,
token G2, dan batas agen dipertahankan konsisten pada paket ini.

## Risiko, batasan, dan hal yang belum selesai
Selftest membuktikan skema, alat dan oracle pada fixture, bukan kemampuan model produksi. Tidak ada panggilan model atau rahasia.

## Pertanyaan untuk Ketua
Ketua menjalankan eval penyedia setelah integrasi skenario dan membandingkan baseline per kelompok.

## Daftar centang gerbang mutu (1–7)
- [ ] 1. Hasil gerbang proyek dicatat di ringkasan akhir; tidak membuktikan implementasi spesifikasi.
- [x] 2. Validasi artefak sesuai paket dilakukan; tanpa perubahan perilaku aplikasi.
- [ ] 3. Uji visual aplikasi tidak berlaku bagi dokumen; G1 memiliki bukti aset statis tersendiri.
- [ ] 4. Audit axe/keyboard implementasi belum dilakukan; kebutuhan dicantumkan untuk Antigravity.
- [x] 5. Hanya area dokumentasi, tidak membaca .env/rahasia atau mengubah kontrol keamanan.
- [x] 6. Tidak menambah dependency atau kode ke bundel runtime aplikasi.
- [x] 7. Dokumen, batas klaim, sumber dan langkah verifikasi disediakan.
