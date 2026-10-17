# Mulai cepat untuk klinik baru

**Untuk siapa:** admin.

Mulai setelah akun admin dan akses klinik Anda aktif. Siapkan profil, tarif, staf, lalu jadwal praktik. Panduan ini tidak menggantikan aktivasi klinik oleh tim Dentiva.

## Langkah

1. Buka **Dashboard**. Jika kartu **Siapkan klinik Anda** muncul, gunakan daftar tugasnya sebagai pintasan. Bila kartu sudah disembunyikan, buka tujuan yang sama melalui menu. [^langkah-1]
2. Buka **Pengaturan → Profil Klinik**. Lengkapi nama, alamat, dan telepon klinik, lalu pilih **Simpan Perubahan**. Periksa pesan **Tersimpan**. [^langkah-2]
3. Buka **Master Treatment → Tambah Treatment**. Isi kode, nama, kategori, dan harga dasar yang disetujui klinik, lalu **Simpan**. Periksa daftar sebelum menambah tarif lain. [^langkah-3]
4. Buka **Kelola Pengguna → Tambah Staf** untuk membuat akun resepsionis. Isi formulir dan sandi awal secara privat, lalu **Simpan Staf**. Formulir saat ini hanya menawarkan peran resepsionis; untuk akun dokter, hubungi admin klinik yang mengoordinasikan penyediaan akun dengan tim Dentiva. [^langkah-4]
5. Setelah akun dokter tersedia, buka **Jadwal Dokter → Tambah Jadwal**. Pilih dokter, hari, jam mulai dan selesai, lalu simpan. Ikuti artikel jadwal praktik untuk rinciannya. [^langkah-5]
6. Minta resepsionis dan dokter masuk dengan akun masing-masing. Cocokkan peran di **Menu profil pengguna** dan menu yang tersedia sebelum mulai bekerja. [^langkah-6]

## Catatan keamanan

- Gunakan satu akun per orang. Sandi awal tidak boleh dimasukkan ke laporan, tangkapan layar, atau chat tim.
- Label “Undang dokter” pada checklist belum berarti undangan email dapat digunakan. SMTP/email reset sandi belum aktif; hubungi admin klinik bila akses belum tersedia.
- Jangan memasukkan pasien nyata untuk mencoba aplikasi. Latihan memakai data sintetis di lingkungan uji yang disediakan pengelola.

## Catatan penggunaan

Checklist aplikasi memuat enam item, termasuk SATUSEHAT yang ditandai opsional. Ini status checklist perangkat lunak, bukan penetapan kewajiban hukum atau bukti integrasi produksi.

## Artikel terkait

- [Masuk dan keluar dengan akun pribadi](masuk-dan-keluar.md)
- [Mengganti sandi, lupa sandi, dan status MFA](sandi-dan-mfa.md)
- [Mengatur jadwal praktik dokter](jadwal-praktik-dokter.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:27`; `apps/clinic/src/components/dashboard/OnboardingChecklist.jsx:60`.
[^langkah-2]: `apps/clinic/src/components/common/Sidebar.jsx:41`; `apps/clinic/src/components/settings/SettingsPage.jsx:444`; `apps/clinic/src/components/settings/SettingsPage.jsx:1303`.
[^langkah-3]: `apps/clinic/src/components/common/Sidebar.jsx:36`; `apps/clinic/src/components/treatments/TreatmentMaster.jsx:179`; `apps/clinic/src/components/treatments/TreatmentMaster.jsx:421`.
[^langkah-4]: `apps/clinic/src/components/common/Sidebar.jsx:39`; `apps/clinic/src/components/admin/UserManagementPage.jsx:118`; `apps/clinic/src/components/admin/UserManagementPage.jsx:168`; `apps/clinic/src/components/admin/UserManagementPage.jsx:302`.
[^langkah-5]: `apps/clinic/src/components/common/Sidebar.jsx:29`; `apps/clinic/src/components/schedule/DoctorSchedulePage.jsx:372`.
[^langkah-6]: `apps/clinic/src/components/layout/TopBar.jsx:136`; `apps/clinic/src/components/common/Sidebar.jsx:54`.
