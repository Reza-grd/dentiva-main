# Pengaturan dan Keamanan
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/settings/SettingsPage.jsx; Console modules/auth/MfaPage.tsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Semua peran mengatur keamanan akun sendiri; admin mengatur klinik sesuai izin; operator Console terpisah.
- Mendaftar/memverifikasi TOTP
- Meninjau sesi perangkat (RENCANA)
- Mengganti sandi
- Meninjau audit ringkas tanpa isi klinis

USULAN: semua peserta enrollment berhasil memverifikasi faktor tanpa bantuan; nol QR/secret tersisa pada tampilan setelah selesai.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Akun → keamanan → faktor TOTP → sesi perangkat → preferensi kunci → audit berizin. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Pengaturan dan Keamanan                    [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | MFA / Sandi / Sesi perangkat                           |
|                | Panduan keamanan / Audit ringkas                       |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Pengaturan                         |
| [Keamanan akun]                    |
| Verifikasi dua langkah             |
| [Atur autentikator]                |
| Sesi perangkat (rencana)           |
| Kunci layar (rencana)              |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Tab](../G2/komponen/tab.md), [Input](../G2/komponen/input.md), [Dialog](../G2/komponen/dialog.md), [Tabel Data](../G2/komponen/tabel.md), [Pilihan](../G2/komponen/pilihan.md), [Tombol](../G2/komponen/tombol.md), [Badge](../G2/komponen/badge.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Jangan mengklaim perangkat aman bila endpoint sesi belum tersedia; tampilkan penjelasan fitur rencana pada spesifikasi, bukan tombol palsu di produk.
- Galat: pesan di bagian terkait, tombol Coba lagi; input/pilihan tetap bila aman.
- Tanpa izin: “Akses halaman ini tidak tersedia untuk peran Anda.” Tidak memuat data dulu;
  kembali ke halaman peran. Server/RLS tetap otoritatif.
- Offline: Banner Offline dan Sesi, hentikan mutasi; bila status submit tidak pasti,
  baca ulang hasil sebelum mengulangi. Tidak menyimpan data medis ke penyimpanan umum.
- Data banyak: pagination server dan filter; jangan mengambil ribuan record sekaligus.
  Form/login/TV tidak memerlukan pagination; batasi daftar notifikasi/riwayat terkait.

## 5. Interaksi, keyboard dan fokus
motion.fast/normal dari G2 untuk respons/peralihan, motion.reduced=0 saat reduced
motion. Urutan fokus mengikuti hierarki DOM, aksi utama sesudah data yang diperiksa.
Dialog mengembalikan fokus ke pemicu; submit gagal fokus ringkasan galat; pemuatan
latar tidak merebut fokus. Tooltip muncul saat fokus dan dapat ditutup Escape.
MFA enrollment: minta verifikasi terbaru, tampilkan QR sekali, konfirmasi kode sebelum faktor dianggap aktif. Menonaktifkan faktor dan mencabut sesi memerlukan server gate. Audit hash ditampilkan sebagai hasil pemeriksaan beserta cakupan/waktu, bukan jaminan tidak dapat diubah superuser.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Keamanan akun |
| label | Kode autentikator |
| placeholder | 6 digit |
| galat | Kode belum cocok. Periksa waktu perangkat dan coba lagi. |
| kosong | Belum ada autentikator terverifikasi. |
| sukses | Autentikator terverifikasi. |
| tooltip | Jangan bagikan kode atau gambar QR autentikator |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
RENCANA idle lock 5 menit untuk tampilan klinis sebagai asumsi awal; Ketua menetapkan. Kunci berbeda dari logout: data sensitif tertutup, pembukaan kembali memerlukan autentikasi. Jangan menyimpan secret TOTP di log/analytics.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: AAL2, recovery, reset email belum operasional, sesi dan pencabutan faktor.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
