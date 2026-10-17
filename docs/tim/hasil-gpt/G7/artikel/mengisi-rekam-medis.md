# Mengisi dan menyimpan rekam medis

**Untuk siapa:** dokter.

Gunakan akun dokter dan pastikan pasien serta tanggal kunjungan benar. Simpan secara sadar: draf sementara bukan bukti catatan sudah tercatat di server.

## Langkah

1. Buka **Data Pasien**, cari pasien, lalu pilih ikon **Rekam Medis**. Cocokkan nama dan nomor RM pada halaman yang terbuka. [^langkah-1]
2. Isi riwayat penyakit dan **Keluhan Utama**, kemudian lengkapi hasil pemeriksaan pada bagian yang sesuai. Tandai alergi hanya berdasarkan informasi yang sudah dikonfirmasi. [^langkah-2]
3. Pada **Histori Kunjungan & SOAP**, pilih kunjungan yang benar. Gunakan **Tambah Kunjungan** hanya jika memang perlu entri baru. Isi tanggal, **Keluhan (S)**, **Diagnosa (A)**, dan **Terapi/Tindakan (P)**; pilih kode ICD-10 bila sesuai. [^langkah-3]
4. Jika memakai **Template SOAP**, periksa dialog penggantian isi dan tinjau ulang hasilnya. Template menimpa isi SOAP terkait; sesuaikan dengan pemeriksaan pasien. [^langkah-4]
5. Pilih **Simpan Rekam Medis**. Tunggu pesan **Berhasil disimpan!**; jika pesan menyebut sebagian data gagal, catatan belum dapat dianggap tersimpan seluruhnya. Periksa kembali sebelum mencoba menyimpan ulang. [^langkah-5]
6. Bila banner draf muncul saat membuka kembali halaman, pilih **Pulihkan Draf** hanya setelah memastikan pasien dan isinya benar, lalu simpan ke server. Pilih **Abaikan** bila draf tidak tepat. [^langkah-6]

## Catatan keamanan

- Penyimpanan rekam medis mengirim status kunjungan selesai; pastikan pelayanan dan pencatatan memang siap sebelum menekan simpan.
- Draf memakai penyimpanan sesi browser, bukan backup atau mode kerja offline. Jangan mengandalkannya setelah menutup sesi/perangkat.
- Catatan terkunci atau tindakan yang sudah dibayar dapat membatasi penyuntingan. Jangan membuat entri ganda untuk melewati penguncian.

## Artikel terkait

- [Mencatat odontogram dan diagnosis](odontogram-dan-diagnosis.md)
- [Menambahkan resep dan persetujuan tindakan](resep-dan-persetujuan.md)
- [Melihat antrean dan memperbarui status layanan](layanan-dokter.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:48`; `apps/clinic/src/components/patient/PatientList.jsx:358`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:678`.
[^langkah-2]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:738`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:485`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:746`.
[^langkah-3]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1310`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1311`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:490`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:491`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:492`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1433`.
[^langkah-4]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:431`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1380`.
[^langkah-5]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1509`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:624`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:518`.
[^langkah-6]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:698`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:710`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:323`.
