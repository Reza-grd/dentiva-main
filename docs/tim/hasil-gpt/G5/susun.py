from pathlib import Path
import json
P=Path(__file__).resolve().parent
def put(n,s): (P/n).write_text(s.strip()+'\n',encoding='utf-8')
def rp(n):return 'Rp '+f'{n:,.0f}'.replace(',','.')
plans=[{'name':'Starter','monthly':1490000,'annual':14900000,'ai':0,'users':5,'clinics':1,'storageGB':10,'patientsGuide':10000,'fixedCost':250000}, {'name':'Pro','monthly':2990000,'annual':29900000,'ai':300,'users':15,'clinics':1,'storageGB':30,'patientsGuide':30000,'fixedCost':400000}, {'name':'Enterprise','monthly':6490000,'annual':64900000,'ai':1000,'users':40,'clinics':1,'storageGB':100,'patientsGuide':100000,'fixedCost':800000}, {'name':'Group','monthly':14900000,'annual':149000000,'ai':2000,'users':100,'clinics':3,'storageGB':300,'patientsGuide':None,'fixedCost':1800000}]
for p in plans:
 p['maxAiCostIllustration']=p['ai']*1450;p['totalCostIllustration']=p['fixedCost']+p['maxAiCostIllustration'];p['grossMarginMonthlyIllustration']=round(1-p['totalCostIllustration']/p['monthly'],4);p['grossMarginAnnualIllustration']=round(1-p['totalCostIllustration']/(p['annual']/12),4)
