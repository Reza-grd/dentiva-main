/**
 * Isi tur pengenalan Eira per peran — rinci: setiap menu dibuka, lalu isi halamannya disorot satu per satu.
 *
 * Bidang setiap langkah:
 *   bab    : nama bagian (dipakai untuk lompat bab & label kecil di kartu)
 *   judul, isi (markdown ringan)
 *   ke     : halaman yang dibuka sebelum langkah tampil (boleh berisi ?query)
 *   target : pemilih CSS elemen yang disorot (menu samping memakai data-tur="<path>")
 *   teks   : alternatif target — elemen pertama (dari `tag`) yang teksnya diawali kalimat ini
 *   naik   : setelah ketemu, naik ke induk terdekat yang cocok dengan pemilih ini
 *   klik   : klik elemen yang disorot dulu (mis. membuka tab di halaman itu)
 *   coba   : pengguna boleh langsung mengisi/klik area yang disorot (tirai tidak menghalangi)
 *   pose   : gerakan Eira; tanya: contoh pertanyaan yang dijawab Eira di langkah itu
 * Bila elemen tidak ditemukan (mis. di ponsel), kartu tampil di tengah tanpa sorotan.
 */
export const TUR_VERSI = 2;

const menu = (path) => `[data-tur="${path}"]`;
const EIRA = '.denti-widget__launch';
const CARI = '[data-tur="cari"]';
const KARTU_EIRA = '.ai-brief';

export const PERAN_LABEL = { admin: 'Manajer Klinik', dokter: 'Dokter', resepsionis: 'Resepsionis' };

export const PEMBUKA = {
  admin: 'Kita akan membuka setiap menu manajer satu per satu dan melihat isinya: dari pengaturan klinik, tim, tarif, stok & HPP, hingga laporan.',
  dokter: 'Kita akan membuka setiap menu Anda dan melihat isinya, lalu **berlatih mengisi rekam medis** pada pasien simulasi tanpa identitas — tidak ada data yang tersimpan.',
  resepsionis: 'Kita akan membuka setiap menu meja depan dan melihat isinya: pendaftaran, jadwal, booking online, recall, layar antrean, hingga kasir.',
};

