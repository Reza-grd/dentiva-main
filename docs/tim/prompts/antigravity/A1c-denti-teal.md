# Antigravity · Misi A1c — Denti Teal (material G1 ke maskot produksi)

Keputusan pemilik 17 Okt 2026: **palet merek = navy (logo) + emas (logo) + teal (aksen); violet dihapus bertahap.**
A1c hanya mengganti **material Denti**. Migrasi aksen aplikasi violet → teal adalah A2 (jangan dikerjakan di sini).

```
MISI A1c — DENTI TEAL. Kerjakan sampai selesai tanpa jeda; berhenti hanya bila buntu.

Folder kerja: worktree sendiri (bukan folder utama).
    git fetch origin
    git worktree add D:/dentiva/antigravity-A1c -b antigravity/A1c-denti-teal origin/console
Jangan membuat junction node_modules yang menunjuk worktree lain.

BACA DULU:
- docs/tim/hasil-gpt/G1/{art-direction.md, lod-aturan.md, palet.json, catatan-rig.md, ekspresi.md} dan galeri
  docs/tim/hasil-gpt/G1/bukti/render-1440-light-dpr2.png (arah visual yang disetujui) + svg/*.svg (rujukan).
- docs/tim/serah-terima/G1-tinjauan.md, A1.md, A1b.md; docs/tim/04-papan-tugas.md (log 17 Okt).
- apps/clinic/src/components/mascot/{dentiSvg.js, denti.css, DentiMascot.jsx}, apps/clinic/src/test/dentiMascot.test.jsx.

PENTING: SVG G1 adalah SNAPSHOT (±135 KB, 100 KB CSS tertanam yang MENGHENTIKAN animasi). JANGAN menyalin berkas atau CSS-nya.
Ambil hanya nilai material (warna, stop gradien, ketebalan kontur per LOD) dan terapkan ke dentiSvg.js / LOD_SPEC.

TUJUAN:
1) Material teal sesuai palet.json G1: enamel #F8FAFC, bayangan enamel #CBD5E1, kontur/outline #163047, visor #0B1220,
   wajah/mata/mulut #5EEAD4, aksen teal #0F766E (panel bawah, ujung lengan, muka headphone, sirip), emas #E7C98B (cincin, gelang).
   Glow radial A1b (eyeGlow/coreGlow/visor-glow) ikut ke keluarga teal; tetap TANPA <filter>.
2) Kontur per LOD mengikuti G1: mini ≥13 unit, standar ≈7, hero ≈4 (sesuaikan bila terbukti lebih baik; tulis alasannya).
   Mini: 0 gradien, 0 filter. Standar: ≤1 gradien badan. Hero: ≤3 gradien.
3) TEMA GELAP: kontur #163047 hanya 1,38:1 terhadap latar gelap #0B1220 → tepi luar harus terang di tema gelap
   (aplikasi memakai kelas `dark` pada <html> — Tailwind darkMode 'class', diset theme-init.js/ThemeContext; mis. variabel CSS di `.dark .denti`; layar antrean TV selalu gelap). Buktikan ≥3:1 di kedua tema.
4) Perbaiki artefak G1: alis state `sorry` di hero tampak seperti balok gelap → bentuk alis yang terbaca.
5) Pertahankan SEMUA kait rig (kelas d-*, pivot, transform-origin, data-state/data-lod/data-kid), sistem LOD A1, orbit offset-path,
   pegas A1b, reduced-motion. Mode anak (data-kid) tetap berfungsi.
6) Jangan mengubah --color-accent aplikasi atau berkas di luar mascot/** kecuali CSS pembungkus Denti yang memakai warna biru lama
   (denti-companion.css, ai-brief.css, queue-display.css) — sebutkan setiap perubahan di laporan.

UJI & BUKTI (gerbang 03 §3):
- Perbarui tes kontras di dentiMascot.test.jsx ke warna baru (outline vs putih ≥3:1; tepi tema gelap ≥3:1; wajah vs visor ≥4,5:1).
- Tes: tidak ada <filter> di semua LOD; mini 0 gradien; ID unik per instans (dua Denti di satu halaman).
- Matriks regresi 93 state × 3 LOD (render statis per state, terang & gelap, DPR 2) → lembar kontak PNG; tandai state yang rusak.
- Bukti sebelum/sesudah: 58 px @1×/2×, 120 px, 220 px, terang & gelap; widget, kartu briefing, halaman Asisten AI, layar antrean TV.
- CPU idle tidak naik dibanding A1b; ukuran gzip dentiSvg.js+denti.css tidak naik >2 KB.
- npm run lint, typecheck, npm test, build:clinic; Playwright A4 (catatan: hapus dist/ dulu sampai A4b selesai) — perbarui baseline visual
  yang berubah karena warna Denti, dan sebutkan berkas baseline yang berubah.
- Hasil run jangan menimpa berkas bukti yang dilacak git tanpa sengaja.

SERAH TERIMA: commit di antigravity/A1c-denti-teal, push cabang itu (bukan console/main), laporan docs/tim/serah-terima/A1c.md
(templat 03 §4) + folder bukti docs/tim/serah-terima/A1c/. Lalu kabari Ketua.
```

Urutan: A4b boleh dikerjakan lebih dulu atau paralel (worktree terpisah).
