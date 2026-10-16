# 02 · Tugas Antigravity — Insinyur Implementasi & Verifikasi Visual

**Peran:** tangan & mata tim di dalam kode. Anda punya repo, terminal, dan **browser** — gunakan untuk *membuktikan* hasil (tangkapan layar, rekaman, tes).
Anda bekerja di cabang `antigravity/<kode>-<topik>` dan **tidak** menyentuh produksi, rahasia, `main`, migrasi, edge function, atau `infra/vps` (lihat 03 §1).
Baca `00-ringkasan-proyek.md` dan `03-aturan-kerja-tim.md` lebih dulu. Misi siap tempel ada di `docs/tim/prompts/antigravity/`.

**Urutan:** A1 (mulai sekarang, tidak menunggu siapa pun) → A2 → A3 (menunggu spesifikasi GPT G2/G3; boleh mulai dari audit & kerangka) → A4 → A5 → A6 → A7.

---

## A1 · **Denti HD** — render tajam di semua ukuran & DPR (prioritas tertinggi)

**Latar:** penyebab blur sudah dianalisis (00 §4.1). Tugas Anda *membuktikan dan memperbaikinya* lalu membangun sistem render bertingkat.

**Langkah:**
1. **Ukur dulu:** tangkapan layar `DentiMascot` pada 58/64/68/96/160/220/300 px × DPR 1/2/3 (Playwright atau browser Anda), simpan sebagai baseline di `docs/tim/serah-terima/A1/sebelum/`.
   Konfirmasi penyebab satu per satu (garis < 1 px, `filter` SVG, bitmap ter-*composite* yang di-`scale`, `drop-shadow` pembungkus).
2. **Sistem LOD** pada `DentiMascot`: prop `lod="auto|mini|standar|hero"` (auto menurut `size`). `mini` memakai SVG sederhana (disediakan GPT G1; sebelum itu, turunkan dari markup
   saat ini dengan menghapus `filter`/gradien kecil dan menebalkan garis), `hero` penuh. Pertahankan semua **93 state** & API publik (`state`, `size`, `kid`, `track`, `look`, `title`).
3. **Aturan render tajam:** `vector-effect: non-scaling-stroke` atau garis minimum dihitung dari `size`; `shape-rendering="geometricPrecision"`; hindari `filter` pada
   grup beranimasi (ganti dengan lapisan bayangan statis/`radialGradient`); hindari `transform: scale()` yang membesarkan bitmap — animasikan dengan `translate`/SMIL/perubahan atribut
   pada elemen vektor, atau beri `will-change` dengan hati-hati; piksel-snap posisi pada ukuran kecil; pembungkus tanpa `filter: drop-shadow` (pakai bayangan SVG statis).
4. **DPR-aware:** uji 1×/2×/3×; pada `mini` pastikan tepi tegas (periksa dengan tangkapan layar yang diperbesar).
5. **Performa:** animasi idle ≤ 2% CPU pada laptop kelas menengah, tanpa *layout thrash*; ukuran JS markup tidak membengkak > 15 KB gzip (muat LOD secara malas bila perlu).
6. **Integrasi aset G1** bila sudah tersedia di `docs/tim/hasil-gpt/G1/svg/` (validasi kait rig; jangan mengubah kontrak CSS tanpa memperbarui `denti.css` & tes).
7. **Tes:** komponen (state & LOD terpilih benar), tes regresi visual (tangkapan layar per LOD × state inti), tes bahwa `mini` tidak mengandung `<filter>`.

**Serahkan:** cabang `antigravity/A1-denti-hd`, `docs/tim/serah-terima/A1.md` dengan galeri sebelum/sesudah (1×/2×/3×) & angka CPU/ukuran.
**Lulus bila:** pada 58 px @2× garis & tepi tampak tegas (tanpa halo/blur), 93 state tetap berfungsi, tes hijau.

---

## A2 · Fondasi sistem desain premium (token → kode)

Wujudkan G2 di kode: perbarui `apps/clinic/src/styles/theme.css` (dan `packages/ui`) dengan token baru (terang/gelap), tipografi **self-host** (fon berlisensi terbuka; sertakan
lisensi), skala jarak/radius/elevasi/gerak, utilitas Tailwind yang memetakan token. Rapikan 25 komponen dasar mengikuti spesifikasi & state; pastikan dark mode setara kualitasnya.
Sebelum G2 tersedia: audit pemakaian token saat ini (hardcode warna, inkonsistensi) dan siapkan migrasi bertahap tanpa mengubah tampilan.
**Tes:** komponen + regresi visual + axe. **Lulus bila:** tidak ada warna hardcode baru, kontras AA, tidak ada regresi tampilan tanpa disengaja.

