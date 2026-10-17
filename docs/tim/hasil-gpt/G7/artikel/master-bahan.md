# Menyiapkan master bahan dan satuan stok

**Untuk siapa:** admin.

Tentukan satuan dasar sebelum mencatat pembelian. Satuan beli seperti box dapat berisi beberapa satuan dasar seperti pcs.

## Langkah

1. Buka **Biaya & Modal → Master Bahan & Gudang**. Periksa daftar agar bahan yang sama tidak dibuat dua kali. [^langkah-1]
2. Pilih **Tambah Bahan Baru**. Isi kode bahan, nama, kategori, dan satuan dasar. [^langkah-2]
3. Isi satuan beli dan faktor konversi sesuai kemasan yang diterima. Contoh sintetis: satu box berisi 100 pcs berarti faktor konversi 100; jangan memasukkan jumlah box sebagai isi per box. [^langkah-3]
4. Isi stok minimum serta pemasok bila diperlukan, lalu **Simpan**. Setelah tersimpan, gunakan **Stok Masuk** untuk mencatat pembelian; pembuatan master melalui formulir ini bukan pencatatan pembelian. [^langkah-4]
5. Untuk melihat batch, pilih ikon **Lihat Batch & Expired** pada baris bahan. Cocokkan tanggal kedaluwarsa dan sisa batch dengan kondisi gudang. [^langkah-5]

## Catatan keamanan

- Jangan menghapus bahan yang mempunyai histori stok untuk merapikan daftar. Jika ada master keliru atau ganda, koordinasikan koreksi dengan penanggung jawab klinik.
- Kode KFA atau kategori Obat bukan bukti persetujuan penggunaan klinis; penetapan obat tetap melalui dokter dan prosedur klinik.

## Artikel terkait

- [Mencatat pembelian dan stok masuk](mencatat-stok-masuk.md)
- [Memeriksa kartu stok dan mencatat opname](opname-dan-kartu-stok.md)
- [Menyiapkan biaya, resep bahan, dan membaca HPP](biaya-hpp-dan-margin.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:37`; `apps/clinic/src/components/costing/CostingDashboard.jsx:17`.
[^langkah-2]: `apps/clinic/src/components/costing/MasterBahan.jsx:187`; `apps/clinic/src/components/costing/MasterBahan.jsx:57`.
[^langkah-3]: `apps/clinic/src/components/costing/MasterBahan.jsx:291`; `apps/clinic/src/components/costing/MasterBahan.jsx:295`.
[^langkah-4]: `apps/clinic/src/components/costing/MasterBahan.jsx:303`; `apps/clinic/src/components/costing/MasterBahan.jsx:340`; `apps/clinic/src/components/costing/CostingDashboard.jsx:18`.
[^langkah-5]: `apps/clinic/src/components/costing/MasterBahan.jsx:237`; `apps/clinic/src/components/costing/MasterBahan.jsx:354`.
