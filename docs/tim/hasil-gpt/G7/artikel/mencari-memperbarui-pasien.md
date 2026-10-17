# Mencari pasien dan memperbarui biodata

**Untuk siapa:** dokter, resepsionis/kasir.

Dokter dan resepsionis dapat membuka daftar sesuai izin. Penyuntingan biodata dalam panduan ini dilakukan resepsionis; admin bisnis tidak memiliki menu data pasien.

## Langkah

1. Buka **Data Pasien**. Ketik nama, nomor RM, nomor WA, atau alamat pada kolom pencarian, lalu tunggu hasilnya. [^langkah-1]
2. Jika belum ditemukan, periksa **Semua Gender**, **Semua Status**, serta halaman daftar. Gunakan pemilih jumlah pasien per halaman bila diperlukan. [^langkah-2]
3. Cocokkan setidaknya dua pengenal, misalnya nama dan nomor RM, kemudian pilih ikon **Lihat Detail**. Hindari memilih pasien hanya berdasarkan nama yang mirip. [^langkah-3]
4. Sebagai resepsionis, pilih **Edit Data** pada detail pasien, perbaiki biodata yang telah dikonfirmasi, lalu **Simpan**. Gunakan **Batal** bila perubahan belum tepat. Dokter yang perlu koreksi biodata dapat meminta bantuan resepsionis. [^langkah-4]
5. Periksa kembali data setelah penyimpanan berhasil. Bila muncul galat, baca pesannya dan jangan membuat pasien baru untuk menggantikan biodata yang gagal diubah. [^langkah-5]

## Catatan keamanan

- Tutup detail pasien sebelum meninggalkan meja; jangan memotret daftar pasien untuk dibagikan ke grup umum.
- Pencarian tanpa hasil bukan bukti bahwa pasien tidak ada. Periksa filter dan ejaan terlebih dahulu.

## Artikel terkait

- [Mendaftarkan pasien baru](mendaftarkan-pasien-baru.md)
- [Membuat janji untuk pasien lama](kunjungan-pasien-lama.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:48`; `apps/clinic/src/components/patient/PatientList.jsx:211`.
[^langkah-2]: `apps/clinic/src/components/patient/PatientList.jsx:227`; `apps/clinic/src/components/patient/PatientList.jsx:245`; `apps/clinic/src/components/patient/PatientList.jsx:394`.
[^langkah-3]: `apps/clinic/src/components/patient/PatientList.jsx:350`; `apps/clinic/src/components/patient/PatientDetail.jsx:400`.
[^langkah-4]: `apps/clinic/src/components/patient/PatientDetail.jsx:358`; `apps/clinic/src/components/patient/PatientDetail.jsx:374`; `apps/clinic/src/components/patient/PatientDetail.jsx:365`; `apps/clinic/src/components/patient/PatientDetail.jsx:362`.
[^langkah-5]: `apps/clinic/src/components/patient/PatientDetail.jsx:254`; `apps/clinic/src/components/patient/PatientDetail.jsx:257`.