## A3 · Implementasi layar premium (bertahap)

Ikuti `urutan-implementasi.md` dari G3. Urutan awal yang disarankan: Login/MFA → Dashboard admin → Asisten AI & kartu usulan (gaya visual saja) → Pasien → Jadwal → Pembayaran →
Layar Antrean → Pengaturan. Tambah **Command palette (Ctrl+K)**, pusat notifikasi, skeleton/empty/error yang elegan, mikro-interaksi, mode ringkas. Satu layar = satu cabang/PR kecil.
**Batas:** jangan mengubah logika bisnis/layanan, kontrak data, atau peran; ubah presentasi. **Lulus bila:** gerbang mutu 03 §3 terpenuhi untuk layar itu.

## A4 · Mutu otomatis: E2E, visual, aksesibilitas, performa

Bangun **Playwright**: alur kritis (login, daftar pasien, buat jadwal, kasir, antrean, Asisten AI dengan respons AI di-*mock*, MFA), **regresi visual** (terang/gelap, 375 & 1440 px),
**axe** per halaman, **Lighthouse CI** dengan anggaran (Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95). Sediakan fixture pengguna/klinik uji **sintetis** (tanpa data nyata).
Usulkan `docs/tim/usulan-ci/e2e.yml` (Ketua yang memasang). **Lulus bila:** suite berjalan lokal < 10 menit, stabil (tanpa flaky) 5× berturut-turut.

## A5 · Hardening sisi aplikasi & rantai pasok (keamanan tingkat tinggi)

1. **UI MFA TOTP** (daftar/verifikasi/kode pemulihan) memakai API Supabase Auth MFA; **manajemen sesi** (daftar perangkat aktif, keluar dari semua perangkat); **auto-kunci layar**
   setelah tidak aktif (konfigurasi per klinik) untuk data klinis; indikator sesi aman. *(Konfigurasi MFA di server dikerjakan Ketua; siapkan UI di balik bendera fitur.)*
2. **Pengerasan frontend:** audit semua `dangerouslySetInnerHTML` (wajib DOMPurify), sanitasi ekspor PDF/HTML, tinjau CSP (usulkan pengetatan, mis. Trusted Types) dan
   Permissions-Policy, anti-clickjacking, penanganan token/sesi (tidak di `localStorage` bila bisa dihindari), tes XSS/injeksi.
3. **Rantai pasok:** konfigurasi Dependabot, CodeQL, gitleaks (pemindaian rahasia), `npm audit` sebagai gerbang, SBOM CycloneDX, pemeriksaan lisensi — sebagai berkas usulan di `docs/tim/usulan-ci/`.
4. **Laporan temuan** terurut keparahan (CWE/OWASP) dengan bukti & perbaikan. **Lulus bila:** semua perbaikan di area Anda bertes; usulan CI siap pasang.

## A6 · Aplikasi desktop kelas premium

Poles `apps/desktop`: tampilan installer (NSIS/DMG) & ikon beresolusi tinggi, layar pembuka, banner offline, UX pembaruan otomatis, menu/tray, pintasan, pencetakan nota/kwitansi
(rancang untuk printer thermal — implementasi minimal aman). Siapkan **alur penandatanganan kode** (workflow *usulan*, secret placeholder; Ketua/pemilik yang mengisi kredensial):
Windows (Azure Trusted Signing/sertifikat OV-EV), macOS (notarisasi). **Lulus bila:** build uji berhasil di CI usulan & installer tampil premium; tidak ada rahasia di repo.

## A7 · Performa & pengalaman

Analisis bundel (visualizer), *code-splitting* per rute, optimasi gambar/fon, Core Web Vitals (LCP < 2,0 s, INP < 200 ms, CLS < 0,05 pada profil laptop menengah & 4G cepat), error boundary
dengan UX baik (+ pelaporan Sentry), kesiapan i18n (ekstraksi string tanpa mengubah bahasa), skeleton konsisten. **Lulus bila:** angka sebelum/sesudah terdokumentasi dan tercapai.

---

### Cara kerja yang diharapkan dari Antigravity
- Mulai tiap paket dengan **rencana tertulis** (artefak) dan minta persetujuan Ketua bila menyentuh area di luar kepemilikan.
- Verifikasi di **browser**: simpan tangkapan layar & rekaman sebagai bukti di `docs/tim/serah-terima/<kode>/`.
- Jalankan seluruh gerbang mutu (03 §3) sebelum menyerahkan; jangan menandai selesai tanpa bukti.
