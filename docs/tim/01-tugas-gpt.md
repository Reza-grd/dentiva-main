# 01 · Tugas GPT — Penasihat Desain, Merek, Kepatuhan & Produk

**Peran:** otak kreatif & dokumen tim. Anda **tidak punya akses repo**; Anda menerima *bundel konteks* (dibuat dengan `node scripts/tim/bundel-konteks.mjs`)
dan menyerahkan **dokumen, spesifikasi, JSON, dan SVG**. Semua keluaran disimpan pengguna ke `docs/tim/hasil-gpt/<kode>/`.
Baca dulu `00-ringkasan-proyek.md` dan `03-aturan-kerja-tim.md`. Prompt siap tempel ada di `docs/tim/prompts/gpt/`.

**Urutan prioritas:** G1 → G2 → G3 → G4 → G5 → G6 (G1–G3 membuka pekerjaan Antigravity; kerjakan dahulu).

---

## G1 · Art direction & aset **Denti HD** (prioritas tertinggi)

**Masalah:** Denti tampak blur/kurang HD (analisis teknis ada di 00 §4.1). Gambar saat ini dirancang untuk ukuran besar lalu dikecilkan.

**Tugas:**
1. **Kritik desain** maskot saat ini dari kode `dentiSvg.js` & `docs/maskot-denti.md` (proporsi, keterbacaan di 58 px, kontras, gaya, "kemahalan" visual).
2. **Art direction** premium: karakter gigi ramah-profesional untuk klinik (bukan kartun anak-anak murahan): palet (terang/gelap), pencahayaan, material (enamel
   glossy halus), aturan garis (≥ 1,5 piksel perangkat pada ukuran tampil), bayangan lembut tanpa filter berat, bahasa gerak (pegas, anticipation), ekspresi inti.
3. **Tiga tingkat detail (LOD)** dengan aturan jelas:
   - `mini` (≤ 72 px: widget, kartu briefing, avatar) — bentuk sangat sederhana, siluet kuat, garis tebal, **tanpa filter/gradien rumit**, mata & mulut besar;
   - `standar` (96–160 px) — detail sedang;
   - `hero` (≥ 220 px: halaman AI, layar antrean) — detail penuh, gradien halus.
4. **Serahkan SVG sumber** untuk 6 state inti × 3 LOD (idle, happy, talk, think, wave, sorry) = 18 berkas, **mempertahankan kait rig** (kelas/ID grup yang dipakai `denti.css`:
   `d-root`, `d-head`, `d-arm-l`, `d-arm-r`, `d-mouth-*`, `d-eye-*`, dst. — daftar lengkap ada di bundel) agar animasi existing tetap jalan; viewBox tetap `0 0 400 480`.
5. **Lembar ekspresi** untuk 12 state inti lainnya (deskripsi + sketsa SVG sederhana) dan prinsip gerak (durasi/easing).

**Keluaran (`docs/tim/hasil-gpt/G1/`):** `art-direction.md`, `lod-aturan.md`, `palet.json`, `svg/<state>.<lod>.svg` (18 berkas), `ekspresi.md`, `catatan-rig.md`
(apa yang berubah dari rig lama), Laporan Serah Terima.
**Kriteria lulus:** SVG valid (tanpa `<filter>` pada `mini`), garis minimum terpenuhi saat dirender pada 58 px @2×, kait rig lengkap, palet lolos kontras AA di latar terang & gelap.

---

## G2 · Sistem desain premium

**Tugas:** rancang bahasa visual "premium & mahal" yang konsisten untuk aplikasi klinik (referensi *kualitas*, bukan meniru merek: ketenangan, ruang bernapas,
tipografi tegas, kontras terkendali, gerak halus). Mulai dari token yang ada (`theme.css` di bundel) dan **perbaiki**, jangan membuang tanpa alasan.

**Isi:** (a) prinsip desain; (b) token warna (aksen Dentiva, netral, semantik, grafik) terang & gelap lolos AA; (c) tipografi (pasangan huruf berlisensi terbuka,
skala, bobot, angka tabular untuk keuangan); (d) jarak/radius/elevasi/garis; (e) gerak (durasi, easing, aturan *reduced motion*); (f) ikonografi; (g) spesifikasi ±25
komponen (tombol, input, tabel data padat, kartu, dialog, toast, tab, badge, skeleton, empty state, command palette, kartu usulan agen, bagan, dll.) dengan state
(default/hover/fokus/aktif/nonaktif/galat/memuat); (h) kepadatan (nyaman/ringkas); (i) panduan data-viz (palet kategorikal & sekuensial, bagan keuangan).

**Keluaran (`docs/tim/hasil-gpt/G2/`):** `design-system.md`, `tokens.json` (format W3C design tokens; pemetaan ke variabel CSS `--color-*` yang ada), `komponen/*.md`, `contoh-halaman.md`, Laporan.
**Kriteria lulus:** semua pasangan warna terdokumentasi dengan rasio kontras; setiap komponen punya semua state; tokens.json dapat diurai.

---

## G3 · Spesifikasi redesign 10 layar utama

**Layar:** Login & verifikasi (MFA), Dashboard admin, **Asisten AI & kartu usulan**, Daftar/Data pasien, Rekam medis (dokter), Jadwal, Pembayaran (kasir),
Biaya & Modal/Stok, Layar Antrean TV, Pengaturan & Keamanan (sesi perangkat, MFA).

