# Masuk dan keluar dengan akun pribadi

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Gunakan alamat aplikasi yang diberikan admin klinik. Kasir memakai akun dengan peran resepsionis.

## Langkah

1. Pada halaman masuk, isi **Email** dan **Password** akun Anda sendiri. Gunakan tombol bergambar mata hanya bila layar tidak terlihat orang lain. [^langkah-1]
2. Pilih **Masuk ke Sistem**. Tunggu dashboard terbuka; bila muncul galat, periksa email dan sandi sebelum mencoba lagi. [^langkah-2]
3. Buka **Menu profil pengguna** untuk memeriksa nama dan peran. Di ponsel, gunakan **Buka menu navigasi** untuk melihat menu kerja Anda. [^langkah-3]
4. Setelah selesai, buka **Menu profil pengguna → Keluar**. Pastikan halaman masuk tampil sebelum perangkat dipakai orang lain. [^langkah-4]

## Catatan keamanan

- Jangan memakai akun dokter untuk kasir atau meminjam akun admin.
- Jangan mengirim sandi, kode autentikator, atau rekaman layar formulir masuk kepada siapa pun.

## Artikel terkait

- [Mengganti sandi, lupa sandi, dan status MFA](sandi-dan-mfa.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/auth/LoginPage.jsx:188`; `apps/clinic/src/components/auth/LoginPage.jsx:203`; `apps/clinic/src/components/auth/LoginPage.jsx:214`.
[^langkah-2]: `apps/clinic/src/components/auth/LoginPage.jsx:245`; `apps/clinic/src/components/auth/LoginPage.jsx:27`.
[^langkah-3]: `apps/clinic/src/components/layout/TopBar.jsx:136`; `apps/clinic/src/components/layout/TopBar.jsx:60`.
[^langkah-4]: `apps/clinic/src/components/layout/TopBar.jsx:37`; `apps/clinic/src/components/layout/TopBar.jsx:185`.
