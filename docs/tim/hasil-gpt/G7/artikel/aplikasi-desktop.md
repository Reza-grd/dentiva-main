# Menggunakan Dentiva Desktop dan menangani pembaruan

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Dentiva Desktop menampilkan aplikasi klinik dalam jendela desktop. Data tetap memerlukan koneksi ke server; aplikasi ini bukan server lokal atau mode kerja offline.

## Langkah

1. Pada halaman masuk versi web, pilih **Unduh aplikasi desktop**. Minta admin klinik memverifikasi sumber dan installer resmi sebelum pemasangan Windows/macOS; bila perangkat menampilkan peringatan keamanan, hentikan dan minta bantuan admin. [^langkah-1]
2. Setelah pemasangan yang disetujui pengelola, buka Dentiva dan masuk dengan akun pribadi melalui **Masuk ke Sistem**. Periksa peran seperti pada aplikasi web. [^langkah-2]
3. Jika kartu **Dentiva … tersedia** muncul, simpan semua pekerjaan dahulu. Pilih **Perbarui sekarang** hanya setelah admin memastikan kanal pembaruan siap, atau **Nanti** untuk melanjutkan pekerjaan. [^langkah-3]
4. Tunggu proses unduh, pemasangan, dan mulai ulang. Jika kartu menampilkan kegagalan, periksa koneksi dan gunakan **Coba lagi** hanya setelah pekerjaan aman; bila tetap gagal, hubungi admin klinik untuk installer yang diverifikasi. [^langkah-4]
5. Jika cetak invoice tidak membuka dialog di desktop, gunakan aplikasi web resmi melalui browser dan buka invoice yang sama dari **Pembayaran → Detail → Cetak Invoice**. [^langkah-5]

## Catatan keamanan

- Jangan mematikan SmartScreen, Gatekeeper, antivirus, atau pemeriksaan tanda tangan untuk memasang aplikasi.
- Pembaruan otomatis belum dijamin aktif: konfigurasi yang ditinjau masih memakai placeholder kunci publik updater. Adanya komponen pembaruan tidak membuktikan distribusi rilis sudah siap.
- Saat offline, jangan menganggap perubahan sudah tersimpan. Setelah jaringan pulih, periksa data server sebelum mengulang transaksi.

## Catatan penggunaan

Sumber tambahan: docs/desktop.md dan apps/desktop/src-tauri/tauri.conf.json. Kesiapan installer, tanda tangan kode, dan kanal rilis perlu diverifikasi pengelola; artikel tidak memerintahkan pengguna membangun atau menerbitkan rilis.

## Artikel terkait

- [Masuk dan keluar dengan akun pribadi](masuk-dan-keluar.md)
- [Mencari dan mencetak invoice](invoice-dan-kwitansi.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/auth/LoginPage.jsx:255`.
[^langkah-2]: `apps/clinic/src/components/auth/LoginPage.jsx:245`; `apps/clinic/src/components/layout/TopBar.jsx:136`.
[^langkah-3]: `apps/clinic/src/components/common/DesktopUpdater.jsx:84`; `apps/clinic/src/components/common/DesktopUpdater.jsx:86`; `apps/clinic/src/components/common/DesktopUpdater.jsx:101`; `apps/clinic/src/components/common/DesktopUpdater.jsx:103`.
[^langkah-4]: `apps/clinic/src/components/common/DesktopUpdater.jsx:53`; `apps/clinic/src/components/common/DesktopUpdater.jsx:63`; `apps/clinic/src/components/common/DesktopUpdater.jsx:101`.
[^langkah-5]: `apps/clinic/src/components/payment/PaymentList.jsx:326`; `apps/clinic/src/components/payment/PaymentForm.jsx:762`.
