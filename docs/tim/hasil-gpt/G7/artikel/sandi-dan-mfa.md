# Mengganti sandi, lupa sandi, dan status MFA

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Penggantian sandi tersedia ketika Anda masih bisa masuk. SMTP/email reset sandi belum aktif. Aktivasi MFA mandiri pada layar klinik juga belum tersedia pada versi yang ditinjau.

## Langkah

1. Jika masih bisa masuk, buka **Menu profil pengguna → Pengaturan → Keamanan**. [^langkah-1]
2. Isi **Password saat ini**, **Password baru**, dan **Konfirmasi password baru**. Gunakan sandi panjang dan unik; ikuti penolakan atau persyaratan server bila muncul. [^langkah-2]
3. Pilih **Update Password** dan tunggu pesan **Password berhasil diganti!**. Bila gagal, jangan menganggap sandi sudah berubah. [^langkah-3]
4. Untuk MFA, periksa bagian keamanan: tombol **Aktifkan 2FA (Nonaktif)** belum bisa digunakan. Hubungi admin klinik untuk status penerapan MFA; jangan mencari QR atau kode pemulihan di layar ini. [^langkah-4]
5. Jika lupa sandi atau tidak bisa masuk, hubungi admin klinik melalui kanal internal yang sudah dikenal. Tombol **Lupa password?** memang ada, tetapi pesan “tautan dikirim” belum membuktikan email diterima selama SMTP belum aktif. [^langkah-5]

## Catatan keamanan

- Admin klinik mengoordinasikan pemulihan dengan pengelola Dentiva bila diperlukan; tidak ada tombol reset staf yang dijanjikan di sini.
- Dukungan tidak memerlukan sandi lama, QR MFA, maupun kode sekali pakai Anda. Jangan menonaktifkan perlindungan perangkat sebagai jalan pintas.

## Catatan penggunaan

Keberadaan layanan MFA di server tidak berarti MFA sudah dipaksa atau tersedia sebagai alur aktivasi pada aplikasi klinik. Console adalah aplikasi internal yang berbeda.

## Artikel terkait

- [Masuk dan keluar dengan akun pribadi](masuk-dan-keluar.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/layout/TopBar.jsx:179`; `apps/clinic/src/components/settings/SettingsPage.jsx:383`.
[^langkah-2]: `apps/clinic/src/components/settings/SettingsPage.jsx:819`; `apps/clinic/src/components/settings/SettingsPage.jsx:827`; `apps/clinic/src/components/settings/SettingsPage.jsx:835`.
[^langkah-3]: `apps/clinic/src/components/settings/SettingsPage.jsx:852`; `apps/clinic/src/components/settings/SettingsPage.jsx:215`.
[^langkah-4]: `apps/clinic/src/components/settings/SettingsPage.jsx:810`.
[^langkah-5]: `apps/clinic/src/components/auth/LoginPage.jsx:74`; `apps/clinic/src/components/auth/LoginPage.jsx:232`.
