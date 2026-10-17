# Menjaga privasi pasien dan meminta bantuan pemulihan

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Gunakan informasi pasien hanya untuk pekerjaan yang diizinkan. Panduan operasional ini tidak menetapkan kebijakan retensi atau menjanjikan hasil pemulihan data.

## Langkah

1. Periksa peran pada **Menu profil pengguna**. Gunakan menu sesuai tugas: admin untuk bisnis/agregat, dokter untuk klinis, resepsionis untuk administrasi serta pembayaran. Jika **Akses Ditolak**, pilih **Kembali ke Dashboard** dan hubungi admin klinik bila hak akses perlu ditinjau. [^langkah-1]
2. Saat mencari atau membuka detail pasien, verifikasi penerima dan tujuan penggunaan sebelum menyalin, mencetak, atau membagikan informasi. Jangan masukkan data pasien ke Denti; gunakan panduan tanpa identitas. [^langkah-2]
3. Jika pasien meminta salinan, koreksi, atau penghapusan, teruskan ke penanggung jawab klinik melalui admin. Dokter/resepsionis berwenang dapat membuka detail pasien dan **Catat Permintaan** sesuai prosedur verifikasi klinik. Mencatat permintaan tidak otomatis mengabulkan atau menghapus data. [^langkah-3]
4. Untuk pertanyaan backup, admin dapat membuka **Pengaturan → Database** dan membaca status yang ditampilkan. **Buat Backup Sekarang (Nonaktif)** dan **Pilih File Backup (Nonaktif)** belum bisa dipakai; hubungi admin klinik untuk diteruskan ke pengelola sistem. [^langkah-4]
5. Akhiri sesi melalui **Menu profil pengguna → Keluar** ketika selesai, terutama pada perangkat bersama. Amankan hasil cetak dan unduhan sebelum menyerahkan perangkat. [^langkah-5]

## Catatan keamanan

- Backup offsite belum aktif. Backup lokal bukan jaminan pemulihan semua kejadian; jangan menjanjikan waktu pulih atau kehilangan data maksimum yang belum diuji.
- Jangan mengirim berkas backup, PDF pasien, token layar TV, atau tangkapan layar yang berisi data pasien ke layanan AI/kanal dukungan umum.
- Jika menduga informasi terlihat oleh pihak yang salah, hentikan pembagian dan segera hubungi admin klinik melalui kanal resmi tanpa meneruskan data sensitifnya.

## Artikel terkait

- [Mengganti sandi, lupa sandi, dan status MFA](sandi-dan-mfa.md)
- [Menyiapkan layar antrean TV](layar-antrean-tv.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/layout/TopBar.jsx:136`; `apps/clinic/src/components/common/Sidebar.jsx:24`; `apps/clinic/src/components/auth/AccessDenied.jsx:28`.
[^langkah-2]: `apps/clinic/src/components/patient/PatientList.jsx:350`; `apps/clinic/src/components/patient/PatientDetail.jsx:824`; `apps/clinic/src/components/ai/DentiGuideWidget.jsx:203`.
[^langkah-3]: `apps/clinic/src/components/patient/PatientDetail.jsx:831`; `apps/clinic/src/components/patient/PatientDetail.jsx:130`; `apps/clinic/src/components/patient/PatientDetail.jsx:133`.
[^langkah-4]: `apps/clinic/src/components/common/Sidebar.jsx:41`; `apps/clinic/src/components/settings/SettingsPage.jsx:387`; `apps/clinic/src/components/settings/SettingsPage.jsx:1252`; `apps/clinic/src/components/settings/SettingsPage.jsx:1263`.
[^langkah-5]: `apps/clinic/src/components/layout/TopBar.jsx:185`.
