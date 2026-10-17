# Melihat antrean dan memperbarui status layanan

**Untuk siapa:** dokter.

Status kunjungan membantu tim mengetahui proses pelayanan. Status pembayaran dikelola terpisah oleh resepsionis.

## Langkah

1. Buka **Jadwal Hari Ini**. Pilih tanggal dan filter status yang diperlukan. [^langkah-1]
2. Periksa identitas pasien dan kunjungannya. Gunakan **Profil** atau tombol **Rekam Medis** pada kartu bila perlu meninjau data sebelum melayani. [^langkah-2]
3. Untuk kunjungan **Terjadwal**, pilih **Mulai** ketika pelayanan benar-benar dimulai. Tunggu status berubah menjadi **Berlangsung**. [^langkah-3]
4. Isi dan simpan rekam medis sesuai pemeriksaan. Setelah pelayanan serta pencatatan selesai, periksa status; **Simpan Rekam Medis** juga mengirim status selesai pada kunjungan yang disimpan. Jika masih **Berlangsung**, gunakan **Selesai** pada kartu. [^langkah-4]
5. Jika kunjungan memang dibatalkan, gunakan **Batalkan** pada kunjungan yang masih Terjadwal atau Berlangsung. Pastikan status menjadi **Dibatalkan**; jangan memakai pembatalan untuk menghapus jejak pelayanan yang sudah terjadi. [^langkah-5]

## Catatan keamanan

- Jangan menandai layanan selesai hanya agar kasir dapat membuat tagihan.
- Selesai bukan berarti lunas. Jika server menolak perubahan status, ikuti alur peran yang sah dan hubungi admin klinik.

## Artikel terkait

- [Mengisi dan menyimpan rekam medis](mengisi-rekam-medis.md)
- [Mencatat odontogram dan diagnosis](odontogram-dan-diagnosis.md)
- [Mencatat pembayaran kunjungan](pembayaran-kunjungan.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:46`; `apps/clinic/src/components/schedule/SchedulePage.jsx:257`; `apps/clinic/src/components/schedule/SchedulePage.jsx:436`.
[^langkah-2]: `apps/clinic/src/components/schedule/SchedulePage.jsx:617`; `apps/clinic/src/components/schedule/SchedulePage.jsx:625`.
[^langkah-3]: `apps/clinic/src/components/schedule/SchedulePage.jsx:643`; `apps/clinic/src/components/schedule/SchedulePage.jsx:26`.
[^langkah-4]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1509`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:533`; `apps/clinic/src/components/schedule/SchedulePage.jsx:652`.
[^langkah-5]: `apps/clinic/src/components/schedule/SchedulePage.jsx:661`; `apps/clinic/src/components/schedule/SchedulePage.jsx:28`.
