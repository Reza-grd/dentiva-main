# Serah Terima G7b — Pusat Bantuan versi terbit

- Pembuat: GPT · Tanggal: 2026-10-17 · Cabang: `gpt/g7b-pusat-bantuan-final` · Worktree: `D:/dentiva/gpt-g7b`.
- Acuan: console terbaru saat pembuatan worktree, commit `0e4805d` (hash lengkap dalam manifest).

## Ringkasan (≤ 5 kalimat)

25 artikel G7 disunting menjadi panduan staf klinik dan satu artikel status layanan ditambahkan, sehingga totalnya 26 artikel.
Rujukan kode dipindahkan seluruhnya ke metadata peninjau, sementara nama menu dan tombol aktif dipertahankan.
Delapan topik status/bantuan dipusatkan dalam artikel status layanan dengan penanda STATUS dan tabel pemeliharaan README.
Validator memeriksa istilah internal, indeks beserta tautan, dan label tebal terhadap komponen nyata.
Hasil di-commit lokal tanpa push; tidak ada perubahan aplikasi atau akses produksi.

## Yang berubah / diserahkan (daftar berkas)

Di `docs/tim/hasil-gpt/G7/`:

- `artikel/*.md`: 25 artikel lama diperbarui; `artikel/status-layanan.md` ditambahkan.
- `glosarium.md`: bahasa pengguna dan rujukan status terpusat.
- `indeks.json`: 26 entri, termasuk `status-layanan`.
- `README.md`: jalur baca per peran, tabel “Saat fitur aktif, ubah ini”, dan petunjuk verifikasi/pemeliharaan.
- `catatan-kesesuaian.md`: dasar tinjauan Ketua, keputusan revisi, dan batas bukti.
- `sumber-langkah.json`: 138 langkah dan rujukan snapshot terbaru.
- `susun.py`: penyusun indeks, metadata langkah, dan tabel STATUS dari naskah artikel; tidak menulis ulang artikel.
- `validasi.py`, `validasi.json`, `bukti-label.json`: validator dan bukti pemeriksaan wajib.

Laporan ini disimpan sebagai `docs/tim/serah-terima/G7b.md`. Laporan historis G7 tidak diubah.

## Cara memverifikasi (perintah + langkah klik)

Dari akar worktree G7b:

```powershell
python -X utf8 docs/tim/hasil-gpt/G7/susun.py
python -X utf8 docs/tim/hasil-gpt/G7/validasi.py
 git diff --check
 git branch --show-current
```

Buka README dan ikuti jalur baca sesuai peran. Buka artikel sandi, invoice, desktop, privasi, serta FAQ; tautan status harus menuju bagian yang sesuai. Pada status layanan, periksa delapan bagian STATUS dan tautan kembali ke panduan operasional. Buka artikel lain untuk memastikan tidak ada bagian rujukan kode yang terbaca staf. Ini langkah peninjauan dokumen, bukan laporan uji klik aplikasi.

Untuk perubahan layanan berikutnya, ubah paragraf pada penanda STATUS yang bersangkutan, sesuaikan rujukan bila tombol/alur berubah, lalu jalankan kedua skrip. Tabel README serta manifest diperbarui dari naskah artikel; tidak perlu menyalin status ke artikel lain.

## Bukti (tangkapan layar / hasil tes / tautan berkas)

- [Hasil pemeriksaan](../hasil-gpt/G7/validasi.json): nol istilah terlarang pada seluruh artikel, termasuk halaman status; indeks 26 entri terurai dan seluruh tautan lokal valid.
- [Bukti label](../hasil-gpt/G7/bukti-label.json): 225 kemunculan label/segmen diperiksa; 220 literal dan lima dinamis terbukti, nol label tidak ditemukan. Label dinamis terdiri dari dua kemunculan judul versi desktop dan tiga tautan Lihat di…; angka menghitung kemunculan, bukan label unik.
- [Rujukan langkah](../hasil-gpt/G7/sumber-langkah.json): 138 langkah, 41 komponen dengan hash dan nomor baris yang diperbarui ke commit acuan. Konteks status dicatat terpisah.
- [Catatan editorial](../hasil-gpt/G7/catatan-kesesuaian.md).
- Penyusunan metadata dan validasi diulang: seluruh artefak tetap identik. Seluruh label kontrol G7 dipertahankan; tujuh pertanyaan FAQ dilepas dari cetak tebal. Terdapat 161 label/segmen unik di antara 225 kemunculan yang diperiksa.
- Tidak ada tangkapan layar, uji runtime, pengiriman email/pesan, atau pemulihan data yang diklaim dilakukan.

