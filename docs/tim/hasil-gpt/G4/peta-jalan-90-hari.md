# Peta Jalan Keamanan 90 Hari — Usulan

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

Periode relatif sejak persetujuan pemilik, bukan janji tanggal rilis. S/M/L adalah
perkiraan usaha relatif. Ketua menetapkan urutan akhir dan pemilik pengganti.

| Tahap | Pekerjaan | Usaha | Ketergantungan | Bukti selesai |
|---|---|---|---|---|
| Hari1–15 | Offsite terenkripsi lintas penyedia | M | akun/storage pemilik | objek diverifikasi, jadwal, restore dari offsite |
| Hari1–15 | SMTP asli + SPF/DKIM/DMARC | M | penyedia/domain pemilik | verifikasi/reset nyata, tanpa click tracking |
| Hari1–15 | AAL2 clinic UI+DB, recovery | L | MFA server sudah tersedia | AAL1 ditolak sesuai peran, enrollment/recovery teruji |
| Hari1–15 | Reboot kernel terjadwal | S | persetujuan jendela operasi | layanan sehat dan catatan rollback |
| Hari1–30 | Rate-limit login/gateway | M | Envoy, uji lockout aman | brute force dibatasi tanpa memblokir klinik sah |
| Hari16–30 | Monitor luar host + alert | M | kanal/pengganti | simulasi host mati menimbulkan alert diterima |
| Hari16–30 | Secret scan/SCA/SBOM/CodeQL | M | usulan A4/A5, Ketua memasang | pipeline rilis dan penanganan temuan |
| Hari16–45 | DR terukur + kunci cadangan | M | offsite | RPO/RTO aktual dicatat, Auth/Storage/RLS pulih |
| Hari16–45 | Jangkar audit luar host | M | tujuan independen | kepala hash diverifikasi tanpa akses write DB |
| Hari31–60 | DPIA, DPA/vendor, retensi | L | advokat/fungsi PDP | dokumen disahkan, proses hak dilatih |
| Hari31–60 | Idle lock/sesi perangkat | L | server assurance/endpoint | perpindahan perangkat dan izin teruji |
| Hari31–60 | Desktop signing/updater | M | sertifikat pemilik | installer/update ditandatangani dan rollback diuji |
| Hari46–75 | WAF bila dibuktikan perlu | M | metrik serangan/kompatibilitas | aturan teruji, false positive dipantau |
| Hari61–90 | Pentest independen + retest | L | staging, scope dan izin | laporan/redaksi, temuan ditutup/risiko diterima |
| Hari61–90 | Review kesiapan SLA/ISMS | M | monitor, DR, audit internal | pemilik menandatangani komitmen realistis |

MFA tidak dicatat sebagai “belum ada”; pekerjaan tersisa ialah pemaksaan,
pemulihan, sesi dan bukti. WAF bukan pengganti RLS, autentikasi atau validasi.
Tidak mengumumkan ISO/SOC2 sebelum lingkup dan sertifikasi nyata ada.
