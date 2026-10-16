# Antigravity · A2 + A3 — Sistem desain & layar premium

**Cabang:** `antigravity/A2-sistem-desain` lalu `antigravity/A3-<layar>` (satu per layar)  **Bergantung:** `docs/tim/hasil-gpt/G2/` dan `G3/` (mulai audit tanpa menunggu).

```
MISI A2 — FONDASI SISTEM DESAIN (token → kode)

LATAR: token ada di apps/clinic/src/styles/theme.css & packages/ui, tetapi pemakaian tidak konsisten. GPT menyerahkan spesifikasi di docs/tim/hasil-gpt/G2/ (design-system.md, tokens.json, komponen/*.md).
1) AUDIT (tanpa mengubah tampilan): hitung warna/ukuran hardcode, komponen duplikat, kelas Tailwind liar; tulis docs/tim/serah-terima/A2/audit.md dengan angka & contoh.
2) IMPLEMENTASI TOKEN: perbarui theme.css (terang & gelap) dari tokens.json, pemetaan ke variabel --color-* yang ada (kompatibel mundur), skala jarak/radius/elevasi/gerak; tipografi SELF-HOST (fon berlisensi terbuka OFL; sertakan LICENSE; subset Latin; font-display: swap; preload kritis).
3) KOMPONEN: rapikan ±25 komponen dasar (packages/ui & apps/clinic/src/components/ui) mengikuti spesifikasi: semua state, keyboard, ARIA, ukuran; tambah yang belum ada (command palette, empty/error state, drawer, kartu KPI).
4) MIGRASI BERTAHAP: ganti hardcode dengan token (skrip codemod aman + tinjau manual); jangan mengubah logika.
5) TES: komponen + regresi visual (terang/gelap) + axe. LULUS: tidak ada warna hardcode baru; kontras AA; tanpa regresi tampilan yang tak disengaja (jelaskan tiap perbedaan yang disengaja).

MISI A3 — LAYAR PREMIUM (bertahap, satu layar per cabang)
Ikuti docs/tim/hasil-gpt/G3/urutan-implementasi.md (bila belum ada: Login/MFA → Dashboard admin → Asisten AI [hanya gaya visual kartu usulan] → Pasien → Jadwal → Pembayaran → Layar Antrean → Pengaturan).
Per layar: wujudkan spesifikasi (layout desktop & ponsel, state memuat/kosong/galat/tanpa-izin/offline, mikro-interaksi, teks Indonesia), tambah Command palette (Ctrl+K), pusat notifikasi, mode ringkas pada tabel padat.
BATAS: jangan ubah logika bisnis/layanan/peran/kontrak data; jangan sentuh logika agen di components/ai (hanya CSS/presentasi kartu).
LULUS per layar: gerbang mutu 03 §3 + bukti terang/gelap/375/1440 + axe bersih + Lighthouse (Perf ≥ 90, A11y ≥ 95) pada layar itu.
```
