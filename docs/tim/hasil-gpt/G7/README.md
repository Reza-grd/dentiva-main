# Pusat Bantuan Dentiva — versi terbit G7b

26 artikel untuk admin, dokter, dan resepsionis/kasir: 25 artikel G7 disunting dan satu artikel status layanan ditambahkan. Naskah artikel memakai bahasa staf klinik; rujukan kode hanya berada pada metadata peninjau. Konten ini belum dipasang sebagai halaman bantuan di aplikasi.

## Mulai dari peran Anda

| Peran | Urutan awal |
|---|---|
| Admin/manajer klinik | [Mulai cepat](artikel/mulai-cepat-klinik-baru.md) → [Jadwal dokter](artikel/jadwal-praktik-dokter.md) → [Master bahan](artikel/master-bahan.md) → [Biaya/HPP](artikel/biaya-hpp-dan-margin.md) → [Denti Agen](artikel/usulan-denti.md) |
| Dokter | [Masuk](artikel/masuk-dan-keluar.md) → [Layanan dokter](artikel/layanan-dokter.md) → [Rekam medis](artikel/mengisi-rekam-medis.md) → [Odontogram](artikel/odontogram-dan-diagnosis.md) → [Resep dan persetujuan](artikel/resep-dan-persetujuan.md) |
| Resepsionis/kasir | [Pendaftaran](artikel/mendaftarkan-pasien-baru.md) → [Janji pasien lama](artikel/kunjungan-pasien-lama.md) → [Booking](artikel/booking-online.md) → [Pembayaran](artikel/pembayaran-kunjungan.md) → [Invoice](artikel/invoice-dan-kwitansi.md) |
| Semua peran | [Fitur yang sedang disiapkan](artikel/status-layanan.md), [Sandi dan MFA](artikel/sandi-dan-mfa.md), [Desktop](artikel/aplikasi-desktop.md), [Privasi](artikel/privasi-dan-backup.md), [FAQ](artikel/faq-pemecahan-masalah.md), [Glosarium](glosarium.md) |

## Saat fitur aktif, ubah ini

Artikel status layanan adalah satu-satunya tempat yang menjelaskan keterbatasan sementara dan jalur bantuannya. Artikel lain menautkan bagian tersebut, tanpa menyalin statusnya. Sebelum mengganti naskah, Ketua memastikan fitur sudah tersedia dan langkah baru telah diuji. Ganti kalimat pembuka di bawah **beserta seluruh paragraf pada penanda yang sama** agar nama tombol atau jalur bantuan lama tidak tertinggal. Jangan menetapkan tanggal atau menjanjikan fitur berdasarkan rencana saja.

<!-- STATUS-TABLE:begin -->
| Penanda STATUS | Berkas dan bagian | Kalimat pembuka yang harus diganti saat layanan siap |
|---|---|---|
| `STATUS:email-reset` | [artikel/status-layanan.md — email-reset](artikel/status-layanan.md#email-reset) | Pengiriman email untuk mengatur ulang sandi belum tersedia. |
| `STATUS:mfa-mandiri` | [artikel/status-layanan.md — mfa-mandiri](artikel/status-layanan.md#mfa-mandiri) | Aktivasi MFA mandiri belum tersedia. |
| `STATUS:pemulihan-data` | [artikel/status-layanan.md — pemulihan-data](artikel/status-layanan.md#pemulihan-data) | Pembuatan dan pemulihan cadangan langsung dari aplikasi belum tersedia. |
| `STATUS:desktop-pembaruan` | [artikel/status-layanan.md — desktop-pembaruan](artikel/status-layanan.md#desktop-pembaruan) | Ketersediaan pemasangan dan pembaruan desktop perlu dikonfirmasi admin klinik. |
| `STATUS:desktop-cetak` | [artikel/status-layanan.md — desktop-cetak](artikel/status-layanan.md#desktop-cetak) | Dialog cetak invoice dapat tidak muncul pada aplikasi desktop. |
| `STATUS:invoice-alamat` | [artikel/status-layanan.md — invoice-alamat](artikel/status-layanan.md#invoice-alamat) | Alamat pada invoice dapat belum sesuai profil klinik. |
| `STATUS:akun-dokter` | [artikel/status-layanan.md — akun-dokter](artikel/status-layanan.md#akun-dokter) | Pembuatan akun dokter langsung dari formulir staf belum tersedia. |
| `STATUS:koreksi-pembayaran` | [artikel/status-layanan.md — koreksi-pembayaran](artikel/status-layanan.md#koreksi-pembayaran) | Koreksi pembayaran yang sudah lunas perlu dibantu admin klinik. |
<!-- STATUS-TABLE:end -->

Tabel ini dihasilkan dari artikel status layanan. Setelah menyunting satu bagian di `artikel/status-layanan.md`, jalankan penyusun metadata dan validator. Tidak perlu menyalin perubahan status ke 25 artikel lain. Bila alur baru memakai tombol berbeda, sesuaikan penanda rujukan langkah pada `sumber-langkah.json` berdasarkan komponen yang sudah dibaca, lalu susun ulang metadata. Batas tetap seperti persetujuan agen, izin peran, dan pembatalan stok masuk tetap dijelaskan di artikel terkait; itu bukan status peluncuran sementara.

## Berkas untuk penerbitan dan peninjauan

- [indeks.json](indeks.json): 26 entri dengan `slug`, `judul`, `peran`, `kata_kunci`; setiap slug menunjuk `artikel/<slug>.md`. Peran `resepsionis` mencakup kasir. Indeks pembaca tidak memberikan hak akses aplikasi.
- `artikel/*.md` dan [glosarium.md](glosarium.md): naskah utama untuk pembaca. Tidak memuat catatan kaki kode atau bagian peninjau.
- [sumber-langkah.json](sumber-langkah.json): metadata editorial untuk 138 langkah, termasuk komponen, baris, penanda, hash, dan commit sumber. Bagian `konteks` menyimpan dasar status layanan.
- [catatan-kesesuaian.md](catatan-kesesuaian.md): keputusan editorial dan batas verifikasi G7b.
- [susun.py](susun.py): membaca naskah artikel untuk memperbarui judul indeks, manifest langkah, dan tabel STATUS. **Tidak menulis ulang artikel**, sehingga penyuntingan status tetap menjadi sumber utama.
- [validasi.py](validasi.py), [validasi.json](validasi.json), [bukti-label.json](bukti-label.json): pemeriksaan istilah, indeks/tautan, label, dan bukti sumber setiap langkah.
- [Serah-terima G7b](../../serah-terima/G7b.md).

## Pemeriksaan ulang

Dari akar worktree:

```powershell
python -X utf8 docs/tim/hasil-gpt/G7/susun.py
python -X utf8 docs/tim/hasil-gpt/G7/validasi.py
 git diff --check
```

Saat sumber aplikasi memang berubah dan sudah dibaca ulang, gunakan `susun.py --acuan <commit-yang-ditinjau>`. Tanpa opsi itu, commit acuan dipertahankan. Penyusun menolak penanda komponen yang hilang; jangan mengganti hash untuk menyembunyikan perbedaan alur.

Laporan label membedakan label literal, label dinamis yang dirakit aplikasi, dan label yang tidak ditemukan. Urutan menu berpanah diperiksa per segmen; `Untuk siapa:` bukan label aplikasi. Bukti merujuk kode, bukan klaim uji klik atau kondisi layanan produksi. Tidak ada data pasien nyata yang dipakai.
