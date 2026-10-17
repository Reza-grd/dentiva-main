# Kata Sandi dan MFA

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Akun staf, operator dan pemulihan akses. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Konfigurasi saat ini min8, huruf+angka, HIBP gagal-terbuka dan TOTP aktif (E03); bukan klaim memenuhi seluruh standar autentikasi.
2. RENCANA pemaksaan AAL2 untuk admin/dokter di database setelah UI siap; Console memiliki alur terpisah.
3. Jangan melarang paste/password manager; rate-limit dan audit login masih perlu pelaksanaan.
4. Penghapusan faktor, pemulihan akun dan reset email memerlukan verifikasi identitas; SMTP asli belum tersedia.

## Keadaan nyata dan rencana
E03/E11/E12. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua backend; klinik memverifikasi staf; operator tidak meminta sandi/TOTP. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Enroll/challenge/unenroll, token AAL1 ditolak saat wajib AAL2, pemulihan akun uji. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
