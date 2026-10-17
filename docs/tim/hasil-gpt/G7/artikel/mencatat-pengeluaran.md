# Mencatat pengeluaran dan memeriksa nota

**Untuk siapa:** admin.

Pengeluaran dapat dicatat manual. Pindai nota adalah bantuan pengisian yang tetap perlu diperiksa; pencatatan stok masuk merupakan alur tersendiri.

## Langkah

1. Buka **Pengeluaran** dan pilih periode yang relevan. Periksa daftar untuk memastikan nota belum tercatat. [^langkah-1]
2. Pilih **Tambah**, lalu isi tanggal, kategori, jumlah, pemasok, nomor nota, dan deskripsi sesuai bukti transaksi. [^langkah-2]
3. Bila memakai **Pindai nota**, pilih foto nota pembelian yang jelas dan sudah bebas data pasien. Periksa ulang hasil pembacaan, terutama nominal, tanggal, dan pemasok. Bila AI tidak aktif atau kuota habis, lanjutkan pengisian manual. [^langkah-3]
4. Pilih **Simpan**. Bila muncul catatan transaksi mirip, bandingkan dahulu. Gunakan **Tetap simpan** hanya jika Anda telah memastikan transaksi memang berbeda dan sah. [^langkah-4]
5. Tunggu pesan **Pengeluaran disimpan.** atau **Pengeluaran diperbarui.**, lalu periksa barisnya. Untuk koreksi, gunakan ikon **Ubah** pada pengeluaran yang sama. [^langkah-5]

## Catatan keamanan

- Nota pembelian dapat dikirim ke layanan AI jika Anda memakai pindai nota. Jangan unggah nota yang memuat identitas atau rincian medis pasien.
- Jangan menghapus pengeluaran untuk menyembunyikan kesalahan. Periksa transaksi dan koordinasikan koreksi dengan penanggung jawab keuangan.

## Artikel terkait

- [Mencatat pembelian dan stok masuk](mencatat-stok-masuk.md)
- [Menyiapkan biaya, resep bahan, dan membaca HPP](biaya-hpp-dan-margin.md)
- [Menggunakan Denti dan memahami batasnya](menggunakan-denti.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:32`; `apps/clinic/src/components/financial/ExpensesPage.jsx:192`; `apps/clinic/src/components/financial/ExpensesPage.jsx:98`.
[^langkah-2]: `apps/clinic/src/components/financial/ExpensesPage.jsx:224`; `apps/clinic/src/components/financial/ExpensesPage.jsx:356`; `apps/clinic/src/components/financial/ExpensesPage.jsx:377`.
[^langkah-3]: `apps/clinic/src/components/financial/ExpensesPage.jsx:221`; `apps/clinic/src/components/financial/ExpensesPage.jsx:317`; `apps/clinic/src/components/financial/ExpensesPage.jsx:107`.
[^langkah-4]: `apps/clinic/src/components/financial/ExpensesPage.jsx:401`; `apps/clinic/src/components/financial/ExpensesPage.jsx:399`; `apps/clinic/src/components/financial/ExpensesPage.jsx:155`.
[^langkah-5]: `apps/clinic/src/components/financial/ExpensesPage.jsx:190`; `apps/clinic/src/components/financial/ExpensesPage.jsx:304`.
