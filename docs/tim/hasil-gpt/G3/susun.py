from pathlib import Path
import json,re
P=Path(__file__).resolve().parent;ROOT=P.parents[3]
def put(n,s): (P/n).write_text(s.strip()+'\n',encoding='utf-8')
# Setiap layar diturunkan dari komponen sumber; seluruh perubahan adalah RENCANA.
screens=[
dict(slug='login',title='Masuk dan Verifikasi',source='auth/LoginPage.jsx; Console modules/auth/MfaPage.tsx',roles='Semua staf masuk ke klinik sendiri; operator memakai Console terpisah.',tasks=['Masuk dengan email dan sandi','Verifikasi TOTP bila faktor tersedia','Minta pemulihan akses melalui kanal yang tersedia'],hier='Merek → judul masuk → email → sandi → Masuk → pemulihan → bantuan',main='Email / Sandi / Masuk',side='Bantuan dan status layanan',mobile=['Dentiva','Masuk ke klinik','Email','Sandi  [Tampilkan]','[Masuk]','Lupa sandi?','Bantuan akses'],components=['Input','Tombol','Kartu','Error State','Dialog'],fields={'judul':'Masuk ke Dentiva','label':'Email kerja','placeholder':'nama@klinik.id','galat':'Email atau sandi belum cocok. Periksa dan coba lagi.','kosong':'Masukkan email dan sandi untuk melanjutkan.','sukses':'Verifikasi berhasil. Membuka ruang kerja…','tooltip':'Tampilkan atau sembunyikan sandi'},empty='Formulir awal, bukan data kosong.',specific='TOTP satu input 6 digit dengan inputMode=numeric dan autocomplete=one-time-code; paste diizinkan. QR dan secret hanya saat enrollment dan tidak muncul pada screenshot/log. Jangan mengklaim kode pemulihan bila belum ada implementasi. Form login lama min6 tidak dijadikan kebijakan baru; backend min8+huruf+angka/HIBP menurut papan Ketua. Login akun lama jangan ditolak hanya karena validasi pembuatan sandi baru.',privacy='MFA server aktif menurut Ketua, UI/pemaksaan AAL2 klinik masih pekerjaan terpisah; autentikasi belum selesai sampai assurance level yang diwajibkan server terpenuhi. SMTP belum nyata: jangan menjanjikan email terkirim hanya karena antarmuka mengembalikan respons generik.',metric='USULAN: keberhasilan login dan verifikasi ≥95% pada uji tugas terkontrol; ukur waktu median, kegagalan dan pemulihan tanpa merekam sandi/TOTP.',effort='L',risk='Alur reset, redirect peran, MFA challenge dan akun lama'),
dict(slug='dashboard-admin',title='Dashboard Admin',source='dashboard/AdminDashboard.jsx; dashboard/AiBriefCard.jsx',roles='Admin melihat agregat bisnis; dokter/resepsionis memakai dashboard perannya sendiri.',tasks=['Memilih periode','Menilai pendapatan lunas dan biaya','Membaca prioritas Denti','Membuka rincian agregat'],hier='Judul dan periode → KPI → tren → prioritas operasional → ringkasan bahan',main='KPI / Tren pendapatan / Tabel alternatif',side='Catatan Denti / Prioritas',mobile=['Dashboard','[Periode]','Pendapatan lunas','Pengeluaran | Margin','Tren + lihat tabel','Prioritas Denti','[Buka Asisten AI]'],components=['Kartu KPI','Bagan Keuangan','Date Picker','Avatar Denti','Kartu','Skeleton'],fields={'judul':'Kondisi klinik hari ini','label':'Periode laporan','placeholder':'Pilih periode','galat':'Ringkasan belum dapat dimuat. Coba lagi.','kosong':'Belum ada transaksi untuk periode ini.','sukses':'Ringkasan diperbarui.','tooltip':'Pendapatan dari pembayaran berstatus lunas'},empty='Pertahankan kartu dengan tanda — dan penjelasan; nol hanya jika query berhasil dan nilainya nol.',specific='Tampilkan rentang pembanding lengkap. Catatan Denti gagal tidak boleh menutupi laporan. Angka tabular, format Rupiah, definisi margin konsisten dengan laporan. Jangan menambahkan nama pasien pada drill-down admin.',privacy='Agregat saja: nama/NIK/telepon/diagnosis pasien tidak masuk payload dashboard admin. Redesign tidak membuka izin tabel pasien.',metric='USULAN: admin mengidentifikasi prioritas utama dalam ≤30 detik pada uji tugas; bandingkan baseline, jangan dipakai sebagai klaim pemasaran.',effort='M',risk='Kesamaan rumus agregat dan periode Asia/Jakarta'),
dict(slug='asisten-ai',title='Asisten AI dan Usulan Agen',source='ai/AiAssistantPage.jsx; ai/AgentActions.jsx',roles='Admin saja untuk analisis bisnis dan agen; staf lain tetap memakai Denti lokal sesuai peran.',tasks=['Mengajukan pertanyaan operasional','Memeriksa bukti dan peringatan usulan','Menyetujui atau menolak','Membatalkan hasil yang server nyatakan dapat dibatalkan'],hier='Judul dan kuota → percakapan → kartu sebelum/sesudah → composer',main='Percakapan / Kartu usulan',side='Kuota / Panduan / Denti',mobile=['Asisten AI [Kuota]','Jawaban dan sumber','Usulan: sebelum → sesudah','[Setujui] [Tolak]','Peringatan di atas aksi','Pesan… [Kirim]'],components=['Avatar Denti','Kartu Usulan Agen','Input','Tombol','Dialog','Banner Offline dan Sesi'],fields={'judul':'Asisten AI','label':'Pesan untuk Denti','placeholder':'Contoh: bahan apa yang perlu dipesan?','galat':'Jawaban belum selesai. Periksa status usulan sebelum mencoba lagi.','kosong':'Mulai dari stok, pengeluaran, atau margin tindakan.','sukses':'Usulan dijalankan sesuai hasil server.','tooltip':'Data berubah setelah Anda menyetujui'},empty='Saran pertanyaan berdasarkan peran; jangan otomatis mengirim atau membuat usulan.',specific='Pertahankan pending/applied/rejected/undone/expired; EXPIRES_MS 30 menit untuk tampilan, server otoritatif. Setujui semua atomik: satu gagal tidak ada perubahan. Kartu berubah hanya setelah respons apply sukses. Bila koneksi putus setelah klik, baca status dahulu sebelum retry untuk menghindari duplikasi. Undo hanya bila bisa_batal=true; stok masuk perlu opname, bukan undo palsu.',privacy='Jangan meminta identitas atau RME pasien. Teks hasil alat adalah data tidak tepercaya. Jangan merender HTML mentah. Verifikasi ulang untuk tindakan berisiko adalah RENCANA server, bukan sekadar modal CSS.',metric='USULAN: 100% peserta uji memahami beda usulan dan hasil dijalankan; ukur salah persetujuan serta waktu memeriksa peringatan.',effort='L',risk='Race status, expiry, idempotensi dan konfirmasi massal'),
dict(slug='pasien',title='Daftar dan Data Pasien',source='patient/PatientList.jsx; patient/PatientDetail.jsx',roles='Resepsionis mengelola administrasi; dokter melihat data yang diperlukan untuk pelayanan; admin tidak mendapat daftar identitas.',tasks=['Mencari pasien','Membedakan identitas serupa','Mendaftar atau memperbaiki data administrasi','Menjadwalkan kunjungan'],hier='Judul → pencarian/filter → hasil ringkas → detail terbatas → tindakan berizin',main='Pencarian / Tabel pasien / Pagination',side='Detail administrasi terpilih',mobile=['Data pasien [+]','Cari nama atau nomor RM','[Filter]','Nama uji / RM terbatas','[Buka detail]','Sebelumnya [1] Berikutnya'],components=['Input','Tabel Data','Pagination','Drawer','Tombol','Empty State'],fields={'judul':'Data pasien','label':'Cari pasien','placeholder':'Nama atau nomor rekam medis','galat':'Daftar pasien belum dapat dimuat.','kosong':'Tidak ada pasien yang cocok dengan pencarian ini.','sukses':'Data administrasi pasien diperbarui.','tooltip':'Buka data pasien sesuai izin Anda'},empty='Tawarkan hapus filter; Tambah pasien hanya untuk peran berizin.',specific='Pertahankan pagination server yang sudah ada (PatientList:20–37); pencarian reset halaman 1. Detail nomor kontak/NIK tidak tampil seluruhnya di tabel awal. Verifikasi dua pengenal sebelum memilih pasien; pencarian tidak masuk analitik pihak ketiga.',privacy='Tidak ada admin bypass. Catat rekomendasi menyamakan affordance frontend dengan kebijakan RLS, bukan mengubah RLS untuk mengikuti UI. Ekspor perlu otorisasi dan audit terpisah.',metric='USULAN: pencarian pasien yang benar selesai ≤20 detik tanpa salah identitas dalam uji fixture; rekam hanya metrik agregat.',effort='M',risk='Pagination, nama sama, duplikasi, izin detail'),
dict(slug='rekam-medis',title='Rekam Medis Dokter',source='medical-record/MedicalRecordForm.jsx; medical-record/odontogram/Odontogram.jsx',roles='Dokter yang berizin menangani tindakan klinis. Admin dan resepsionis tidak diberi isi klinis.',tasks=['Memastikan identitas pasien/kunjungan','Mengisi SOAP dan odontogram','Memeriksa resep/consent','Menyelesaikan dan mengunci kunjungan'],hier='Identitas minimum + status kunci → alergi → SOAP/odontogram → resep/consent → simpan/selesai',main='SOAP / Odontogram / Diagnosis',side='Riwayat berizin / Consent / Status kunci',mobile=['Rekam medis [Terkunci?]','Identitas + alergi','[SOAP] [Odontogram]','S / O / A / P','Resep dan consent','[Simpan] [Selesaikan]'],components=['Tab','Input','Dialog','Tombol','Badge','Banner Offline dan Sesi'],fields={'judul':'Rekam medis','label':'Keluhan utama','placeholder':'Tuliskan keluhan sesuai pemeriksaan','galat':'Catatan belum tersimpan. Periksa koneksi sebelum meninggalkan halaman.','kosong':'Belum ada catatan pada kunjungan ini.','sukses':'Catatan tersimpan.','tooltip':'Kunjungan selesai mengikuti aturan penguncian server'},empty='Tidak menyalin isi kunjungan lama otomatis; template memerlukan peninjauan dokter.',specific='Sumber frontend MedicalRecordForm:46 masih mencantumkan admin pada canAccess, sedangkan kebijakan proyek/DB melarang isi klinis untuk admin. Ini ketidaksesuaian affordance yang perlu diselaraskan Antigravity/Ketua; jangan memperluas izin database. Navigasi odontogram harus punya daftar gigi alternatif keyboard; mikrofon/dikte meminta izin perangkat jelas.',privacy='Auto-lock dan reautentikasi sebelum membuka data klinis adalah RENCANA; tidak menghapus draft server. Hindari localStorage data medis; pulihkan draft hanya dengan sesi/izin sah. Setelah kunjungan terkunci, edit mengikuti mekanisme koreksi resmi, bukan membuka paksa.',metric='USULAN: uji dokter menyelesaikan SOAP tanpa kehilangan input; nol edit tersimpan pada kunjungan terkunci; semua gigi dapat diakses keyboard.',effort='L',risk='Penguncian/lunas, draft, enkripsi, odontogram, consent'),
dict(slug='jadwal',title='Jadwal dan Kunjungan',source='schedule/SchedulePage.jsx; schedule/DoctorSchedulePage.jsx',roles='Resepsionis mengatur booking; dokter melihat jadwal praktik dan kunjungan sesuai izin; admin hanya kapasitas agregat.',tasks=['Memilih tanggal/dokter','Mendaftarkan jadwal','Memeriksa benturan','Memperbarui status kunjungan sesuai peran'],hier='Tanggal dan dokter → agenda harian → booking menunggu → detail jadwal',main='Agenda hari / Kalender / Filter',side='Booking dan detail slot',mobile=['Jadwal [Tanggal]','[Dokter] [Status]','09.00  Slot / status','09.30  Slot / status','[Jadwalkan kunjungan]'],components=['Date Picker','Select','Tabel Data','Drawer','Badge','Dialog'],fields={'judul':'Jadwal klinik','label':'Tanggal kunjungan','placeholder':'Pilih tanggal','galat':'Jadwal berubah. Muat ulang sebelum memilih slot.','kosong':'Belum ada kunjungan pada tanggal ini.','sukses':'Jadwal kunjungan tersimpan.','tooltip':'Jam ditampilkan dalam zona waktu klinik'},empty='Tampilkan jam praktik dan CTA berizin; hari tutup berbeda dari kosong.',specific='Pertahankan scheduled/ongoing/completed/cancelled dengan teks. Konflik diperiksa lagi server saat simpan. Jangan mengubah tanggal via toISOString UTC bila hari lokal dimaksud. Drag-drop opsional desktop, wajib alternatif Ubah waktu dengan keyboard.',privacy='Detail identitas hanya bagi peran berizin; admin melihat slot/capacity agregat. Permintaan booking publik tidak membocorkan daftar pasien lama.',metric='USULAN: nol penyimpanan jadwal bentrok yang ditolak server tanpa penjelasan; ukur waktu mengubah slot dan kesalahan tanggal lokal.',effort='M',risk='Zona waktu, benturan, jadwal dokter dan data bersamaan'),
dict(slug='pembayaran',title='Pembayaran Kasir',source='payment/PaymentForm.jsx; payment/PaymentList.jsx; payment/QrisPanel.jsx',roles='Hanya resepsionis berizin memproses pembayaran pasien. Admin memakai laporan agregat.',tasks=['Memeriksa kunjungan dan tagihan','Memilih metode pembayaran','Memeriksa nominal/diskon','Menyimpan pembayaran dan mencetak invoice'],hier='Kunjungan + status → rincian item → subtotal/diskon/total → metode/jumlah bayar → simpan',main='Item tindakan dan obat / Total',side='Metode / Jumlah bayar / Ringkasan',mobile=['Pembayaran','Kunjungan + status','Item tagihan','Subtotal / Diskon / Total','Metode | Jumlah bayar','[Simpan pembayaran]'],components=['Tabel Data','Input','Select','Kartu','Dialog','Tombol','Toast'],fields={'judul':'Pembayaran kunjungan','label':'Jumlah dibayar','placeholder':'Masukkan nominal Rupiah','galat':'Pembayaran belum terkonfirmasi. Periksa status sebelum mengulangi.','kosong':'Belum ada item yang dapat ditagihkan.','sukses':'Pembayaran tercatat. Invoice dapat dicetak.','tooltip':'Pembayaran lunas mengunci item sesuai aturan server'},empty='Kembali ke kunjungan; kasir tidak menciptakan tindakan klinis tanpa alur berizin.',specific='Total selalu terlihat sticky tanpa menutup field. Tampilkan kembalian atau sisa bayar dari kalkulasi server; jangan anggap QR ditampilkan berarti lunas. Pisahkan bukti transfer manual, QRIS klinik, dan billing langganan Midtrans. Retry setelah timeout membaca status transaksi dahulu.',privacy='Jangan tampilkan diagnosis/SOAP kepada kasir. Perubahan kunjungan lunas tetap ditolak server. Diskon besar/reversal memerlukan alur dan izin yang ditetapkan Ketua, bukan konfirmasi visual saja.',metric='USULAN: skenario kasir fixture selesai ≤60 detik dengan total benar; nol pencatatan ganda akibat klik ulang; ukur sebelum/sesudah.',effort='L',risk='Rumus invoice, pembulatan, status QRIS, item lunas dan retry'),
dict(slug='biaya-stok',title='Biaya, Modal dan Stok',source='costing/CostingDashboard.jsx; costing/StockOpname.jsx; costing/MaterialPurchases.jsx',roles='Admin mengelola bahan, overhead, resep biaya, margin; dokter hanya data tindakan berizin, tidak seluruh keuangan.',tasks=['Menilai stok dan batch','Mencatat pembelian/opname','Mengatur overhead dan resep biaya','Membandingkan HPP dan tarif'],hier='Tab area → ringkasan sesuai tab → filter/pencarian → tabel → detail batch/biaya',main='Tabel bahan / Batch / HPP',side='Ringkasan biaya / Detail perubahan',mobile=['Biaya & Modal','[Area: Gudang v]','Cari bahan [Filter]','Bahan | Stok | Satuan','Batch dan kadaluwarsa','[Stok masuk] [Opname]'],components=['Tab','Select','Tabel Data','Input','Drawer','Dialog','Badge'],fields={'judul':'Biaya & Modal','label':'Satuan pembelian','placeholder':'Pilih bahan atau pemasok','galat':'Satuan atau harga belum cocok. Periksa sebelum menyimpan.','kosong':'Belum ada bahan untuk filter ini.','sukses':'Perubahan stok tercatat.','tooltip':'Satuan beli dapat berbeda dari satuan dasar'},empty='Tambah bahan baru hanya setelah pencarian duplikat; jangan isi harga nol sebagai harga tidak diketahui.',specific='Pertahankan tujuh tab sumber: overhead, BOM, master, purchase, stock_card, opname, profitability. Pada ponsel pemilih area mengganti tab scroll panjang. Selalu tampilkan konversi box→ampul/pcs, harga per satuan dan total; stock-opname menunjukkan sebelum/sesudah. Kadaluwarsa memberi teks dan tanggal, bukan warna saja.',privacy='Pembuangan batch memerlukan alasan dan audit; jangan menghapus histori stok. HPP per tindakan bukan tarif pasien; jelaskan pembobotan overhead dan periode.',metric='USULAN: 100% pengguna uji membedakan satuan beli/dasar pada fixture lidocaine; nol submit opname tanpa konfirmasi selisih.',effort='L',risk='Konversi satuan, biaya rata-rata, batch, HPP dan bulk atomik'),
dict(slug='antrean-tv',title='Layar Antrean TV',source='queue/QueueDisplay.jsx; utils/dentiQueue.js',roles='Publik ruang tunggu dengan token layar terbatas; pengelola token admin/resepsionis sesuai izin.',tasks=['Membaca nomor panggilan','Mengenali ruang/dokter','Mengetahui status layanan'],hier='Klinik + waktu → nomor dipanggil → dokter/ruang → daftar berikutnya → pesan layanan',main='Nomor besar / Dokter / Ruang',side='Nomor berikutnya / Status koneksi',mobile=['Antrean klinik','Nomor dipanggil: A-012','Dokter / Ruang','Berikutnya: nomor saja','Terakhir diperbarui…'],components=['Kartu','Badge','Avatar Denti','Banner Offline dan Sesi'],fields={'judul':'Antrean klinik','label':'Nomor dipanggil','placeholder':'Tidak berlaku pada layar publik','galat':'Informasi antrean belum diperbarui. Silakan konfirmasi ke resepsionis.','kosong':'Belum ada panggilan saat ini.','sukses':'Informasi antrean diperbarui.','tooltip':'Layar publik hanya menampilkan informasi terbatas'},empty='Bedakan klinik tutup, tidak ada antrean, token tidak berlaku dan jaringan putus.',specific='Nomor panggilan dominan, Denti hero pendamping dan tidak menutupi nomor. Sumber melakukan polling 10 detik; stale ditandai bersama waktu pembaruan, jangan menyajikan panggilan lama seolah baru. Usulan audio memerlukan aktivasi pengelola dan fallback visual; hindari berkedip cepat. Desktop wireframe 1440 adalah minimum, uji juga TV 1920.',privacy='Tidak menampilkan nama lengkap/No.RM/NIK/telepon/keluhan; inisial hanya bila payload publik mengizinkan. Token layar jangan masuk screenshot publik; pencabutan token memutus akses. Tidak menjadikan TV sesi staf.',metric='USULAN: nomor dapat dibaca dari jarak ruang tunggu dalam uji lokasi; nol identitas lengkap tampil; stale terdeteksi setelah dua interval gagal.',effort='M',risk='Token publik, polling, suara, visibilitas jarak dan privasi'),
dict(slug='pengaturan-keamanan',title='Pengaturan dan Keamanan',source='settings/SettingsPage.jsx; Console modules/auth/MfaPage.tsx',roles='Semua peran mengatur keamanan akun sendiri; admin mengatur klinik sesuai izin; operator Console terpisah.',tasks=['Mendaftar/memverifikasi TOTP','Meninjau sesi perangkat (RENCANA)','Mengganti sandi','Meninjau audit ringkas tanpa isi klinis'],hier='Akun → keamanan → faktor TOTP → sesi perangkat → preferensi kunci → audit berizin',main='MFA / Sandi / Sesi perangkat',side='Panduan keamanan / Audit ringkas',mobile=['Pengaturan','[Keamanan akun]','Verifikasi dua langkah','[Atur autentikator]','Sesi perangkat (rencana)','Kunci layar (rencana)'],components=['Tab','Input','Dialog','Tabel Data','Pilihan','Tombol','Badge'],fields={'judul':'Keamanan akun','label':'Kode autentikator','placeholder':'6 digit','galat':'Kode belum cocok. Periksa waktu perangkat dan coba lagi.','kosong':'Belum ada autentikator terverifikasi.','sukses':'Autentikator terverifikasi.','tooltip':'Jangan bagikan kode atau gambar QR autentikator'},empty='Jangan mengklaim perangkat aman bila endpoint sesi belum tersedia; tampilkan penjelasan fitur rencana pada spesifikasi, bukan tombol palsu di produk.',specific='MFA enrollment: minta verifikasi terbaru, tampilkan QR sekali, konfirmasi kode sebelum faktor dianggap aktif. Menonaktifkan faktor dan mencabut sesi memerlukan server gate. Audit hash ditampilkan sebagai hasil pemeriksaan beserta cakupan/waktu, bukan jaminan tidak dapat diubah superuser.',privacy='RENCANA idle lock 5 menit untuk tampilan klinis sebagai asumsi awal; Ketua menetapkan. Kunci berbeda dari logout: data sensitif tertutup, pembukaan kembali memerlukan autentikasi. Jangan menyimpan secret TOTP di log/analytics.',metric='USULAN: semua peserta enrollment berhasil memverifikasi faktor tanpa bantuan; nol QR/secret tersisa pada tampilan setelah selesai.',effort='L',risk='AAL2, recovery, reset email belum operasional, sesi dan pencabutan faktor')]
for x in screens:
 comps=', '.join('['+n+'](../G2/komponen/'+{'Tombol':'tombol','Input':'input','Kartu':'kartu','Error State':'error-state','Dialog':'dialog','Kartu KPI':'kartu-kpi','Bagan Keuangan':'bagan-keuangan','Date Picker':'date-picker','Avatar Denti':'avatar-denti','Skeleton':'skeleton','Kartu Usulan Agen':'kartu-usulan-agen','Banner Offline dan Sesi':'banner-sesi','Tabel Data':'tabel','Pagination':'pagination','Drawer':'drawer','Empty State':'empty-state','Tab':'tab','Badge':'badge','Select':'select','Toast':'toast','Pilihan':'pilihan'}[n]+'.md)' for n in x['components'])
 mobile='\n'.join('| '+l.ljust(34)+' |' for l in x['mobile'])
 copy='\n'.join(f'| {k} | {v} |' for k,v in x['fields'].items())
 put('layar-'+x['slug']+'.md',f'''
# {x['title']}
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/{x['source']}. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
{x['roles']}
'''+ '\n'.join('- '+t for t in x['tasks'])+f'''

{x['metric']}
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
{x['hier']}. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | {x['title'][:42].ljust(42)} [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | {x['main'][:54].ljust(54)} |
|                | {x['side'][:54].ljust(54)} |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
{mobile}
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
{comps}. Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: {x['empty']}
- Galat: pesan di bagian terkait, tombol Coba lagi; input/pilihan tetap bila aman.
- Tanpa izin: “Akses halaman ini tidak tersedia untuk peran Anda.” Tidak memuat data dulu;
  kembali ke halaman peran. Server/RLS tetap otoritatif.
- Offline: Banner Offline dan Sesi, hentikan mutasi; bila status submit tidak pasti,
  baca ulang hasil sebelum mengulangi. Tidak menyimpan data medis ke penyimpanan umum.
- Data banyak: pagination server dan filter; jangan mengambil ribuan record sekaligus.
  Form/login/TV tidak memerlukan pagination; batasi daftar notifikasi/riwayat terkait.

## 5. Interaksi, keyboard dan fokus
motion.fast/normal dari G2 untuk respons/peralihan, motion.reduced=0 saat reduced
motion. Urutan fokus mengikuti hierarki DOM, aksi utama sesudah data yang diperiksa.
Dialog mengembalikan fokus ke pemicu; submit gagal fokus ringkasan galat; pemuatan
latar tidak merebut fokus. Tooltip muncul saat fokus dan dapat ditutup Escape.
{x['specific']}

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
{copy}
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
{x['privacy']}
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha {x['effort']} (perkiraan relatif, Ketua menetapkan). Risiko: {x['risk']}.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
''')
put('pola-global.md','''
# Pola Global
Versi 1.0 · Semua penambahan di bawah adalah RENCANA.

## Command palette
Ctrl+K Windows/Linux, Cmd+K macOS; jangan mengambil shortcut saat komposisi IME.
Dialog pencarian halaman/tindakan sesuai peran, bukan pencarian data pasien global.
Panah navigasi hasil, Enter membuka, Escape menutup, fokus kembali pemicu. Bila
hasil kosong: “Tidak ada halaman yang cocok. Coba kata lain.” Filter clinic_id
dan peran berasal dari izin server; daftar lokal tidak menjadi sumber otorisasi.
Tindakan destruktif membuka dialog konfirmasi dan tetap memerlukan server gate.

## Pusat notifikasi
Urutan: insiden akses yang perlu tindakan → gagal tugas → pengingat → informasi.
Setiap item memiliki waktu, kategori, status baca, satu tindakan dan deduplikasi
event. Daftar 20 per halaman, baca semua hanya per pengguna/klinik. Jangan menaruh
diagnosis/NIK/nama pasien pada preview; ringkas sebagai “Jadwal perlu ditinjau”.
Keadaan kosong, gagal, offline dan expired mengikuti komponen G2. Dibaca tidak
berarti masalah selesai. Notifikasi push/WA/email di luar lingkup kecuali sudah
ada kanal nyata; jangan menjanjikan pengiriman yang SMTP-nya belum tersedia.

## Onboarding klinik — lima langkah
1. Verifikasi profil dan zona waktu klinik (admin; jangan unggah rahasia).
2. Undang staf/peran dengan alur yang tersedia; undangan email menunggu SMTP nyata.
3. Atur jadwal praktik dan tarif awal; dokter memeriksa data klinis sesuai izin.
4. Tinjau pengaturan keamanan: TOTP, akses, kontak pemulihan; AAL2 backend dahulu.
5. Jalankan satu alur simulasi sintetis dan tinjau ringkasan kesiapan bersama tim.
Checklist menunjukkan bukti penyelesaian, bukan klik “sudah”. Dapat dilanjutkan
antarperangkat lewat server bila tersedia; belum menganggap daftar lokal sebagai
kontrol keamanan. Migrasi data nyata lewat alur pemilik yang disetujui, bukan AI.

## Mode ringkas
Tabel desktop row-compact 40 px, kontrol 36 px; ponsel hit area tetap 44 px.
Simpan preferensi pengguna tanpa data klinis. Tetap ada header sort, label kolom,
pagination dan fokus. Sembunyikan kolom sekunder lewat pemilih kolom, jangan
membuang informasi total/peringatan. Tidak menyusutkan teks penting di bawah 14 px.

## Offline, sesi berakhir, idle
Putus koneksi: tampilkan waktu pembaruan terakhir; mutasi berhenti. Setelah timeout
mutasi, baca status dahulu. Sesi berakhir: tutup informasi sensitif, arahkan masuk
ulang, jangan melanjutkan apply otomatis setelah login. Idle klinis 5 menit adalah
ASUMSI awal untuk Ketua; pemberitahuan 30 detik sebelumnya, tombol tetap aktif
tidak menjadi bypass assurance server. Recovery draft tidak melalui localStorage RME.

## Konsistensi navigasi lintas peran
Admin: bisnis/agregat, bukan daftar pasien atau kasir. Dokter: pelayanan klinis.
Resepsionis: administrasi dan pembayaran. Operator Console: operasional platform
sesuai izin operator, tidak otomatis membaca data klinis tenant. Menu hanya
menampilkan tujuan yang sah; akses URL langsung tetap diperiksa di server.
''')
put('urutan-implementasi.md','''
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
''')
result=[]
for x in screens:
 text=(P/('layar-'+x['slug']+'.md')).read_text(encoding='utf-8');assert len(re.findall(r'^## [1-9]\.',text,re.M))==9
 result.append({'screen':x['slug'],'sections':9,'wireframes':['1440','375'],'components':x['components']})
put('validasi.json',json.dumps(result,ensure_ascii=False,indent=2));print('G3: 10 layar × 9 bagian, pola global dan prioritas ditulis.')
