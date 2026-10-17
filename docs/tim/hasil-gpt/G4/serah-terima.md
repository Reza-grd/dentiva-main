# Serah Terima G4 — Keamanan dan kepatuhan — draf

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Pemilik: Ketua dan fungsi privasi · Tinjau: tahunan/sebelum pengesahan.

- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
Model ancaman, matriks hukum, 93 kontrol, sembilan kebijakan, DR, pentest, materi vendor dan empat draf hukum.
Status: keluaran dokumentasi siap ditinjau; bukan pernyataan siap produksi.

## Yang berubah / diserahkan (daftar berkas)
- `dr-backup.md`
- `hukum/dpa.md`
- `hukum/kebijakan-privasi.md`
- `hukum/sla.md`
- `hukum/syarat-layanan.md`
- `iso27001-pemetaan.md`
- `iso27001-register.json`
- `kebijakan/kata-sandi-mfa.md`
- `kebijakan/kerentanan.md`
- `kebijakan/kontrol-akses.md`
- `kebijakan/kriptografi-rahasia.md`
- `kebijakan/logging-pemantauan.md`
- `kebijakan/manajemen-perubahan.md`
- `kebijakan/pengembangan-aman.md`
- `kebijakan/retensi-penghapusan.md`
- `kebijakan/vendor-subprosesor.md`
- `kepatuhan-rme-satusehat.md`
- `kepatuhan-uu-pdp.md`
- `kuesioner-vendor.md`
- `model-ancaman.md`
- `peta-jalan-90-hari.md`
- `rencana-pentest.md`
- `respons-insiden.md`
- `sumber-dan-bukti.md`
- `susun.py`
- `whitepaper-keamanan.md`

## Cara memverifikasi (perintah + langkah klik)
`python docs/tim/hasil-gpt/G4/susun.py`
Buka dokumen utama paket dan telusuri rujukan ke paket sebelumnya serta bukti.
Jalankan pemeriksaan akhir di hasil-gpt/RINGKASAN-G1-G6.md untuk hasil lint/typecheck/test/build.
Jangan menjalankan skrip migrasi atau operasi server sebagai bagian tinjauan dokumentasi ini.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
Daftar sumber resmi dan register bukti repo disediakan; seluruh dokumen memakai label DRAF dan metadata pemilik/tinjau.

## Keputusan desain & alasan
Mengikuti MASTER yang telah diotorisasi pengguna; asumsi dicatat, bukan dijadikan fakta.
Hanya keluaran dokumentasi dan laporan yang diubah. Istilah peran, palet G1,
token G2, dan batas agen dipertahankan konsisten pada paket ini.

## Risiko, batasan, dan hal yang belum selesai
Bukan audit atau nasihat hukum final. Kontrol produksi tidak diperiksa langsung. ISO penuh perlu salinan berlisensi; offsite/SMTP dan pemaksaan aal2 klinik belum terbukti tuntas.

## Pertanyaan untuk Ketua
Tetapkan entitas hukum, kontak privasi, DPO, tujuan offsite, dan pemilik insiden; advokat meninjau dasar pemrosesan dan kanal pemberitahuan.

## Daftar centang gerbang mutu (1–7)
- [x] 1. Lint/typecheck/build lulus dan 590 tes aplikasi lulus dengan konfigurasi uji sintetis; bukti di ringkasan akhir. Ini tidak membuktikan implementasi spesifikasi.
- [x] 2. Validasi artefak sesuai paket dilakukan; tanpa perubahan perilaku aplikasi.
- [ ] 3. Uji visual aplikasi tidak berlaku bagi dokumen; G1 memiliki bukti aset statis tersendiri.
- [ ] 4. Audit axe/keyboard implementasi belum dilakukan; kebutuhan dicantumkan untuk Antigravity.
- [x] 5. Hanya area dokumentasi, tidak membaca .env/rahasia atau mengubah kontrol keamanan.
- [x] 6. Tidak menambah dependency atau kode ke bundel runtime aplikasi.
- [x] 7. Dokumen, batas klaim, sumber dan langkah verifikasi disediakan.
