# Sistem Desain Dentiva — Tenang dan Presisi
Versi 1.0 · 2026-10-17 · GPT · Status: spesifikasi usulan, belum implementasi.

## 1. Prinsip (lakukan / hindari)
1. Satu tugas dominan: satu tombol utama per konteks / hindari tiga CTA setara.
2. Data lebih dulu: angka dan rentang waktu eksplisit / hindari dekorasi menutupi hasil.
3. Ruang bernapas: kelompokkan dengan space.s4/s6 / hindari padding acak.
4. Keamanan terasa jelas: jelaskan alasan verifikasi / hindari lencana sertifikasi palsu.
5. Konsisten lintas peran: token sama, izin berbeda / jangan hanya menyembunyikan tombol.
6. Denti membantu: tampilkan saat relevan / hindari gerak berulang di tiap kartu.
7. Pemulihan jelas: pertahankan input dan beri coba lagi / hindari toast tanpa tindakan.
8. Aksesibilitas default: label, kontras, fokus / jangan memakai warna sebagai satu-satunya makna.

## 2. Evolusi dari implementasi
Sumber dibaca: theme.css, tailwind.config.js, packages/ui/tailwind-preset.cjs,
Button.tsx, Input.tsx, Dialog.tsx, dan Console DataTable.tsx. Pertahankan pemetaan
CSS yang ada. --color-accent violet lama disimpan di namespace legacy; teal dari
G1 adalah USULAN migrasi merek yang perlu diterapkan sekaligus dan ditinjau Ketua.
Jangan mengganti warna satu layar saja. Gelap diselaraskan ke #0B1220 sesuai G1.
Border lama #E2E8F0 boleh untuk pemisah dekoratif; batas kontrol bermakna memakai
color.*.border agar ≥3:1. Accent putih pada violet gelap lama jangan diteruskan
ke teal terang tema gelap: pasangan on-accent tema gelap adalah navy.
Alias --color-background→--color-bg dan --color-text-muted→--color-muted
mencegah dua sumber kebenaran. Preset Tailwind yang ada tetap digunakan.

## 3. Kontras dan warna
tokens.json menyimpan nilai DTCG eksplisit untuk terang/gelap dan 12 netral.
Mengacu [Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/),
laporan Community Group DTCG, bukan W3C Recommendation. Alias dan metadata CSS
berada pada $extensions; mode tema berupa grup eksplisit light/dark.
kontras.json dihitung oleh susun.py; tabel di bawah adalah seluruh pasangan yang
diizinkan untuk teks/kontrol. Pasangan lain memerlukan perhitungan baru.
Teks utama menargetkan AAA; teks lain minimal AA. Translucency pada teks dilarang.
Warna chart diuji terhadap permukaan, bukan berarti delapan seri saling berbeda
≥3:1. Pakai label langsung, marker/pola, dan tabel alternatif; grafik tumpang tindih
membutuhkan pengujian pasangan yang bersinggungan.

| Tema | Pasangan token | Rasio | Minimum | Hasil |
|---|---|---:|---:|---|
| light | text / bg | 12.97:1 | 4.5 | lulus |
| light | text / card | 13.57:1 | 4.5 | lulus |
| light | muted / bg | 7.24:1 | 4.5 | lulus |
| light | muted / card | 7.58:1 | 4.5 | lulus |
| light | accent / bg | 5.23:1 | 4.5 | lulus |
| light | accent / card | 5.47:1 | 4.5 | lulus |
| light | info / bg | 6.41:1 | 4.5 | lulus |
| light | info / card | 6.70:1 | 4.5 | lulus |
| light | success / bg | 6.81:1 | 4.5 | lulus |
| light | success / card | 7.13:1 | 4.5 | lulus |
| light | warning / bg | 6.78:1 | 4.5 | lulus |
| light | warning / card | 7.09:1 | 4.5 | lulus |
| light | danger / bg | 6.18:1 | 4.5 | lulus |
| light | danger / card | 6.47:1 | 4.5 | lulus |
| light | focus / bg | 5.23:1 | 3 | lulus |
| light | focus / card | 5.47:1 | 3 | lulus |
| light | border / bg | 4.55:1 | 3 | lulus |
| light | border / card | 4.76:1 | 3 | lulus |
| light | on-accent / accent | 5.47:1 | 4.5 | lulus |
| light | text / hover | 12.38:1 | 4.5 | lulus |
| light | text / selected | 12.04:1 | 4.5 | lulus |
| light | chart-1 / card | 5.47:1 | 3 | lulus |
| light | chart-2 / card | 6.70:1 | 3 | lulus |
| light | chart-3 / card | 6.98:1 | 3 | lulus |
| light | chart-4 / card | 6.29:1 | 3 | lulus |
| light | chart-5 / card | 7.09:1 | 3 | lulus |
| light | chart-6 / card | 7.13:1 | 3 | lulus |
| light | chart-7 / card | 7.90:1 | 3 | lulus |
| light | chart-8 / card | 6.32:1 | 3 | lulus |
| dark | text / bg | 17.89:1 | 4.5 | lulus |
| dark | text / card | 15.99:1 | 4.5 | lulus |
| dark | muted / bg | 12.61:1 | 4.5 | lulus |
| dark | muted / card | 11.27:1 | 4.5 | lulus |
| dark | accent / bg | 12.66:1 | 4.5 | lulus |
| dark | accent / card | 11.31:1 | 4.5 | lulus |
| dark | info / bg | 10.38:1 | 4.5 | lulus |
| dark | info / card | 9.28:1 | 4.5 | lulus |
| dark | success / bg | 13.33:1 | 4.5 | lulus |
| dark | success / card | 11.92:1 | 4.5 | lulus |
| dark | warning / bg | 15.03:1 | 4.5 | lulus |
| dark | warning / card | 13.44:1 | 4.5 | lulus |
| dark | danger / bg | 9.86:1 | 4.5 | lulus |
| dark | danger / card | 8.82:1 | 4.5 | lulus |
| dark | focus / bg | 12.66:1 | 3 | lulus |
| dark | focus / card | 11.31:1 | 3 | lulus |
| dark | border / bg | 7.30:1 | 3 | lulus |
| dark | border / card | 6.53:1 | 3 | lulus |
| dark | on-accent / accent | 12.66:1 | 4.5 | lulus |
| dark | text / hover | 13.98:1 | 4.5 | lulus |
| dark | text / selected | 9.03:1 | 4.5 | lulus |
| dark | chart-1 / card | 11.31:1 | 3 | lulus |
| dark | chart-2 / card | 9.28:1 | 3 | lulus |
| dark | chart-3 / card | 9.47:1 | 3 | lulus |
| dark | chart-4 / card | 8.85:1 | 3 | lulus |
| dark | chart-5 / card | 13.44:1 | 3 | lulus |
| dark | chart-6 / card | 11.92:1 | 3 | lulus |
| dark | chart-7 / card | 8.39:1 | 3 | lulus |
| dark | chart-8 / card | 9.51:1 | 3 | lulus |

