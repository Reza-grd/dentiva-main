# Glosarium Dentiva

Istilah operasional untuk pengguna aplikasi. Penjelasan ini bukan kebijakan hukum, keputusan klinis, atau klaim sertifikasi.

| Istilah | Arti dalam panduan |
|---|---|
| Admin / Manajer Klinik | Peran pengelola bisnis, staf, jadwal praktik, dan konfigurasi klinik sesuai izin. Tidak otomatis memperoleh akses data klinis atau kasir. |
| Dokter | Peran pelayanan klinis yang mengisi rekam medis dan memperbarui status pelayanan. |
| Resepsionis / Kasir | Peran administrasi pasien, janji, booking, dan pembayaran. Kasir bukan nama peran akun terpisah. |
| Console | Aplikasi internal operator Dentiva. Bukan menu keamanan akun staf klinik. |
| Klinik | Lingkup organisasi tempat akun dan data klinik digunakan. Akun tidak memberikan hak ke klinik lain. |
| No. RM | Nomor rekam medis untuk membantu membedakan pasien. Tetap cocokkan dengan pengenal lain. |
| RME | Rekam medis elektronik. Akses serta perubahan mengikuti peran dan aturan server. |
| SOAP | Kerangka pencatatan klinis Subjective, Objective, Assessment, Plan. Pada layar saat ini terdapat Keluhan (S), Diagnosa (A), dan Terapi/Tindakan (P), serta bagian pemeriksaan lainnya. |
| Odontogram | Bagan gigi dan permukaan untuk mencatat kondisi hasil pemeriksaan. |
| ICD-10 | Kode klasifikasi diagnosis yang dipilih sesuai penilaian dokter. |
| Master Treatment | Daftar perawatan dan tarif dasar yang dikelola admin; bukan daftar kunjungan pasien. |
| Informed Consent | Pencatatan persetujuan tindakan pada kunjungan setelah proses penjelasan dan persetujuan pasien. Tanda tangan pada layar bukan pengganti proses tersebut. |
| Resep obat | Obat, dosis, frekuensi, dan jumlah yang ditetapkan dokter untuk pasien. Berbeda dari resep bahan/BOM. |
| Draf rekam medis | Salinan sementara di sesi browser sebelum penyimpanan ke server. Bukan backup, bukan janji mode offline. |
| Kunjungan Terjadwal | Janji yang telah dicatat sebagai kunjungan. Berbeda dari permintaan booking yang belum diproses. |
| Berlangsung | Status ketika pelayanan sedang berjalan. |
| Selesai | Status pelayanan selesai; bukan status dana masuk atau pembayaran lunas. |
| Booking Online | Permintaan tanggal/jam dari pasien. Konfirmasi booking belum otomatis membuat kunjungan. |
| Invoice / Faktur | Dokumen tagihan dari transaksi tercatat. Nomor invoice membantu mencari transaksi yang sama. |
| Kwitansi | Istilah bukti pembayaran; periksa status dan nominal aktual pada invoice sebelum memberikannya sebagai bukti lunas. |
| Pending | Status pembayaran yang belum dinyatakan lunas. Jangan menganggapnya dana masuk. |
| Bayar Sebagian / Cicilan | Status `partial`; formulir menyebut Bayar Sebagian, daftar Pembayaran menampilkan Cicilan. Jangan menyimpulkan ada jadwal angsuran otomatis. |
| QRIS | Metode pembayaran melalui kode QR. Kode yang tampil bukan konfirmasi penerimaan dana. |
| Langganan SaaS | Pembayaran penggunaan Dentiva oleh klinik. Berbeda dari tagihan pasien di kasir. |
| Master bahan | Daftar bahan, obat, satuan, konversi, dan atribut inventori. |
| Satuan dasar | Satuan pemakaian stok, misalnya pcs, ml, atau gr, sesuai master bahan klinik. |
| Satuan beli | Satuan pembelian, misalnya box atau botol. |
| Faktor konversi | Banyaknya satuan dasar dalam satu satuan beli. Contoh sintetis: satu box berisi 100 pcs berarti faktor 100. |
| Stok masuk | Pencatatan penerimaan pembelian yang memengaruhi persediaan. Berbeda dari sekadar membuat master bahan. |
| Batch | Kelompok stok yang dapat mempunyai tanggal kedaluwarsa tersendiri. |
| Kartu stok | Riwayat pergerakan stok menurut bahan, jenis, dan periode. |
| Opname | Penyesuaian saldo sistem berdasarkan stok fisik akhir, disertai alasan. Bukan mengisi jumlah selisih sebagai stok fisik. |
| Overhead | Biaya operasional yang dialokasikan dalam perhitungan modal perawatan, misalnya sewa atau utilitas. |
| BOM / Resep bahan | Susunan bahan dan perkiraan jumlah pemakaian per perawatan. Bukan resep obat pasien. |
| Wastage | Persentase susut yang dimasukkan pada resep bahan. Periksa kesesuaiannya dengan praktik klinik. |
| HPP | Harga pokok/modal perawatan menurut masukan dan perhitungan aplikasi. Tidak sama dengan tarif pasien. |
| Margin | Selisih harga jual dan modal pada perhitungan terkait. Periksa periode dan kelengkapan data sebelum menarik kesimpulan. |
| Denti Pemandu | Pendamping lokal untuk panduan aplikasi dan navigasi semua peran. Bukan akses data bisnis agen bagi semua staf. |
| Asisten AI | Halaman admin untuk pertanyaan ringkasan bisnis dan usulan tindakan sesuai akses/paket. Masukan pengguna dan foto nota harus bebas data pasien. |
| Usulan | Kartu perubahan yang belum dijalankan. Jawaban teks AI tidak menggantikan kartu/hasil server. |
| Setujui / Dijalankan | Perintah menjalankan usulan dan status setelah respons sukses. Selalu periksa hasil tercatat. |
| Tolak / Ditolak | Menghentikan usulan yang belum dijalankan, bukan membatalkan transaksi yang sudah terjadi. |
| Batalkan / Dibatalkan | Meminta pemulihan hasil tindakan yang didukung server. Tidak tersedia untuk semua jenis tindakan. |
| Kedaluwarsa usulan | Masa persetujuan berakhir. Minta usulan baru berdasarkan data terbaru. |
| Kuota AI | Batas pemakaian AI yang ditampilkan aplikasi. Panduan lokal Denti berbeda dari permintaan AI berkuota. |
| MFA / 2FA | Verifikasi dengan faktor tambahan. Aktivasi mandiri MFA pada layar klinik yang ditinjau belum tersedia. |
| TOTP | Kode autentikator berbasis waktu. Jangan bagikan kode atau QR penyiapannya. Penjelasan istilah ini tidak menyatakan fitur klinik sudah aktif. |
| SMTP | Layanan pengiriman email sistem. SMTP/email reset sandi belum aktif; hubungi admin klinik untuk jalur pemulihan. |
| Token layar antrean | Bagian alamat tautan TV yang memberi akses layar antrean terbatas tanpa login. Tetap jaga kerahasiaan tautannya. |
| Backup lokal | Cadangan yang berada di lingkungan penyimpanan lokal pengelola. Bukan bukti backup offsite tersedia. |
| Backup offsite | Cadangan di lokasi terpisah; belum aktif pada keadaan proyek yang diberikan. Hubungi admin klinik untuk informasi pemulihan. |
| Updater | Mekanisme pembaruan desktop. Kesiapan kode, kunci penandatanganan pembaruan, dan rilis terdistribusi adalah hal terpisah. |
| SATUSEHAT | Integrasi sistem kesehatan yang mempunyai pengaturan tersendiri. Keberadaan menu atau checklist bukan bukti sinkronisasi produksi berhasil. |

Lihat [indeks artikel](indeks.json), [panduan Denti](artikel/menggunakan-denti.md), dan [privasi serta backup](artikel/privasi-dan-backup.md) untuk langkah penggunaan.
