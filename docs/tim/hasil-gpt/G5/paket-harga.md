# Paket dan Harga Premium — USULAN
Versi1.0 · Seluruh harga adalah hipotesis bisnis untuk disetujui, bukan harga pasar
hasil riset atau harga billing yang telah dipasang. model-harga.json sumber angka.

## Titik awal yang benar-benar ada
Migrasi 20261008135226_ai_assistant_foundation.sql:41–44 mengaktifkan AI pada Pro
dan Enterprise; baris348 menetapkan kuota300/1000. Harga live tidak dapat dibuktikan
dari seed migrasi yang ditemukan; jangan menebak nilai database produksi.
Usulan mempertahankan kuota Pro/Enterprise dahulu. Starter/Group dan pembatasan
komersial baru memerlukan implementasi billing/otorisasi Ketua.

## Tabel usulan (belum termasuk pajak)
| Paket | Bulanan | Tahunan | Klinik | Akun staf | Kuota AI/bln | Penyimpanan | Panduan kapasitas pasien |
|---|---:|---:|---:|---:|---:|---:|---:|
| Starter | Rp 1.490.000 | Rp 14.900.000 | 1 | 5 | 0 | 10 GB | 10000 |
| Pro | Rp 2.990.000 | Rp 29.900.000 | 1 | 15 | 300 | 30 GB | 30000 |
| Enterprise | Rp 6.490.000 | Rp 64.900.000 | 1 | 40 | 1000 | 100 GB | 100000 |
| Group | Rp 14.900.000 | Rp 149.000.000 | 3 | 100 | 2000 | 300 GB | sesuai kontrak |

Tahunan =10×bulanan (diskon16,67% atas12 bulan), dibayar di muka setelah kontrak.
Kuota AI tidak rollover; hitungan harus mengikuti unit backend yang disepakati.
“Percakapan” dapat berisi beberapa panggilan: jangan menyamakan300 kuota dengan
300 percakapan tanpa definisi billing yang cocok. Panduan kapasitas pasien bukan
alasan menghapus/menutup arsip RME lama; kapasitas tambahan dirundingkan lebih dulu.

## Fitur dan batas
| Fitur | Starter | Pro | Enterprise | Group |
|---|---|---|---|---|
| RME/jadwal/kasir/stok dan kontrol dasar | ya sesuai izin | ya | ya | per klinik |
| Denti lokal/panduan | ya | ya | ya | ya |
| AI agregat/agen dengan persetujuan | tidak diusulkan | kuota300 | kuota1000 | pool2000 RENCANA |
| Review proses/onboarding | dasar | terpandu | pendamping khusus terjadwal | proyek per cabang |
| Konsolidasi lintas cabang | tidak | tidak | tidak otomatis | RENCANA hanya agregat berizin |
| Integrasi SATUSEHAT | sandbox saat ini; produksi setelah kesiapan dikonfirmasi | sama | sama | sama |
| SLA/24×7 | tidak otomatis | tidak otomatis | addendum setelah siap | addendum setelah siap |

## Add-on USULAN
- AI100 unit: Rp350.000; biaya ilustrasi maksimum145.000, margin58,6% sebelum
  dukungan/pajak. Definisi unit dan batas pemakaian ditampilkan sebelum pembelian.
- Penyimpanan25 GB: Rp150.000/bulan, setelah biaya backup/egress riil diketahui.
- Cabang tambahan Group: mulai Rp3.500.000/bulan, lingkup implementasi ditinjau;
  tidak membuka akses data antar-tenant otomatis.
- SATUSEHAT produksi: biaya setup usulan Rp5.000.000 per lingkup standar, hanya
  setelah integrasi/kontrak siap; biaya khusus ditawarkan terpisah.
- WhatsApp: biaya kanal resmi/vendor diteruskan sesuai penggunaan + pengelolaan
  yang disepakati; jangan menjanjikan pesan tak terbatas lewat sidecar tidak resmi.

## Ekonomi unit — ILUSTRASI, bukan margin aktual
Sumber biaya internal docs/denti-agen.md memberi perkiraan750–1450 per percakapan
agen dan tugas ringan<100. Model ini secara konservatif membebankan1450 pada setiap
unit kuota; kebenarannya harus diuji pada ai_usage, bukan dianggap tarif vendor kini.
Alokasi tetap di bawah adalah ASUMSI VPS/dukungan per klinik; overhead perusahaan,
penjualan, onboarding, pajak dan biaya payment belum dihitung.

| Paket | Biaya AI kuota penuh | Alokasi tetap contoh | Margin bulanan | Margin tahunan ekuivalen |
|---|---:|---:|---:|---:|
| Starter | Rp 0 | Rp 250.000 | 83.2% | 79.9% |
| Pro | Rp 435.000 | Rp 400.000 | 72.1% | 66.5% |
| Enterprise | Rp 1.450.000 | Rp 800.000 | 65.3% | 58.4% |
| Group | Rp 2.900.000 | Rp 1.800.000 | 68.5% | 62.2% |

Rumus margin=(pendapatan−biaya langsung)/pendapatan. Titik impas biaya AI per unit
=(pendapatan−alokasi tetap)/kuota. Jangan mengiklankan margin ini sebagai profit.
Lakukan sensitivitas penggunaan25/50/100%, cache gagal dan biaya dukungan naik;
pastikan add-on dibeli sebelum kuota habis tanpa perubahan data klinik terhambat.

## Percobaan dan diskon
USULAN demo sintetis dahulu, pilot14 hari setelah SMTP/onboarding siap. Tanpa kartu
pasien nyata di demo umum. Diskon hanya tahunan atau kontrak grup dengan alasan
biaya layanan; hindari promo hitung mundur palsu. Akhir pilot menyediakan ekspor
dan proses retensi; tidak mengunci keselamatan pasien demi konversi penjualan.
