# Pusat Bantuan Dentiva — G7

25 artikel untuk admin, dokter, dan resepsionis/kasir. Disusun 17 Oktober 2026 berdasarkan kode `origin/console` pada commit `df7f178`, bukan berdasarkan rancangan layar yang belum dibangun. Ini paket konten untuk ditinjau dan diintegrasikan, belum halaman bantuan yang terpasang di aplikasi.

## Mulai dari peran Anda

| Peran | Urutan awal yang disarankan |
|---|---|
| Admin/manajer klinik | [Mulai cepat](artikel/mulai-cepat-klinik-baru.md) → [Jadwal praktik](artikel/jadwal-praktik-dokter.md) → [Master bahan](artikel/master-bahan.md) → [Biaya/HPP](artikel/biaya-hpp-dan-margin.md) → [Denti Agen](artikel/usulan-denti.md) |
| Dokter | [Masuk](artikel/masuk-dan-keluar.md) → [Layanan dokter](artikel/layanan-dokter.md) → [Rekam medis](artikel/mengisi-rekam-medis.md) → [Odontogram](artikel/odontogram-dan-diagnosis.md) → [Resep dan persetujuan](artikel/resep-dan-persetujuan.md) |
| Resepsionis/kasir | [Pendaftaran](artikel/mendaftarkan-pasien-baru.md) → [Janji pasien lama](artikel/kunjungan-pasien-lama.md) → [Booking online](artikel/booking-online.md) → [Pembayaran](artikel/pembayaran-kunjungan.md) → [Invoice](artikel/invoice-dan-kwitansi.md) |
| Semua peran | [Sandi dan MFA](artikel/sandi-dan-mfa.md), [Desktop](artikel/aplikasi-desktop.md), [Privasi dan backup](artikel/privasi-dan-backup.md), [FAQ](artikel/faq-pemecahan-masalah.md), [Glosarium](glosarium.md) |

## Berkas dan integrasi

- [indeks.json](indeks.json): array 25 objek dengan `slug`, `judul`, `peran`, dan `kata_kunci`. Lokasi artikel adalah `artikel/<slug>.md`.
- `peran` memakai nilai `admin`, `dokter`, `resepsionis`. Istilah kasir dipetakan ke resepsionis; `peran` adalah sasaran pembaca, bukan izin baru atau pengganti otorisasi aplikasi.
- Tiap artikel memiliki judul, sasaran pembaca, langkah bernomor, catatan keamanan, dan tautan artikel terkait.
- [sumber-langkah.json](sumber-langkah.json): pemetaan 130 langkah ke 41 komponen, nomor baris, penanda sumber, dan SHA-256. Catatan kaki artikel menyajikan rujukan yang sama untuk peninjau.
- [catatan-kesesuaian.md](catatan-kesesuaian.md): perbedaan dengan G3 dan fitur yang belum dapat dijanjikan.
- [validasi.py](validasi.py) dan [validasi.json](validasi.json): pemeriksaan struktur, tautan, serta kesesuaian rujukan dengan snapshot kode. [susun.py](susun.py) menyimpan sumber editorial untuk menyusun ulang artikel dan indeks.

Jalur menu dicetak tebal mengikuti teks aplikasi. Pada ponsel, buka tombol **Buka menu navigasi** dahulu bila menu belum terlihat. Gunakan bagian yang sesuai peran; menu staf memang berbeda.

Untuk penerbitan ke pusat bantuan, pindahkan catatan kaki dan bagian “Rujukan langkah untuk peninjau” ke metadata editorial atau sembunyikan dari pembaca akhir. Pertahankan manifest sumber untuk pemeliharaan. Paket ini belum menambahkan pencarian atau rute pusat bantuan ke aplikasi.

## Pemeriksaan ulang

Dari akar worktree G7:

```powershell
python -X utf8 docs/tim/hasil-gpt/G7/validasi.py
git diff --check
```

Validator hanya membaca sumber aplikasi dan menulis laporan di G7. Bila komponen berubah, jangan sekadar memperbarui hash: baca ulang alur, revisi langkah, susun ulang, lalu validasi. Jalankan `susun.py` hanya ketika sengaja menyusun ulang konten; skrip merekam HEAD saat penyusunan.

Verifikasi ini membuktikan struktur dan keberadaan rujukan. Ketepatan makna langkah diperiksa melalui pembacaan kode; klik langsung dengan akun peran di lingkungan uji masih perlu dilakukan Ketua sebelum publikasi. Tidak ada pengujian dengan data pasien nyata atau koneksi produksi.
