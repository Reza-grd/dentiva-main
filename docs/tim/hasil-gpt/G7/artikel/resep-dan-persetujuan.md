# Menambahkan resep dan persetujuan tindakan

**Untuk siapa:** dokter.

Resep dan persetujuan terhubung dengan kunjungan. Artikel ini menjelaskan penggunaan layar, bukan rekomendasi obat atau pengganti penjelasan tindakan kepada pasien.

## Langkah

1. Buka rekam medis dan pilih kunjungan yang benar pada **Histori Kunjungan & SOAP**. Pastikan kunjungan tidak terkunci sebelum mengubah isinya. [^langkah-1]
2. Di bagian resep, cari obat pada **Cari nama obat...**, pilih obat yang benar, lalu isi dosis, frekuensi, dan jumlah sesuai keputusan dokter. Tinjau alergi; ketiadaan peringatan aplikasi tidak membuktikan obat aman. [^langkah-2]
3. Pilih tombol tambah pada baris obat dan periksa daftar resep. Pilih **Simpan Rekam Medis** untuk menyimpan perubahan. Setelah kunjungan tersimpan dan memuat resep, gunakan **Cetak Resep**. [^langkah-3]
4. Untuk kunjungan yang sudah tersimpan dan belum terkunci, pilih **Informed Consent**. Isi judul serta jenis tindakan, jelaskan tindakan melalui prosedur klinik, lalu minta pasien menandatangani kotak yang disediakan. [^langkah-4]
5. Pilih **Simpan Persetujuan**, tunggu konfirmasi berhasil, lalu periksa entri pada daftar **Informed Consents**. Klik entri tindakan tersebut bila perlu menghasilkan PDF. [^langkah-5]

## Catatan keamanan

- Jangan membubuhkan tanda tangan atas nama pasien. Jika pasien tidak dapat menandatangani, ikuti prosedur klinik dan hubungi penanggung jawab.
- Amankan hasil cetak/PDF dan berikan hanya kepada penerima yang terverifikasi. Penyimpanan tanda tangan di aplikasi bukan klaim sertifikasi tanda tangan elektronik.

## Artikel terkait

- [Mengisi dan menyimpan rekam medis](mengisi-rekam-medis.md)
- [Mencatat odontogram dan diagnosis](odontogram-dan-diagnosis.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1310`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1402`.
[^langkah-2]: `apps/clinic/src/components/medical-record/PrescriptionEntry.jsx:153`; `apps/clinic/src/components/medical-record/PrescriptionEntry.jsx:88`; `apps/clinic/src/components/medical-record/PrescriptionEntry.jsx:92`.
[^langkah-3]: `apps/clinic/src/components/medical-record/PrescriptionEntry.jsx:223`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1509`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1368`.
[^langkah-4]: `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1333`; `apps/clinic/src/components/medical-record/ConsentFormModal.jsx:140`; `apps/clinic/src/components/medical-record/ConsentFormModal.jsx:151`; `apps/clinic/src/components/medical-record/ConsentFormModal.jsx:187`.
[^langkah-5]: `apps/clinic/src/components/medical-record/ConsentFormModal.jsx:214`; `apps/clinic/src/components/medical-record/ConsentFormModal.jsx:108`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1460`; `apps/clinic/src/components/medical-record/MedicalRecordForm.jsx:1466`.