/* ═════════════════════════════ DOKTER ═════════════════════════════ */
const DOKTER = [
  // Dashboard
  { bab: 'Dashboard', judul: 'Dashboard dokter', isi: 'Halaman pertama setiap kali Anda masuk. Semua yang perlu Anda tangani hari ini ada di sini.', target: menu('/dokter'), ke: '/dokter', pose: 'point', tanya: 'Apa itu dashboard?' },
  { bab: 'Dashboard', judul: 'Angka hari ini', isi: 'Jumlah pasien hari ini, yang **sudah selesai**, dan yang **belum ditangani**. Angka ini bergerak otomatis saat pemeriksaan dimulai dan diselesaikan.', ke: '/dokter', teks: 'Pasien Hari Ini', tag: 'span', naik: '.grid', pose: 'nod' },
  { bab: 'Dashboard', judul: 'Jadwal hari ini', isi: 'Antrean pasien Anda hari ini. Tekan **Mulai** saat pasien masuk ruang periksa dan **Selesai** setelah tindakan — pasien yang selesai siap dibayar di kasir. Rekam medisnya dibuka dari menu **Jadwal** atau **Data Pasien**.', ke: '/dokter', teks: 'Jadwal Hari Ini', tag: 'h2', naik: '.glass-panel, [class*="rounded"]', pose: 'point', tanya: 'Bagaimana memulai pemeriksaan?' },
  { bab: 'Dashboard', judul: 'Akses cepat', isi: 'Pintasan ke halaman yang paling sering Anda buka.', ke: '/dokter', teks: 'Akses Cepat', tag: 'h3', naik: '.glass-panel, [class*="rounded"]', pose: 'nod' },

  // Jadwal
  { bab: 'Jadwal', judul: 'Menu Jadwal Hari Ini', isi: 'Seluruh kunjungan terjadwal, bukan hanya hari ini.', target: menu('/dokter/jadwal'), pose: 'point' },
  { bab: 'Jadwal', judul: 'Pilih tanggal', isi: 'Ganti tanggal untuk melihat jadwal hari lain, misalnya persiapan esok hari.', ke: '/dokter/jadwal', target: '[aria-label="Pilih tanggal kunjungan"]', pose: 'nod' },
  { bab: 'Jadwal', judul: 'Saring status', isi: 'Tampilkan hanya yang **terjadwal**, **berlangsung**, **selesai**, atau **batal**.', ke: '/dokter/jadwal', target: '[aria-label="Filter status kunjungan"]', pose: 'point' },
  { bab: 'Jadwal', judul: 'Aksi di setiap baris', isi: 'Setiap kunjungan punya tombol **Profil**, **Rekam Medis**, **Mulai**, dan **Selesai** (serta **Batalkan**). Urutan Mulai → Selesai menjaga status antrean tetap benar untuk resepsionis dan kasir.', ke: '/dokter/jadwal', teks: 'Jadwal Kunjungan', tag: 'h1', pose: 'idea' },

  // Data pasien
  { bab: 'Data pasien', judul: 'Menu Data Pasien', isi: 'Seluruh pasien klinik beserta riwayatnya.', target: menu('/pasien'), pose: 'point' },
  { bab: 'Data pasien', judul: 'Cari pasien', isi: 'Ketik nama, **nomor rekam medis**, nomor WhatsApp, atau alamat. Hasil muncul saat Anda mengetik.', ke: '/pasien', target: 'input[placeholder^="Cari nama, No. RM"]', pose: 'nod', tanya: 'Apa itu nomor rekam medis?' },
  { bab: 'Data pasien', judul: 'Saring daftar', isi: 'Persempit berdasarkan jenis kelamin atau status pasien aktif.', ke: '/pasien', target: '[aria-label="Filter status pasien"]', pose: 'point' },
  { bab: 'Data pasien', judul: 'Buka profil atau rekam medis', isi: 'Di setiap baris ada tombol untuk **melihat profil** (riwayat, alergi, kunjungan) dan **membuka rekam medis** pasien itu. Inilah cara tercepat mengakses rekam medis pasien lama.', ke: '/pasien', target: 'table', pose: 'idea' },
  { bab: 'Data pasien', judul: 'Cari dari mana saja', isi: 'Kolom pencarian di bilah atas (atau **Ctrl + K**) membuka data pasien dari halaman mana pun.', target: CARI, pose: 'point', tanya: 'Bagaimana mencari pasien?' },

  // Rekam medis — daftar
  { bab: 'Rekam medis', judul: 'Menu Rekam Medis', isi: 'Daftar seluruh rekam medis yang bisa Anda buka.', target: menu('/dokter/rekam-medis'), pose: 'point' },
  { bab: 'Rekam medis', judul: 'Cara mengakses rekam medis', isi: 'Ada tiga jalan: tombol **Rekam Medis** di baris halaman **Jadwal**, dari **Data Pasien**, atau dari halaman ini — cari nama atau No. RM lalu klik baris pasiennya.', ke: '/dokter/rekam-medis', target: 'input[placeholder="Nama atau No. RM..."]', pose: 'nod' },
  { bab: 'Rekam medis', judul: 'Latihan dengan pasien simulasi', isi: 'Tombol ini membuka formulir rekam medis lengkap dengan **pasien tanpa identitas**. Isinya tidak pernah disimpan, jadi aman untuk mencoba semua bagian. Kita buka sekarang.', ke: '/dokter/rekam-medis', target: '[data-tur="rm-latihan"]', pose: 'idea' },

  // Rekam medis — simulasi formulir
  { bab: 'Simulasi rekam medis', judul: 'Mode simulasi', isi: 'Anda sekarang di formulir rekam medis yang sama persis dengan pasien sungguhan. Tanda ini memastikan **tidak ada data yang disimpan**.', ke: '/rekam-medis/simulasi', target: '[data-tur="rm-simulasi"]', pose: 'welcome' },
  { bab: 'Simulasi rekam medis', judul: 'Identitas pasien', isi: 'Pada pasien sungguhan, kartu ini menampilkan nama, No. RM, umur, jenis kelamin, kontak, golongan darah, dan dokter pemeriksa — pastikan Anda membuka pasien yang benar.', ke: '/rekam-medis/simulasi', teks: 'Pasien Simulasi', tag: 'h2', naik: '.glass-panel', pose: 'nod' },
  { bab: 'Simulasi rekam medis', judul: '1 · Riwayat penyakit', isi: 'Centang penyakit sistemik (hipertensi, diabetes, jantung, dll.) dan **alergi** beserta rinciannya. Riwayat ini tersimpan di pasien dan terbawa ke kunjungan berikutnya. **Silakan coba centang satu.**', ke: '/rekam-medis/simulasi', teks: 'Riwayat Penyakit Medis', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'point' },
  { bab: 'Simulasi rekam medis', judul: '2 · Keluhan utama (wajib)', isi: 'Tulis keluhan dengan kata-kata pasien, misalnya *“gigi belakang kanan bawah ngilu saat minum dingin sejak 3 hari”*. Bidang ini **wajib** — tanpa ini rekam medis tidak bisa disimpan. **Coba ketik sekarang.**', ke: '/rekam-medis/simulasi', teks: 'Keluhan Utama', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'idea' },
  { bab: 'Simulasi rekam medis', judul: '3 · Pemeriksaan ekstra oral', isi: 'Wajah, bibir, kelenjar getah bening kanan/kiri, sendi rahang (TMJ), dan otot pengunyahan. Pilih kondisi dari pilihan yang tersedia, tambahkan keterangan bila tidak normal.', ke: '/rekam-medis/simulasi', teks: 'Pemeriksaan Extra Oral', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'nod' },
  { bab: 'Simulasi rekam medis', judul: '4 · Tanda vital', isi: 'Tekanan darah, nadi, dan pernapasan. Penting sebelum anestesi atau pencabutan, terutama pada pasien dengan riwayat hipertensi.', ke: '/rekam-medis/simulasi', teks: 'Keadaan Umum (Tanda Vital)', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'point' },
  { bab: 'Simulasi rekam medis', judul: '5 · Pemeriksaan intra oral', isi: 'Debris, plak, kalkulus, perdarahan papila, risiko karies, pH plak & saliva, serta kondisi gingiva, mukosa, palatum, lidah, dasar mulut, dan hubungan rahang.', ke: '/rekam-medis/simulasi', teks: 'Keadaan Umum Intra Oral', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'nod' },
  { bab: 'Simulasi rekam medis', judul: '6 · Periodontal & OHI-S', isi: 'Isi skor **debris** dan **kalkulus** (0–3) pada enam gigi indeks. Dentiva menghitung **DI, CI, dan OHI-S** beserta kategorinya (baik/sedang/buruk) secara otomatis.', ke: '/rekam-medis/simulasi', teks: 'Pemeriksaan Periodontal', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'idea' },
  { bab: 'Simulasi rekam medis', judul: '7 · Odontogram', isi: '**Klik satu gigi**, lalu pilih kondisinya (karies, tumpatan, sisa akar, hilang, mahkota, dll.) dan permukaannya. Tombol **Legenda** menjelaskan setiap simbol; ada gigi anak dan dewasa. **Coba klik satu gigi sekarang.**', ke: '/rekam-medis/simulasi', teks: 'Odontogram Anak', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'point', tanya: 'Apa itu odontogram?' },
  { bab: 'Simulasi rekam medis', judul: '8 · Diagnosis & perawatan', isi: 'Pilih **diagnosis** (temuan masalah) dan **tindakan** dari master treatment klinik. Tindakan yang dipilih di sini menjadi dasar **tagihan** di kasir.', ke: '/rekam-medis/simulasi', teks: 'Diagnosis & Perawatan', tag: 'h3', naik: '.glass-panel, [class*="rounded"]', coba: true, pose: 'nod' },
  { bab: 'Simulasi rekam medis', judul: '9 · Media pasien', isi: 'Unggah foto rontgen (periapikal, panoramik) dan foto klinis. Berkas tersimpan aman per pasien. Dalam simulasi bagian ini dinonaktifkan.', ke: '/rekam-medis/simulasi', teks: 'Media Pasien', tag: 'h3', naik: '.glass-panel', pose: 'point' },
  { bab: 'Simulasi rekam medis', judul: '10 · Catatan suara', isi: 'Tekan **Mulai Bicara** dan diktekan temuan Anda; teksnya muncul di kotak sebelah untuk disalin ke SOAP. Tangan tetap bebas saat memeriksa.', ke: '/rekam-medis/simulasi', teks: 'Catatan Suara Medis', tag: 'h3', naik: '.glass-panel', pose: 'listen' },
  { bab: 'Simulasi rekam medis', judul: '11 · Kunjungan & SOAP', isi: 'Setiap kunjungan dicatat dalam format **SOAP**: **S** keluhan, **O** pemeriksaan, **A** diagnosis (+ kode **ICD-10**), **P** terapi/tindakan. Gunakan **Template SOAP** agar lebih cepat. Kolom bertanda * wajib. **Coba isi Keluhan (S).**', ke: '/rekam-medis/simulasi', teks: 'Histori Kunjungan', tag: 'h3', naik: '.glass-panel', coba: true, pose: 'idea', tanya: 'Ajarkan cara mengisi rekam medis' },
  { bab: 'Simulasi rekam medis', judul: '12 · Resep elektronik', isi: 'Di dalam setiap kunjungan: pilih obat, isi **dosis**, **frekuensi**, dan **jumlah**. Resep bisa dicetak sebagai PDF setelah rekam medis disimpan.', ke: '/rekam-medis/simulasi', teks: 'E-Prescription', tag: 'h4', naik: 'div', pose: 'point' },
  { bab: 'Simulasi rekam medis', judul: '13 · Simpan, cetak, rujuk', isi: '**Simpan Rekam Medis** memeriksa bidang wajib (ditandai merah bila kosong) lalu menyimpan dengan **riwayat versi**. Setelah tersimpan: kunci catatan, buat **informed consent**, cetak resep, atau buat **surat rujukan**. Dalam simulasi, Simpan hanya memeriksa kelengkapan — **coba tekan sekarang.**', ke: '/rekam-medis/simulasi', target: '[data-tur="rm-aksi"]', coba: true, pose: 'nod' },

  // Riwayat kunjungan & profil
  { bab: 'Riwayat & profil', judul: 'Riwayat kunjungan', isi: 'Semua kunjungan yang pernah Anda tangani, lengkap dengan status dan isi SOAP-nya.', target: menu('/dokter/kunjungan'), pose: 'point' },
  { bab: 'Riwayat & profil', judul: 'Cari kunjungan lama', isi: 'Cari berdasarkan nama, No. RM, atau isi keluhan, lalu klik untuk melihat rincian kunjungan.', ke: '/dokter/kunjungan', target: 'input[placeholder^="Nama, No.RM"]', pose: 'nod' },
  { bab: 'Riwayat & profil', judul: 'Profil dokter', isi: 'Data diri profesional Anda.', target: menu('/dokter/profil-dokter'), pose: 'point' },
  { bab: 'Riwayat & profil', judul: 'Gelar & nama', isi: 'Gelar depan (mis. *drg.*), nama, dan gelar belakang tampil persis seperti ini di resep, surat rujukan, dan informed consent.', ke: '/dokter/profil-dokter', teks: 'Kredensial & Nama', tag: 'h3', naik: 'div', pose: 'nod' },
  { bab: 'Riwayat & profil', judul: 'STR & SIP', isi: 'Isi nomor **STR** dan **SIP** yang aktif. Wajib untuk dokumen resmi dan untuk pengiriman data ke SATUSEHAT.', ke: '/dokter/profil-dokter', teks: 'Nomor Lisensi Medis', tag: 'h3', naik: 'div', pose: 'idea', tanya: 'Apa itu STR?' },
];

