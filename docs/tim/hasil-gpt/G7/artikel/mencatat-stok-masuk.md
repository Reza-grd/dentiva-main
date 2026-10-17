# Mencatat pembelian dan stok masuk

**Untuk siapa:** admin.

Siapkan master bahan dan nota pembelian. Periksa satuan beli serta isi per kemasan sebelum menyimpan.

## Langkah

1. Buka **Biaya & Modal → Stok Masuk**. [^langkah-1]
2. Isi tanggal pembelian dan pilih bahan pada **Pilih Bahan**. Pastikan kode/nama sesuai barang yang diterima. [^langkah-2]
3. Isi jumlah beli dan harga per satuan beli. Tinjau perhitungan jumlah satuan dasar dan total pembelian; misalnya jumlah box harus dikalikan isi per box yang benar. [^langkah-3]
4. Lengkapi pemasok, nomor faktur, dan tanggal kedaluwarsa bila ada. Cocokkan semuanya dengan nota serta kemasan fisik. [^langkah-4]
5. Pilih **Proses Pembelian**. Setelah proses berhasil, periksa perubahan melalui **Kartu Stok** dan informasi batch pada master bahan sebelum mencatat pembelian berikutnya. [^langkah-5]

## Catatan keamanan

- Jangan mengirim ulang pembelian hanya karena layar terlambat merespons; periksa kartu stok dan nomor faktur terlebih dahulu.
- Stok masuk melalui agen tidak mendukung pembatalan otomatis. Jika jumlah keliru, periksa bukti dan lakukan koreksi lewat opname yang beralasan.

## Artikel terkait

- [Menyiapkan master bahan dan satuan stok](master-bahan.md)
- [Memeriksa kartu stok dan mencatat opname](opname-dan-kartu-stok.md)
- [Menyetujui, menolak, dan membatalkan usulan Denti](usulan-denti.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:37`; `apps/clinic/src/components/costing/CostingDashboard.jsx:18`.
[^langkah-2]: `apps/clinic/src/components/costing/MaterialPurchases.jsx:132`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:146`.
[^langkah-3]: `apps/clinic/src/components/costing/MaterialPurchases.jsx:163`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:175`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:58`.
[^langkah-4]: `apps/clinic/src/components/costing/MaterialPurchases.jsx:201`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:190`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:211`.
[^langkah-5]: `apps/clinic/src/components/costing/MaterialPurchases.jsx:245`; `apps/clinic/src/components/costing/MaterialPurchases.jsx:32`; `apps/clinic/src/components/costing/CostingDashboard.jsx:19`.
