# Rencana Perbaikan Sebelum dan Sesudah Pengajuan PSE

| Prioritas | ID | Pekerjaan | Pelaksana | Bergantung pada | Selesai bila |
|---|---|---|---|---|---|
| 1 | KBLI | Konfirmasi kesesuaian KBLI 47901 (*platform digital intermediasi perdagangan eceran*) dengan layanan SaaS. Siapkan perubahan ke KBLI yang tepat bila perlu (KBLI 2025 sudah berlaku di OSS; kode SaaS harus dicek di OSS/BPS) | Pemilik + konsultan perizinan / helpdesk OSS-Komdigi | — | Ada jawaban tertulis OSS/Komdigi atau KBLI baru tercatat |
| 1 | H2 | Aktifkan email `halo@dentiva.id` (MX Hostinger) dan SMTP pengiriman aplikasi | Pemilik (akun), Claude (konfigurasi) | akun email | Email uji masuk; lupa kata sandi terkirim |
| 1 | H1 | Jalankan `infra/vps/sql/enkripsi-data-lama.sql`: uji dulu, lalu terapkan | Pemilik (menjalankan), Claude (memeriksa) | — | Hitungan "polos sesudah" = 0 di semua tabel |
| 1 | D1/D2 | Tayangkan perbaikan dependensi (push `main`, Vercel build ulang) | Pemilik (push) | — | `npm audit` produksi tanpa critical |
| 1 | LOK | Konfirmasi lokasi pusat data VPS dari akun/kontrak Biznet Gio | Pemilik | — | Dokumen atau tangkapan layar lokasi |
| 2 | H3 | Backup di luar server: jadwalkan `salin-backup-offsite.sh` ke penyimpanan kedua (sebaiknya di Indonesia) + gladi pulih bulanan | Pemilik (memilih tujuan), Claude | anggaran | Salinan harian ada di luar VPS; satu gladi pulih tercatat |
| 2 | H4 | Peringatan pemantauan aktif (`pantau.env`) + pemantau eksternal | Pemilik (nomor), Claude | — | Uji peringatan diterima |
| 2 | M1 | Hapus skema `backup_20260929` | Claude, dengan persetujuan pemilik | H3 selesai | Skema tidak ada |
| 2 | M2 | Kebijakan retensi `ai_usage`, `audit_logs`, `notification_logs` + pembersihan terjadwal | Pemilik (masa simpan), Claude | keputusan hukum | Cron pembersihan berjalan |
| 2 | H5 | Pindah notifikasi pasien ke WhatsApp Cloud API resmi | Pemilik (billing, template), Claude | verifikasi bisnis Meta | `WA_PROVIDER_REMINDER=meta` dan uji terkirim |
| 3 | M3 | CAPTCHA pendaftaran dan MFA opsional di aplikasi klinik | Claude | — | Fitur aktif dan teruji |
| 3 | M5 | Enkripsi tanda tangan persetujuan dan `booking_requests` | Claude | H1 | Kolom berprefiks PGP |
| 3 | M4 | Vercel Pro | Pemilik | anggaran | Paket berubah |
| 3 | M6/M7 | Penyetelan Postgres, lingkungan staging, uji penetrasi dan uji beban di staging | Claude, dengan izin pemilik | staging | Laporan uji |
| 3 | L1–L3 | Upgrade vite/quill, agregasi pengeluaran, seragamkan CORS | Claude | — | Uji lulus |
