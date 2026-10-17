# Lampiran Tingkat Layanan

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Status dan lingkup
USULAN, bukan SLA aktif. Kontrak [ISI], paket [ISI], layanan inti [ISI], wilayah
ukur dan kalender WIB [ISI]. Tidak ada klaim ketersediaan terukur saat ini.

## Pengukuran yang harus disepakati
Ketersediaan bulanan = (menit layanan dalam lingkup − menit gangguan tak tersedia)
/ menit layanan dalam lingkup ×100%. Endpoint/operasi representatif, sumber monitor
independen, interval, minimum durasi dan kriteria gagal ditetapkan Lampiran Teknis.
Pengecualian pemeliharaan harus diberi notice/batas; jangan mengecualikan semua
gangguan vendor secara sepihak hingga metrik tidak bermakna. Sengketa ukuran
ditangani dengan bukti waktu dan log yang dapat diaudit tanpa data pasien.

## Dukungan dan pemulihan
Jam kerja USULAN Senin–Jumat09.00–17.00 WIB di luar hari libur nasional; kanal
dan kapasitas personel [ISI]. Respons awal berbeda dari waktu penyelesaian.
Target internal SEV1 respons1 jam selama jam layanan; SEV2 4 jam kerja; SEV3 1 hari
kerja, seluruhnya perlu kapasitas dan persetujuan. Dukungan24/7 hanya addendum
dengan petugas siaga nyata. Tidak menjanjikan respons1 jam bila tidak ada on-call.
RPO/RTO mengacu skenario dr-backup.md: backup lokal yang ikut hilang bersama VPS
tidak memiliki jaminan pulih; angka target belum menjadi komitmen kontrak.

## Kredit, eskalasi dan peninjauan
Target ketersediaan, tingkat kredit, batas kredit, prosedur klaim dan waktu ajukan
[ISI/TINJAU setelah offsite dan pengukuran]. Jangan mengisi angka99,9% hanya untuk
membedakan paket. Eskalasi ke Ketua/pengganti dan pemilik klinik, pembaruan insiden
dengan waktu berikutnya yang jelas. Kredit layanan tidak menggantikan kewajiban
privasi/pelindungan data. Semua perubahan SLA disahkan kedua pihak dan diumumkan
sebelum berlaku sesuai kontrak. Uji DR dan monitor adalah prasyarat penawaran SLA.