**Per layar:** tujuan pengguna & tugas utama, hierarki informasi, wireframe ASCII (desktop & ponsel 375 px), komponen yang dipakai (dari G2), status memuat/kosong/galat/
tanpa-izin, mikro-interaksi, teks Bahasa Indonesia (judul, label, galat, kosong), kebutuhan aksesibilitas, metrik keberhasilan. Tambah: **Command palette (Ctrl+K)**,
**Pusat notifikasi**, **onboarding klinik baru** (checklist 5 langkah), dan **mode ringkas** untuk data padat.

**Keluaran (`docs/tim/hasil-gpt/G3/`):** `layar-<nama>.md` ×10, `pola-global.md` (command palette, notifikasi, onboarding), `urutan-implementasi.md` (prioritas berdasar dampak/biaya), Laporan.
**Kriteria lulus:** setiap layar punya seluruh bagian di atas; teks UI konsisten dengan gaya Denti (hangat, ringkas, profesional).

---

## G4 · Paket dokumen keamanan & kepatuhan (kelas enterprise)

> Semua dokumen berlabel **"DRAF — perlu ditinjau advokat/DPO/auditor"**. Dilarang mengklaim sertifikasi yang belum ada.

**Tugas:** dari arsitektur & keadaan di 00 (bagian 2–4) dan bundel keamanan:
1. **Model ancaman (STRIDE)** per komponen + peta risiko (kemungkinan × dampak) + mitigasi yang *sudah ada* vs *kurang*.
2. **Pemetaan kepatuhan**: UU PDP (UU 27/2022) — hak subjek data, dasar pemrosesan, DPO, pemberitahuan insiden 3×24 jam; Permenkes 24/2022 (RME) — retensi, akses,
   keamanan; SATUSEHAT; ISO/IEC 27001 Annex A & 27799 (data kesehatan) — status kontrol (ada/sebagian/belum) + bukti.
3. **Kebijakan & prosedur**: kontrol akses & peran, manajemen kunci/rahasia, kata sandi & MFA, manajemen perubahan, **rencana respons insiden** (peran, tingkat keparahan,
   komunikasi), **backup & pemulihan bencana** (target RPO/RTO yang realistis untuk VPS tunggal + rencana peningkatan), retensi & penghapusan data, pengelolaan vendor/subprosesor
   (Supabase self-host, Biznet, Vercel, Google/Anthropic, Whapi, Midtrans, Sentry), pengembangan aman.
4. **Rencana uji penetrasi** (ruang lingkup, aturan keterlibatan, daftar uji OWASP ASVS/API Top 10 untuk arsitektur ini).
5. **White paper keamanan** (untuk calon klien premium; jujur & dapat diaudit), **kuesioner keamanan vendor** terjawab (SIG-Lite style).
6. **Draf hukum**: Syarat Layanan, Kebijakan Privasi, Perjanjian Pemrosesan Data (DPA), SLA.
7. **Daftar kekurangan prioritas** + usulan peta jalan 90 hari (mis. MFA, offsite backup, WAF, SBOM, pemantauan) dengan perkiraan usaha — Ketua yang menetapkan.

**Keluaran (`docs/tim/hasil-gpt/G4/`):** `model-ancaman.md`, `kepatuhan-uu-pdp.md`, `kepatuhan-rme-satusehat.md`, `iso27001-pemetaan.md`, `kebijakan/*.md`, `respons-insiden.md`, `dr-backup.md`,
`rencana-pentest.md`, `whitepaper-keamanan.md`, `kuesioner-vendor.md`, `hukum/*.md`, `peta-jalan-90-hari.md`, Laporan.
**Kriteria lulus:** tiap klaim keamanan merujuk fitur nyata di 00/bundel atau ditandai "rencana"; tidak ada klaim sertifikasi palsu; setiap dokumen punya pemilik & periode tinjau.

---

## G5 · Produk, paket & harga premium

**Tugas:** strategi positioning "klinik gigi premium": segmentasi (klinik tunggal, klinik multi-cabang/grup, dokter praktik mandiri), proposisi nilai (keamanan, AI, kemudahan),
**paket & harga dalam Rupiah** (Starter/Pro/Enterprise/Group; sudah ada paket Pro & Enterprise di DB dengan kuota AI 300/1000 per bulan — usulkan penyesuaian), batas fitur,
add-on (AI ekstra, SATUSEHAT, WhatsApp, penyimpanan), onboarding "white-glove" & migrasi data, SLA per paket, kalkulator ROI (rumus + contoh), struktur situs
(copy halaman Beranda/Keamanan/Harga/Unduh), naskah demo 15 menit, template studi kasus, strategi harga yang tidak murahan.

**Keluaran (`docs/tim/hasil-gpt/G5/`):** `positioning.md`, `paket-harga.md`, `roi-kalkulator.md`, `copy-situs.md`, `naskah-demo.md`, `studi-kasus-templat.md`, Laporan.

---

## G6 · Skenario uji agen & bank mikrocopy Denti

**Tugas:** (a) ±150 skenario evaluasi Denti Agen mengikuti `docs/briefing-gpt-agen.md` (format JS siap tempel); (b) **bank mikrocopy** Denti: pesan sukses/galat/kosong/menunggu,
penutup usulan, penolakan sopan, penjelasan peringatan, sapaan per jam & peran — nada hangat-profesional-premium, variasi agar tidak berulang (≥ 5 per situasi).

**Keluaran (`docs/tim/hasil-gpt/G6/`):** `skenario.js`, `mikrocopy.md` (+ `mikrocopy.json`), Laporan.
**Kriteria lulus:** skenario valid terhadap format; tidak mengarang angka di luar data klinik contoh; mikrocopy bebas klaim yang tidak bisa dipenuhi produk.
