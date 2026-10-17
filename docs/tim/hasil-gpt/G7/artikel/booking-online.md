# Menangani permintaan booking online

**Untuk siapa:** resepsionis/kasir.

Booking adalah permintaan waktu dari pasien. Konfirmasi di daftar booking belum membuat data pasien maupun kunjungan secara otomatis.

## Langkah

1. Buka **Booking Online**, lalu pilih status **Menunggu**. Gunakan tombol **Muat ulang** bila perlu mengambil daftar terbaru. [^langkah-1]
2. Periksa kode booking, nama, nomor kontak, dokter, tanggal, dan jam. Cocokkan dengan daftar **Jadwal** sebelum menerima permintaan. [^langkah-2]
3. Pilih **Konfirmasi** bila tersedia, atau **Tolak** bila permintaan tidak dapat diterima. Jika menolak, isi alasan internal bila diperlukan, lalu tunggu hasil pembaruan status. [^langkah-3]
4. Gunakan **Kabari via WA**, periksa tujuan dan isi pesan di WhatsApp, lalu kirim melalui WhatsApp. Membuka tautan tidak berarti pesan sudah terkirim. [^langkah-4]
5. Untuk booking yang dikonfirmasi, gunakan **Daftarkan pasien**. Cari apakah pasien sudah tercatat; pilih alur pasien lama bila sudah ada. Jika pasien baru, lengkapi pendaftaran. Tetapkan kembali dokter, tanggal, dan jam booking saat membuat jadwal, kemudian periksa kunjungannya. [^langkah-5]

## Catatan keamanan

- Pintasan booking hanya mengisi awal nama dan nomor WA, bukan seluruh rincian kunjungan.
- Jangan menyertakan diagnosis atau informasi tambahan yang tidak diperlukan dalam pesan konfirmasi.

## Artikel terkait

- [Membuat janji untuk pasien lama](kunjungan-pasien-lama.md)
- [Mendaftarkan pasien baru](mendaftarkan-pasien-baru.md)
- [Melihat antrean dan memperbarui status layanan](layanan-dokter.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:62`; `apps/clinic/src/components/schedule/BookingRequests.jsx:12`; `apps/clinic/src/components/schedule/BookingRequests.jsx:101`.
[^langkah-2]: `apps/clinic/src/components/schedule/BookingRequests.jsx:118`; `apps/clinic/src/components/schedule/BookingRequests.jsx:121`; `apps/clinic/src/components/common/Sidebar.jsx:61`.
[^langkah-3]: `apps/clinic/src/components/schedule/BookingRequests.jsx:129`; `apps/clinic/src/components/schedule/BookingRequests.jsx:130`; `apps/clinic/src/components/schedule/BookingRequests.jsx:65`.
[^langkah-4]: `apps/clinic/src/components/schedule/BookingRequests.jsx:136`; `apps/clinic/src/components/schedule/BookingRequests.jsx:83`.
[^langkah-5]: `apps/clinic/src/components/schedule/BookingRequests.jsx:141`; `apps/clinic/src/components/schedule/BookingRequests.jsx:140`; `apps/clinic/src/components/patient/PatientRegistration.jsx:28`; `apps/clinic/src/components/patient/PatientRegistration.jsx:67`.
