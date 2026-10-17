# Kuesioner Keamanan Vendor — Format Ringkas

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

Ini jawaban orisinal bergaya kuesioner vendor ringkas; bukan reproduksi SIG berlisensi.
“Ada” hanya dalam scope bukti, bukan jaminan produksi tanpa audit.

| Pertanyaan | Jawaban jujur | Bukti |
|---|---|---|
| Apakah sudah ISO27001/SOC2? | Tidak ada bukti sertifikasi. Pemetaan awal tersedia; bukan sertifikat. | iso27001-pemetaan.md |
| Apakah seluruh MFA diwajibkan? | Sebagian: TOTP tersedia; AAL2 klinik masih rencana. | E03/E12 |
| Apakah pasien antar-klinik terisolasi? | Ada kontrol restrictive pada kode; perlu regresi dan bukti deployment. | E01 |
| Apakah admin melihat isi klinis? | Kebijakan DB melarang; frontend perlu diselaraskan. | E02 |
| Apakah data terenkripsi? | Backup age terbukti di skrip; enkripsi bidang medis dilaporkan, cakupan/rotasi perlu tinjauan. | E05/00 |
| Backup offsite tersedia? | Belum aktif menurut runbook. | E06 |
| RTO/RPO dijamin? | Belum SLA terukur; target dan skenario dijelaskan terpisah. | dr-backup.md |
| Audit tidak dapat diubah? | Tambah-saja berantai; administrator sangat berhak tetap risiko. | E04 |
| Pentest independen? | Belum bukti; rencana tersedia. | rencana-pentest.md |
| Apakah AI dapat langsung mengubah? | Tidak pada desain yang ditinjau: hanya usul, apply server memerlukan persetujuan. | E10 |
| Data pasien dikirim ke AI? | Alat dirancang agregat; prompt bebas perlu minimisasi dan kontrol tambahan. Tidak menjanjikan nol kebocoran. | E10 |
| Lokasi semua data Indonesia? | Server inti dilaporkan Indonesia; vendor eksternal perlu pemetaan. | E08/vendor |
| Sandi bocor ditolak? | HIBP diaktifkan konfigurasi dan dilaporkan aktif; gagal-terbuka berarti ada batas ketika layanan gagal. | E03 |
| Penghapusan setelah kontrak? | Mengikuti instruksi sah, retensi sektoral dan legal hold; belum mekanisme otomatis menyeluruh. | kebijakan/retensi-penghapusan.md |
| Bagaimana incident notice? | Rencana dan kontak perlu disahkan; pemberitahuan pengendali dinilai advokat. | respons-insiden.md |
| Sesi perangkat dan idle lock? | Belum lengkap; G3 berisi usulan. | G3 |
| SMTP reset berfungsi? | Belum menurut laporan Ketua. | E11 |
| SATUSEHAT produksi? | Belum dibuktikan; sandbox disebut pada sumber. | kepatuhan-rme-satusehat.md |
| Vendor dipantau? | Register draf; review kontrak/lokasi belum selesai. | kebijakan/vendor-subprosesor.md |
| Bisakah memberi bukti terbaru? | Ketua menyusun paket redaksi dengan versi/tanggal; tidak membagikan secrets atau data nyata. | sumber-dan-bukti.md |
