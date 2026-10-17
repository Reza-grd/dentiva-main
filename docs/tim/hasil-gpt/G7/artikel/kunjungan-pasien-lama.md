# Membuat janji untuk pasien lama

**Untuk siapa:** resepsionis/kasir.

Gunakan pasien yang sudah tercatat. Menu Jadwal menampilkan kunjungan, sedangkan alur pembuatan janji resepsionis tersedia melalui Daftar Pasien atau detail pasien.

## Langkah

1. Buka **Daftar Pasien → Pasien Lama**. [^langkah-1]
2. Cari nama, nomor RM, atau nomor WhatsApp. Ketik setidaknya dua karakter, pilih hasil yang benar, dan cocokkan identitasnya. [^langkah-2]
3. Pada **Jadwal Kunjungan Baru**, pilih dokter, tanggal, jam, dan isi keluhan atau alasan kunjungan. Cocokkan waktu dengan jadwal praktik klinik. [^langkah-3]
4. Pilih **Jadwalkan Kunjungan** dan tunggu dialog keberhasilan. Bila gagal, periksa pesan dan jadwal yang sudah ada sebelum mengirim ulang. [^langkah-4]
5. Buka **Jadwal**, pilih tanggal yang sesuai, lalu periksa pasien dan dokter pada kunjungan berstatus **Terjadwal**. [^langkah-5]

## Catatan keamanan

- Jangan membuat data pasien baru untuk kunjungan ulang.
- Alternatif: dari detail pasien pilih “Jadwalkan Kunjungan Ulang”, lalu “Simpan Jadwal”. Jangan menjanjikan bahwa pesan WhatsApp otomatis terkirim hanya karena jadwal tersimpan.

## Artikel terkait

- [Mencari pasien dan memperbarui biodata](mencari-memperbarui-pasien.md)
- [Mengatur jadwal praktik dokter](jadwal-praktik-dokter.md)
- [Menangani permintaan booking online](booking-online.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:58`; `apps/clinic/src/components/patient/PatientRegistration.jsx:28`.
[^langkah-2]: `apps/clinic/src/components/patient/PatientRegistration.jsx:1071`; `apps/clinic/src/components/patient/PatientRegistration.jsx:85`.
[^langkah-3]: `apps/clinic/src/components/patient/PatientRegistration.jsx:1141`; `apps/clinic/src/components/patient/ScheduleVisitForm.jsx:16`; `apps/clinic/src/components/patient/PatientRegistration.jsx:104`.
[^langkah-4]: `apps/clinic/src/components/patient/PatientRegistration.jsx:1155`; `apps/clinic/src/components/patient/PatientRegistration.jsx:121`.
[^langkah-5]: `apps/clinic/src/components/common/Sidebar.jsx:61`; `apps/clinic/src/components/schedule/SchedulePage.jsx:257`; `apps/clinic/src/components/schedule/SchedulePage.jsx:25`.