model={'status':'USULAN; seluruh biaya contoh ILUSTRASI, bukan konfigurasi billing aktif atau tarif vendor terverifikasi','source':'docs/denti-agen.md; supabase/migrations/20261008135226_ai_assistant_foundation.sql:348','assumptions':{'highAiCostPerQuotaUnitIDR':1450,'lowAiCostPerQuotaUnitIDR':750,'annualMonthsCharged':10,'tax':'belum termasuk pajak; status PKP dan kewajiban ditinjau pemilik/akuntan','fixedCost':'alokasi contoh VPS/operasi/dukungan; bukan invoice aktual'},'plans':plans}
put('model-harga.json',json.dumps(model,ensure_ascii=False,indent=2))
put('positioning.md','''
# Positioning Dentiva
Versi1.0 · USULAN produk dan pesan; perlu persetujuan pemilik.

## Janji yang dapat dipertanggungjawabkan
“Ruang kerja klinik gigi yang tertata, dengan bantuan AI yang tetap Anda kendalikan.”
Tiga pilar: aman melalui batas akses yang jelas; cerdas melalui analisis/usulan;
berkelas melalui alur tenang, konsisten dan mudah dipulihkan saat gagal.
Premium berarti kualitas layanan dan bukti, bukan dekorasi emas atau harga tanpa alasan.

## Segmentasi
| Segmen | Masalah utama | Nilai yang ditawarkan | Bukti demo |
|---|---|---|---|
| Praktik mandiri | administrasi mengganggu pelayanan | jadwal, RME per dokter, kasir tertata | satu alur kunjungan sintetis |
| Klinik tunggal | data stok/biaya tersebar | stok, HPP, agregat dan Denti usulan | kartu sebelum/sesudah + persetujuan |
| Grup/cabang | konsistensi operasi dan kewenangan | onboarding per cabang dan standar laporan | RENCANA Group; isolasi tenant tetap |

Grup bukan alasan membuka RME lintas klinik bagi pemilik. Konsolidasi laporan
lintas clinic_id memerlukan desain/otorisasi server oleh Ketua; jangan dijual
sebagai fitur aktif hanya karena tabel SaaS mendukung banyak klinik.

## Pembeda yang jujur
Tunjukkan pembagian peran, usulan yang bisa diperiksa, histori stok dan laporan
yang konsisten. Hindari merendahkan pesaing, “paling aman”, “100% patuh”, atau
janji menghemat angka tertentu. Kritik harga murah tidak menggantikan bukti nilai.
Keamanan dasar sama pada semua paket: tidak menjual RLS, privasi atau enkripsi
sebagai add-on yang boleh dimatikan untuk pelanggan kecil.

## Kesiapan penjualan
Sebelum kampanye: offsite dan latihan, SMTP, alur MFA/pemulihan, dukungan serta
kontrak disahkan; fitur sandbox disebut sandbox. Lihat G4/whitepaper-keamanan.md.
Nama model dalam kode adalah keputusan internal saat snapshot, bukan klaim bahwa
model tertentu tersedia atau sudah aktif. Situs menjual hasil kerja yang ditinjau,
bukan nama model yang belum diuji.
''')
rows='\n'.join(f"| {p['name']} | {rp(p['monthly'])} | {rp(p['annual'])} | {p['clinics']} | {p['users']} | {p['ai']} | {p['storageGB']} GB | {p['patientsGuide'] or 'sesuai kontrak'} |" for p in plans)
margin='\n'.join(f"| {p['name']} | {rp(p['maxAiCostIllustration'])} | {rp(p['fixedCost'])} | {p['grossMarginMonthlyIllustration']:.1%} | {p['grossMarginAnnualIllustration']:.1%} |" for p in plans)
put('paket-harga.md','''
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
'''+rows+'''

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
'''+margin+'''

Rumus margin=(pendapatan−biaya langsung)/pendapatan. Titik impas biaya AI per unit
=(pendapatan−alokasi tetap)/kuota. Jangan mengiklankan margin ini sebagai profit.
Lakukan sensitivitas penggunaan25/50/100%, cache gagal dan biaya dukungan naik;
pastikan add-on dibeli sebelum kuota habis tanpa perubahan data klinik terhambat.

## Percobaan dan diskon
USULAN demo sintetis dahulu, pilot14 hari setelah SMTP/onboarding siap. Tanpa kartu
pasien nyata di demo umum. Diskon hanya tahunan atau kontrak grup dengan alasan
biaya layanan; hindari promo hitung mundur palsu. Akhir pilot menyediakan ekspor
dan proses retensi; tidak mengunci keselamatan pasien demi konversi penjualan.
''')
put('onboarding-whiteglove.md','''
# Onboarding dengan Pendampingan — USULAN
Pemilik menyetujui kapasitas personel, ruang migrasi, kanal dan jadwal sebelum dijual.

## Ruang kerja dan biaya setup
Starter Rp1.500.000; Pro Rp3.000.000; Enterprise Rp7.500.000; Group mulai Rp15.000.000.
Ini usulan satu kali, belum termasuk pajak. Konversi data khusus/scan manual di luar
lingkup ditaksir setelah sampel sintetis dan pemetaan field, bukan janji migrasi semua.

## Tahapan dengan bukti keluar
1. Kickoff: pemilik klinik, dokter penanggung jawab, resepsionis dan petugas privasi;
   sepakati peran, lingkup data, dasar kewenangan dan penanggung jawab migrasi.
2. Pemetaan: format sumber, kualitas, duplikasi, visit/consent/Storage dan ID; gunakan
   contoh sintetis untuk tim desain. Data nyata hanya di alur aman milik Ketua.
3. Gladi terisolasi: hitungan dan rekonsiliasi field, akses tiap peran, hash berkas,
   daftar yang ditolak, persetujuan klinik. Tidak mengubah data asli tanpa salinan sah.
4. Pelatihan peran: dokter RME/lock, resepsionis identitas/kasir/jadwal, admin agregat
   dan persetujuan Denti. Masing-masing menjalankan satu skenario fixture.
5. Hari-H: jendela disetujui, freeze sumber, backup, migrasi Ketua, pemeriksaan dan
   tanda tangan penerimaan; tersedia prosedur manual klinik bila tidak siap.
6. Masa pendampingan awal: sesi review terjadwal, tiket masalah, rekonsiliasi invoice,
   stok dan izin; kriteria keluar jelas, bukan dianggap berhasil karena login bisa.

## Dukungan usulan
Kalender awal Senin–Jumat09.00–17.00 WIB di luar hari libur, sama dengan draf SLA G4.
Target triase SEV1 1 jam layanan, SEV2 4 jam kerja, SEV3 1 hari kerja setelah kapasitas
disahkan; respons bukan resolusi. Enterprise/Group mendapat koordinasi terjadwal,
bukan janji24/7. Kontak khusus adalah kanal tiket/koordinator yang ditunjuk, bukan
nomor pribadi yang dijamin selalu aktif. Aktivasi SMTP/offsite dan recovery menjadi
prasyarat penerimaan operasional. Dukungan darurat di luar jam memerlukan addendum.
''')
put('roi-kalkulator.md','''
# Kalkulator Nilai Operasional
Semua angka berikut **ILUSTRASI** untuk dihitung bersama klinik, bukan janji hasil.

## Rumus bulanan
Nilai waktu = menit administrasi yang benar-benar berkurang/60 × biaya tenaga/jam.
Nilai tagihan = tambahan kas tertagih yang dapat diatribusikan pada perbaikan proses.
Nilai stok = pengurangan nilai stok terbuang dibanding baseline yang sebanding.
Nilai no-show = kunjungan tambahan yang benar-benar terjadi × margin kontribusi,
bukan omzet bruto. Keluarkan transaksi yang sudah dihitung pada nilai tagihan.
Manfaat bersih = jumlah manfaat valid − langganan − add-on − setup/bulan amortisasi.
ROI biaya = manfaat bersih/biaya total. Waktu tersedia tidak selalu menjadi kas;
laporkan kapasitas dan manfaat tunai secara terpisah agar tidak melebih-lebihkan.

## Contoh konservatif ILUSTRASI: Pro bulanan
- 20 jam/bulan × Rp30.000 = Rp600.000 nilai kapasitas, bukan penghematan gaji otomatis.
- Tambahan tagihan tertagih Rp1.500.000 (hanya bagian yang diatribusikan).
- Stok terbuang berkurang Rp400.000.
- 5 kunjungan tambahan × margin kontribusi Rp200.000 = Rp1.000.000.
- Jumlah manfaat Rp3.500.000; kas saja Rp2.900.000.
- Biaya Rp2.990.000 + setup Rp3.000.000/12 = Rp3.240.000, tanpa add-on/pajak.
- Bersih termasuk kapasitas Rp260.000; ROI8,02%. Kas bersih −Rp340.000;
  ROI kas −10,49%. Contoh ini belum membuktikan pembelian menguntungkan.

## Sensitivitas
Jika seluruh manfaat hanya50% contoh: Rp1.750.000−Rp3.240.000=−Rp1.490.000.
Jika125%: Rp4.375.000−Rp3.240.000=Rp1.135.000. Klinis, volume dan kualitas layanan
tidak dikonversi menjadi angka tanpa dasar. Gunakan baseline4 minggu yang representatif,
periode pembanding sama, log perubahan proses dan faktor lain (libur/harga/promosi).
Biaya tunai, kapasitas waktu dan hasil pasien dilaporkan terpisah.

## Isian bersama klien
Periode [ISI]; sumber [ISI]; menit sebelum/sesudah [ISI]; biaya tenaga [ISI];
nilai stok [ISI]; tagihan tambahan [ISI]; no-show tambahan bersih [ISI]; margin
kontribusi [ISI]; biaya total [ISI]; rentang ketidakpastian [ISI]. Klinik menyetujui
metode atribusi dan tidak menggunakan hasil sebagai jaminan untuk klinik lain.
''')
faq=[('Apakah Dentiva untuk klinik gigi?','Ya, alurnya mencakup jadwal, rekam medis, kasir, bahan dan laporan sesuai peran.'),('Apakah admin melihat semua rekam medis?','Akses klinis mengikuti peran; admin bisnis melihat agregat, bukan isi RME pasien.'),('Apakah Denti langsung mengubah data?','Denti menyiapkan usulan. Perubahan memerlukan persetujuan dan pemeriksaan server.'),('Bisakah AI memproses pembayaran pasien?','Tidak. Gunakan alur kasir oleh resepsionis berizin.'),('Apakah data seluruhnya di Indonesia?','Server inti dilaporkan di Indonesia; layanan luar dapat memproses metadata atau prompt. Minta daftar vendor yang disetujui.'),('Sudah bersertifikat ISO27001?','Belum ada bukti sertifikasi. Kami tidak mengklaimnya.'),('Apakah semua akun wajib MFA?','TOTP tersedia pada server; pemaksaan peran klinik masih diselesaikan. Status kesiapan dikonfirmasi saat onboarding.'),('Apakah backup offsite aktif?','Belum pada snapshot proyek yang ditinjau. Aktivasi dan latihan menjadi pekerjaan prioritas.'),('SATUSEHAT sudah produksi?','Sumber proyek menyatakan sandbox. Kesiapan produksi harus dikonfirmasi untuk klinik Anda.'),('Apakah WhatsApp tanpa batas?','Tidak. Kanal, biaya vendor dan batas pengiriman perlu disepakati.'),('Apa arti kuota AI?','Unit penggunaan mengikuti sistem kuota. Satu percakapan dapat mencakup beberapa permintaan; definisinya harus jelas di penawaran.'),('Berapa harganya?','Draf penawaran mulai Rp1.490.000/bulan; harga dan pajak final dikonfirmasi tertulis. Pro Rp2.990.000 dan Enterprise Rp6.490.000/bulan adalah usulan.'),('Apakah ada paket grup?','Usulan Group mulai Rp14.900.000/bulan untuk3 klinik; konsolidasi lintas cabang memerlukan kesiapan teknis dan izin tersendiri.'),('Bisa migrasi data lama?','Ruang migrasi ditentukan setelah pemetaan dan gladi; tidak semua format otomatis didukung.'),('Bagaimana jika berhenti berlangganan?','Ekspor dan retensi arsip disepakati di kontrak/DPA; arsip klinis tidak dimusnahkan otomatis.'),('Apakah dukungan24 jam?','Belum menjadi layanan standar. Kalender dan target dukungan disepakati sesuai kapasitas nyata.'),('Apakah aplikasi desktop ditandatangani?','Penandatanganan masih pekerjaan proyek pada snapshot ini; status installer harus diperiksa sebelum dibagikan.'),('Apakah Dentiva menjamin penghematan?','Tidak. Nilai dihitung bersama memakai baseline dan asumsi klinik, termasuk kemungkinan hasil bersih negatif.')]
put('copy-situs.md','''
# Copy Situs — DRAF EDITORIAL, belum boleh diterbitkan tanpa tinjauan pemilik
Harga dan fitur rencana di sini wajib diselaraskan dengan kontrak serta kesiapan.

## Beranda
Judul: “Kelola klinik dengan lebih tertata.”
Subjudul: “Jadwal, rekam medis, pembayaran dan bahan dalam alur yang jelas bagi
setiap peran. Denti membantu membaca kondisi bisnis dan menyiapkan usulan untuk
Anda periksa.” CTA utama “Jadwalkan demo”; sekunder “Lihat cara kerja Denti”.
Bagian bukti: pembagian akses, kartu persetujuan, riwayat stok, laporan berperiode.
Jangan memasang logo sertifikasi, angka pelanggan atau testimoni yang belum nyata.

## Keamanan
Judul: “Kepercayaan dibangun dari kontrol yang dapat dijelaskan.”
Copy: “Pembatasan akses dan isolasi klinik menjadi bagian desain Dentiva. Kami
menjelaskan kontrol yang tersedia serta pekerjaan yang masih berjalan agar Anda
dapat menilai kesiapan layanan.” CTA “Minta ringkasan keamanan”. Sumber G4 whitepaper;
sebelum publikasi konfirmasi MFA, offsite, SMTP, vendor dan insiden contact terbaru.

## Harga
Judul: “Pilih pendampingan yang sesuai dengan operasi klinik.”
Tampilkan tabel paket-harga.md sebagai DRAF penawaran: Starter Rp1.490.000,
Pro Rp2.990.000, Enterprise Rp6.490.000/bulan; Group mulai Rp14.900.000/3 klinik.
Tahunan10×bulanan, belum termasuk pajak. CTA “Bicarakan kebutuhan klinik”.
Tidak ada “paling populer” tanpa bukti penjualan. Jangan menerbitkan SKU baru
sebelum backend/billing mendukungnya.

## Unduh
Judul: “Ruang kerja klinik, juga di desktop.”
Copy: “Pilih installer untuk perangkat yang didukung dan ikuti panduan pemasangan.”
Tautan berasal dari distribusi resmi yang ditetapkan Ketua, bukan URL tebakan.
Tampilkan versi, OS, status tanda tangan dan catatan rilis. Bila installer belum
ditandatangani, jelaskan status dan pilihan aplikasi web; jangan menyuruh mematikan
perlindungan sistem secara umum. Dukungan offline penuh tidak dijanjikan.

## FAQ
'''+ '\n\n'.join(f'### {q}\n{a}' for q,a in faq))
put('naskah-demo.md','''
# Demo 15 Menit
Fixture sintetis, tidak mengirim data pasien nyata ke alat demo/AI.

| Waktu | Langkah | Kalimat dan bukti |
|---|---|---|
| 00–02 | Pahami peran dan masalah | “Bagian administrasi mana yang paling menyita waktu?” Catat tanpa menjanjikan ROI. |
| 02–04 | Jadwal dan pasien sintetis | “Resepsionis bekerja pada administrasi; dokter menangani catatan klinis.” |
| 04–06 | Dokter dan RME | Tunjukkan identitas, catatan dan status kunci; jangan memakai akun admin untuk demo RME. |
| 06–08 | Kasir | Tagihan→jumlah bayar→hasil server; bedakan status klinis dan lunas. |
| 08–10 | Dashboard admin | “Yang terlihat di sini adalah agregat bisnis, tanpa isi rekam medis.” |
| 10–12 | Denti Agen | “Siapkan stok masuk lidocaine2 box @60rb.” Tunjukkan konversi dan kartu; “Ini masih usulan.” Setujui fixture, lalu lihat status hasil; undo hanya bila server mendukung. |
| 12–14 | Keamanan dan batas | Jelaskan kontrol serta gap offsite/SMTP/MFA klinik menurut status terbaru, bukan mengklaim sudah selesai. |
| 14–15 | Rangkuman kebutuhan | “Kita petakan paket, migrasi dan proses pendampingan sebelum menyepakati aktivasi.” |

Pra-demo: reset fixture, akun per peran, jaringan, kuota, versi dan skenario siap;
demo model gagal memakai screenshot berlabel rekaman, jangan berpura-pura live.
Keberatan harga: hitung ROI dengan data klien dan tunjukkan asumsi; keberatan AI:
persetujuan manusia dan batas lingkup; keberatan keamanan: bukti beserta gap;
keberatan migrasi: pemetaan/gladi, bukan janji seluruh data selesai sehari.
''')
put('studi-kasus-templat.md','''
# Templat Studi Kasus — belum ada hasil klien diisi
Klinik [ISI nama/izin publikasi]; narasumber/peran [ISI]; tanggal/periode [ISI].
Semua publikasi memerlukan persetujuan tertulis, data agregat dan tinjauan privasi.

## Konteks dan perubahan
Jumlah cabang/staf [ISI]; proses awal [ISI]; masalah dan dampak [ISI]; alur yang
diubah [ISI]; tanggal aktivasi dan pelatihan [ISI]; fitur yang benar dipakai [ISI].

## Metrik berpasangan
| Metrik | Definisi/sumber | Sebelum | Sesudah | Periode/ukuran sampel | Faktor lain |
|---|---|---|---|---|---|
| Waktu administrasi | stopwatch/log tugas | [ISI] | [ISI] | [ISI] | [ISI] |
| Kas tertagih tambahan | rekonsiliasi pembayaran | [ISI] | [ISI] | [ISI] | [ISI] |
| Stok terbuang | nilai batch, bukan omzet | [ISI] | [ISI] | [ISI] | [ISI] |
| No-show | definisi kunjungan disepakati | [ISI] | [ISI] | [ISI] | [ISI] |
| Salah input/pemulihan | kejadian dan koreksi | [ISI] | [ISI] | [ISI] | [ISI] |

## Pertanyaan wawancara
Apa tugas tersulit sebelum perubahan? Bagaimana pembagian peran berubah? Bagian
mana tetap memerlukan kerja manual? Apa yang gagal pada minggu awal? Bukti apa
yang mendukung klaim manfaat? Adakah biaya baru atau gangguan lain? Apa yang
belum teratasi? Minta kutipan verbatim disetujui, jangan mengarang testimoni.

## Narasi dan batas
Masalah→perubahan→hasil terukur→keterbatasan→langkah berikut. Korelasi tidak otomatis
kausalitas; hindari menghitung omzet sebagai laba atau kapasitas waktu sebagai kas.
Lampirkan metode, izin, sumber dan tanggal; jangan menyertakan identitas pasien.
''')
print('G5: 7 dokumen produk dan model harga terhitung ditulis.')
