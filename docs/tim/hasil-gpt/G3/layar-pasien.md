# Daftar dan Data Pasien
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/patient/PatientList.jsx; patient/PatientDetail.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Resepsionis mengelola administrasi; dokter melihat data yang diperlukan untuk pelayanan; admin tidak mendapat daftar identitas.
- Mencari pasien
- Membedakan identitas serupa
- Mendaftar atau memperbaiki data administrasi
- Menjadwalkan kunjungan

USULAN: pencarian pasien yang benar selesai ≤20 detik tanpa salah identitas dalam uji fixture; rekam hanya metrik agregat.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Judul → pencarian/filter → hasil ringkas → detail terbatas → tindakan berizin. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Daftar dan Data Pasien                     [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Pencarian / Tabel pasien / Pagination                  |
|                | Detail administrasi terpilih                           |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Data pasien [+]                    |
| Cari nama atau nomor RM            |
| [Filter]                           |
| Nama uji / RM terbatas             |
| [Buka detail]                      |
| Sebelumnya [1] Berikutnya          |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Input](../G2/komponen/input.md), [Tabel Data](../G2/komponen/tabel.md), [Pagination](../G2/komponen/pagination.md), [Drawer](../G2/komponen/drawer.md), [Tombol](../G2/komponen/tombol.md), [Empty State](../G2/komponen/empty-state.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Tawarkan hapus filter; Tambah pasien hanya untuk peran berizin.
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
Pertahankan pagination server yang sudah ada (PatientList:20–37); pencarian reset halaman 1. Detail nomor kontak/NIK tidak tampil seluruhnya di tabel awal. Verifikasi dua pengenal sebelum memilih pasien; pencarian tidak masuk analitik pihak ketiga.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Data pasien |
| label | Cari pasien |
| placeholder | Nama atau nomor rekam medis |
| galat | Daftar pasien belum dapat dimuat. |
| kosong | Tidak ada pasien yang cocok dengan pencarian ini. |
| sukses | Data administrasi pasien diperbarui. |
| tooltip | Buka data pasien sesuai izin Anda |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Tidak ada admin bypass. Catat rekomendasi menyamakan affordance frontend dengan kebijakan RLS, bukan mengubah RLS untuk mengikuti UI. Ekspor perlu otorisasi dan audit terpisah.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha M (perkiraan relatif, Ketua menetapkan). Risiko: Pagination, nama sama, duplikasi, izin detail.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
