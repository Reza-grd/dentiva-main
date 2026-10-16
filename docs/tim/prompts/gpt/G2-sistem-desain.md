# GPT · G2 — Sistem desain premium

**Lampirkan:** `00`, `03`, `bundel/GPT-desain.md` (theme.css, komponen UI, daftar layar, contoh JSX utama).  **Simpan ke:** `docs/tim/hasil-gpt/G2/`.

```
PAKET G2 — SISTEM DESAIN PREMIUM DENTIVA

KONTEKS
Aplikasi klinik gigi (React + Tailwind 3). Token ada di theme.css (terlampir) tetapi pemakaiannya tak konsisten. Target: bahasa visual "premium & mahal" — tenang, ruang
bernapas, tipografi tegas, kontras terkendali, gerak halus; terasa seperti produk kelas enterprise, tetap hangat untuk dokter & resepsionis yang bekerja seharian.
Jangan meniru merek lain; jelaskan KUALITAS yang dituju. Mulai dari token yang ada: perbaiki, jangan membuang tanpa alasan.

TUGASMU
(a) Prinsip desain (≤ 8, tiap prinsip dengan contoh "lakukan/jangan").
(b) Token warna: aksen Dentiva (usulkan palet aksen + netral 12 langkah), semantik (info/sukses/peringatan/bahaya), grafik (kategorikal 8 & sekuensial), TERANG & GELAP.
    Tabel rasio kontras untuk semua pasangan teks/latar & komponen (AA minimal; target AAA untuk teks utama).
(c) Tipografi: pasangan huruf BERLISENSI TERBUKA (sebut lisensinya & cara self-host), skala (display→caption), bobot, tinggi baris, ANGKA TABULAR untuk keuangan, aturan Bahasa Indonesia (tanggal, Rupiah).
(d) Jarak (skala 4 px), radius, garis, elevasi (bayangan lembut berlapis), blur/kaca bila dipakai (hemat, tidak mengorbankan keterbacaan).
(e) Gerak: durasi & easing token, pola (masuk/keluar/peralihan), aturan prefers-reduced-motion (apa yang diganti apa).
(f) Ikonografi: gaya (lucide dipakai sekarang), ukuran, ketebalan garis, kapan ilustrasi vs ikon.
(g) Spesifikasi ±25 komponen: tombol, input, select, checkbox/radio/switch, tabel data padat, kartu, dialog, drawer, toast, tab, badge, tooltip, skeleton, empty state, error state,
    breadcrumb, pagination, date picker, command palette, kartu usulan agen (Setujui/Tolak/Batalkan + peringatan), kartu KPI, bagan keuangan, avatar/Denti, banner offline/sesi.
    Tiap komponen: anatomi, varian, SEMUA state (default/hover/fokus/aktif/nonaktif/memuat/galat), ukuran, perilaku keyboard, ARIA, aturan teks.
(h) Kepadatan: "nyaman" & "ringkas" (untuk tabel besar).
(i) Panduan data-viz & tabel keuangan (warna, label, tooltip, angka).
(j) Satu halaman contoh (Dashboard) yang menyatukan semuanya, deskriptif (ASCII + penjelasan).

KELUARAN ("### BERKAS: docs/tim/hasil-gpt/G2/<nama>"):
design-system.md, tokens.json (format W3C Design Tokens; sertakan pemetaan ke variabel CSS yang ada --color-* di theme.css), komponen/<nama>.md ×25, contoh-halaman.md, serah-terima.md.

KRITERIA LULUS: semua pasangan warna punya rasio kontras tertulis & lolos AA; tiap komponen punya semua state; tokens.json valid JSON; tidak ada nilai ajaib di luar token.
Kerjakan bertahap: kirim (a)–(f) dahulu, tunggu "lanjut", lalu (g)–(j).
```
