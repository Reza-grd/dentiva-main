from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[4];code=sys.argv[1];P=ROOT/'docs/tim/hasil-gpt'/code
summary={
'G2':('Sistem desain premium','Token DTCG dua tema, 25 komponen, contoh dashboard, dan 58 pasangan kontras hasil skrip.','python docs/tim/hasil-gpt/G2/susun.py','tokens.json dan kontras.json diurai; 58 pasangan penggunaan lulus ambang yang ditentukan.','Migrasi violet ke teal perlu persetujuan merek; font baru belum dipasang. Tidak ada implementasi atau klaim axe aplikasi.','Setujui migrasi aksen teal secara serentak; tentukan jadwal self-host font.'),
'G3':('Spesifikasi sepuluh layar','Sepuluh layar dengan bagian 1–9, wireframe desktop/375 px, pola global, dan urutan implementasi.','python docs/tim/hasil-gpt/G3/susun.py','Audit struktur memeriksa 10 layar, 9 bagian per layar, dan rujukan komponen G2.','MFA klinik, sesi perangkat, command palette dan auto-lock memerlukan implementasi serta server gate. Desain tidak memberi hak akses baru.','Tetapkan masa idle dan verifikasi ulang; selaraskan izin frontend RME dengan database.'),
'G4':('Keamanan dan kepatuhan — draf','Model ancaman, matriks hukum, 93 kontrol, sembilan kebijakan, DR, pentest, materi vendor dan empat draf hukum.','python docs/tim/hasil-gpt/G4/susun.py','Daftar sumber resmi dan register bukti repo disediakan; seluruh dokumen memakai label DRAF dan metadata pemilik/tinjau.','Bukan audit atau nasihat hukum final. Kontrol produksi tidak diperiksa langsung. ISO penuh perlu salinan berlisensi; offsite/SMTP dan pemaksaan aal2 klinik belum terbukti tuntas.','Tetapkan entitas hukum, kontak privasi, DPO, tujuan offsite, dan pemilik insiden; advokat meninjau dasar pemrosesan dan kanal pemberitahuan.'),
'G5':('Produk dan harga premium','Positioning, usulan empat paket, onboarding, ROI, copy situs, demo 15 menit dan templat studi kasus.','python docs/tim/hasil-gpt/G5/susun.py','Harga, kuota dan contoh biaya dihitung dari satu model; angka ilustrasi diberi label.','Harga merupakan usulan, bukan konfigurasi billing aktif. Tidak menjanjikan SLA ketersediaan, 24/7, integrasi SATUSEHAT produksi, atau sertifikasi.','Setujui harga/kuota, biaya dukungan, pajak, kapasitas onboarding dan SLA sebelum penawaran.'),
'G6':('Skenario agen dan mikrocopy','150 skenario mencakup bahasa, ambigu, multi-langkah, keselamatan dan analitik; mikrocopy JSON/Markdown.','node docs/tim/hasil-gpt/G6/verifikasi.mjs','Lihat bukti-validasi.json dan hasil selftest artefak; pengujian skrip tanpa model dibedakan dari evaluasi penyedia sungguhan.','Selftest membuktikan skema, alat dan oracle pada fixture, bukan kemampuan model produksi. Tidak ada panggilan model atau rahasia.','Ketua menjalankan eval penyedia setelah integrasi skenario dan membandingkan baseline per kelompok.')}
title,desc,cmd,proof,risks,questions=summary[code]
files='\n'.join('- `'+str(f.relative_to(P)).replace('\\','/')+'`' for f in sorted(P.rglob('*')) if f.is_file() and f.name!='serah-terima.md' and '__pycache__' not in f.parts)
text=f'''# Serah Terima {code} — {title}
- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: gpt/g1-g6-paket

## Ringkasan (≤ 5 kalimat)
{desc}
Status: keluaran dokumentasi siap ditinjau; bukan pernyataan siap produksi.

## Yang berubah / diserahkan (daftar berkas)
{files}

## Cara memverifikasi (perintah + langkah klik)
`{cmd}`
Buka dokumen utama paket dan telusuri rujukan ke paket sebelumnya serta bukti.
Jalankan pemeriksaan akhir di hasil-gpt/RINGKASAN-G1-G6.md untuk hasil lint/typecheck/test/build.
Jangan menjalankan skrip migrasi atau operasi server sebagai bagian tinjauan dokumentasi ini.

## Bukti (tangkapan layar / hasil tes / tautan berkas)
{proof}

## Keputusan desain & alasan
Mengikuti MASTER yang telah diotorisasi pengguna; asumsi dicatat, bukan dijadikan fakta.
Hanya keluaran dokumentasi dan laporan yang diubah. Istilah peran, palet G1,
token G2, dan batas agen dipertahankan konsisten pada paket ini.

## Risiko, batasan, dan hal yang belum selesai
{risks}

## Pertanyaan untuk Ketua
{questions}

## Daftar centang gerbang mutu (1–7)
- [x] 1. Lint/typecheck/build lulus dan 590 tes aplikasi lulus dengan konfigurasi uji sintetis; bukti di ringkasan akhir. Ini tidak membuktikan implementasi spesifikasi.
- [x] 2. Validasi artefak sesuai paket dilakukan; tanpa perubahan perilaku aplikasi.
- [ ] 3. Uji visual aplikasi tidak berlaku bagi dokumen; G1 memiliki bukti aset statis tersendiri.
- [ ] 4. Audit axe/keyboard implementasi belum dilakukan; kebutuhan dicantumkan untuk Antigravity.
- [x] 5. Hanya area dokumentasi, tidak membaca .env/rahasia atau mengubah kontrol keamanan.
- [x] 6. Tidak menambah dependency atau kode ke bundel runtime aplikasi.
- [x] 7. Dokumen, batas klaim, sumber dan langkah verifikasi disediakan.
'''
if code=='G4':text=text.replace('\n- Pembuat:', '\n\n**DRAF — perlu ditinjau advokat/DPO/auditor**\n\nVersi 1.0 · Pemilik: Ketua dan fungsi privasi · Tinjau: tahunan/sebelum pengesahan.\n\n- Pembuat:',1)
(P/'serah-terima.md').write_text(text,encoding='utf-8');(ROOT/'docs/tim/serah-terima'/f'{code}.md').write_text(text,encoding='utf-8')
