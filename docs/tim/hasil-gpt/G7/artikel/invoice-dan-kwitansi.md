# Mencari dan mencetak invoice

**Untuk siapa:** resepsionis/kasir.

Cetak dari transaksi yang sudah disimpan. Gunakan invoice yang sama untuk cetak ulang agar tidak membuat transaksi ganda.

## Langkah

1. Buka **Pembayaran**. Cari nama pasien atau nomor invoice, lalu sesuaikan rentang waktu dan status bila hasil belum muncul. [^langkah-1]
2. Pilih **Detail** pada invoice yang benar. Cocokkan nomor invoice, pasien, item, total, dan status bayar. [^langkah-2]
3. Pilih **Cetak Invoice**. Periksa identitas klinik, alamat, dan rincian pada pratinjau sebelum mencetak atau menyimpan PDF melalui dialog cetak browser. [^langkah-3]
4. Untuk invoice lunas, gunakan **Kirim Ulang Invoice WA** hanya bila fitur tersedia dan pasien memberi izin WhatsApp. Baca hasil pengiriman; status ditunda atau gagal bukan bukti pesan sudah diterima. [^langkah-4]
5. Jika dialog cetak tidak muncul pada desktop, buka aplikasi web resmi yang diberikan klinik melalui browser dan cari invoice yang sama. Jangan membuat pembayaran baru untuk mencoba mencetak ulang. [^langkah-5]

## Catatan keamanan

- Invoice memuat data pasien dan transaksi. Jangan mengirim ke nomor yang belum diverifikasi atau printer yang tidak diawasi.
- Bila alamat klinik pada pratinjau tidak sesuai, hentikan pencetakan dan hubungi admin klinik. Kode cetak saat ini masih memuat alamat tetap; perubahan Profil Klinik belum membuktikan seluruh template cetak ikut benar.

## Artikel terkait

- [Mencatat pembayaran kunjungan](pembayaran-kunjungan.md)
- [Menggunakan Dentiva Desktop dan menangani pembaruan](aplikasi-desktop.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:66`; `apps/clinic/src/components/payment/PaymentList.jsx:221`; `apps/clinic/src/components/payment/PaymentList.jsx:233`; `apps/clinic/src/components/payment/PaymentList.jsx:250`.
[^langkah-2]: `apps/clinic/src/components/payment/PaymentList.jsx:326`; `apps/clinic/src/components/payment/PaymentForm.jsx:754`.
[^langkah-3]: `apps/clinic/src/components/payment/PaymentForm.jsx:762`; `apps/clinic/src/components/payment/PaymentForm.jsx:333`.
[^langkah-4]: `apps/clinic/src/components/payment/PaymentForm.jsx:772`; `apps/clinic/src/components/payment/PaymentForm.jsx:286`; `apps/clinic/src/components/payment/PaymentForm.jsx:318`.
[^langkah-5]: `apps/clinic/src/components/payment/PaymentForm.jsx:333`; `apps/clinic/src/components/auth/LoginPage.jsx:245`; `apps/clinic/src/components/payment/PaymentList.jsx:221`.
