# Jadwal dan Kunjungan
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/schedule/SchedulePage.jsx; schedule/DoctorSchedulePage.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Resepsionis mengatur booking; dokter melihat jadwal praktik dan kunjungan sesuai izin; admin hanya kapasitas agregat.
- Memilih tanggal/dokter
- Mendaftarkan jadwal
- Memeriksa benturan
- Memperbarui status kunjungan sesuai peran

USULAN: nol penyimpanan jadwal bentrok yang ditolak server tanpa penjelasan; ukur waktu mengubah slot dan kesalahan tanggal lokal.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Tanggal dan dokter → agenda harian → booking menunggu → detail jadwal. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Jadwal dan Kunjungan                       [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Agenda hari / Kalender / Filter                        |
|                | Booking dan detail slot                                |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Jadwal [Tanggal]                   |
| [Dokter] [Status]                  |
| 09.00  Slot / status               |
| 09.30  Slot / status               |
| [Jadwalkan kunjungan]              |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Date Picker](../G2/komponen/date-picker.md), [Select](../G2/komponen/select.md), [Tabel Data](../G2/komponen/tabel.md), [Drawer](../G2/komponen/drawer.md), [Badge](../G2/komponen/badge.md), [Dialog](../G2/komponen/dialog.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Tampilkan jam praktik dan CTA berizin; hari tutup berbeda dari kosong.
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
Pertahankan scheduled/ongoing/completed/cancelled dengan teks. Konflik diperiksa lagi server saat simpan. Jangan mengubah tanggal via toISOString UTC bila hari lokal dimaksud. Drag-drop opsional desktop, wajib alternatif Ubah waktu dengan keyboard.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Jadwal klinik |
| label | Tanggal kunjungan |
| placeholder | Pilih tanggal |
| galat | Jadwal berubah. Muat ulang sebelum memilih slot. |
| kosong | Belum ada kunjungan pada tanggal ini. |
| sukses | Jadwal kunjungan tersimpan. |
| tooltip | Jam ditampilkan dalam zona waktu klinik |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Detail identitas hanya bagi peran berizin; admin melihat slot/capacity agregat. Permintaan booking publik tidak membocorkan daftar pasien lama.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha M (perkiraan relatif, Ketua menetapkan). Risiko: Zona waktu, benturan, jadwal dokter dan data bersamaan.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
