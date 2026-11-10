/**
 * Isi tur pengenalan Eira per peran. Setiap langkah menyorot satu elemen nyata di aplikasi.
 *   target : pemilih CSS elemen yang disorot (menu samping memakai data-tur="<path>")
 *   ke     : halaman yang dibuka sebelum langkah ditampilkan (opsional)
 *   pose   : gerakan Eira (dipilih yang tenang & formal)
 *   tanya  : contoh pertanyaan yang bisa langsung ditanyakan ke Eira pada langkah itu
 */
export const TUR_VERSI = 1;

const menu = (path) => `[data-tur="${path}"]`;
const EIRA = '.denti-widget__launch';
const CARI = '[data-tur="cari"]';

export const PERAN_LABEL = { admin: 'Manajer Klinik', dokter: 'Dokter', resepsionis: 'Resepsionis' };

export const PEMBUKA = {
  admin: 'Saya akan menunjukkan menu untuk menyiapkan klinik, memantau keuangan, dan mengelola tim.',
  dokter: 'Saya akan menunjukkan alur kerja harian Anda: jadwal, data pasien, hingga rekam medis.',
  resepsionis: 'Saya akan menunjukkan alur di meja depan: pendaftaran, jadwal, booking, antrean, hingga pembayaran.',
};

export const LANGKAH = {
  admin: [
    { judul: 'Dashboard klinik', isi: 'Ringkasan hari ini dalam satu layar: kunjungan, pendapatan, dan hal yang perlu ditindaklanjuti.', target: menu('/admin'), ke: '/admin', pose: 'point', tanya: 'Apa itu dashboard?' },
    { judul: 'Pengaturan klinik', isi: 'Mulailah dari sini: profil klinik, **QRIS & pembayaran**, template **pengingat WhatsApp**, dan integrasi **SATUSEHAT**.', target: menu('/admin/pengaturan'), pose: 'idea', tanya: 'Ajarkan cara memasang QRIS' },
    { judul: 'Kelola pengguna', isi: 'Undang dokter dan resepsionis. Setiap peran hanya melihat menu yang sesuai tugasnya.', target: menu('/admin/pengguna'), pose: 'nod', tanya: 'Bagaimana cara mengundang staf?' },
    { judul: 'Master treatment', isi: 'Daftar tindakan dan tarif klinik. Tarif di sini dipakai otomatis saat kasir membuat tagihan.', target: menu('/admin/treatments'), pose: 'point', tanya: 'Bagaimana mengubah tarif tindakan?' },
    { judul: 'Jadwal dokter', isi: 'Atur jam praktik setiap dokter. Jadwal ini juga yang tampil di halaman **booking online** pasien.', target: menu('/admin/jadwal-dokter'), pose: 'nod', tanya: 'Apa itu booking online?' },
    { judul: 'Biaya & modal', isi: 'Biaya operasional, resep bahan per tindakan, dan stok gudang. Dari sini Dentiva menghitung **HPP dan margin** setiap tindakan.', target: menu('/admin/costing'), pose: 'idea', tanya: 'Apa itu HPP?' },
    { judul: 'Pengeluaran', isi: 'Catat setiap pengeluaran klinik. Foto nota bisa dipindai agar isiannya terisi otomatis.', target: menu('/admin/pengeluaran'), pose: 'point', tanya: 'Ajarkan cara mencatat pengeluaran' },
    { judul: 'Laporan', isi: 'Tab **Keuangan** untuk pendapatan, pengeluaran, dan laba; tab **Tahunan & Kunjungan** untuk tren dan ekspor PDF.', target: menu('/admin/laporan'), pose: 'nod', tanya: 'Apa itu margin?' },
    { judul: 'Asisten AI', isi: 'Tanyakan kondisi klinik dengan bahasa sehari-hari. Bila saya mengusulkan perubahan data, **datanya baru berubah setelah Anda setujui**.', target: menu('/admin/asisten-ai'), pose: 'listen', tanya: 'Ajarkan cara memakai Asisten AI' },
    { judul: 'Audit log', isi: 'Jejak setiap perubahan penting: siapa, kapan, dan apa yang diubah. Catatan ini tidak dapat diubah atau dihapus.', target: menu('/admin/audit-log'), pose: 'nod', tanya: 'Apa itu audit log?' },
  ],
  dokter: [
    { judul: 'Dashboard dokter', isi: 'Pasien Anda hari ini dan antrean yang sedang berjalan, langsung saat Anda masuk.', target: menu('/dokter'), ke: '/dokter', pose: 'point', tanya: 'Apa itu dashboard?' },
    { judul: 'Jadwal hari ini', isi: 'Daftar kunjungan terjadwal. Pilih pasien untuk mulai pemeriksaan.', target: menu('/dokter/jadwal'), pose: 'nod', tanya: 'Bagaimana memulai pemeriksaan?' },
    { judul: 'Cari pasien cepat', isi: 'Ketik nama atau nomor rekam medis dari mana saja untuk membuka data pasien.', target: CARI, pose: 'point', tanya: 'Bagaimana mencari pasien?' },
    { judul: 'Data pasien', isi: 'Profil, riwayat penyakit, alergi, dan seluruh kunjungan pasien dalam satu tempat.', target: menu('/pasien'), pose: 'nod', tanya: 'Apa itu nomor rekam medis?' },
    { judul: 'Rekam medis', isi: 'SOAP, **odontogram**, diagnosis ICD-10, tindakan ICD-9-CM, resep, dan informed consent. Tersimpan otomatis dengan riwayat versi.', target: menu('/dokter/rekam-medis'), pose: 'idea', tanya: 'Ajarkan cara mengisi rekam medis' },
    { judul: 'Riwayat kunjungan', isi: 'Seluruh kunjungan yang telah Anda tangani, lengkap dengan status dan catatan.', target: menu('/dokter/kunjungan'), pose: 'nod', tanya: 'Apa itu odontogram?' },
    { judul: 'Profil dokter', isi: 'Lengkapi gelar, **STR**, dan **SIP**. Data ini tampil pada dokumen resmi dan dipakai untuk SATUSEHAT.', target: menu('/dokter/profil-dokter'), pose: 'point', tanya: 'Apa itu STR?' },
  ],
  resepsionis: [
    { judul: 'Dashboard resepsionis', isi: 'Antrean, kunjungan, dan pembayaran hari ini dalam satu layar.', target: menu('/resepsionis'), ke: '/resepsionis', pose: 'point', tanya: 'Apa itu dashboard?' },
    { judul: 'Daftar pasien baru', isi: 'Daftarkan pasien dan langsung buat jadwal kunjungan pertamanya.', target: menu('/pasien/daftar'), pose: 'nod', tanya: 'Ajarkan cara mendaftarkan pasien' },
    { judul: 'Cari pasien cepat', isi: 'Ketik nama atau nomor rekam medis untuk menemukan pasien lama dalam hitungan detik.', target: CARI, pose: 'point', tanya: 'Bagaimana mencari pasien?' },
    { judul: 'Jadwal', isi: 'Kelola jadwal kunjungan dan atur ulang bila pasien berhalangan.', target: menu('/resepsionis/jadwal'), pose: 'nod', tanya: 'Bagaimana menjadwalkan ulang kunjungan?' },
    { judul: 'Booking online', isi: 'Permintaan janji dari halaman booking klinik masuk ke sini untuk dikonfirmasi.', target: menu('/booking-requests'), pose: 'idea', tanya: 'Ajarkan cara memproses booking' },
    { judul: 'Recall pasien', isi: 'Daftar pasien yang sudah waktunya kontrol kembali, siap diingatkan lewat WhatsApp.', target: menu('/resepsionis/recall'), pose: 'point', tanya: 'Apa itu recall?' },
    { judul: 'Layar antrean', isi: 'Tampilkan antrean di TV ruang tunggu cukup dengan satu tautan.', target: menu('/layar-antrean'), pose: 'nod', tanya: 'Bagaimana memasang layar antrean di TV?' },
    { judul: 'Pembayaran', isi: 'Terima pembayaran tunai, transfer, hingga **QRIS**, lalu cetak kwitansi.', target: menu('/resepsionis/pembayaran'), pose: 'idea', tanya: 'Ajarkan cara menerima pembayaran QRIS' },
  ],
};

/** Langkah penutup yang sama untuk semua peran: Eira selalu ada di pojok layar. */
export const LANGKAH_EIRA = { judul: 'Eira selalu di sini', isi: 'Klik saya kapan saja untuk membuka menu, belajar fitur langkah demi langkah, atau bertanya istilah. Ketik **“mulai tur”** bila ingin mengulang perkenalan ini.', target: EIRA, pose: 'welcome', tanya: 'Apa saja yang bisa kamu bantu?' };

/** Saran langkah pertama setelah tur selesai. */
export const LANJUTAN = {
  admin: [['Lengkapi profil klinik', '/admin/pengaturan'], ['Undang tim', '/admin/pengguna'], ['Atur tarif tindakan', '/admin/treatments']],
  dokter: [['Lengkapi profil dokter', '/dokter/profil-dokter'], ['Lihat jadwal hari ini', '/dokter/jadwal']],
  resepsionis: [['Daftarkan pasien', '/pasien/daftar'], ['Cek booking online', '/booking-requests'], ['Buka jadwal', '/resepsionis/jadwal']],
};

export const langkahUntuk = (peran) => [...(LANGKAH[peran] || LANGKAH.admin), LANGKAH_EIRA];