/* ═══════════════════════════ RESEPSIONIS ═══════════════════════════ */
const RESEPSIONIS = [
  // Dashboard
  { bab: 'Dashboard', judul: 'Dashboard resepsionis', isi: 'Pusat kendali meja depan: antrean, kunjungan, dan pembayaran hari ini.', target: menu('/resepsionis'), ke: '/resepsionis', pose: 'point', tanya: 'Apa itu dashboard?' },
  { bab: 'Dashboard', judul: 'Angka hari ini', isi: '**Antrean**, yang **sudah selesai**, yang **belum bayar**, dan tagihan **belum lunas** hari ini.', ke: '/resepsionis', teks: 'Antrean Hari Ini', tag: 'span', naik: '.grid', pose: 'nod' },
  { bab: 'Dashboard', judul: 'Tugas meja depan dari Eira', isi: 'Saya merangkum hal yang perlu Anda kerjakan hari ini: booking yang menunggu, pasien belum bayar, dan pengingat kontrol.', ke: '/resepsionis', target: KARTU_EIRA, pose: 'idea' },
  { bab: 'Dashboard', judul: 'Antrean langsung', isi: 'Pasien hari ini berurutan. Dari baris pasien Anda bisa menekan **Mulai** dan **Selesai**, membuka profil pasien, lalu **Bayar** setelah pemeriksaan selesai.', ke: '/resepsionis', teks: 'Antrean Langsung', tag: 'h3', naik: '.rounded-2xl, [class*="rounded"]', pose: 'point' },

  // Pendaftaran
  { bab: 'Pendaftaran', judul: 'Menu Daftar Pasien', isi: 'Untuk pasien yang datang langsung atau lewat telepon.', target: menu('/pasien/daftar'), pose: 'point', tanya: 'Ajarkan cara mendaftarkan pasien' },
  { bab: 'Pendaftaran', judul: 'Pasien baru', isi: 'Pilih **Pasien Baru** untuk pasien yang pertama kali datang. Nomor rekam medis dibuat otomatis.', ke: '/pasien/daftar', teks: 'Pasien Baru', tag: 'button', klik: true, pose: 'nod' },
  { bab: 'Pendaftaran', judul: 'Data diri', isi: 'Nama lengkap, NIK, tanggal lahir, jenis kelamin, golongan darah. **NIK wajib diisi** — dipakai untuk SATUSEHAT dan BPJS.', ke: '/pasien/daftar', teks: 'Data Diri Pasien', tag: 'h2', naik: '.glass-panel, [class*="rounded"]', pose: 'point' },
  { bab: 'Pendaftaran', judul: 'Kontak & jaminan', isi: 'Nomor **WhatsApp** dipakai untuk pengingat jadwal dan recall. Pilih juga jaminan: **Umum**, **BPJS**, atau **Asuransi Swasta**.', ke: '/pasien/daftar', teks: 'Kontak & Jaminan', tag: 'h2', naik: '.glass-panel, [class*="rounded"]', pose: 'nod' },
  { bab: 'Pendaftaran', judul: 'Tiga tahap pendaftaran', isi: '**1 Identitas & Jaminan** → **2 Alamat Domisili** → **3 Klinik & Jadwal** (dokter keluarga, keluhan awal, dan jadwal kunjungan pertama). Tahap berikutnya terbuka setelah data wajib tahap ini lengkap; Anda selalu bisa kembali ke tahap sebelumnya. Keluhan awal langsung terbaca dokter di rekam medis.', ke: '/pasien/daftar', teks: 'Identitas & Jaminan', tag: 'p', naik: '.max-w-xl', pose: 'idea' },
  { bab: 'Pendaftaran', judul: 'Pasien lama', isi: 'Untuk pasien yang sudah terdaftar: pilih **Pasien Lama**, cari namanya, lalu buat jadwal kunjungan baru — tanpa mengetik ulang datanya.', ke: '/pasien/daftar', teks: 'Pasien Lama', tag: 'button', klik: true, pose: 'nod' },

  // Data pasien
  { bab: 'Data pasien', judul: 'Menu Data Pasien', isi: 'Seluruh pasien klinik.', target: menu('/pasien'), pose: 'point' },
  { bab: 'Data pasien', judul: 'Cari & saring', isi: 'Cari nama, No. RM, WhatsApp, atau alamat. Klik baris pasien untuk melihat profil dan mengubah datanya.', ke: '/pasien', target: 'input[placeholder^="Cari nama, No. RM"]', pose: 'nod', tanya: 'Bagaimana mencari pasien?' },

  // Jadwal
  { bab: 'Jadwal', judul: 'Menu Jadwal', isi: 'Semua kunjungan terjadwal.', target: menu('/resepsionis/jadwal'), pose: 'point' },
  { bab: 'Jadwal', judul: 'Memantau jadwal', isi: 'Janji baru dibuat dari **Daftar Pasien** (pilih **Pasien Lama** untuk pasien terdaftar) atau dari **Booking Online**. Halaman ini untuk memantau dan mengelola kunjungan.', ke: '/resepsionis/jadwal', teks: 'Jadwal Kunjungan', tag: 'h1', pose: 'idea' },
  { bab: 'Jadwal', judul: 'Tanggal & status', isi: 'Pindah tanggal dan saring status untuk melihat siapa yang belum datang. Dari baris kunjungan: buka **Profil**, terima **Pembayaran** setelah pemeriksaan selesai, atau **Batalkan** bila pasien berhalangan.', ke: '/resepsionis/jadwal', target: '[aria-label="Pilih tanggal kunjungan"]', pose: 'nod' },

  // Booking online
  { bab: 'Booking online', judul: 'Menu Booking Online', isi: 'Permintaan janji dari halaman booking klinik Anda.', target: menu('/booking-requests'), pose: 'point', tanya: 'Apa itu booking online?' },
  { bab: 'Booking online', judul: 'Memproses permintaan', isi: 'Saring per status. Untuk setiap permintaan: **Konfirmasi** atau **Tolak**, lalu **Kabari via WA**. Untuk pasien baru, tekan **Daftarkan pasien** — datanya terisi otomatis.', ke: '/booking-requests', teks: 'Booking Online', tag: 'h1', naik: 'div', pose: 'idea', tanya: 'Ajarkan cara memproses booking' },

  // Recall
  { bab: 'Recall', judul: 'Menu Recall Pasien', isi: 'Pasien yang sudah waktunya kontrol kembali.', target: menu('/resepsionis/recall'), pose: 'point', tanya: 'Apa itu recall?' },
  { bab: 'Recall', judul: 'Template pesan', isi: 'Pesan WhatsApp pengingat kontrol. Tulis **{nama}** dan **{klinik}** — keduanya diganti otomatis dengan nama pasien dan klinik.', ke: '/resepsionis/recall', target: '#recall-template', pose: 'nod' },
  { bab: 'Recall', judul: 'Kirim pengingat', isi: 'Cari pasien, lalu tekan tombol WhatsApp di barisnya. Pesan dibuka di WhatsApp Anda untuk dikirim — tidak ada yang terkirim otomatis.', ke: '/resepsionis/recall', target: 'input[aria-label="Cari pasien"]', pose: 'point' },

  // Riwayat, layar antrean, pembayaran
  { bab: 'Riwayat kunjungan', judul: 'Riwayat kunjungan', isi: 'Semua kunjungan yang sudah lewat. Cari dengan nama atau No. RM untuk melihat rinciannya.', target: menu('/resepsionis/kunjungan'), pose: 'nod' },
  { bab: 'Layar antrean', judul: 'Menu Layar Antrean', isi: 'Antrean tampil di TV ruang tunggu.', target: menu('/layar-antrean'), pose: 'point' },
  { bab: 'Layar antrean', judul: 'Buat tautan TV', isi: 'Tekan **Buat tautan**, lalu buka tautannya di browser TV atau komputer layar — tanpa login. Tautan bisa dicabut kapan saja.', ke: '/layar-antrean', teks: 'Buat tautan', tag: 'button', pose: 'idea', tanya: 'Bagaimana memasang layar antrean di TV?' },
  { bab: 'Pembayaran', judul: 'Menu Pembayaran', isi: 'Kasir klinik: tagihan, pembayaran, dan kwitansi.', target: menu('/resepsionis/pembayaran'), pose: 'point' },
  { bab: 'Pembayaran', judul: 'Ringkasan kasir', isi: 'Jumlah transaksi, pendapatan, yang **sudah lunas**, dan **belum lunas** pada periode terpilih.', ke: '/resepsionis/pembayaran', teks: 'Total Transaksi', tag: 'span', naik: '.grid', pose: 'nod' },
  { bab: 'Pembayaran', judul: 'Cari & saring tagihan', isi: 'Cari nama pasien atau nomor invoice; saring rentang waktu dan status.', ke: '/resepsionis/pembayaran', target: '[aria-label="Cari nama pasien atau nomor invoice"]', pose: 'point' },
  { bab: 'Pembayaran', judul: 'Menerima pembayaran', isi: 'Buka tagihan, periksa tindakan dari dokter, beri diskon bila perlu, lalu pilih metode: **tunai**, **transfer**, atau **QRIS**. Cetak **kwitansi**, atau kirim invoice lewat WhatsApp (paket Pro).', ke: '/resepsionis/pembayaran', target: 'table', pose: 'idea', tanya: 'Ajarkan cara menerima pembayaran QRIS' },
];

