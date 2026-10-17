# Mendaftarkan pasien baru

**Untuk siapa:** resepsionis/kasir.

Cari pasien terlebih dahulu untuk menghindari data ganda. Artikel ini menjelaskan pencatatan administrasi oleh resepsionis.

## Langkah

1. Buka **Data Pasien** dan cari nama atau nomor rekam medis. Jika pasien sudah ada, gunakan artikel kunjungan pasien lama. [^langkah-1]
2. Buka **Daftar Pasien**, lalu pilih **Pasien Baru**. Pada **Identitas & Jaminan**, isi nama, jenis kelamin, nomor WhatsApp, dan identitas yang sesuai. Pilihan identitas meliputi NIK, NIK ibu untuk bayi, paspor, atau lainnya; jangan mengarang NIK. [^langkah-2]
3. Catat persetujuan notifikasi WhatsApp sesuai jawaban pasien. Pilih **Lanjutkan →**, lalu lengkapi **Alamat Domisili** dengan memilih wilayah berurutan dan mengisi alamat detail. [^langkah-3]
4. Pilih **Daftar Pasien** bila hanya mendaftarkan, atau **Daftar & Jadwalkan** bila akan membuat kunjungan pertama. Tunggu dialog berhasil yang menampilkan nomor rekam medis. [^langkah-4]
5. Jika memilih penjadwalan, tekan **Lanjut ke Penjadwalan →**, isi tanggal, jam, dokter, serta keluhan kunjungan, lalu **Simpan Jadwal**. Konfirmasi hasil sebelum menutup dialog. [^langkah-5]

## Catatan keamanan

- Cocokkan identitas dengan pasien melalui prosedur klinik; jangan membacakan NIK di ruang tunggu.
- Pendaftaran dan penjadwalan adalah proses terpisah. Bila jadwal gagal setelah pasien berhasil dibuat, cari pasien yang sudah tercatat sebelum mencoba lagi.

## Artikel terkait

- [Mencari pasien dan memperbarui biodata](mencari-memperbarui-pasien.md)
- [Membuat janji untuk pasien lama](kunjungan-pasien-lama.md)
- [Menangani permintaan booking online](booking-online.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:48`; `apps/clinic/src/components/patient/PatientList.jsx:211`.
[^langkah-2]: `apps/clinic/src/components/common/Sidebar.jsx:58`; `apps/clinic/src/components/patient/PatientRegistration.jsx:473`; `apps/clinic/src/components/patient/PatientRegistration.jsx:493`; `apps/clinic/src/components/patient/PatientRegistration.jsx:569`.
[^langkah-3]: `apps/clinic/src/components/patient/PatientRegistration.jsx:63`; `apps/clinic/src/components/patient/PatientRegistration.jsx:1013`; `apps/clinic/src/components/patient/PatientRegistration.jsx:494`.
[^langkah-4]: `apps/clinic/src/components/patient/PatientRegistration.jsx:1025`; `apps/clinic/src/components/patient/PatientRegistration.jsx:1036`; `apps/clinic/src/components/patient/PatientRegistration.jsx:362`.
[^langkah-5]: `apps/clinic/src/components/patient/PatientRegistration.jsx:1186`; `apps/clinic/src/components/patient/PatientRegistration.jsx:903`; `apps/clinic/src/components/patient/PatientRegistration.jsx:1052`.
