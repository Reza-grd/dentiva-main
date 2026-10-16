# Backup & Pemulihan Bencana (DR) — keadaan nyata & rencana

_Diperbarui 17 Okt 2026 (Ketua Tim). Dokumen ini hanya memuat yang benar-benar ada; yang belum ada ditandai **RENCANA**._

## 1. Yang berjalan sekarang

| Komponen | Keadaan |
|---|---|
| Backup harian | `infra/vps/bin/backup-harian.sh`, cron **01:30 WIB**. Satu snapshot PostgreSQL konsisten (`pg_export_snapshot`): skema, data, `pg_dump -Fc` penuh, tabel auth (`users`, `identities`, **`mfa_factors`**), metadata & berkas Storage + manifest SHA-256 |
| Enkripsi | **age** ke kunci publik pemilik (`penerima.txt`). Kunci pembuka hanya di laptop pemilik (`~/.ssh/dentiva_backup`); server **tidak bisa** membuka backup-nya sendiri. Teks polos hanya di RAM |
| Retensi lokal | 14 hari di `/opt/dentiva/backup` (±31 MB/hari) |
| Status | `terakhir.txt` (OK/GAGAL + hitungan tabel/baris) · `backup.log` |
| Pemantauan | `infra/vps/bin/pantau.sh` (cron tiap 5 menit): kontainer, API publik, disk, memori, umur backup, sertifikat HTTPS, reboot tertunda → `status.json`; peringatan WhatsApp bila `pantau.env` diisi |
| Offsite | Skrip `salin-backup-offsite.sh` **sudah terpasang tetapi belum dijadwalkan** — menunggu penyimpanan tujuan (lihat §3) |
| Uji pemulihan | Gladi pemulihan dari nol pernah dilakukan (`docs/migrasi-vps-indonesia.md`); jalur: `pulihkan-ke-vps.sh` + `unggah-storage.sh` |

## 2. Target (jujur)

| Ukuran | Sekarang | Target setelah peningkatan |
|---|---|---|
| **RPO** (data yang bisa hilang) | ≤ 24 jam (backup harian) — dan **seluruhnya di server yang sama** sampai offsite aktif | ≤ 15 menit dengan arsip WAL (RENCANA, perlu penyimpanan offsite) |
| **RTO** (waktu pulih) | ±3–6 jam (provision VPS baru + pulihkan + DNS) bila pemilik tersedia dengan kunci age | ≤ 2 jam dengan skrip pemulihan terotomasi + VPS cadangan dingin (RENCANA) |
| Risiko terbesar | Kehilangan VPS **dan** backup lokal sekaligus (satu penyedia/satu disk) | Dihapus oleh offsite (§3) |

## 3. Mengaktifkan offsite (butuh keputusan & akun pemilik)

1. Pilih penyimpanan **di luar Biznet** yang kompatibel S3 (mis. Cloudflare R2, Backblaze B2, Wasabi, atau layanan lokal berbeda penyedia). Buat bucket **privat** + kunci akses khusus bucket (hanya baca/tulis bucket itu).
2. Di server: `sudo apt install rclone`, lalu buat `/opt/dentiva/backup/offsite.env` (izin 600; isi contoh di komentar skrip: `OFFSITE_REMOTE`, `RCLONE_CONFIG_OFFSITE_*`).
3. Uji: `bash /opt/dentiva/bin/salin-backup-offsite.sh` → harus mencetak `OK … → offsite`.
4. Jadwalkan: `45 2 * * * /opt/dentiva/bin/salin-backup-offsite.sh >> /opt/dentiva/backup/offsite.log 2>&1`. `pantau.sh` otomatis mengawasi statusnya (peringatan bila GAGAL/usang).
5. Karena berkas sudah terenkripsi age, penyedia penyimpanan **tidak dapat** membaca isinya.

## 4. Gladi pemulihan (WAJIB berkala — bulanan, lalu per kuartal)

Backup yang belum pernah dipulihkan belum bisa disebut backup. Di laptop pemilik (punya kunci age) atau VPS uji:
1. Unduh backup terbaru (offsite bila aktif), buka: `age -d -i ~/.ssh/dentiva_backup dentiva-<waktu>.tar.age | tar -x`.
2. Periksa `files.sha256` (manifest) dan `hitungan.tsv` (jumlah baris per tabel) — cocokkan dengan `terakhir.txt`.
3. Pulihkan ke database **uji** (bukan produksi): `pg_restore` dari `lengkap.dump` (atau `pulihkan-ke-vps.sh` pada VPS uji).
4. Jalankan `npm run db:smoke`-setara: login uji, hitung baris tabel utama, buka satu halaman klinik terhadap database pulihan.
5. Catat hasil & durasi (RTO nyata) di tabel gladi di bawah.

| Tanggal | Sumber | Hasil | Durasi | Catatan |
|---|---|---|---|---|
| 2026-10-11 | Gladi migrasi (dari nol, diulang) | Lolos | — | tercatat di `migrasi-vps-indonesia.md` |
| _berikutnya: Nov 2026_ | | | | |

## 5. Kegagalan umum & tindakan

- **backup GAGAL** (`terakhir.txt`): lihat `backup.log`; jalankan manual `backup-harian.sh`; biasanya disk penuh/kontainer db tidak sehat.
- **Disk > 85%**: kurangi `SIMPAN_HARI`, bersihkan log Docker, perbesar disk.
- **Kunci age hilang**: backup TIDAK dapat dibuka — simpan salinan kunci di dua tempat aman terpisah (pengelola sandi + media offline).
