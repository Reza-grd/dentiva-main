# Kesesuaian dengan aplikasi yang ada

Tanggal: 2026-10-17. Acuan: commit `df7f178` dari `origin/console`. Ini catatan editorial bagi Ketua, bukan janji implementasi G3 atau laporan pengujian produksi.

## Sumber yang didahulukan

Ringkasan proyek dan aturan tim dibaca lebih dulu, kemudian seluruh spesifikasi layar/teks G3, mikrocopy G6, `docs/denti-agen.md`, dan `docs/desktop.md`. Label dan percabangan peran ditentukan dari komponen nyata serta `apps/clinic/src/App.jsx`. Nomor baris setiap langkah dan hash komponen tercantum dalam `sumber-langkah.json`; validasi akan gagal jika sumber berubah.

Instruksi kerja di dokumen tim dipakai sesuai tugas G7 yang diotorisasi pengguna: worktree sendiri, perubahan hanya di dua lokasi dokumentasi yang diminta, commit lokal. Contoh perintah deployment, pemasangan kunci, rilis desktop, atau migrasi dalam dokumen sumber diperlakukan sebagai konteks; tidak dijalankan.

## Perbedaan dan keputusan editorial

| Area | G3 / dokumen rencana | Kode yang ditinjau dan keputusan G7 |
|---|---|---|
| Login | Judul dan label baru “Masuk ke Dentiva”, “Email kerja” | `auth/LoginPage.jsx` memakai Email, Password, Masuk ke Sistem. Artikel mengikuti label ini. |
| MFA | Enrollment QR/TOTP dan pemulihan dirancang di G3 | `settings/SettingsPage.jsx:809` menonaktifkan tombol 2FA. Artikel hanya menjelaskan status dan jalur admin; tidak memberi langkah pemindaian QR, kode pemulihan, pencabutan sesi, atau klaim MFA dipaksa. |
| Lupa sandi | Desain pemulihan email | `auth/LoginPage.jsx` sudah punya tombol dan teks pengiriman. Keadaan layanan dari pengguna: SMTP/email reset belum aktif. Artikel mengutamakan hubungi admin klinik, bukan menunggu email. |
| Sandi | G3 mengacu kebijakan server yang lebih kuat daripada validasi formulir lama | `settings/SettingsPage.jsx` masih memeriksa minimal enam karakter. Artikel tidak mengajarkan enam karakter sebagai rekomendasi; sarankan sandi panjang/unik dan ikuti penolakan server. Konfigurasi server tidak diuji G7. |
| Onboarding | Lima langkah usulan G3 | `dashboard/OnboardingChecklist.jsx:9` memuat enam item. G7 mengikuti pintasan yang ada, tanpa mengklaim checklist sebagai bukti kepatuhan atau integrasi. |
| Akun dokter | Checklist menyebut Undang dokter | `admin/UserManagementPage.jsx:276` hanya menawarkan resepsionis; baris 279 menjelaskan akun dokter dibuat/diverifikasi tim Dentiva. Artikel memakai Kelola Pengguna untuk resepsionis dan eskalasi pengadaan dokter. Tidak menjanjikan undangan SMTP. |
| Janji resepsionis | Spesifikasi Jadwal menyediakan aksi umum | `schedule/SchedulePage.jsx:331` menyembunyikan Tambah Jadwal bagi resepsionis. Artikel memakai Daftar Pasien → Pasien Lama; detail pasien juga memiliki Jadwalkan Kunjungan Ulang. |
| Booking | Potensi asumsi konfirmasi langsung menjadi janji | `schedule/BookingRequests.jsx:67` hanya memperbarui status; pintasan baris 140 meneruskan nama/WA saja. G7 mengharuskan pencarian pasien, pengisian dokter/tanggal/jam, serta pemeriksaan kunjungan. |
| Rekam medis | G3 mengusulkan state/error/draft yang lebih lengkap | `medical-record/MedicalRecordForm.jsx:296` menyimpan draf dalam sessionStorage; save melakukan beberapa operasi dan dapat melaporkan gagal sebagian. Artikel tidak menjanjikan autosave server, offline, atau penyimpanan atomik seluruh catatan. |
| Selesai layanan | Status terpisah dari pembayaran | `medical-record/MedicalRecordForm.jsx:533` dan `:554` juga mengirim completed saat menyimpan kunjungan. G7 memberi peringatan dampak simpan dan tidak menyuruh kasir menyelesaikan pelayanan. |
| Hak akses | Beberapa pemeriksaan lokal lama masih menyebut admin | Rute di `App.jsx` membatasi pasien ke dokter/resepsionis, RME ke dokter, pembayaran ke resepsionis. Artikel mengikuti pembatasan rute serta aturan tim; tidak memberi admin langkah pasien/klinis atau kasir. |
| Pembayaran | Usulan tampilan G3 dan istilah jumlah dibayar | `payment/PaymentForm.jsx:1146` memakai Uang Diterima; daftar menulis Cicilan untuk partial, formulir Bayar Sebagian. Status bawaan paid dan autofill nominal saat Lunas dijelaskan agar staf memeriksa eksplisit. |
| Invoice | Profil klinik dipakai dokumen | `payment/PaymentForm.jsx:336` masih memasukkan alamat tetap di template cetak. Artikel meminta cek pratinjau dan berhenti bila alamat keliru; tidak menjanjikan alamat Profil Klinik selalu diterapkan. |
| Biaya & bahan | G3 merencanakan pemilih area mobile | `costing/CostingDashboard.jsx:14` masih memakai tujuh tab. Artikel menyebut label tab nyata, tanpa drawer/pemilih area baru. |
| Agen | G3 mengusulkan kartu dan interaksi lebih kaya | `ai/AgentActions.jsx` menyediakan Setujui, Tolak, Setujui semua, Tolak semua, Lihat di…, dan Batalkan bersyarat. G7 tidak menambahkan dialog verifikasi ulang atau tombol riwayat baru. Dokumen agen menegaskan stok masuk dikoreksi lewat opname. |
| Chat AI | Teks layar menekankan ringkasan tanpa pasien | `ai/AiAssistantPage.jsx` mengirim pesan pengguna/foto nota yang dimasukkan. Artikel secara eksplisit melarang memasukkan data pasien, bukan menjamin seluruh teks otomatis bebas identitas. |
| TV | Desain menambahkan stale state/audio opsional | `queue/QueueDisplay.jsx` melakukan polling; `settings/QueueDisplayLinks.jsx` membuat token khusus. G7 tidak menjanjikan suara, ruang baru, atau indikator data usang yang belum dibuktikan. |
| Desktop | `docs/desktop.md` mencampur alur updater tersedia dan persiapan rilis | `common/DesktopUpdater.jsx` memiliki tombol pembaruan, tetapi `apps/desktop/src-tauri/tauri.conf.json:94` masih placeholder kunci publik. Artikel bersyarat dan meminta kanal diverifikasi; tidak menyatakan updater/rilis/signing sudah aktif. |
| Backup | UI Database memiliki panel Automatic Backup | `settings/SettingsPage.jsx:1240` menyatakan status belum terverifikasi; backup manual/restore nonaktif. Sesuai instruksi pengguna, offsite belum aktif dan jalur alternatif adalah admin klinik. Tidak mengulang klaim provider sebagai bukti backup terkelola. |
| Pola global | Command palette, pusat notifikasi, daftar sesi, auto-lock G3 | Bukan langkah G7. Ikon notifikasi TopBar masih placeholder; tidak diarahkan sebagai pusat bantuan atau pusat notifikasi aktif. |

## Batas verifikasi

130 langkah dibaca terhadap komponen dan dirujuk satu per satu. Validator memeriksa kecocokan teks artikel dengan manifest, nomor baris, penanda, hash sumber, kelengkapan indeks, dan tautan lokal. Keberadaan penanda tidak membuktikan makna langkah secara otomatis; pemeriksaan makna dilakukan melalui pembacaan kode.

Tidak masuk akun, menjalankan mutasi, mengirim nota, memeriksa backend produksi, menguji email, mengunduh installer, atau memvalidasi pemulihan backup. Tidak ada tangkapan layar/rekaman klik runtime yang diklaim. Ketua perlu menguji alur memakai akun peran dan fixture sintetis sebelum publikasi konten.
