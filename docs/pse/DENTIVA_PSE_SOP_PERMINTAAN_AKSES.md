# SOP Penanganan Permintaan Akses Resmi atas Sistem dan Data Elektronik

Berlaku untuk permintaan dari instansi atau aparat yang berwenang berdasarkan peraturan perundang-undangan. Contohnya: penegakan hukum, pengawasan Komdigi, otoritas kesehatan.

Status: **DRAF — perlu disahkan Direksi dan ditinjau penasihat hukum.**

## Prinsip
- **Tidak ada pintu belakang.** Tidak ada akun admin permanen untuk pihak eksternal, dan tidak ada akses langsung tanpa pengawasan ke server atau database.
- Data diberikan **seminimal mungkin**: hanya yang diminta, dan hanya sejauh dasar hukumnya mengizinkan.
- **Data pasien milik klinik** sebagai pengendali. Kecuali hukum melarang, klinik terkait diberi tahu.

## Langkah
1. **Penerimaan.** Permintaan diterima tertulis (surat resmi atau email dinas) di kontak resmi perusahaan, lalu dicatat di register permintaan: nomor, tanggal, instansi, petugas, ringkasan.
2. **Verifikasi kewenangan.** Pastikan identitas petugas dan instansi melalui saluran resmi instansi, bukan kontak yang tercantum di surat. Pastikan instansi berwenang atas jenis data yang diminta.
3. **Verifikasi dasar hukum.** Periksa pasal dan dasar hukum yang dirujuk, cakupan, dan jangka waktu. Bila meragukan, minta klarifikasi tertulis dan konsultasikan dengan penasihat hukum.
4. **Persetujuan internal.** Disetujui Direktur Utama atau pejabat yang ditunjuk, plus penanggung jawab pelindungan data. Persetujuan dicatat.
5. **Pembatasan cakupan.** Tentukan data minimum: klinik, periode, kolom. Data kesehatan hanya diberikan bila dasar hukumnya secara khusus mengizinkan.
6. **Pengambilan data.** Dilakukan oleh petugas Dentiva (bukan pihak peminta) lewat kueri yang tercatat. Kueri, waktu, dan pelaksananya dicatat.
7. **Penyerahan aman.** Berkas dienkripsi, kata sandi dikirim lewat kanal terpisah, dengan berita acara serah terima. Tidak menyerahkan kredensial sistem.
8. **Jejak audit.** Register memuat permintaan, verifikasi, persetujuan, kueri, berkas (hash), dan serah terima. Disimpan sesuai kebijakan retensi.
9. **Penolakan atau klarifikasi.** Bila kewenangan atau dasar hukum tidak terpenuhi, kirim tanggapan tertulis berisi alasan dan informasi yang dibutuhkan. Tidak ada data yang diberikan sebelum terpenuhi.
10. **Pemberitahuan.** Klinik pengendali diberi tahu, kecuali dilarang hukum. Insiden atau penyalahgunaan ditangani lewat prosedur respons insiden.

## Peran
| Peran | Tugas |
|---|---|
| Penerima | mencatat dan meneruskan |
| Penanggung jawab pelindungan data | verifikasi dan pembatasan cakupan |
| Direktur Utama | persetujuan |
| Petugas teknis | pengambilan dan pengamanan data |
