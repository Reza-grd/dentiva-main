# Backup dan Pemulihan Bencana

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Keadaan dan target
E05 dan docs/backup-dr.md: backup01.30 WIB, satu snapshot PostgreSQL, age,
manifest, Auth/MFA dan Storage, retensi lokal14 hari. Offsite skrip tersedia E06
namun belum tujuan/jadwal. Gladi migrasi 11 Okt dicatat, durasi tidak tersedia.

| Skenario | RPO/RTO yang boleh dinyatakan |
|---|---|
| Database rusak, snapshot lokal utuh | RPO target ≤24 jam bila backup sukses; RTO perkiraan3–6 jam, belum ukuran teruji baru |
| VPS/disk lokal hilang | RPO/RTO belum terjamin: backup dapat hilang bersama server; jangan menjanjikan24 jam |
| Setelah offsite berhasil + latihan | target awal RPO≤24 jam, RTO≤6 jam; harus diukur dan disahkan |
| Setelah WAL/PITR dan cadangan | RENCANA RPO≤15 menit, RTO≤2 jam; bukan SLA aktif |

## Kerangka pemulihan — hanya Ketua yang mengeksekusi
1. Deklarasi bencana; bekukan mutasi terdampak, catat waktu/backup terakhir sukses.
2. Pemilik/pengganti mengambil backup dan kunci age melalui kanal aman terpisah.
3. Verifikasi manifest dan keaslian sumber; uji dekripsi di lingkungan terisolasi.
4. Provision VPS bersih; pulihkan versi Postgres/extension/config yang cocok.
5. Ikuti pulihkan-ke-vps.sh dan unggah-storage.sh, tanpa menjalankannya di produksi
   lama; pulihkan data/Auth/MFA/metadata/Storage sebagai satu konsistensi logis.
6. Cocokkan hitungan, hash Storage, izin/RLS/RPC, login/TOTP, log dan kunjungan kunci.
7. Terapkan kembali pencabutan akun/penghapusan sah yang belum masuk snapshot;
   rotasi kredensial terdampak, jangan membuka akses sebelum verifikasi.
8. Uji tenant sintetis, rekonsiliasi transaksi setelah snapshot, persetujuan klinik.
9. Alihkan trafik/DNS oleh Ketua, awasi dan dokumentasikan durasi setiap langkah.

## Latihan dan bukti
Usulkan bulanan setelah offsite aktif, lalu interval berbasis risiko. Form latihan:
tanggal, backup/hash, cakupan DB/Auth/Storage, waktu mulai/layanan pulih, kehilangan
data aktual, kegagalan, perbaikan dan penandatangan. Uji skenario key hilang dan
pemilik tidak tersedia. Backup terenkripsi tanpa kunci yang dapat dipulihkan tidak
memenuhi kebutuhan kesinambungan. Jangan mengklaim checksum ukuran saja membuktikan
backup dapat dipulihkan. Rencana log eksternal tidak menggantikan backup.
