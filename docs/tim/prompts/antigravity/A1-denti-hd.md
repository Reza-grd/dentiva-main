# Antigravity · A1 — Denti HD (MULAI DI SINI)

**Cabang:** `antigravity/A1-denti-hd`  **Serah terima:** `docs/tim/serah-terima/A1.md`  **Aset GPT (bila ada):** `docs/tim/hasil-gpt/G1/svg/`

```
MISI A1 — DENTI HD: render maskot tajam di semua ukuran & DPR

LATAR
Maskot Denti (apps/clinic/src/components/mascot/: DentiMascot.jsx, dentiSvg.js [markup SVG ±34 KB], denti.css [rig animasi 93 state]) tampak BLUR/kurang HD. Dugaan penyebab yang harus kamu BUKTIKAN atau BANTAH dengan ukuran:
 (a) viewBox 400×480 ditampilkan 58–68 px (DentiGuideWidget, AiBriefCard) → garis stroke-width 2–3 unit = ±0,3–0,5 px;
 (b) ±30 atribut filter= (blur/glow) + 20 gradien di SVG → rasterisasi beresolusi rendah;
 (c) animasi CSS transform: scale() pada grup ter-composite → bitmap dibesarkan;
 (d) filter: drop-shadow pada pembungkus (denti-companion.css .denti-companion__avatar).
Tempat Denti dipakai: widget mengambang (size 58/64), kartu briefing dashboard (68), halaman Asisten AI (DentiCompanion, ±220), layar antrean TV (220–300).

LANGKAH
1) UKUR: tulis skrip Playwright yang merender DentiMascot pada size 58/64/68/96/160/220/300 × DPR 1/2/3 (halaman uji lokal atau Vite dev), ambil tangkapan layar & perbesar 4×;
   simpan di docs/tim/serah-terima/A1/sebelum/. Hitung tiap hipotesis (a–d): matikan satu per satu dan tunjukkan efek visualnya. Tulis ringkasan temuan.
2) SISTEM LOD: tambah prop lod="auto|mini|standar|hero" (auto menurut size: ≤72 mini, ≤160 standar, selebihnya hero). mini = markup sederhana (tanpa <filter>, gradien minimal, garis tebal, siluet kuat).
   Jika aset GPT G1 tersedia, integrasikan; jika belum, TURUNKAN mini dari markup sekarang (hapus filter/gradien kecil, tebalkan garis) — lalu ganti saat aset G1 tiba.
   Pertahankan API publik & SEMUA 93 state (DENTI_STATES) dan kontrak kelas rig di denti.css.
3) ATURAN RENDER TAJAM: garis minimum terhadap piksel perangkat (vector-effect: non-scaling-stroke atau hitung dari size), shape-rendering="geometricPrecision", ganti filter beranimasi dengan lapisan statis/gradien,
   animasikan lewat translate/rotate (atau SMIL/atribut) alih-alih scale() pada layer ter-composite, hapus drop-shadow pembungkus (bayangan SVG statis), pembulatan posisi pada ukuran kecil, tanpa blur pada tepi.
4) PERFORMA: CPU idle ≤ 2% (profil 60 dtk), tanpa layout thrash; JS tambahan ≤ 15 KB gzip (muat LOD secara malas bila perlu). Hormati prefers-reduced-motion.
5) TES: komponen (LOD terpilih benar per size; state valid; mini tanpa <filter>), regresi visual (tangkapan layar per LOD × 6 state inti × DPR 1/2), semua tes lama hijau (npm test).
6) SESUDAH: ulangi tangkapan layar yang sama ke .../sesudah/ dan buat galeri sebelum/sesudah di laporan (perbesar 4× pada 58 px @2×).

KRITERIA LULUS
- 58 px @2×: tepi & garis tegas, tanpa halo/blur; 93 state tetap berfungsi; lint/typecheck/tes/build hijau; CPU & ukuran sesuai batas; bukti lengkap; tidak ada perubahan di luar komponen mascot/CSS terkait & tesnya.
```
