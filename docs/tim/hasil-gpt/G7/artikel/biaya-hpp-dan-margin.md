# Menyiapkan biaya, resep bahan, dan membaca HPP

**Untuk siapa:** admin.

HPP membantu memahami modal perawatan. Hasilnya bergantung pada kelengkapan harga bahan, resep bahan, overhead, dan transaksi; HPP bukan tarif pasien.

## Langkah

1. Buka **Biaya & Modal → Biaya Operasional → Tambah Biaya Overhead**. Isi kategori, nama biaya, dan jumlah bulanan, lalu **Simpan**. [^langkah-1]
2. Pada **Target & Alokasi Bulanan**, pilih periode dan gunakan **Edit Target** bila target sudah ada. Periksa total overhead serta **Estimasi Total Bobot Tindakan**, lalu **Kunci Target**. Target ini masukan perhitungan, bukan jumlah pasien yang pasti datang. [^langkah-2]
3. Buka **Resep Bahan (BOM)**. Cari dan pilih perawatan yang akan disusun, lalu **Tambah Bahan**. [^langkah-3]
4. Pilih bahan, isi jumlah rata-rata dalam satuan dasar serta **Wastage (%)**. Tinjau pilihan **Bahan Wajib**, kemudian **Simpan**. Periksa resepnya sebelum melanjutkan ke perawatan lain. [^langkah-4]
5. Buka **Lap. Profitabilitas**, pilih awal dan akhir periode, lalu baca harga jual, modal, dan margin yang tersedia. Bila belum ada data, periksa transaksi, harga bahan, dan resep; jangan menganggap data kosong sebagai laba nol yang sudah terukur. [^langkah-5]

## Catatan keamanan

- BOM adalah resep pemakaian bahan, bukan resep obat pasien. Jangan memakai estimasi bahan sebagai keputusan klinis.
- Pisahkan master overhead untuk alokasi biaya dari pencatatan pengeluaran aktual. Jangan menjanjikan perubahan BOM/target akan menghitung ulang semua histori.

## Artikel terkait

- [Menyiapkan master bahan dan satuan stok](master-bahan.md)
- [Mencatat pembelian dan stok masuk](mencatat-stok-masuk.md)
- [Mencatat pengeluaran dan memeriksa nota](mencatat-pengeluaran.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:37`; `apps/clinic/src/components/costing/CostingDashboard.jsx:15`; `apps/clinic/src/components/costing/OverheadCosts.jsx:279`; `apps/clinic/src/components/costing/OverheadCosts.jsx:363`; `apps/clinic/src/components/costing/OverheadCosts.jsx:394`.
[^langkah-2]: `apps/clinic/src/components/costing/OverheadCosts.jsx:186`; `apps/clinic/src/components/costing/OverheadCosts.jsx:222`; `apps/clinic/src/components/costing/OverheadCosts.jsx:240`; `apps/clinic/src/components/costing/OverheadCosts.jsx:262`.
[^langkah-3]: `apps/clinic/src/components/costing/CostingDashboard.jsx:16`; `apps/clinic/src/components/costing/TreatmentBOM.jsx:137`; `apps/clinic/src/components/costing/TreatmentBOM.jsx:179`.
[^langkah-4]: `apps/clinic/src/components/costing/TreatmentBOM.jsx:25`; `apps/clinic/src/components/costing/TreatmentBOM.jsx:283`; `apps/clinic/src/components/costing/TreatmentBOM.jsx:310`; `apps/clinic/src/components/costing/TreatmentBOM.jsx:317`.
[^langkah-5]: `apps/clinic/src/components/costing/CostingDashboard.jsx:21`; `apps/clinic/src/components/costing/ProfitabilityReport.jsx:102`; `apps/clinic/src/components/costing/ProfitabilityReport.jsx:43`; `apps/clinic/src/components/costing/ProfitabilityReport.jsx:44`.