/* ═══════════════════════════ MANAJER (ADMIN) ═══════════════════════════ */
const ADMIN = [
  // Dashboard
  { bab: 'Dashboard', judul: 'Dashboard klinik', isi: 'Kondisi klinik dalam satu layar.', target: menu('/admin'), ke: '/admin', pose: 'point', tanya: 'Apa itu dashboard?' },
  { bab: 'Dashboard', judul: 'Angka utama', isi: 'Total pasien, kunjungan hari ini, pendapatan hari ini dan bulan ini — dengan tren dibanding bulan lalu.', ke: '/admin', teks: 'Total Pasien', tag: 'span', naik: '.grid', pose: 'nod' },
  { bab: 'Dashboard', judul: 'Catatan hari ini dari Eira', isi: 'Ringkasan yang saya susun dari data klinik: yang berjalan baik, yang perlu perhatian, dan satu langkah yang saya sarankan. Anda juga bisa langsung bertanya di sini.', ke: '/admin', target: KARTU_EIRA, pose: 'idea' },
  { bab: 'Dashboard', judul: 'Grafik', isi: 'Tren **kunjungan 30 hari**, **pendapatan vs pengeluaran** 6 bulan, **tindakan terpopuler**, dan **aktivitas terbaru**.', ke: '/admin', teks: 'Kunjungan 30 Hari', tag: 'h3', naik: '[class*="rounded"]', pose: 'point' },

  // Pengaturan
  { bab: 'Pengaturan', judul: 'Menu Pengaturan', isi: 'Mulailah dari sini saat menyiapkan klinik.', target: menu('/admin/pengaturan'), pose: 'idea' },
  { bab: 'Pengaturan', judul: 'Profil klinik', isi: 'Nama, alamat, logo, dan kontak klinik — tampil di kwitansi, resep, dan halaman booking.', ke: '/admin/pengaturan', teks: 'Profil Klinik', tag: 'button', klik: true, pose: 'point' },
  { bab: 'Pengaturan', judul: 'WhatsApp', isi: 'Atur WhatsApp klinik dan **template pesan** pengingat untuk pasien.', ke: '/admin/pengaturan', teks: 'Pengaturan WhatsApp', tag: 'button', klik: true, pose: 'nod' },
  { bab: 'Pengaturan', judul: 'Template SOAP', isi: 'Siapkan isi SOAP baku per jenis tindakan agar dokter cukup memilih template saat mengisi rekam medis.', ke: '/admin/pengaturan', teks: 'Template SOAP', tag: 'button', klik: true, pose: 'point' },
  { bab: 'Pengaturan', judul: 'SATUSEHAT', isi: 'Masukkan kredensial SATUSEHAT klinik agar kunjungan dapat dikirim ke platform Kemenkes.', ke: '/admin/pengaturan', teks: 'SATUSEHAT', tag: 'button', klik: true, pose: 'nod' },
  { bab: 'Pengaturan', judul: 'Pembayaran & QRIS', isi: 'Unggah **QRIS** klinik dan atur metode pembayaran yang tampil di kasir.', ke: '/admin/pengaturan', teks: 'Pembayaran & QRIS', tag: 'button', klik: true, pose: 'idea', tanya: 'Ajarkan cara memasang QRIS' },
  { bab: 'Pengaturan', judul: 'Booking online', isi: 'Aktifkan halaman booking klinik dan bagikan tautannya ke pasien (Instagram, Google Maps, WhatsApp).', ke: '/admin/pengaturan', teks: 'Booking Online', tag: 'button', klik: true, pose: 'point', tanya: 'Apa itu booking online?' },
  { bab: 'Pengaturan', judul: 'Langganan & cadangan data', isi: '**Langganan** untuk paket Dentiva Anda; **Data & Cadangan** untuk membuat cadangan manual atau memulihkan data klinik.', ke: '/admin/pengaturan', teks: 'Data & Cadangan', tag: 'button', klik: true, pose: 'nod' },

  // Tim & tarif
  { bab: 'Tim & tarif', judul: 'Kelola pengguna', isi: 'Akun seluruh tim klinik dan perannya.', target: menu('/admin/pengguna'), pose: 'point' },
  { bab: 'Tim & tarif', judul: 'Tambah staf', isi: 'Buat akun **dokter** atau **resepsionis**. Setiap peran hanya melihat menu sesuai tugasnya; rekam medis hanya bisa dibuka dokter.', ke: '/admin/pengguna', teks: 'Tambah Staf', tag: 'button', naik: 'button', pose: 'idea', tanya: 'Bagaimana cara mengundang staf?' },
  { bab: 'Tim & tarif', judul: 'Master treatment', isi: 'Daftar tindakan dan tarifnya.', target: menu('/admin/treatments'), pose: 'point' },
  { bab: 'Tim & tarif', judul: 'Daftar & tarif tindakan', isi: 'Tambah atau ubah tindakan beserta kode, harga dasar, dan kode ICD-9-CM. Tarif di sini dipakai otomatis saat dokter memilih tindakan dan kasir membuat tagihan.', ke: '/admin/treatments', teks: 'Daftar Treatment', tag: 'h2', naik: '.glass-panel, [class*="rounded"]', pose: 'nod', tanya: 'Bagaimana mengubah tarif tindakan?' },
  { bab: 'Tim & tarif', judul: 'Jadwal praktik dokter', isi: 'Atur hari dan jam praktik setiap dokter, serta interval per pasien. Jadwal ini juga yang tampil di **booking online**.', target: menu('/admin/jadwal-dokter'), ke: '/admin/jadwal-dokter', pose: 'idea' },

  // Biaya & modal
  { bab: 'Biaya & modal', judul: 'Menu Biaya & Modal', isi: 'Stok bahan, resep bahan per tindakan, dan biaya operasional.', target: menu('/admin/costing'), pose: 'point', tanya: 'Apa itu HPP?' },
  { bab: 'Biaya & modal', judul: 'Ringkasan', isi: 'Nilai stok gudang, bahan yang **perlu dipesan**, margin per tindakan, dan biaya operasional bulanan. Klik kartunya untuk langsung ke bagian terkait.', ke: '/admin/costing', target: '[aria-label="Ringkasan biaya dan modal"]', pose: 'nod' },
  { bab: 'Biaya & modal', judul: 'Gudang', isi: '**Daftar bahan**, **stok masuk** (pembelian), **kartu stok**, dan **stok opname**. Pemakaian bahan dicatat di kartu stok.', ke: '/admin/costing', teks: 'Gudang', tag: '[role="tab"]', klik: true, pose: 'point' },
  { bab: 'Biaya & modal', judul: 'Resep & HPP', isi: 'Tentukan bahan yang dipakai tiap tindakan. Dentiva menghitung **HPP** dan **margin** setiap tindakan di tab Profitabilitas.', ke: '/admin/costing', teks: 'Resep & HPP', tag: '[role="tab"]', klik: true, pose: 'idea' },
  { bab: 'Biaya & modal', judul: 'Biaya operasional', isi: 'Biaya tetap bulanan (sewa, gaji, listrik) yang dialokasikan ke setiap tindakan agar margin terlihat jujur.', ke: '/admin/costing', teks: 'Biaya Operasional', tag: '[role="tab"]', klik: true, pose: 'nod' },

  // Keuangan
  { bab: 'Keuangan', judul: 'Pengeluaran', isi: 'Catat setiap pengeluaran klinik.', target: menu('/admin/pengeluaran'), ke: '/admin/pengeluaran', pose: 'point' },
  { bab: 'Keuangan', judul: 'Pindai nota', isi: 'Foto nota belanja; saya membaca isinya dan menyiapkan isian pengeluaran untuk Anda periksa. Atau tekan **Tambah** untuk mengisi manual.', ke: '/admin/pengeluaran', teks: 'Pindai nota', tag: 'button', pose: 'idea', tanya: 'Ajarkan cara mencatat pengeluaran' },
  { bab: 'Keuangan', judul: 'Laporan', isi: 'Laporan keuangan dan kunjungan.', target: menu('/admin/laporan'), ke: '/admin/laporan', pose: 'point' },
  { bab: 'Keuangan', judul: 'Laporan keuangan', isi: 'Pendapatan, pengeluaran, dan **laba bersih** per periode.', ke: '/admin/laporan', teks: 'Keuangan', tag: '[role="tab"]', klik: true, pose: 'nod', tanya: 'Apa itu margin?' },
  { bab: 'Keuangan', judul: 'Tahunan & kunjungan', isi: 'Ringkasan bulanan, kunjungan, tindakan terpopuler, dan **ekspor PDF** untuk laporan tahunan.', ke: '/admin/laporan', teks: 'Tahunan', tag: '[role="tab"]', klik: true, pose: 'idea' },

  // Eira & kontrol
  { bab: 'Asisten AI & kontrol', judul: 'Asisten AI', isi: 'Tanyakan kondisi klinik dengan bahasa sehari-hari.', target: menu('/admin/asisten-ai'), ke: '/admin/asisten-ai', pose: 'listen' },
  { bab: 'Asisten AI & kontrol', judul: 'Bertanya & meminta tindakan', isi: 'Contoh: *“berapa laba bulan ini?”* atau *“catat pengeluaran listrik 850 ribu”*. Bila saya mengusulkan perubahan data, **datanya baru berubah setelah Anda setujui**.', ke: '/admin/asisten-ai', target: 'textarea', pose: 'idea', tanya: 'Ajarkan cara memakai Asisten AI' },
  { bab: 'Asisten AI & kontrol', judul: 'Layar antrean', isi: 'Buat tautan untuk TV ruang tunggu — tanpa login.', target: menu('/layar-antrean'), pose: 'point' },
  { bab: 'Asisten AI & kontrol', judul: 'Audit log', isi: 'Jejak setiap perubahan penting.', target: menu('/admin/audit-log'), ke: '/admin/audit-log', pose: 'nod' },
  { bab: 'Asisten AI & kontrol', judul: 'Menelusuri perubahan', isi: 'Saring per modul dan waktu: siapa mengubah apa, kapan. Catatan ini **tidak dapat diubah atau dihapus** — penting saat audit.', ke: '/admin/audit-log', target: 'input[placeholder="Cari modul..."]', pose: 'point', tanya: 'Apa itu audit log?' },
];

