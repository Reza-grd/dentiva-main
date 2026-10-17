# Pola Global
Versi 1.0 · Semua penambahan di bawah adalah RENCANA.

## Command palette
Ctrl+K Windows/Linux, Cmd+K macOS; jangan mengambil shortcut saat komposisi IME.
Dialog pencarian halaman/tindakan sesuai peran, bukan pencarian data pasien global.
Panah navigasi hasil, Enter membuka, Escape menutup, fokus kembali pemicu. Bila
hasil kosong: “Tidak ada halaman yang cocok. Coba kata lain.” Filter clinic_id
dan peran berasal dari izin server; daftar lokal tidak menjadi sumber otorisasi.
Tindakan destruktif membuka dialog konfirmasi dan tetap memerlukan server gate.

## Pusat notifikasi
Urutan: insiden akses yang perlu tindakan → gagal tugas → pengingat → informasi.
Setiap item memiliki waktu, kategori, status baca, satu tindakan dan deduplikasi
event. Daftar 20 per halaman, baca semua hanya per pengguna/klinik. Jangan menaruh
diagnosis/NIK/nama pasien pada preview; ringkas sebagai “Jadwal perlu ditinjau”.
Keadaan kosong, gagal, offline dan expired mengikuti komponen G2. Dibaca tidak
berarti masalah selesai. Notifikasi push/WA/email di luar lingkup kecuali sudah
ada kanal nyata; jangan menjanjikan pengiriman yang SMTP-nya belum tersedia.

## Onboarding klinik — lima langkah
1. Verifikasi profil dan zona waktu klinik (admin; jangan unggah rahasia).
2. Undang staf/peran dengan alur yang tersedia; undangan email menunggu SMTP nyata.
3. Atur jadwal praktik dan tarif awal; dokter memeriksa data klinis sesuai izin.
4. Tinjau pengaturan keamanan: TOTP, akses, kontak pemulihan; AAL2 backend dahulu.
5. Jalankan satu alur simulasi sintetis dan tinjau ringkasan kesiapan bersama tim.
Checklist menunjukkan bukti penyelesaian, bukan klik “sudah”. Dapat dilanjutkan
antarperangkat lewat server bila tersedia; belum menganggap daftar lokal sebagai
kontrol keamanan. Migrasi data nyata lewat alur pemilik yang disetujui, bukan AI.

## Mode ringkas
Tabel desktop row-compact 40 px, kontrol 36 px; ponsel hit area tetap 44 px.
Simpan preferensi pengguna tanpa data klinis. Tetap ada header sort, label kolom,
pagination dan fokus. Sembunyikan kolom sekunder lewat pemilih kolom, jangan
membuang informasi total/peringatan. Tidak menyusutkan teks penting di bawah 14 px.

## Offline, sesi berakhir, idle
Putus koneksi: tampilkan waktu pembaruan terakhir; mutasi berhenti. Setelah timeout
mutasi, baca status dahulu. Sesi berakhir: tutup informasi sensitif, arahkan masuk
ulang, jangan melanjutkan apply otomatis setelah login. Idle klinis 5 menit adalah
ASUMSI awal untuk Ketua; pemberitahuan 30 detik sebelumnya, tombol tetap aktif
tidak menjadi bypass assurance server. Recovery draft tidak melalui localStorage RME.

## Konsistensi navigasi lintas peran
Admin: bisnis/agregat, bukan daftar pasien atau kasir. Dokter: pelayanan klinis.
Resepsionis: administrasi dan pembayaran. Operator Console: operasional platform
sesuai izin operator, tidak otomatis membaca data klinis tenant. Menu hanya
menampilkan tujuan yang sah; akses URL langsung tetap diperiksa di server.
