# FAQ dan pemecahan masalah sehari-hari

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Mulai dari pesan yang terlihat. Bila hasil penyimpanan belum jelas, periksa status terbaru sebelum mengulangi tindakan.

## Langkah

1. **Menu hilang atau Akses Ditolak?** Periksa peran di menu profil, lalu gunakan **Kembali ke Dashboard**. Hubungi admin klinik bila pembagian tugas tidak sesuai; jangan mencoba akun orang lain atau mengubah alamat untuk melewati izin. [^langkah-1]
2. **Email reset tidak datang atau lupa sandi?** Hubungi admin klinik. **Lupa password?** masih dapat menampilkan pesan pengiriman, tetapi SMTP/email reset sandi belum aktif; jangan menunggu email sebagai satu-satunya jalur pemulihan. [^langkah-2]
3. **Halaman gagal dimuat?** Periksa jaringan terlebih dahulu. Pada galat daftar Pembayaran gunakan **Coba lagi**; pada layar **Aplikasi Mengalami Kendala** gunakan **Muat Ulang Halaman** setelah menilai pekerjaan yang belum tersimpan. Catat pesan galat tanpa data pasien bila tetap gagal. [^langkah-3]
4. **Pembayaran atau usulan Denti belum jelas hasilnya?** Buka detail transaksi atau menu hasil usulan dan periksa status. Pesan jawaban AI, QR yang tampil, atau tombol yang sudah ditekan belum membuktikan proses selesai. Jangan mengulang simpan atau Setujui sebelum memeriksa. [^langkah-4]
5. **Denti sibuk, kuota habis, atau tidak menjawab?** Baca pesan di **Asisten AI** dan periksa kuota. Gunakan **Pengeluaran** atau **Biaya & Modal** untuk pekerjaan manual sesuai izin; coba AI kembali kemudian tanpa mengirim data pasien. [^langkah-5]
6. **Backup atau pemulihan data diperlukan?** Hubungi admin klinik. Tombol backup/restore belum aktif, backup offsite belum aktif, dan pengelola perlu memeriksa cadangan serta pilihan pemulihan sebelum memberi keputusan. [^langkah-6]
7. **Klinik ditangguhkan atau pendaftaran belum aktif?** Baca keterangan layar, hubungi admin klinik agar berkoordinasi dengan tim Dentiva, lalu pilih **Periksa lagi** setelah ada pembaruan status. Tombol ini memeriksa ulang, bukan mengaktifkan klinik sendiri. [^langkah-7]

## Catatan keamanan

- Saat melapor, berikan nama menu, waktu kejadian, jenis perangkat, dan pesan galat yang sudah disamarkan. Jangan mengirim sandi, token, NIK, atau rekam medis.
- Jangan membersihkan penyimpanan browser, memasang ulang aplikasi, atau menutup sesi saat ada pekerjaan yang belum tersimpan tanpa menilai dampaknya bersama admin.

## Artikel terkait

- [Mengganti sandi, lupa sandi, dan status MFA](sandi-dan-mfa.md)
- [Mencatat pembayaran kunjungan](pembayaran-kunjungan.md)
- [Menyetujui, menolak, dan membatalkan usulan Denti](usulan-denti.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/layout/TopBar.jsx:136`; `apps/clinic/src/components/auth/AccessDenied.jsx:28`.
[^langkah-2]: `apps/clinic/src/components/auth/LoginPage.jsx:74`; `apps/clinic/src/components/auth/LoginPage.jsx:232`.
[^langkah-3]: `apps/clinic/src/components/payment/PaymentList.jsx:273`; `apps/clinic/src/components/common/ErrorBoundary.jsx:32`; `apps/clinic/src/components/common/ErrorBoundary.jsx:41`.
[^langkah-4]: `apps/clinic/src/components/payment/PaymentList.jsx:326`; `apps/clinic/src/components/ai/AgentActions.jsx:104`; `apps/clinic/src/components/payment/QrisPanel.jsx:66`.
[^langkah-5]: `apps/clinic/src/components/ai/AiAssistantPage.jsx:482`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:264`; `apps/clinic/src/components/common/Sidebar.jsx:32`; `apps/clinic/src/components/common/Sidebar.jsx:37`.
[^langkah-6]: `apps/clinic/src/components/settings/SettingsPage.jsx:1252`; `apps/clinic/src/components/settings/SettingsPage.jsx:1263`.
[^langkah-7]: `apps/clinic/src/components/auth/ClinicUnavailable.jsx:19`; `apps/clinic/src/components/auth/ClinicUnavailable.jsx:28`.
