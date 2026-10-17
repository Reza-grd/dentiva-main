# Masuk dan Verifikasi
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/auth/LoginPage.jsx; Console modules/auth/MfaPage.tsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Semua staf masuk ke klinik sendiri; operator memakai Console terpisah.
- Masuk dengan email dan sandi
- Verifikasi TOTP bila faktor tersedia
- Minta pemulihan akses melalui kanal yang tersedia

USULAN: keberhasilan login dan verifikasi ≥95% pada uji tugas terkontrol; ukur waktu median, kegagalan dan pemulihan tanpa merekam sandi/TOTP.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Merek → judul masuk → email → sandi → Masuk → pemulihan → bantuan. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Masuk dan Verifikasi                       [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Email / Sandi / Masuk                                  |
|                | Bantuan dan status layanan                             |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Dentiva                            |
| Masuk ke klinik                    |
| Email                              |
| Sandi  [Tampilkan]                 |
| [Masuk]                            |
| Lupa sandi?                        |
| Bantuan akses                      |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Input](../G2/komponen/input.md), [Tombol](../G2/komponen/tombol.md), [Kartu](../G2/komponen/kartu.md), [Error State](../G2/komponen/error-state.md), [Dialog](../G2/komponen/dialog.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Formulir awal, bukan data kosong.
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
TOTP satu input 6 digit dengan inputMode=numeric dan autocomplete=one-time-code; paste diizinkan. QR dan secret hanya saat enrollment dan tidak muncul pada screenshot/log. Jangan mengklaim kode pemulihan bila belum ada implementasi. Form login lama min6 tidak dijadikan kebijakan baru; backend min8+huruf+angka/HIBP menurut papan Ketua. Login akun lama jangan ditolak hanya karena validasi pembuatan sandi baru.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Masuk ke Dentiva |
| label | Email kerja |
| placeholder | nama@klinik.id |
| galat | Email atau sandi belum cocok. Periksa dan coba lagi. |
| kosong | Masukkan email dan sandi untuk melanjutkan. |
| sukses | Verifikasi berhasil. Membuka ruang kerja… |
| tooltip | Tampilkan atau sembunyikan sandi |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
MFA server aktif menurut Ketua, UI/pemaksaan AAL2 klinik masih pekerjaan terpisah; autentikasi belum selesai sampai assurance level yang diwajibkan server terpenuhi. SMTP belum nyata: jangan menjanjikan email terkirim hanya karena antarmuka mengembalikan respons generik.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: Alur reset, redirect peran, MFA challenge dan akun lama.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
