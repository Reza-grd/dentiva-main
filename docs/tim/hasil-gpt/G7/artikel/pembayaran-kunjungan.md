# Mencatat pembayaran kunjungan

**Untuk siapa:** resepsionis/kasir.

Pastikan dokter sudah menyelesaikan pelayanan. Kasir memakai akun resepsionis; pembayaran pasien berbeda dari langganan Dentiva.

## Langkah

1. Buka **Jadwal**, pilih tanggal, lalu cari kunjungan berstatus **Selesai**. Pilih tombol pembayaran pada kartu untuk membuka formulir kunjungan itu. [^langkah-1]
2. Cocokkan pasien, kunjungan, tindakan, jumlah, dan harga. Periksa biaya tambahan serta diskon sesuai kebijakan klinik; jangan mengubah pilihan klinis tanpa koordinasi dokter. [^langkah-2]
3. Isi **Uang Diterima** sesuai dana yang diterima dan pilih metode pembayaran yang sesuai, misalnya Cash, QRIS, atau Transfer Bank. Periksa **TOTAL BAYAR** sebelum melanjutkan. [^langkah-3]
4. Pilih status **Lunas**, **Bayar Sebagian**, atau **Pending** sesuai keadaan sebenarnya. Untuk QRIS, periksa notifikasi dana masuk di aplikasi bank/e-wallet klinik; menampilkan QR tidak berarti pembayaran berhasil. [^langkah-4]
5. Pilih **Simpan Pembayaran** dan tunggu konfirmasi. Jika koneksi putus atau hasil tidak jelas, buka kembali detail pembayaran yang sama sebelum mengirim ulang. [^langkah-5]
6. Buka **Pembayaran**, cari invoice atau pasien, lalu periksa status terakhir melalui **Detail**. Lanjutkan pencetakan invoice dari detail yang sudah tercatat. [^langkah-6]

## Catatan keamanan

- Status bawaan formulir adalah Lunas. Bila Uang Diterima kosong atau nol ketika Lunas dipilih, aplikasi mengisinya sebesar total tagihan saat simpan; selalu isi dan periksa nominal secara eksplisit.
- Pembayaran lunas dapat mengunci perubahan. Pembatalan/refund bukan fitur yang dijanjikan artikel ini; hubungi admin klinik dan ikuti prosedur koreksi.

## Artikel terkait

- [Mencari dan mencetak invoice](invoice-dan-kwitansi.md)
- [Melihat antrean dan memperbarui status layanan](layanan-dokter.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:61`; `apps/clinic/src/components/schedule/SchedulePage.jsx:632`; `apps/clinic/src/components/schedule/SchedulePage.jsx:634`.
[^langkah-2]: `apps/clinic/src/components/payment/PaymentForm.jsx:28`; `apps/clinic/src/components/payment/PaymentForm.jsx:1109`; `apps/clinic/src/components/payment/PaymentForm.jsx:1135`.
[^langkah-3]: `apps/clinic/src/components/payment/PaymentForm.jsx:1150`; `apps/clinic/src/components/payment/PaymentForm.jsx:1182`; `apps/clinic/src/components/payment/PaymentForm.jsx:1184`; `apps/clinic/src/components/payment/PaymentForm.jsx:712`.
[^langkah-4]: `apps/clinic/src/components/payment/PaymentForm.jsx:1204`; `apps/clinic/src/components/payment/PaymentForm.jsx:1205`; `apps/clinic/src/components/payment/QrisPanel.jsx:66`.
[^langkah-5]: `apps/clinic/src/components/payment/PaymentForm.jsx:1253`; `apps/clinic/src/components/payment/PaymentForm.jsx:258`; `apps/clinic/src/components/payment/PaymentList.jsx:326`.
[^langkah-6]: `apps/clinic/src/components/common/Sidebar.jsx:66`; `apps/clinic/src/components/payment/PaymentList.jsx:221`; `apps/clinic/src/components/payment/PaymentList.jsx:329`.
