# LAPORAN UJI PEMULIHAN BENCANA (DISASTER RECOVERY)
**PT DENTIVA TEKNOLOGI NUSANTARA**
Nomor: [ISI]/LDR/DTN/X/2026 · Tanggal uji: 11 Oktober 2026 · Disusun: [TANGGAL]

---

## 1. Ringkasan
Pada 11 Oktober 2026, Dentiva memindahkan seluruh layanan dari Supabase Cloud ke server sendiri di Jakarta. Prosesnya diawali gladi pemulihan **dari nol** sebanyak **2 (dua) kali**. Kedua gladi **lolos** verifikasi, lalu pemindahan resmi berhasil dengan jeda layanan sekitar **40 menit**. Uji ini membuktikan bahwa layanan dapat dipulihkan utuh dari cadangan ke server baru.

## 2. Lingkup dan tujuan
- **Sistem:** basis data PostgreSQL (seluruh skema, data, hak akses/RLS), Auth, Storage (berkas), fungsi edge, rahasia (vault), dan jadwal cron.
- **Tujuan:** membuktikan prosedur pemulihan lengkap, mengukur waktu pemulihan nyata (RTO), dan memastikan tidak ada data hilang (RPO).

## 3. Lingkungan
| | |
|---|---|
| Server tujuan | Biznet Gio NEO Lite MM 8.4 (4 vCPU, 8 GB RAM, 60 GB), Jakarta — Ubuntu 24.04 LTS |
| Platform | Supabase self-hosted (Docker), Caddy (TLS) |
| Sumber | Supabase Cloud (dibekukan read-only saat pemindahan) |
| Skrip | `reset-gladi.sh` → `pulihkan-ke-vps.sh` → `unggah-storage.sh` → `buat-vault.sh` → `buat-jadwal-cron.sh` → `backup-harian.sh` |

## 4. Pelaksanaan
| No | Tahap | Hasil |
|---|---|---|
| 1 | Gladi 1: salin data, storage, fungsi edge, rahasia, cron ke server kosong | Lolos |
| 2 | Verifikasi: jumlah baris per tabel, hak akses/RLS, berkas storage; 147 smoke test + 311 tes otomatis + uji alur utama lewat web staging | Lolos |
| 3 | Reset total server (`reset-gladi.sh`), lalu Gladi 2 dari nol | Lolos (verifikasi sama) |
| 4 | Pemindahan resmi ±09:05–09:45 WIB: Cloud dibekukan → dump final → pulihkan → cek jumlah baris → alihkan web klinik & console ke `api.dentiva.id` | Lolos — **143 tabel / 1.564 baris** terpindah, jumlah baris cocok |
| 5 | Uji penerimaan pemilik: login dan simpan data di aplikasi | Lolos |
| 6 | Backup harian terenkripsi pertama dan uji buka (dekripsi + manifest sha256) | Lolos |

## 5. Hasil terhadap target
| Ukuran | Target | Hasil |
|---|---|---|
| RPO (data hilang) | 0 untuk pemindahan terencana | **0** — sumber dibekukan sebelum dump final; jumlah baris cocok |
| RTO (pemindahan terencana) | ≤ 2 jam | **±40 menit** jeda layanan |
| RTO (bencana nyata, dari backup harian) | ≤ 6 jam | Diperkirakan 3–6 jam (VPS baru + pulihkan + DNS); belum diuji dari offsite |
| Keutuhan | Baris, hak akses, berkas cocok | Cocok |

## 6. Temuan dan tindak lanjut
| No | Temuan | Tindakan | Penanggung jawab | Target |
|---|---|---|---|---|
| 1 | Backup harian masih tersimpan di server yang sama (belum ada salinan offsite) | Aktifkan `salin-backup-offsite.sh` ke penyimpanan S3-kompatibel **di Indonesia** di penyedia berbeda | Direktur Utama (pengadaan) & PIC Keamanan | [TANGGAL] |
| 2 | Pemulihan dari backup harian (bukan migrasi) belum diuji penuh | Gladi bulanan sesuai `docs/backup-dr.md` §4, catat durasi | PIC Keamanan | Desember 2026 |
| 3 | RPO bencana masih ≤ 24 jam | Pertimbangkan arsip WAL setelah offsite aktif (target ≤ 15 menit) | PIC Keamanan | Q1 2027 |
| 4 | Kunci dekripsi backup (age) hanya dipegang pemilik | Simpan salinan di dua tempat aman terpisah; tunjuk pemegang cadangan | Direktur Utama | [TANGGAL] |

## 7. Kesimpulan
Prosedur pemulihan Dentiva **terbukti berfungsi**: dua pemulihan dari nol dan satu pemindahan produksi berhasil tanpa kehilangan data, dalam waktu di bawah target. Risiko terbesar yang tersisa adalah belum adanya cadangan offsite (temuan 1), yang menjadi prioritas tindak lanjut.

Rujukan: `docs/migrasi-vps-indonesia.md`, `docs/backup-dr.md`.

---

| Pelaksana | Mengetahui |
|---|---|
| &nbsp;<br>&nbsp;<br>[NAMA]<br>PIC Keamanan Informasi | &nbsp;<br>&nbsp;<br>[NAMA]<br>Direktur Utama |