export const LANGKAH = { admin: ADMIN, dokter: DOKTER, resepsionis: RESEPSIONIS };

/** Langkah penutup yang sama untuk semua peran: Eira selalu ada di pojok layar. */
export const LANGKAH_EIRA = { bab: 'Penutup', judul: 'Eira selalu di sini', isi: 'Klik saya kapan saja untuk membuka menu, belajar fitur langkah demi langkah, atau bertanya istilah. Ketik **“mulai tur”** bila ingin mengulang perkenalan ini.', target: EIRA, pose: 'welcome', tanya: 'Apa saja yang bisa kamu bantu?' };

/** Saran langkah pertama setelah tur selesai. */
export const LANJUTAN = {
  admin: [['Lengkapi profil klinik', '/admin/pengaturan'], ['Undang tim', '/admin/pengguna'], ['Atur tarif tindakan', '/admin/treatments']],
  dokter: [['Lanjut latihan rekam medis', '/rekam-medis/simulasi'], ['Lengkapi profil dokter', '/dokter/profil-dokter'], ['Lihat jadwal hari ini', '/dokter/jadwal']],
  resepsionis: [['Daftarkan pasien', '/pasien/daftar'], ['Cek booking online', '/booking-requests'], ['Buka jadwal', '/resepsionis/jadwal']],
};

export const langkahUntuk = (peran) => [...(LANGKAH[peran] || LANGKAH.admin), LANGKAH_EIRA];

/** Daftar bab (urutan tampil) beserta indeks langkah pertamanya. */
export const babUntuk = (langkah) => langkah.reduce((acc, s, i) => {
  if (!acc.length || acc[acc.length - 1].nama !== s.bab) acc.push({ nama: s.bab, mulai: i, jumlah: 0 });
  acc[acc.length - 1].jumlah += 1;
  return acc;
}, []);

