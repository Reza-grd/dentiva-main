# Biaya, Modal dan Stok
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/costing/CostingDashboard.jsx; costing/StockOpname.jsx; costing/MaterialPurchases.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Admin mengelola bahan, overhead, resep biaya, margin; dokter hanya data tindakan berizin, tidak seluruh keuangan.
- Menilai stok dan batch
- Mencatat pembelian/opname
- Mengatur overhead dan resep biaya
- Membandingkan HPP dan tarif

USULAN: 100% pengguna uji membedakan satuan beli/dasar pada fixture lidocaine; nol submit opname tanpa konfirmasi selisih.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Tab area → ringkasan sesuai tab → filter/pencarian → tabel → detail batch/biaya. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Biaya, Modal dan Stok                      [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Tabel bahan / Batch / HPP                              |
|                | Ringkasan biaya / Detail perubahan                     |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Biaya & Modal                      |
| [Area: Gudang v]                   |
| Cari bahan [Filter]                |
| Bahan | Stok | Satuan              |
| Batch dan kadaluwarsa              |
| [Stok masuk] [Opname]              |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Tab](../G2/komponen/tab.md), [Select](../G2/komponen/select.md), [Tabel Data](../G2/komponen/tabel.md), [Input](../G2/komponen/input.md), [Drawer](../G2/komponen/drawer.md), [Dialog](../G2/komponen/dialog.md), [Badge](../G2/komponen/badge.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Tambah bahan baru hanya setelah pencarian duplikat; jangan isi harga nol sebagai harga tidak diketahui.
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
Pertahankan tujuh tab sumber: overhead, BOM, master, purchase, stock_card, opname, profitability. Pada ponsel pemilih area mengganti tab scroll panjang. Selalu tampilkan konversi box→ampul/pcs, harga per satuan dan total; stock-opname menunjukkan sebelum/sesudah. Kadaluwarsa memberi teks dan tanggal, bukan warna saja.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Biaya & Modal |
| label | Satuan pembelian |
| placeholder | Pilih bahan atau pemasok |
| galat | Satuan atau harga belum cocok. Periksa sebelum menyimpan. |
| kosong | Belum ada bahan untuk filter ini. |
| sukses | Perubahan stok tercatat. |
| tooltip | Satuan beli dapat berbeda dari satuan dasar |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Pembuangan batch memerlukan alasan dan audit; jangan menghapus histori stok. HPP per tindakan bukan tarif pasien; jelaskan pembobotan overhead dan periode.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: Konversi satuan, biaya rata-rata, batch, HPP dan bulk atomik.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