## 4. Tipografi
UI: Inter, SIL Open Font License 1.1; judul editorial pemasaran: Source Serif 4,
SIL Open Font License 1.1. Sumber lisensi: https://github.com/rsms/inter/blob/master/LICENSE.txt
dan https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md.
Rekomendasi aset: WOFF2 subset Latin yang mencakup bahasa Indonesia, self-host
setelah lisensi ditinjau; simpan berkas lisensi dan font-display:swap. Tidak menambah
font atau dependency aplikasi dalam paket ini. Inter yang sudah dipakai dipertahankan.
Display 40/48; h1 32/40; h2 24/32; h3 20/28; body 16/24; small 14/20; caption 12/16.
Bobot 400/500/600/700, heading tanpa uppercase berlebihan. Body ponsel tetap 16 px.
Keuangan: font-variant-numeric:tabular-nums, rata kanan; Intl.NumberFormat id-ID
untuk Rupiah, jangan memaksa dua desimal. Tanggal contoh 17 Okt 2026; waktu WIB
ditampilkan bila lintas zona. Jangan menyamakan tanggal UTC dengan hari klinik.

## 5. Jarak, radius, elevasi dan kepadatan
Gunakan space.s1=4 px hingga s16=64 px; padding kartu s6 desktop/s4 ponsel;
gap formulir s4, jarak seksi s8. Radius sm/md/lg/xl/2xl:8/12/16/20/24 px;
pil digunakan untuk status saja. Border 1 CSS px (dekorasi), focus-ring 2 px + offset
2 px. Elevasi kartu mengikuti shadow.card; dialog shadow lebih kuat hanya satu
lapisan. Hapus glow sebagai tanda utama interaksi. Permukaan dialog solid;
glass/backdrop blur opsional dekorasi di luar data klinis, tidak pada tabel padat.
Nyaman: control 44, row 52; ringkas: control-compact 36, row-compact 40 desktop.
Ponsel selalu hit area 44×44; ringkas mengurangi isi, bukan target sentuh.

## 6. Gerak dan ikon
motion.fast 160 ms hover/fokus, normal 240 ms dialog/peralihan, gesture 480 ms Denti;
ease [0.2,0.8,0.2,1]. Animasi memakai transform/opacity; jangan transition:all.
Reduced motion: durasi nol, skeleton statis, spinner diganti teks “Memuat…”,
pose Denti tetap bermakna. Gerak tidak menjadi satu-satunya indikator keberhasilan.
Lucide yang sudah ada dipertahankan (ISC); ikon 20 px, stroke 2, dekoratif aria-hidden.
Ikon aksi tanpa teks wajib accessible name; label yang sama pada tooltip dan aria-label.
Ilustrasi Denti untuk bantuan/kosong, ikon untuk tindakan; hindari emoji sebagai status klinis.

## 7. Data-viz
Delapan warna kategorikal ada pada tokens.color.chart.light/dark. Sekuensial teal
untuk besaran satu variabel; label nilai dan legenda wajib. Merah/hijau hanya
semantik dengan ikon dan tanda minus/plus. Grafik keuangan menyebut pendapatan
lunas, periode, satuan Rp, dan sumber agregasi; nol berbeda dari tidak ada data.
Sumbu batang mulai nol; jangan memotong sumbu untuk membesar-besarkan perubahan.
Tooltip juga tersedia lewat fokus keyboard, tabel data alternatif dapat dibaca.
Jangan membandingkan dua periode tidak lengkap tanpa keterangan.

## 8. Penerapan
25 spesifikasi komponen ada di komponen/. Default semua teks memakai text/card;
muted/card untuk pendukung; primary memakai on-accent/accent; semantic/card untuk
galat/peringatan. Hover memakai text/hover; selected memakai text/selected.
Spesifikasi adalah rencana. Axe, focus trap, responsif, dan anggaran bundel tetap
harus diperiksa Antigravity setelah implementasi; dokumen ini tidak mengklaim lolos.
