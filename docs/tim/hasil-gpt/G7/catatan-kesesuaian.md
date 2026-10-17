# Catatan editorial G7b

Acuan: `origin/console`, commit `0e4805d` (hash lengkap pada manifest). Pembaca dokumen ini adalah peninjau; naskah staf berada di `artikel/` dan `glosarium.md`.

## Dasar revisi

Catatan tinjauan Ketua pada `docs/tim/04-papan-tugas.md:67` menyatakan G7 diterima dan memverifikasi 159 dari 170 label tebal secara literal, tiga label dinamis, serta delapan judul FAQ. Tindak lanjut sebelum terbit adalah mengganti istilah internal dan memusatkan status sementara. Angka itu hasil tinjauan G7 oleh Ketua, bukan hasil validator G7b.

Seluruh paket G7, serah-terima G7, dan mikrocopy G6 dibaca sebelum penyuntingan. Perintah infrastruktur, deployment, atau pemindahan cabang dalam dokumen latar diperlakukan sebagai konteks; tidak dijalankan sebagai bagian revisi ini. G7b hanya mengubah folder G7 dan serah-terima G7b yang diotorisasi pengguna.

## Yang diperbarui

- 25 artikel lama dibersihkan dari catatan kaki teknis, bagian peninjau, nama berkas sumber, dan uraian implementasi. Menu, tombol, tujuan navigasi, pembagian peran, dan urutan kerja aktif dipertahankan.
- Satu artikel `status-layanan.md` memusatkan delapan topik status/bantuan yang sebelumnya tersebar. Tidak menjanjikan tanggal atau kepastian fitur baru. Artikel operasional menautkan bagian status yang relevan.
- Glosarium memakai bahasa pengguna dan merujuk status layanan alih-alih menyalin keterbatasan sementara.
- README memiliki tabel penanda STATUS, lokasi bagian, dan kalimat pembuka yang harus direvisi saat kesiapan layanan berubah. Tabel disusun otomatis dari artikel status agar sumber naskahnya tetap satu.
- `susun.py` kini membaca artikel sebagai naskah utama. Menjalankannya tidak mengembalikan naskah teknis lama atau menulis ulang artikel.
- Rujukan 130 langkah lama diperbarui terhadap snapshot terbaru; delapan langkah status ditambahkan. `sumber-langkah.json` menyimpan 138 langkah, penanda, nomor baris, hash 41 komponen, dan konteks dasar status.

## Keputusan isi

Batas tetap seperti izin peran, kewajiban persetujuan agen, dan pembatalan tindakan yang bersyarat tetap berada di artikel operasional. Hal itu menjelaskan cara bekerja, bukan status peluncuran sementara. Batas layanan sementara dan kendala yang memerlukan jalur bantuan ada di delapan bagian bertanda STATUS. Periksa seluruh paragraf pada suatu penanda saat layanan berubah, termasuk label Nonaktif dan jalur alternatifnya.

Pada FAQ, kalimat pertanyaan tidak lagi dicetak tebal agar tidak tertukar dengan label aplikasi. Urutan menu berpanah tetap dipertahankan; validator memeriksa setiap segmen. Label dinamis diperiksa melalui template dan bagian teks penyusunnya, bukan dimasukkan ke daftar pengecualian tanpa bukti. Metadata membedakan rujukan alur layar dari konteks keputusan layanan: keberadaan tombol bukan bukti bahwa pengiriman email atau layanan lain telah siap.

## Bukti dan batas

[validasi.json](validasi.json) melaporkan tiga pemeriksaan wajib, jumlah langkah, rujukan, serta hash sumber. [bukti-label.json](bukti-label.json) merinci setiap kemunculan label, jenis kecocokan, berkas, baris, dan penanda. [sumber-langkah.json](sumber-langkah.json) menghubungkan teks langkah terbit dengan sumber yang dibaca. Penanda sumber dicocokkan dengan berkas kerja serta commit acuan, bukan hanya nomor baris lama.

Verifikasi ini berbasis pembacaan kode dan pemeriksaan artefak, tanpa login, mutasi, unggahan nota, data pasien nyata, atau akses produksi. Tidak menjalankan ulang lint/typecheck/test/build aplikasi maupun mengklaim uji klik, axe, installer, pengiriman pesan, atau pemulihan data. Tidak ada komponen aplikasi yang diubah. Penerbitan ke halaman bantuan dan pengujian integrasinya merupakan pekerjaan berikutnya oleh pemilik area aplikasi.
