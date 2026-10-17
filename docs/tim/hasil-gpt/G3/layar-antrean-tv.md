# Layar Antrean TV
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/queue/QueueDisplay.jsx; utils/dentiQueue.js. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Publik ruang tunggu dengan token layar terbatas; pengelola token admin/resepsionis sesuai izin.
- Membaca nomor panggilan
- Mengenali ruang/dokter
- Mengetahui status layanan

USULAN: nomor dapat dibaca dari jarak ruang tunggu dalam uji lokasi; nol identitas lengkap tampil; stale terdeteksi setelah dua interval gagal.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Klinik + waktu → nomor dipanggil → dokter/ruang → daftar berikutnya → pesan layanan. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Layar Antrean TV                           [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Nomor besar / Dokter / Ruang                           |
|                | Nomor berikutnya / Status koneksi                      |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Antrean klinik                     |
| Nomor dipanggil: A-012             |
| Dokter / Ruang                     |
| Berikutnya: nomor saja             |
| Terakhir diperbarui…               |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Kartu](../G2/komponen/kartu.md), [Badge](../G2/komponen/badge.md), [Avatar Denti](../G2/komponen/avatar-denti.md), [Banner Offline dan Sesi](../G2/komponen/banner-sesi.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Bedakan klinik tutup, tidak ada antrean, token tidak berlaku dan jaringan putus.
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
Nomor panggilan dominan, Denti hero pendamping dan tidak menutupi nomor. Sumber melakukan polling 10 detik; stale ditandai bersama waktu pembaruan, jangan menyajikan panggilan lama seolah baru. Usulan audio memerlukan aktivasi pengelola dan fallback visual; hindari berkedip cepat. Desktop wireframe 1440 adalah minimum, uji juga TV 1920.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Antrean klinik |
| label | Nomor dipanggil |
| placeholder | Tidak berlaku pada layar publik |
| galat | Informasi antrean belum diperbarui. Silakan konfirmasi ke resepsionis. |
| kosong | Belum ada panggilan saat ini. |
| sukses | Informasi antrean diperbarui. |
| tooltip | Layar publik hanya menampilkan informasi terbatas |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Tidak menampilkan nama lengkap/No.RM/NIK/telepon/keluhan; inisial hanya bila payload publik mengizinkan. Token layar jangan masuk screenshot publik; pencabutan token memutus akses. Tidak menjadikan TV sesi staf.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha M (perkiraan relatif, Ketua menetapkan). Risiko: Token publik, polling, suara, visibilitas jarak dan privasi.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
