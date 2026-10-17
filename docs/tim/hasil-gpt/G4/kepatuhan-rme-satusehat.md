# RME dan SATUSEHAT

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Rujukan
[Permenkes 24/2022](https://peraturan.bpk.go.id/Home/Download/301563/Permenkes%20Nomor%2024%20Tahun%202022.pdf):
Pasal 29 memuat kerahasiaan, integritas, ketersediaan; Pasal 30 mengatur akses;
Pasal 39 menetapkan penyimpanan RME paling singkat 25 tahun sejak kunjungan
terakhir pasien. Penghapusan akun/langganan tidak otomatis menghapus RME.
Advokat menilai penerapan bersama regulasi kesehatan terbaru dan keadaan klinik.

## Pemetaan implementasi
| Kebutuhan | Status | Bukti / gap / tindakan |
|---|---|---|
| Kerahasiaan dan pembagian peran | Sebagian | E01/E02; perlu review akses berkala dan koreksi affordance frontend |
| Integritas dan koreksi | Sebagian | guard kunjungan/lunas, E04 audit; bukti prosedur koreksi dan persetujuan klinik |
| Ketersediaan | Sebagian | E05 backup lokal; kehilangan VPS tetap risiko besar |
| Retensi jangka panjang | Belum lengkap | kebijakan draf, kapasitas/ekspor/akses setelah kontrak belum disepakati |
| Pembukaan informasi | Belum proses formal | klinik memverifikasi pemohon, dasar dan kewenangan; audit dan data minimal |
| Interoperabilitas | Sebagian: sandbox | sumber proyek menyatakan sandbox; jangan klaim integrasi produksi tuntas |

[Dokumentasi SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/integrations/)
membedakan endpoint sandbox/produksi dan memakai FHIR R4. RENCANA penerimaan:
validasi organisasi/lokasi/praktisi, resource yang diwajibkan playbook klinik,
terminologi, consent yang relevan, outbox, retry/idempotensi, respons galat serta
rekonsiliasi penerimaan. Resource Patient hanya melalui peran/pemrosesan sah.
Dokumentasi API tersedia tidak membuktikan status akreditasi atau persetujuan vendor.

## Keputusan untuk pemilik
Tentukan kustodian ekspor dan jaminan kesinambungan RME saat klinik berhenti
berlangganan; jangan mencampur retensi database aktif dengan retensi backup 14 hari.
Uji pemulihan mengembalikan Storage, Auth/MFA, log dan metadata RME bersama data.