## Keputusan desain & alasan

- Mengikuti tinjauan Ketua pada log G7: bahasa staf menggantikan uraian infrastruktur. Contoh perubahan: bantuan pengaturan ulang sandi dijelaskan sebagai tindakan menghubungi admin klinik, tanpa istilah layanan email internal.
- Memusatkan status yang dapat berubah di satu artikel, dengan tautan singkat dari artikel lain. Jalur bantuan tidak menjanjikan fitur atau tanggal yang belum tersedia.
- Menyimpan metadata teknis terpisah agar isi artikel siap dibaca staf sekaligus tetap dapat ditelusuri peninjau.
- Mempertahankan label dan alur aktif; perubahan teks langkah terutama menyederhanakan bahasa atau mengalihkan penjelasan status ke artikel pusat. Rujukan setiap langkah diselaraskan ulang.
- Pertanyaan FAQ memakai teks biasa, sedangkan label antarmuka tetap tebal. Pengujian label dinamis memiliki bukti penyusunan, bukan pengecualian tanpa pemeriksaan.
- Naskah artikel menjadi sumber utama. Penyusun lama yang dapat mengembalikan teks internal diganti dengan penyusun metadata saja.

## Risiko, batasan, dan hal yang belum selesai

- Konten siap untuk peninjauan penerbitan; rute/halaman pusat bantuan belum diintegrasikan karena berada di luar izin perubahan G7b.
- Label ditemukan di sumber komponen, termasuk nama aksesibel, placeholder, dan bagian teks dinamis. Ini bukan bukti semua kontrol terlihat pada setiap peran/keadaan layar atau pengganti uji klik aplikasi.
- Status layanan berdasarkan instruksi pengguna dan tinjauan Ketua; tidak diuji terhadap layanan produksi. Ketua perlu memperbarui satu bagian STATUS setelah kesiapan benar-benar dikonfirmasi.
- Nama berkas, nomor baris, dan hash hanya ada di metadata/editorial; perubahan komponen berikutnya perlu dibaca ulang sebelum rujukan diperbarui.
- Tidak menambah data contoh pasien, dependency, kode aplikasi, atau klaim hukum/sertifikasi.

## Pertanyaan untuk Ketua

Tidak ada pertanyaan yang menghambat. Saat status layanan berubah, perbarui paragraf bertanda STATUS berdasarkan hasil verifikasi, lalu susun ulang metadata dan jalankan validator sebelum menerbitkan ulang.

## Daftar centang gerbang mutu (1–7) — centang yang terpenuhi + catatan

- [ ] 1. Lint/typecheck/test/build aplikasi tidak dijalankan ulang: revisi dokumentasi dengan izin tulis terbatas. Tidak mengklaim pengujian aplikasi selesai.
- [x] 2. Validator dokumentasi diperbarui dan dijalankan; memeriksa tiga syarat wajib beserta struktur, penanda, rujukan, dan hash. Tidak mengubah perilaku atau tes aplikasi.
- [ ] 3. Tidak ada perubahan visual aplikasi; tangkapan layar/runtime bukan bukti paket ini.
- [ ] 4. Dokumen mempertahankan judul, peran, langkah bernomor, catatan keamanan, dan artikel terkait. Axe/keyboard pada integrasi aplikasi belum diuji.
- [x] 5. Hanya lokasi dokumentasi yang diizinkan; tanpa rahasia, data pasien nyata, atau perubahan keamanan/produksi.
- [x] 6. Tanpa dependency atau perubahan bundel aplikasi.
- [x] 7. Artikel, glosarium, indeks, tabel pemeliharaan status, bukti, dan cara verifikasi diperbarui.
