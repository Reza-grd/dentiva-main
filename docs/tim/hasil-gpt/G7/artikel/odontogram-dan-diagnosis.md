# Mencatat odontogram dan diagnosis

**Untuk siapa:** dokter.

Odontogram mencatat temuan pemeriksaan. Pemilihan simbol dan diagnosis tetap menjadi tanggung jawab dokter.

## Langkah

1. Buka rekam medis pasien yang benar, lalu gulir ke bagian odontogram. Pilih **Bantuan Simbol** bila perlu melihat legenda. [^langkah-1]
2. Klik gigi atau permukaan yang diperiksa, lalu pilih kode simbol pada panel. Untuk kode yang memerlukan permukaan, pilih permukaan spesifik; ikuti pesan aplikasi bila pilihan tidak sesuai. [^langkah-2]
3. Periksa nomor gigi dan hasil tanda sebelum melanjutkan. Jika memakai simbol bridge, pilih gigi akhir pada baris yang sama sesuai petunjuk **Mode Bridge**. [^langkah-3]
4. Pada bagian diagnosis dan tindakan, cari kode/nama diagnosis serta tindakan yang benar, lalu pilih hasilnya. Catatan diagnosis bebas dan kode ICD-10 pada SOAP juga perlu diperiksa sesuai kunjungan. [^langkah-4]
5. Lengkapi bidang rekam medis yang wajib, kemudian **Simpan Rekam Medis**. Periksa hasil penyimpanan; perubahan gambar sebelum simpan belum menjadi bukti perubahan di server. [^langkah-5]

## Catatan keamanan

- Hindari “Reset Semua Gigi” untuk memperbaiki satu tanda; periksa lingkup perubahan sebelum menghapus.
- Jika tindakan terkunci karena invoice atau pembayaran, koordinasikan dengan resepsionis. Jangan mengubah diagnosis untuk menyesuaikan tagihan.

## Artikel terkait

- [Mengisi dan menyimpan rekam medis](mengisi-rekam-medis.md)
- [Menambahkan resep dan persetujuan tindakan](resep-dan-persetujuan.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/patient/PatientDetail.jsx:704`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1227`.
[^langkah-2]: `apps/clinic/src/components/medical-record/odontogram/Odontogram.jsx:226`; `apps/clinic/src/components/medical-record/odontogram/Odontogram.jsx:246`; `apps/clinic/src/components/medical-record/odontogram/Odontogram.jsx:307`.
[^langkah-3]: `apps/clinic/src/components/medical-record/odontogram/Odontogram.jsx:272`; `apps/clinic/src/components/medical-record/odontogram/Odontogram.jsx:376`.
[^langkah-4]: `apps/clinic/src/components/medical-record/DiagnosisTreatment.jsx:112`; `apps/clinic/src/components/medical-record/DiagnosisTreatment.jsx:206`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1433`.
[^langkah-5]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:500`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1509`.
