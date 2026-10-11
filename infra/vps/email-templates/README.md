# Template email akun Dentiva

Tugas T3, 11 Oktober 2026. Branch: `gpt/email-templates`. Lima template siap ditinjau dan dipasang oleh Claude; belum diterapkan ke server dan belum diuji kirim melalui SMTP.

| Template | Subjek |
|---|---|
| `confirmation.html` | Konfirmasi email akun Dentiva Anda |
| `recovery.html` | Atur ulang kata sandi Dentiva Anda |
| `invite.html` | Undangan bergabung di Dentiva |
| `email_change.html` | Konfirmasi perubahan email Dentiva |
| `magic_link.html` | Tautan masuk ke Dentiva |

## Kontrak template

- HTML berbahasa Indonesia, CSS inline, tabel presentasi selebar maksimal 600px (wrapper Outlook 600px), responsif pada layar kecil.
- Tombol utama dan tautan cadangan menggunakan `{{ .ConfirmationURL }}` utuh. Jangan merangkai ulang URL, menambahkan parameter, atau menaruhnya di log.
- `{{ .Email }}` adalah email akun dari GoTrue, **bukan** asumsi email baru. Isi email_change sengaja tidak menyebut alamat baru karena alur konfirmasi lama/baru dapat berbeda.
- `{{ .Token }}` ditampilkan jika tersedia, dengan petunjuk bersyarat bila halaman aplikasi meminta kode. Ini tidak menambahkan dukungan OTP ke aplikasi; Claude perlu memastikan alur kode didukung sebelum menawarkannya kepada pengguna.
- `{{ .SiteURL }}` hanya tautan navigasi situs, bukan tombol verifikasi. Claude memastikan SiteURL dan redirect yang diizinkan benar untuk web klinik, console, dan desktop.
- Tidak menggunakan gambar, font eksternal, JavaScript, pixel, atau pelacak. Matikan pelacakan klik/buka di penyedia SMTP agar URL verifikasi tidak ditulis ulang.
- Tidak mencantumkan waktu kedaluwarsa tetap; mengikuti konfigurasi GoTrue.
- Pengirim yang direncanakan: **Dentiva <no-reply@dentiva.id>**. SMTP dan DNS dikelola terpisah; tidak ada kredensial dalam direktori ini.

## Penerimaan oleh Claude

1. Tinjau lima file dan subjek; pemasangan konfigurasi server tetap tanggung jawab Claude.
2. Render memakai GoTrue versi yang dipakai server, dengan nilai sintetis. Pastikan variabel ter-escape sebagai HTML dan tidak tampil mentah.
3. Uji kelima alur memakai akun uji nonklinik: konfirmasi pendaftaran, pemulihan sandi, undangan staf, perubahan email (kedua alamat bila diaktifkan), dan magic link. Jangan memakai data pasien.
4. Pastikan tombol menuju API Indonesia, redirect ke aplikasi yang benar, tautan bekas/kedaluwarsa ditolak, dan tautan tidak dikonsumsi pemindai email sebelum pengguna mengklik. Template saja tidak mengatasi prefetch pemindai.
5. Periksa inbox dan tampilan ponsel/desktop melalui penyedia terpilih. Jangan membagikan email asli berisi tautan masuk atau OTP ke chat.
6. Verifikasi SPF/DKIM/DMARC dari email uji; laporkan hanya status PASS/FAIL, bukan header lengkap atau token.
7. Bila aplikasi tidak memiliki input OTP, hapus blok `{{ if .Token }}...{{ end }}` sebelum pemasangan, setelah menyepakati perubahan dengan pemilik.

Sumber kontrak variabel dan batasan pelacakan/prefetch: [dokumentasi Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).
