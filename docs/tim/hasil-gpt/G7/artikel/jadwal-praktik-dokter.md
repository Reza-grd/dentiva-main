# Mengatur jadwal praktik dokter

**Untuk siapa:** admin.

Jadwal praktik menentukan hari dan rentang waktu dokter bekerja. Ini berbeda dari janji kunjungan pasien.

## Langkah

1. Buka **Jadwal Dokter**. Periksa daftar atau filter **Semua Dokter** sebelum menambahkan jadwal. [^langkah-1]
2. Pilih **Tambah Jadwal**, kemudian pilih dokter dan hari praktik. [^langkah-2]
3. Isi **Jam Mulai** dan **Jam Selesai**. Jam mulai harus lebih awal; satu dokter tidak dapat memiliki dua entri hari yang sama melalui formulir ini. [^langkah-3]
4. Isi **Jumlah Pasien per Hari** bila klinik memakai kapasitas tertentu, lalu periksa pratinjau slot. Bila kosong, aplikasi menampilkan interval bawaan 30 menit. [^langkah-4]
5. Pilih **Tambah Jadwal** untuk menyimpan entri baru. Untuk perubahan berikutnya, gunakan ikon **Edit** dan **Simpan Perubahan**; ikon **Nonaktifkan** dapat menghentikan penggunaan jadwal sesuai kebutuhan. [^langkah-5]

## Catatan keamanan

- Koordinasikan perubahan jadwal dengan dokter dan resepsionis. Mengubah jadwal praktik tidak membuktikan janji pasien yang sudah ada ikut dijadwal ulang.
- Jangan menghapus jadwal hanya untuk mengatasi galat tanpa memeriksa kunjungan yang terdampak.

## Artikel terkait

- [Mulai cepat untuk klinik baru](mulai-cepat-klinik-baru.md)
- [Membuat janji untuk pasien lama](kunjungan-pasien-lama.md)
- [Menangani permintaan booking online](booking-online.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:29`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:259`.
[^langkah-2]: `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:246`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:395`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:412`.
[^langkah-3]: `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:426`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:127`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:139`.
[^langkah-4]: `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:465`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:483`.
[^langkah-5]: `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:525`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:330`.
