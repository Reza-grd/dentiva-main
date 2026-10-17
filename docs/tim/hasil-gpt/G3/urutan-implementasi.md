# Urutan Implementasi
Perkiraan usaha: S kecil, M sedang, L besar; bukan estimasi hari pasti.

| Urut | Layar/pola | Dampak | Usaha | Ketergantungan / bukti selesai |
|---|---|---|---|---|
| 1 | Token dan komponen G2 | konsistensi semua layar | M | migrasi token, kontras dan keyboard |
| 2 | Login/MFA + keamanan | batas akses | L | server TOTP, pemaksaan AAL2, pemulihan dan SMTP |
| 3 | Pembayaran | risiko salah nominal tinggi | L | guard lunas, idempotensi, uji kasir |
| 4 | Rekam medis | keselamatan dan kerahasiaan | L | role dokter, lock, draft dan consent |
| 5 | Asisten AI | persetujuan dan transparansi | L | AgentActions status/expiry/undo |
| 6 | Dashboard admin | kejelasan agregat | M | rumus laporan, data tanpa identitas |
| 7 | Biaya & stok | konversi dan HPP | L | batch, unit conversion, atomic bulk |
| 8 | Jadwal | operasi harian | M | zona waktu, konflik dan peran |
| 9 | Pasien | administrasi cepat | M | pagination dan privasi |
| 10 | Antrean TV | privasi ruang tunggu | M | token terbatas dan stale state |
| 11 | Palette/notifikasi/onboarding | efisiensi | M | peta izin dan endpoint nyata |

Keamanan tidak ditunda demi urutan visual. Frontend canAccess RME yang masih
menyebut admin dicatat untuk diselaraskan dengan DB; jangan melonggarkan DB.
Setiap layar melewati gerbang 03 dengan bukti asli, bukan menyalin status G1/G2.
