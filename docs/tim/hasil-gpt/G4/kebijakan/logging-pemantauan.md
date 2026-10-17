# Logging dan Pemantauan

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Audit bisnis, autentikasi, layanan dan alert. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Log minimal: aktor terverifikasi, waktu, tenant, tindakan, status dan correlation ID; bukan token atau isi RME utuh.
2. E04 mengikat isi log berantai; jangan menyebutnya kebal superuser. Jangkar eksternal dan akses log perlu review.
3. RENCANA alert di luar host dan pengujian kanal; pantau.sh di host belum cukup untuk mendeteksi host mati.
4. Batasi akses log dan retensi menurut klasifikasi; penyelidikan memakai salinan dengan rantai penguasaan bukti.

## Keadaan nyata dan rencana
E04/E07, kanal WA belum terkonfirmasi. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua operasi; fungsi privasi meninjau minimisasi. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Bukti simulasi alert, pemeriksaan rantai, penanganan insiden dan redaksi log. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
