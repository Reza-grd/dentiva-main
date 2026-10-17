# Memeriksa kartu stok dan mencatat opname

**Untuk siapa:** admin.

Kartu stok membantu menelusuri pergerakan. Opname menyesuaikan saldo berdasarkan hasil hitung fisik, bukan menambahkan jumlah pembelian.

## Langkah

1. Buka **Biaya & Modal → Kartu Stok**. Pilih bahan, jenis pergerakan, dan rentang tanggal untuk menelusuri selisih. [^langkah-1]
2. Hitung stok fisik dalam satuan dasar bahan. Buka **Stok Opname → Lakukan Opname Baru** untuk membuka formulir. [^langkah-2]
3. Pilih tanggal dan bahan. Bandingkan **Stok Sistem (Saat Ini)** dengan jumlah yang benar-benar ada, lalu isi **Stok Fisik Aktual** sebagai saldo akhir, bukan nilai selisih. [^langkah-3]
4. Baca **Selisih** yang ditampilkan, lalu isi **Catatan** berisi alasan yang dapat dipertanggungjawabkan, misalnya koreksi salah hitung. Pastikan arah penyesuaiannya benar. [^langkah-4]
5. Pilih **Simpan Opname**. Periksa riwayat opname serta Kartu Stok setelah proses berhasil; jika hasil belum jelas, jangan membuat opname kedua sebelum membaca saldo terbaru. [^langkah-5]

## Catatan keamanan

- Simpan bukti hitung sesuai prosedur klinik. Jangan menyesuaikan angka hanya agar cocok dengan perkiraan.
- Kartu stok bukan fitur menghapus histori. Koreksi tidak menghapus alasan transaksi sebelumnya.

## Artikel terkait

- [Mencatat pembelian dan stok masuk](mencatat-stok-masuk.md)
- [Menyiapkan master bahan dan satuan stok](master-bahan.md)
- [Menyetujui, menolak, dan membatalkan usulan Denti](usulan-denti.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:37`; `apps/clinic/src/components/costing/CostingDashboard.jsx:19`; `apps/clinic/src/components/costing/StockMovements.jsx:78`; `apps/clinic/src/components/costing/StockMovements.jsx:88`.
[^langkah-2]: `apps/clinic/src/components/costing/CostingDashboard.jsx:20`; `apps/clinic/src/components/costing/StockOpname.jsx:126`; `apps/clinic/src/components/costing/StockOpname.jsx:218`.
[^langkah-3]: `apps/clinic/src/components/costing/StockOpname.jsx:194`; `apps/clinic/src/components/costing/StockOpname.jsx:225`; `apps/clinic/src/components/costing/StockOpname.jsx:54`.
[^langkah-4]: `apps/clinic/src/components/costing/StockOpname.jsx:235`; `apps/clinic/src/components/costing/StockOpname.jsx:244`.
[^langkah-5]: `apps/clinic/src/components/costing/StockOpname.jsx:254`; `apps/clinic/src/components/costing/StockOpname.jsx:110`; `apps/clinic/src/components/costing/StockMovements.jsx:81`.
