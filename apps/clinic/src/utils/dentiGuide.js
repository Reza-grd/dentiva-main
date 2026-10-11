/**
 * Denti sebagai pemandu: membuka halaman/tab, menjelaskan letak menu, dan mengajarkan cara memakai fitur.
 * Sadar peran — mengikuti hak akses terbaru (admin tidak mengakses data pasien, kasir hanya resepsionis, dst).
 * Fungsi murni; diuji lewat dentiTraining.test.js. Teks masukan sudah dinormalkan (normalizeChat).
 */

const ADMIN_NO_PATIENT = 'Data pasien hanya bisa dibuka **dokter** dan **resepsionis**. Admin sengaja hanya melihat angka ringkas demi privasi pasien. 🔒';
const roleName = { admin: 'admin', dokter: 'dokter', resepsionis: 'resepsionis' };

/**
 * Halaman & tab yang bisa dibuka. `to`: rute (string) atau per peran. `roles`: peran yang boleh.
 * `deny`: alasan per peran bila tidak boleh. `where`: jalur menu untuk "di mana …".
 */
export const PAGES = [
  { id: 'dashboard', label: 'Dashboard', aliases: ['dashboard', 'beranda', 'home', 'halaman utama', 'halaman depan', 'dasbor'],
    to: { admin: '/admin', dokter: '/dokter', resepsionis: '/resepsionis' }, roles: ['admin', 'dokter', 'resepsionis'], where: 'Menu samping → Dashboard' },
  { id: 'profil-dokter', label: 'Profil Dokter', aliases: ['profil dokter', 'data dokter', 'biodata dokter', 'profil praktik'],
    to: '/dokter/profil-dokter', roles: ['dokter'], deny: { admin: 'Profil dokter diisi oleh dokter yang bersangkutan.', resepsionis: 'Profil dokter diisi oleh dokter yang bersangkutan.' }, where: 'Menu samping (dokter) → Profil Dokter' },
  { id: 'pasien', label: 'Data Pasien', aliases: ['pasien', 'data pasien', 'daftar pasien', 'patients', 'list pasien', 'semua pasien', 'database pasien'],
    to: '/pasien', roles: ['dokter', 'resepsionis'], deny: { admin: ADMIN_NO_PATIENT }, where: 'Menu samping → Data Pasien' },
  { id: 'pendaftaran', label: 'Pendaftaran Pasien', aliases: ['pendaftaran pasien', 'registrasi pasien', 'tambah pasien', 'pasien baru', 'daftarkan pasien'],
    to: '/pasien/daftar', roles: ['resepsionis'], deny: { admin: 'Pendaftaran pasien dikerjakan **resepsionis**. Admin tidak mengelola data pasien. 🔒', dokter: 'Pendaftaran pasien dikerjakan **resepsionis**.' },
    where: 'Menu samping (resepsionis) → Daftar Pasien' },
  { id: 'rekam', label: 'Rekam Medis', aliases: ['rekam medis', 'rekam medik', 'catatan medis', 'emr', 'rm pasien', 'soap'],
    to: '/dokter/rekam-medis', roles: ['dokter'], deny: { admin: 'Rekam medis hanya untuk **dokter** yang menangani. Admin tidak bisa membukanya. 🔒', resepsionis: 'Rekam medis hanya untuk **dokter** yang menangani. 🔒' },
    where: 'Menu samping (dokter) → Rekam Medis' },
  { id: 'pembayaran', label: 'Pembayaran', aliases: ['pembayaran', 'kasir', 'transaksi', 'payments', 'kwitansi'],
    to: '/resepsionis/pembayaran', roles: ['resepsionis'], deny: { admin: 'Penerimaan pembayaran hanya dilakukan **resepsionis** (kasir). Admin cukup melihat laporan keuangan. 💳', dokter: 'Penerimaan pembayaran dilakukan **resepsionis** (kasir).' },
    where: 'Menu samping (resepsionis) → Pembayaran' },
  { id: 'jadwal', label: 'Jadwal Kunjungan', aliases: ['jadwal', 'kalender', 'jadwal kunjungan', 'janji temu', 'schedule', 'agenda', 'appointment', 'jadwal hari ini', 'jadwal harian'],
    to: { dokter: '/dokter/jadwal', resepsionis: '/resepsionis/jadwal' }, roles: ['dokter', 'resepsionis'],
    deny: { admin: 'Jadwal kunjungan dikelola **resepsionis** dan **dokter**. Untuk jam praktik dokter, buka **Jadwal Dokter**. 📅' }, where: 'Menu samping → Jadwal' },
  { id: 'riwayat', label: 'Riwayat Kunjungan', aliases: ['riwayat kunjungan', 'riwayat', 'history kunjungan', 'daftar kunjungan'],
    to: { dokter: '/dokter/kunjungan', resepsionis: '/resepsionis/kunjungan' }, roles: ['dokter', 'resepsionis'],
    deny: { admin: 'Riwayat kunjungan berisi data pasien, jadi hanya untuk **dokter** dan **resepsionis**. 🔒' }, where: 'Menu samping → Riwayat Kunjungan' },
  { id: 'booking', label: 'Permintaan Booking', aliases: ['booking', 'permintaan booking', 'booking masuk', 'reservasi'],
    to: '/booking-requests', roles: ['resepsionis'], deny: { admin: 'Permintaan booking diproses **resepsionis** karena berisi data calon pasien. Pengaturan booking online ada di **Pengaturan → Booking Online**.', dokter: 'Permintaan booking diproses **resepsionis**.' },
    where: 'Menu samping (resepsionis) → Booking Online' },
  { id: 'recall', label: 'Recall Pasien', aliases: ['recall', 'recall pasien', 'kontrol ulang', 'pasien kontrol'],
    to: '/resepsionis/recall', roles: ['resepsionis'], deny: { admin: 'Recall pasien memakai kontak pasien, jadi dikelola **resepsionis**. 🔒', dokter: 'Recall pasien dikelola **resepsionis**.' },
    where: 'Menu samping (resepsionis) → Recall Pasien' },
  { id: 'antrean', label: 'Layar Antrean', aliases: ['layar antrean', 'layar antrian', 'antrean tv', 'antrian tv', 'layar tv', 'tv antrean', 'tv antrian', 'antrean', 'antrian', 'layar ruang tunggu', 'tv ruang tunggu', 'monitor antrean', 'display antrean'],
    to: '/layar-antrean', roles: ['admin', 'resepsionis'], deny: { dokter: 'Layar antrean dikelola **admin** dan **resepsionis**.' }, where: 'Menu samping → Layar Antrean' },
  { id: 'jadwaldokter', label: 'Jadwal Dokter', aliases: ['jadwal dokter', 'jadwal praktik', 'jadwal praktek', 'jam praktik', 'jam praktek', 'jadwal praktik dokter', 'shift dokter', 'kalender dokter'],
    to: '/admin/jadwal-dokter', roles: ['admin'], deny: { dokter: 'Jadwal praktik diatur **admin**. Jadwal harian Anda ada di **Jadwal**.', resepsionis: 'Jadwal praktik diatur **admin**.' }, where: 'Menu samping (admin) → Jadwal Dokter' },
  { id: 'keuangan', label: 'Keuangan', aliases: ['keuangan', 'dashboard keuangan', 'finance', 'lap keuangan', 'laporan keuangan'],
    to: '/keuangan', roles: ['admin'], deny: { dokter: 'Laporan keuangan dilihat **admin**.', resepsionis: 'Laporan keuangan dilihat **admin**.' }, where: 'Menu samping (admin) → Lap. Keuangan' },
  { id: 'tindakan', label: 'Master Tindakan', aliases: ['tindakan', 'master tindakan', 'daftar tindakan', 'treatment', 'treatments', 'harga tindakan', 'daftar harga', 'price list'],
    to: '/admin/treatments', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Master Treatment' },
  { id: 'costing', label: 'Biaya & Modal', aliases: ['biaya dan modal', 'biaya modal', 'costing', 'modal', 'hpp', 'hp', 'harga pokok', 'overhead', 'biaya operasional'],
    to: '/admin/costing', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Biaya & Modal' },
  { id: 'pengeluaran', label: 'Pengeluaran', aliases: ['pengeluaran', 'expenses', 'biaya keluar', 'catat pengeluaran'],
    to: '/admin/pengeluaran', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Pengeluaran' },
  { id: 'laporan', label: 'Laporan', aliases: ['laporan', 'report', 'reports', 'laporan bulanan'],
    to: '/admin/laporan', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Laporan' },
  { id: 'asisten', label: 'Asisten AI', aliases: ['asisten ai', 'asisten', 'chat ai', 'ngobrol dengan ai'],
    to: '/admin/asisten-ai', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Asisten AI' },
  { id: 'pengguna', label: 'Kelola Pengguna', aliases: ['pengguna', 'user', 'users', 'staf', 'karyawan', 'akun pengguna', 'kelola pengguna', 'kelola staf', 'daftar staf', 'pegawai'],
    to: '/admin/pengguna', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Kelola Pengguna' },
  { id: 'audit', label: 'Log Audit', aliases: ['audit', 'log audit', 'audit log', 'riwayat aktivitas', 'jejak audit', 'log aktivitas'],
    to: '/admin/audit-log', roles: ['admin'], deny: {}, where: 'Menu samping (admin) → Audit Log' },
  { id: 'pengaturan', label: 'Pengaturan', aliases: ['pengaturan', 'setting', 'settings', 'setelan', 'konfigurasi'],
    to: { admin: '/admin/pengaturan', dokter: '/pengaturan', resepsionis: '/pengaturan' }, roles: ['admin', 'dokter', 'resepsionis'], where: 'Menu samping → Pengaturan' },
  { id: 'profil', label: 'Profil Saya', aliases: ['profil', 'profil saya', 'profile', 'akun saya', 'akunku'],
    to: '/profil', roles: ['admin', 'dokter', 'resepsionis'], where: 'Klik nama Anda di kanan atas → Profil' },
  // ── Tab di Pengaturan (admin)
  { id: 'tab-tema', label: 'Pengaturan › Tampilan Tema', aliases: ['tema', 'tampilan', 'tema tampilan', 'tampilan tema', 'warna', 'mode gelap tab'], to: { admin: '/admin/pengaturan?tab=appearance', dokter: '/pengaturan?tab=appearance', resepsionis: '/pengaturan?tab=appearance' }, roles: ['admin', 'dokter', 'resepsionis'], deny: {}, where: 'Pengaturan → tab Tampilan Tema' },
  { id: 'tab-profil-klinik', label: 'Pengaturan › Profil Klinik', aliases: ['profil klinik', 'data klinik', 'identitas klinik', 'alamat klinik', 'nama klinik'], to: '/admin/pengaturan?tab=profile', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Profil Klinik' },
  { id: 'tab-notifikasi', label: 'Pengaturan › Notifikasi', aliases: ['notifikasi', 'pengaturan notifikasi'], to: '/admin/pengaturan?tab=notifications', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Notifikasi' },
  { id: 'tab-wa', label: 'Pengaturan › WhatsApp', aliases: ['pengaturan whatsapp', 'pengaturan whatsap', 'whatsapp', 'whatsap', 'wa', 'pengaturan wa', 'template pengingat', 'template pesan', 'pesan pengingat', 'isi pesan pengingat', 'template wa', 'template whatsapp', 'pengingat', 'pengingat wa', 'pengingat whatsapp', 'invoice wa', 'uji coba wa', 'tes wa'],
    to: '/admin/pengaturan?tab=whatsapp', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Pengaturan WhatsApp' },
  { id: 'tab-edukasi', label: 'Pengaturan › Edukasi Perawatan', aliases: ['edukasi perawatan', 'edukasi pasien', 'edukasi tindakan', 'template edukasi', 'edukasi pasca tindakan'], to: '/admin/pengaturan?tab=treatment-education', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Edukasi Perawatan' },
  { id: 'tab-soap', label: 'Pengaturan › Template SOAP', aliases: ['template soap', 'soap template', 'template rekam medis'], to: '/admin/pengaturan?tab=soap-templates', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Template SOAP' },
  { id: 'tab-satusehat', label: 'Pengaturan › SATUSEHAT', aliases: ['satusehat', 'satu sehat', 'pengaturan satusehat', 'integrasi satusehat'], to: '/admin/pengaturan?tab=satusehat', roles: ['admin'], deny: {}, where: 'Pengaturan → tab SATUSEHAT' },
  { id: 'tab-qris', label: 'Pengaturan › Pembayaran & QRIS', aliases: ['qris', 'pengaturan pembayaran', 'pembayaran qris', 'rekening', 'metode pembayaran'], to: '/admin/pengaturan?tab=payments', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Pembayaran & QRIS' },
  { id: 'tab-booking', label: 'Pengaturan › Booking Online', aliases: ['pengaturan booking', 'booking online', 'tautan booking', 'link booking'], to: '/admin/pengaturan?tab=booking', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Booking Online' },
  { id: 'tab-keamanan', label: 'Pengaturan › Keamanan', aliases: ['keamanan', 'kata sandi', 'password', 'sandi', 'ganti password', 'ganti kata sandi', 'mfa', 'verifikasi dua langkah'], to: { admin: '/admin/pengaturan?tab=security', dokter: '/pengaturan?tab=security', resepsionis: '/pengaturan?tab=security' }, roles: ['admin', 'dokter', 'resepsionis'], deny: {}, where: 'Pengaturan → tab Keamanan' },
  { id: 'tab-langganan', label: 'Pengaturan › Langganan', aliases: ['langganan', 'billing', 'paket langganan', 'paket', 'tagihan dentiva', 'upgrade'], to: '/admin/pengaturan?tab=billing', roles: ['admin'], deny: {}, where: 'Pengaturan → tab Langganan SaaS' },
];

// ── Akar kata ──
const STEM = {
  menambah: 'tambah', menambahkan: 'tambah', mengubah: 'ubah', mengganti: 'ganti', mengatur: 'atur', membuat: 'buat', menyalakan: 'nyalakan',
  mematikan: 'matikan', mencatat: 'catat', memasang: 'pasang', menghubungkan: 'hubungkan', mengaktifkan: 'aktifkan', menerima: 'terima',
  menguji: 'uji', mengisi: 'isi', membaca: 'baca', melihat: 'lihat', menampilkan: 'tampilkan', memakai: 'pakai', menggunakan: 'gunakan',
  membagikan: 'bagikan', mendaftarkan: 'daftarkan', menyimpan: 'simpan', mengirim: 'kirim', mengirimkan: 'kirim', menaikkan: 'naikkan',
  menurunkan: 'turunkan', memperbarui: 'perbarui', mengunduh: 'unduh', memeriksa: 'periksa', mengecek: 'cek', memahami: 'pahami',
  menonaktifkan: 'nonaktifkan', menghapus: 'hapus', membuka: 'buka', memantau: 'pantau', menjadwalkan: 'jadwalkan', menghitung: 'hitung',
  memasukkan: 'masukkan', memilih: 'pilih', menetapkan: 'tetapkan', mengelola: 'kelola', menjelaskan: 'jelaskan', mempelajari: 'pelajari',
  mengajarkan: 'ajarkan', mengerti: 'mengerti', membayar: 'bayar', memberi: 'beri',
  menyetel: 'setel', menyetting: 'setting', meng: 'meng',
  menolak: 'tolak', memproses: 'proses', mengonfirmasi: 'konfirmasi', mengkonfirmasi: 'konfirmasi', memulai: 'mulai', mengakhiri: 'akhiri',
  menyelesaikan: 'selesaikan', menghubungi: 'hubungi', menulis: 'tulis', mencetak: 'cetak', mengunci: 'kunci', menginput: 'input', mengingatkan: 'ingatkan',
  membuatkan: 'buatkan',
};
const stem = (t) => t.split(' ').map((w) => STEM[w] || w).join(' ');

// ── Pencocokan ───────────────────────────────────────────────────────────────
const editDistance = (a, b) => {
  const m = a.length; const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j += 1) d[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
};

const squash = (s) => s.replace(/([b-df-hj-kmnp-tv-z])\1+(?=\s|$)/g, '$1');
const clean = (s) => squash(String(s || '').toLowerCase().replace(/&/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim());
const STRIP = /^(?:halaman|menu|tab|page|fitur|bagian)\s+/;
const tidy = (s) => clean(s).replace(STRIP, '').replace(/\s+(?:nya|aja|saja|sekarang|dong|ya|deh|sih)$/g, '').replace(/\s+nya$/, '').trim();

/** Cari halaman dari teks target. Cocok persis → cocok dengan 1–2 salah ketik. */
export function findPage(target) {
  const x = tidy(target);
  if (!x) return null;
  const forms = [x, x.replace(/nya$/, '')].filter(Boolean);
  const exact = PAGES.find((p) => p.aliases.some((a) => forms.includes(clean(a))));
  if (exact) return exact;
  if (x.length < 5) return null;
  let best = null; let bestD = 9;
  for (const p of PAGES) {
    for (const a of p.aliases) {
      const al = clean(a);
      if (al.length < 5) continue;
      const lim = al.length >= 12 ? 2 : 1;
      const dd = editDistance(x, al);
      if (dd <= lim && dd < bestD) { best = p; bestD = dd; }
    }
  }
  return best;
}

const toFor = (p, role) => (typeof p.to === 'string' ? p.to : p.to[role]);
const allowed = (p, role) => p.roles.includes(role);

const VERBS = '(?:buka(?:kan|in|lah|nya)?|membuka|melihat|menampilkan|mengakses|mengunjungi|ke|pergi ke|pindah ke|pindah|masuk ke|masuk|tampilkan|tunjukkan|tunjukin|lihat(?:kan|in)?|liat(?:in)?|arahkan(?: saya| aku)? ke|antar(?: saya| aku)? ke|menuju|navigasi ke|go to|open|show|akses|kunjungi|bawa(?: saya| aku)? ke|loncat ke|lompat ke)';
const LEAD = '(?:(?:tolong|coba|bisa|boleh|mau|ingin|pengen|pingin|aku|saya|dong|ya|bantu|bantuin|sekarang|langsung|aja|saja|kita|yuk|ayo) )*';
const NAV_G = new RegExp(`^${LEAD}${VERBS}(?: (?:halaman|menu|tab|page|fitur|bagian))? (.+)$`);
const WHERE_G = /^(?:dimana|di mana|letak|lokasi|posisi|ada dimana|menu)\s+(?:letak |lokasi |menu |halaman |tab |fitur )?(.+?)(?:\s+(?:ada dimana|dimana|di mana|itu dimana))?$/;
const WHERE_END = /^(?:letak |lokasi |posisi )?(?:(?:halaman|menu|tab|fitur) )?(.+?) (?:ada )?(?:dimana|di mana)$/;

const YES = /^(?:(?:ya|iya|oke|ok|okee|baik|boleh|silakan|silahkan|tentu|sip|yup|yap|siap|ayo|yuk|gas|tolong|langsung|mau) )*(?:ya|iya|yap|yup|yoi|boleh|oke|ok|okee|siap|silakan|silahkan|lanjut|lanjutkan|lanjutin|gas|gaskeun|yuk|ayo|hayuk|hayu|mau|sip|buka|bukakan|bukain|tampilkan|tentu|tentu saja|pasti|jelas|baik|setuju|betul|benar|bawa(?: aku| saya)? ke sana|antar(?: aku| saya)? ke sana|ke sana|boleh banget)(?: (?:dong|aja|saja|deh|sekarang|banget|kak|ya|buka|bukakan|halamannya|tolong|dong))*$/;
const NO = /^(?:tidak|nggak|enggak|gak|ga|jangan|nanti|nanti aja|belum|tidak usah|gak usah|ga usah|tak usah|batal|batalkan|skip|lewati|lain kali|tidak jadi|tidak perlu)(?: (?:dulu|usah|perlu|dong|deh|terima kasih|makasih|buka|dibuka|saja|aja|jadi|ya|kali))*$/;
const BACK = /^(?:kembali|balik|mundur|ke belakang|halaman sebelumnya|kembali ke halaman sebelumnya|balik ke halaman sebelumnya|back|go back|kembali dong|sebelumnya)$/;
const FORWARD = /^(?:maju|ke depan|halaman berikutnya|halaman selanjutnya|forward|go forward|berikutnya halaman)$/;
const RELOAD = /^(?:(?:muat|load) ulang(?: halaman)?|refresh(?: halaman)?|reload(?: halaman)?|segarkan(?: halaman)?|perbarui halaman|segarkan ulang)$/;
const LIST = /^(?:apa saja (?:yang )?(?:bisa|dapat) (?:kamu |anda )?(?:buka|bukakan|tampilkan|diakses|dibuka)|menu apa saja|daftar menu|ada menu apa saja|halaman apa saja|apa saja menu(?:nya)?|apa saja halaman(?:nya)?|kamu bisa buka apa saja|bisa buka apa saja|bisa buka apa|buka apa saja|navigasi apa saja|tab apa saja|daftar halaman|list menu|menu di sini apa saja)$/;

// ── Tutorial ─────────────────────────────────────────────────────────────────
const TEACH = '(?:cara|caranya|gimana|bagaimana|ajar(?:kan|i|in)|tutorial|panduan|langkah(?: langkah)?|petunjuk|tunjukkan cara|tunjukin cara|jelaskan|terangkan|apa itu|mau tahu|mau tau|pengen tahu|belajar|how to)';
// Pertanyaan "ajarkan" harus diawali kata ajakan belajar (bukan sekadar memuat kata "gimana" di tengah kalimat data).
const TEACH_START = new RegExp(`^(?:(?:tolong|coba|bisa|boleh|mau|ingin|pengen|dong|ya|aku|saya|kak|bantu|kita) )*${TEACH}\\b`);
const TUTORIALS = [
  { id: 'tpl-wa', re: /(template|isi pesan|teks|kata kata|susunan) (pesan )?(pengingat|reminder)|(ubah|ganti|edit|atur|buat) (teks|isi|pesan|template) (pesan )?(pengingat|wa|whatsapp?)|pengingat (wa|whatsapp?) (diubah|diganti|diatur)/,
    title: 'mengubah teks pesan pengingat WhatsApp', to: '/admin/pengaturan?tab=whatsapp', label: 'Pengaturan › WhatsApp', roles: ['admin'],
    steps: ['Buka **Pengaturan → tab Pengaturan WhatsApp**.', 'Gulir ke bagian **Isi Pesan Pengingat** — ada dua kotak: *H-1 hari* dan *H-1 jam*.',
      'Ketik teks Anda. Sisipkan data otomatis dengan kode seperti `{nama}`, `{tanggal}`, `{jam}`, `{dokter}`, `{klinik}`, `{telepon}`.', 'Lihat **Pratinjau** di bawah kotak untuk memastikan hasilnya.',
      'Klik **Simpan** di bagian bawah halaman. Pengingat berikutnya memakai teks baru.'], tip: 'Kosongkan kotak lalu simpan (atau klik "Kembalikan ke teks bawaan") bila ingin kembali ke teks standar.' },
  { id: 'wa-test', re: /(uji|tes|test|coba)( kirim| coba| pengiriman)? ?(pesan )?(wa|whatsapp?)|kirim pesan uji|cek (wa|whatsapp?) (nyambung|tersambung|jalan|aktif)/,
    title: 'menguji pengiriman WhatsApp', to: '/admin/pengaturan?tab=whatsapp', label: 'Pengaturan › WhatsApp', roles: ['admin'],
    steps: ['Buka **Pengaturan → Pengaturan WhatsApp**.', 'Cari kotak **Uji Coba Pengiriman Pesan**.', 'Isi nomor tujuan (contoh `0812xxxxxxx`), lalu klik tombol kirim.', 'Pesan uji akan masuk ke nomor itu dalam beberapa detik.'],
    tip: 'Kalau pesan tidak masuk, hubungi tim Dentiva — kemungkinan nomor WhatsApp klinik perlu ditautkan ulang.' },
  { id: 'wa-toggle', re: /(aktifkan|nyalakan|matikan|nonaktifkan|hidupkan)( fitur)? (invoice|struk|pengingat|edukasi|pesan otomatis|notifikasi wa)|(invoice|struk|pengingat|edukasi)( wa| whatsapp?)? ?(otomatis )?(diaktifkan|dimatikan|dinonaktifkan)/,
    title: 'menyalakan atau mematikan pesan WhatsApp otomatis', to: '/admin/pengaturan?tab=whatsapp', label: 'Pengaturan › WhatsApp', roles: ['admin'],
    steps: ['Buka **Pengaturan → Pengaturan WhatsApp**.', 'Ada empat sakelar: **konfirmasi pembayaran (invoice)**, **edukasi pasca tindakan**, **pengingat H-1 hari**, dan **pengingat H-1 jam**.', 'Geser sakelar sesuai kebutuhan.', 'Klik **Simpan** di bagian bawah halaman.'],
    tip: 'Pesan hanya dikirim ke pasien yang sudah memberi izin WhatsApp saat didaftarkan.' },
  { id: 'invoice-wa', concept: true, re: /(invoice|invois|struk|kwitansi|nota)( wa| whatsapp?)?.*(terkirim|dikirim|otomatis|syarat|kenapa tidak|kenapa gak|tidak masuk|gak masuk)|kenapa (invoice|struk|edukasi|pengingat)( wa)? (tidak|gak|nggak) (terkirim|masuk)|cara kerja (invoice|invois|struk|edukasi)|kapan (edukasi|invoice|struk|pengingat) (terkirim|dikirim)|(edukasi).*(terkirim|dikirim)/,
    title: 'kapan invoice & edukasi WhatsApp terkirim', to: '/admin/pengaturan?tab=whatsapp', label: 'Pengaturan › WhatsApp', roles: ['admin'],
    steps: ['Setelah resepsionis menyimpan pembayaran **Lunas**, server mengirim **invoice** otomatis ke WhatsApp pasien, lalu **edukasi** sesuai tindakan yang tercatat.', 'Syaratnya: pasien **memberi izin WhatsApp**, punya **nomor WA**, dan sakelarnya **aktif** di Pengaturan WhatsApp.',
      'Bila WhatsApp klinik sedang terputus, pesan **ditunda** dan dikirim otomatis begitu tersambung (dicoba ulang tiap 5 menit).', 'Resepsionis bisa menekan **Kirim ulang invoice** di halaman pembayaran.'],
    tip: 'Edukasi diambil dari tab **Edukasi Perawatan**; tindakan tanpa template tidak dikirimi edukasi.' },
  { id: 'edukasi', re: /(edukasi|template edukasi|edukasi perawatan|edukasi pasca)( tindakan| pasien| perawatan)? (diubah|diganti|diatur|dibuat|ditambah|ditambahkan)|(ubah|ganti|edit|atur|buat|tambah) (template )?edukasi/,
    title: 'mengatur edukasi perawatan per tindakan', to: '/admin/pengaturan?tab=treatment-education', label: 'Pengaturan › Edukasi Perawatan', roles: ['admin'],
    steps: ['Buka **Pengaturan → Edukasi Perawatan**.', 'Pilih atau tambah template untuk tindakan (misal *Scaling*), lalu isi teks edukasi dan instruksi obat.', 'Tambahkan **kata kunci** bila nama tindakan di klinik berbeda-beda.', 'Simpan. Edukasi dikirim otomatis setelah pembayaran lunas sesuai tindakan yang dilakukan.'],
    tip: 'Template klinik yang namanya persis sama dengan tindakan didahulukan dibanding edukasi bawaan.' },
  { id: 'antrean', re: /(layar|tv) (antrean|antrian|ruang tunggu)|(antrean|antrian) (di )?tv|(pasang|pakai|pake|tampilkan|tampilin|buat|bikin|atur) (antrean|antrian|tv)|tampilan antrean/,
    title: 'menampilkan antrean di TV ruang tunggu', to: '/layar-antrean', label: 'Layar Antrean', roles: ['admin', 'resepsionis'],
    steps: ['Buka menu **Layar Antrean** (ada di menu samping admin dan resepsionis).', 'Isi nama layar (misal *TV ruang tunggu*), lalu klik **Buat tautan**.', 'Salin tautan yang muncul — tampil **sekali saja**, simpan baik-baik.', 'Buka tautan itu di TV atau komputer layar tersebut. Tidak perlu login.',
      'Layar menampilkan nomor urut, inisial pasien, dan dokter. Cabut tautan dari halaman yang sama bila perlu.'], tip: 'Satu klinik bisa punya sampai 10 tautan aktif (misal beberapa TV).' },
  { id: 'tambah-staf', re: /(tambah|buat|bikin|daftarkan|undang|input)( akun)? (staf|karyawan|pegawai|pengguna|user|resepsionis|admin)|(staf|karyawan|pegawai|pengguna|user) baru|akun (resepsionis|staf) baru/,
    title: 'menambah akun staf baru', to: '/admin/pengguna', label: 'Kelola Pengguna', roles: ['admin'],
    steps: ['Buka **Kelola Pengguna**.', 'Klik tombol tambah pengguna, isi nama, email, nomor telepon, dan kata sandi awal.', 'Pilih peran **Resepsionis** (atau Admin).', 'Simpan. Staf bisa langsung login dengan email dan kata sandi tersebut.'],
    tip: 'Akun **dokter** (akses rekam medis) dibuat dan diverifikasi oleh tim Dentiva — admin tidak bisa membuatnya sendiri demi keamanan data pasien.' },
  { id: 'peran', re: /(ubah|ganti|edit|atur)( peran| role| hak akses)|(nonaktifkan|matikan|blokir|hapus|ban)( akun)? (staf|pengguna|user|karyawan)|hak akses (apa|siapa)|siapa (boleh|bisa|yang bisa) (akses|lihat|buka)/,
    title: 'mengatur peran dan akses staf', to: '/admin/pengguna', label: 'Kelola Pengguna', roles: ['admin'],
    steps: ['Buka **Kelola Pengguna**.', 'Pada baris staf, ubah **peran** lewat daftar pilihan atau **nonaktifkan** akunnya.', 'Pembagian akses: **dokter** = rekam medis & tindakan klinis; **resepsionis** = pendaftaran, jadwal, kasir; **admin** = pengelolaan klinik & laporan **tanpa** data pasien.'],
    tip: 'Admin tidak bisa mengubah peran dirinya sendiri dan tidak bisa menjadikan siapa pun dokter.' },
  { id: 'jadwal-dokter', re: /(atur|ubah|buat|isi|tambah)( jadwal)? (jam )?(praktik|praktek|jadwal dokter)|jadwal dokter (diatur|diubah|dibuat)|(atur|set) (dokter )?(libur|cuti)/,
    title: 'mengatur jadwal praktik dokter', to: '/admin/jadwal-dokter', label: 'Jadwal Dokter', roles: ['admin'],
    steps: ['Buka **Jadwal Dokter**.', 'Pilih dokter, lalu tentukan hari dan jam praktik.', 'Simpan. Slot jam di form kunjungan resepsionis mengikuti jadwal ini.'], tip: 'Dokter yang libur cukup dinonaktifkan jadwalnya pada hari itu.' },
  { id: 'tindakan', re: /(tambah|buat|ubah|ganti|edit|atur|naikkan|turunkan)( harga| tarif)? (tindakan|treatment|perawatan|layanan)|harga (tindakan|treatment) (diubah|diganti|diatur)|(tambah|buat) tindakan baru/,
    title: 'menambah atau mengubah tindakan & harga', to: '/admin/treatments', label: 'Master Tindakan', roles: ['admin'],
    steps: ['Buka **Master Treatment**.', 'Klik tambah untuk tindakan baru, atau pilih tindakan yang ada untuk mengubahnya.', 'Isi nama, kategori, **harga dasar**, dan durasi.', 'Simpan. Tindakan langsung bisa dipilih dokter dan kasir.'],
    tip: 'Isi juga **bahan yang dipakai** di Biaya & Modal agar HPP dan margin terhitung otomatis.' },
  { id: 'costing', re: /(hitung|atur|isi|cara kerja)( biaya)? (hpp?|modal|biaya modal|costing|overhead|margin)|cara kerja biaya (dan )?modal|bagaimana (hpp?|margin) dihitung/,
    title: 'memahami Biaya & Modal (HPP)', to: '/admin/costing', label: 'Biaya & Modal', roles: ['admin'],
    steps: ['Buka **Biaya & Modal**.', 'Isi **biaya overhead** bulanan (sewa, listrik, gaji) dan target tindakan per bulan.', 'Hubungkan **bahan** ke tiap tindakan agar biaya bahan terhitung.', 'Sistem menghitung HPP, margin, dan titik impas per tindakan secara otomatis.'],
    tip: 'Saat kunjungan selesai, snapshot biaya & stok tindakan dicatat otomatis.' },
  { id: 'pengeluaran', re: /(catat|input|tambah|isi|masukkan|bikin)( data)? (pengeluaran|biaya keluar|expense)|pengeluaran (dicatat|diinput|ditambah)/,
    title: 'mencatat pengeluaran klinik', to: '/admin/pengeluaran', label: 'Pengeluaran', roles: ['admin'],
    steps: ['Buka **Pengeluaran**.', 'Klik tambah, pilih kategori, isi jumlah, tanggal, dan keterangan.', 'Simpan. Angkanya langsung masuk ke Laporan Keuangan.'], tip: 'Catat rutin agar laba bersih di laporan akurat.' },
  { id: 'laporan', re: /(lihat|baca|buka|cek)( laporan| rekap)( keuangan| bulanan| pendapatan)?|laporan (keuangan|bulanan) (dilihat|dibaca)|(laporan|keuangan|pendapatan) (di mana|dimana|gimana|bagaimana) (lihatnya|caranya)/,
    title: 'melihat laporan keuangan & kunjungan', to: '/keuangan', label: 'Keuangan', roles: ['admin'],
    steps: ['Buka **Lap. Keuangan** untuk pendapatan, pengeluaran, dan laba bersih per periode.', 'Buka **Laporan** untuk grafik kunjungan bulanan, tindakan terpopuler, dan ringkasan tahunan.', 'Semua angka bersifat ringkasan — **tanpa nama pasien**.'],
    tip: 'Mau analisis cepat? Tanya saya, misalnya *"Ringkas kondisi klinik hari ini"*.' },
  { id: 'qris', re: /(atur|pasang|setting|isi|aktifkan)( metode)? (qris|pembayaran qris|rekening)|qris (diatur|dipasang|diaktifkan)|cara (pasang|setting) qris/,
    title: 'memasang QRIS & metode pembayaran', to: '/admin/pengaturan?tab=payments', label: 'Pengaturan › Pembayaran & QRIS', roles: ['admin'],
    steps: ['Buka **Pengaturan → Pembayaran & QRIS**.', 'Unggah atau isi data QRIS dan rekening klinik.', 'Simpan. Kasir akan melihat QRIS di halaman pembayaran.'] },
  { id: 'satusehat', re: /(atur|hubungkan|sambungkan|setting|pasang|aktifkan)( integrasi)? (satusehat|satu sehat)|satusehat (diatur|dihubungkan|dipasang)|(apa itu|fungsi) satusehat/,
    title: 'menghubungkan SATUSEHAT', to: '/admin/pengaturan?tab=satusehat', label: 'Pengaturan › SATUSEHAT', roles: ['admin'],
    steps: ['Siapkan Organization ID, Client ID, dan Client Secret dari portal SATUSEHAT Kemenkes.', 'Buka **Pengaturan → SATUSEHAT** dan isi datanya (kunci rahasia dimasukkan oleh tim Dentiva).', 'Mulai dari **sandbox** untuk uji coba, lalu produksi setelah disetujui.', 'Kirim data kunjungan ke SATUSEHAT dari antrean sinkronisasi.'],
    tip: 'Produksi baru aktif setelah persetujuan resmi dari Kemenkes.' },
  { id: 'booking', re: /(atur|aktifkan|pasang|buat|bagikan)( tautan| link| fitur)? booking( online)?|booking online (diatur|diaktifkan)|pasien (booking|daftar) (sendiri|online)/,
    title: 'mengaktifkan booking online', to: '/admin/pengaturan?tab=booking', label: 'Pengaturan › Booking Online', roles: ['admin'],
    steps: ['Buka **Pengaturan → Booking Online**.', 'Aktifkan fitur dan salin **tautan booking** klinik Anda.', 'Bagikan tautan itu ke pasien (WhatsApp, Instagram, Google Maps).', 'Permintaan booking masuk ke **resepsionis** untuk dikonfirmasi.'] },
  { id: 'tema', re: /(ganti|ubah|pilih|atur)( warna| tema| tampilan)|(warna|tema|tampilan) (diganti|diubah|diatur)|mode gelap (di mana|dimana|gimana|bagaimana)/,
    title: 'mengganti tema & tampilan', to: { admin: '/admin/pengaturan?tab=appearance', dokter: '/pengaturan?tab=appearance', resepsionis: '/pengaturan?tab=appearance' }, label: 'Pengaturan › Tampilan Tema', roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['Buka **Pengaturan → Tampilan Tema**, atau klik ikon tema di bilah atas.', 'Pilih tema warna dan mode terang/gelap.'], tip: 'Cukup bilang ke saya *"nyalakan mode gelap"* — langsung saya ubah! 🌙' },
  { id: 'password', re: /(ganti|ubah|reset|lupa|atur)( kata sandi| password| sandi)|(kata sandi|password) (diganti|diubah|lupa)|(aktifkan|pasang|atur) (mfa|verifikasi dua langkah|2fa)|keamanan akun/,
    title: 'mengganti kata sandi & keamanan akun', to: { admin: '/admin/pengaturan?tab=security', dokter: '/pengaturan?tab=security', resepsionis: '/pengaturan?tab=security' }, label: 'Pengaturan › Keamanan', roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['Buka **Pengaturan → Keamanan**.', 'Isi kata sandi baru (minimal 8 karakter, campur huruf dan angka), lalu simpan.', 'Aktifkan **verifikasi dua langkah** bila tersedia untuk perlindungan ekstra.'],
    tip: 'Lupa kata sandi? Di halaman login klik **Lupa password** (email pemulihan dikirim ke email akun).' },
  { id: 'audit', re: /(lihat|cek|buka|baca)( log| jejak)? (audit|aktivitas)|siapa (yang )?(ubah|hapus|mengubah|menghapus|akses)|(audit|log) (di mana|dimana|gimana|bagaimana)|(log|jejak) audit (itu )?apa/,
    title: 'membaca log audit', to: '/admin/audit-log', label: 'Log Audit', roles: ['admin'],
    steps: ['Buka **Audit Log**.', 'Filter berdasarkan tanggal, modul, atau pelaku.', 'Setiap perubahan penting (pembayaran, pengguna, rekam medis) tercatat: siapa, kapan, dan apa yang berubah.'],
    tip: 'Kata sandi dan rahasia lain tidak pernah dicatat di log.' },
  { id: 'langganan', re: /(upgrade|ganti|naik|beli|perpanjang|cek|lihat)( paket| langganan)|paket (apa|saya|klinik)|langganan (habis|berakhir|sampai kapan)|masa (trial|uji coba)/,
    title: 'mengecek & mengganti paket langganan', to: '/admin/pengaturan?tab=billing', label: 'Pengaturan › Langganan', roles: ['admin'],
    steps: ['Buka **Pengaturan → Langganan SaaS**.', 'Lihat paket aktif, fitur, dan masa berlakunya.', 'Pilih paket lain atau perpanjang dari halaman yang sama.'] },
  { id: 'alur', concept: true, re: /(alur|proses|urutan|tahapan|cara kerja) (kunjungan|pasien|klinik|pelayanan|kerja sistem|dentiva)|alur kerja|cara kerja (sistem )?dentiva|bagaimana (pasien|kunjungan) (diproses|berjalan|dilayani)|dari (daftar|pendaftaran) sampai (bayar|pembayaran|selesai)/,
    title: 'alur kunjungan pasien di Dentiva', to: null, label: null, roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['**Resepsionis** mendaftarkan pasien (dengan izin WhatsApp) dan membuat jadwal kunjungan.', 'Pengingat WhatsApp terkirim otomatis **H-1 hari** dan **H-1 jam**.', 'Pasien datang → **resepsionis** mengatur antrean (tampil di layar TV).',
      '**Dokter** memulai tindakan, mengisi rekam medis, mencatat **tindakan** dan **obat/resep**, lalu menyelesaikan kunjungan.', '**Resepsionis** menerima pembayaran (tunai/transfer/QRIS) dan menyimpan **Lunas**.', 'Server mengirim **invoice** dan **edukasi** sesuai tindakan ke WhatsApp pasien.',
      '**Admin** memantau antrean sederhana dan laporan agregat — tanpa data pasien.'] },
  { id: 'akses', concept: true, re: /(pembagian|batasan|aturan|perbedaan) (hak akses|peran|role|akses)|(admin|dokter|resepsionis) (bisa|boleh|tidak bisa|gak bisa) (apa|ngapain)|hak akses (admin|dokter|resepsionis)|kenapa admin (tidak|gak|nggak) (bisa|boleh)/,
    title: 'pembagian hak akses antar peran', to: null, label: null, roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['**Dokter**: rekam medis, odontogram, tindakan, resep, memulai & menyelesaikan kunjungan.', '**Resepsionis**: pendaftaran pasien, jadwal, booking, recall, antrean, dan **kasir** (pembayaran).', '**Admin**: pengguna, jadwal dokter, master tindakan, biaya & modal, pengeluaran, pengaturan, laporan agregat, antrean sederhana.', 'Admin **tidak** melihat data pasien, tidak menerima pembayaran, dan tidak menjadikan siapa pun dokter — ini sengaja untuk melindungi data pasien.'] },
  { id: 'daftar-pasien', re: /(daftarkan|daftar|registrasi|input|tambah|bikin)( data)? pasien( baru)?|cara daftar(in)? pasien/,
    title: 'mendaftarkan pasien baru', to: '/pasien/daftar', label: 'Pendaftaran Pasien', roles: ['resepsionis'],
    steps: ['Menu samping → **Daftar Pasien**.', 'Isi identitas pasien dan **nomor WhatsApp**; centang **izin WhatsApp** bila pasien setuju dikirimi pengingat/invoice.', 'Simpan, lalu buat **kunjungan** dari jadwal.'],
    tip: 'Pendaftaran pasien dikerjakan resepsionis. Admin tidak mengakses data pasien.' },
  { id: 'terima-bayar', re: /(terima|proses|input|catat|simpan)( transaksi)? (pembayaran|bayaran)|cara (kasir|bayar|bayarkan)|(kirim ulang|kirim lagi) (invoice|struk)/,
    title: 'menerima pembayaran (kasir)', to: '/resepsionis/pembayaran', label: 'Pembayaran', roles: ['resepsionis'],
    steps: ['Menu samping → **Pembayaran**, pilih kunjungan.', 'Periksa tindakan dan obat yang dicatat dokter; tambahkan **biaya tambahan** atau **diskon** bila ada.', 'Pilih metode (tunai/transfer/QRIS) dan isi **Uang Diterima**.', 'Pilih status **Lunas**, lalu **Simpan**. Invoice WhatsApp terkirim otomatis.'],
    tip: 'Pembayaran lunas bersifat final. Kunjungan tidak otomatis selesai — hanya dokter yang menyelesaikannya.' },
  { id: 'pakai-ai', concept: true, re: /(cara|gimana|bagaimana)( cara)? (pakai|pake|gunakan) (denti|asisten ai|asisten|ai)|(cara|gimana|bagaimana)( cara)? (bertanya|tanya)( ke)?( (denti|asisten ai|asisten|ai))?$|(apa saja|contoh) (yang )?(bisa|boleh) (ditanyakan|ditanya|dipakai)|contoh pertanyaan (untuk|ke|buat)( denti| asisten| ai)?/,
    title: 'memakai Asisten AI', to: null, label: null, roles: ['admin'],
    steps: ['Ketik pertanyaan biasa, misalnya *"Berapa pendapatan bulan ini?"* atau *"Ringkas kondisi klinik hari ini"*.', 'Saya juga bisa **menghitung** (margin, BEP, cicilan, persen), **membuka halaman** (*"buka pengeluaran"*), **mengajarkan cara** (*"ajarkan cara membuat layar antrean"*), dan **mengobrol**.', 'Beri 👍/👎 di jawaban agar saya makin pintar.'],
    tip: 'Saya hanya membaca angka ringkasan klinik — bukan nama atau data identitas pasien.' },
  { id: 'buat-kunjungan', re: /(buat|bikin|tambah|jadwalkan|atur|input|daftarkan)( jadwal| janji)? (kunjungan|jadwal kunjungan|janji temu|appointment)|cara (buat|bikin|jadwalkan) (kunjungan|jadwal|janji)/,
    title: 'membuat jadwal kunjungan pasien', to: { resepsionis: '/resepsionis/jadwal' }, label: 'Jadwal', roles: ['resepsionis'],
    steps: ['Buka **Jadwal**, lalu klik **Tambah Jadwal Kunjungan**.', 'Pilih **dokter**, lalu cari pasien lewat nama atau **No. RM** (atau ketik manual).', 'Pilih tanggal dan jam — slot mengikuti jadwal praktik dokter.', 'Isi **keluhan** bila ada, lalu simpan. Pengingat WhatsApp H-1 hari dan H-1 jam terkirim otomatis.'],
    tip: 'Pasien baru? Daftarkan dulu lewat **Daftar Pasien** (centang izin WhatsApp).' },
  { id: 'booking-konfirmasi', re: /(konfirmasi|terima|tolak|proses|setujui)( permintaan)? booking|permintaan booking( masuk)? (diproses|dikonfirmasi|diapakan)|booking masuk (diapakan|bagaimana|gimana)|cara (proses|konfirmasi) booking/,
    title: 'memproses permintaan booking pasien', to: '/booking-requests', label: 'Permintaan Booking', roles: ['resepsionis'],
    steps: ['Buka **Booking Online** di menu samping — yang menunggu tampil di status *pending*.', 'Periksa tanggal, jam, dan keluhan, lalu klik **Konfirmasi** atau **Tolak**.', 'Klik **Kabari via WA** — pesan dibuka di WhatsApp Anda (tidak terkirim otomatis).', 'Untuk pasien baru yang dikonfirmasi, klik **Daftarkan pasien**: data nama dan nomor WA terisi otomatis.']},
  { id: 'recall', re: /(pakai|pake|gunakan|kerjakan|hubungi|lihat|cara|kirim|bagaimana|gimana|ajarkan|ajari|tutorial|panduan)( fitur)? recall|recall( pasien)? (itu )?(gimana|bagaimana|caranya|dipakai|dikerjakan|digunakan)|(hubungi|ingatkan|ingetin|ingatin) pasien (lama|yang lama|untuk kontrol|kontrol)|pasien (lama )?(tidak|belum|gak|nggak) kontrol/,
    title: 'mengingatkan pasien lama untuk kontrol (recall)', to: '/resepsionis/recall', label: 'Recall Pasien', roles: ['resepsionis'],
    steps: ['Buka **Recall Pasien** — isinya pasien yang sudah lama tidak kontrol dan belum punya jadwal berikutnya.', 'Atur filter **Terakhir datang ≥ …** atau cari nama/No. RM.', 'Klik aksi WhatsApp pada pasien (hanya yang **mengizinkan kontak WA** dan nomornya valid). Pesan dibuka di WhatsApp Anda — **tidak ada yang terkirim otomatis**.', 'Tandai pasien sebagai **Dihubungi** supaya tidak diulang selama 30 hari.', 'Ubah gaya kalimat lewat **Template pesan WA**, atau isi *Gaya* (mis. santai, singkat) agar AI menyusunnya.']},
  { id: 'dokter-mulai', re: /(mulai|memulai)( kunjungan| pemeriksaan| pasien| tindakan)|cara (mulai|memulai|periksa|menyelesaikan|selesaikan|mengakhiri|akhiri) (kunjungan|pemeriksaan|pasien|tindakan)|(selesaikan|akhiri|menyelesaikan)( kunjungan| tindakan| pemeriksaan)/,
    title: 'memulai dan menyelesaikan kunjungan (dokter)', to: { dokter: '/dokter/jadwal' }, label: 'Jadwal Hari Ini', roles: ['dokter'],
    steps: ['Buka **Jadwal Hari Ini** di menu samping dokter.', 'Pada pasien yang sudah datang (status *Terjadwal*), klik **Mulai** — status menjadi *Berlangsung*.', 'Isi **Rekam Medis**: SOAP, odontogram, tindakan, dan resep.', 'Setelah tindakan selesai, klik **Selesai**. Kasir (resepsionis) lalu menerima pembayaran.'],
    tip: 'Hanya dokter yang dapat memulai dan menyelesaikan kunjungan.' },
  { id: 'rekam-medis', re: /(isi|mengisi|buat|tulis|menulis|catat|input|lengkapi)( rekam medis| soap| odontogram| catatan medis| catatan)|cara (isi|mengisi|menulis) (rekam medis|soap|odontogram)|(kunci|buka kunci) catatan|cetak rekam medis|rekam medis (diisi|ditulis)/,
    title: 'mengisi rekam medis pasien', to: { dokter: '/dokter/rekam-medis' }, label: 'Rekam Medis', roles: ['dokter'],
    steps: ['Buka **Rekam Medis** (atau tombol rekam medis pada baris pasien di Jadwal Hari Ini).', 'Isi **SOAP** — pakai *Template SOAP* agar lebih cepat.', 'Tandai kondisi gigi di **Odontogram**, pilih **tindakan**, dan isi resep bila perlu.', 'Klik **Simpan Rekam Medis**. Catatan bisa dikunci dengan **Kunci Catatan**; riwayat versinya tersimpan di **Daftar Versi**.'],
    tip: 'Rekam medis berisi data rahasia — hanya dokter yang menangani yang dapat membukanya.' },
  { id: 'resep', re: /(buat|tulis|menulis|isi|input|catat|beri|memberi)( resep| e resep| obat)|cara (resep|memberi obat|menulis resep|buat resep)|resep elektronik (diisi|dibuat)/,
    title: 'menulis resep obat (E-Prescription)', to: { dokter: '/dokter/rekam-medis' }, label: 'Rekam Medis', roles: ['dokter'],
    steps: ['Buka **Rekam Medis** pasien dan cari bagian **E-Prescription (Resep Obat)**.', 'Pilih obat (cari nama obat), lalu isi **dosis**, **frekuensi**, **jumlah**, dan **aturan pakai**.', 'Simpan bersama rekam medis. Obat yang dicatat ikut tampil di halaman kasir.']},
  { id: 'masalah', concept: true, re: /(aplikasi|sistem|halaman|layar|dentiva)( saya| ini| nya)? (lambat|lemot|error|macet|hang|nge ?lag|kosong|blank|putih|tidak bisa dibuka|gak bisa dibuka|nggak bisa dibuka|loading terus|berkedip|tidak mau jalan|gak mau jalan)|(tidak|gak|nggak|ga) bisa (login|masuk)|gagal (login|masuk)|error terus|muncul error|kok error|loading (terus|lama)/,
    title: 'mengatasi halaman error, lambat, atau tidak bisa login', to: null, label: null, roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['Coba **muat ulang** halaman — ketik *"muat ulang"* ke saya, atau tekan **F5**.', 'Periksa koneksi internet; coba buka situs lain. Aplikasi tetap butuh internet untuk menyimpan data.', 'Keluar (logout) lalu masuk lagi. Untuk lupa kata sandi, klik **Lupa password** di halaman login.', 'Masih bermasalah? Catat **pesan error** dan **jam kejadian**, lalu hubungi tim Dentiva.'],
    tip: 'Data yang sudah tersimpan aman di server — masalah tampilan tidak menghapus data.' },
  { id: 'unduh', re: /\b(unduh|download|install|instal)\b|(pasang|perbarui|update) aplikasi|aplikasi desktop/,
    title: 'memasang aplikasi desktop Dentiva', to: null, label: null, roles: ['admin', 'dokter', 'resepsionis'],
    steps: ['Buka **dentiva.id/unduh** dan pilih Windows atau macOS.', 'Jalankan pemasang yang terunduh. Jika Windows menampilkan peringatan, klik **More info → Run anyway**.', 'Login memakai akun yang sama dengan versi web.', 'Aplikasi menawarkan pembaruan sendiri bila ada versi baru.'] },
  { id: 'backup', concept: true, re: /(backup|cadangan)|data (klinik )?(bisa |akan )?hilang|(data|rekam medis)( klinik| pasien)? disimpan (di )?(mana|dimana)|server (di mana|dimana)/,
    title: 'penyimpanan & cadangan data', to: null, label: null, roles: ['admin'],
    steps: ['Data klinik disimpan di **server di Indonesia** (Jakarta), sesuai kewajiban penyimpanan rekam medis.', '**Cadangan terenkripsi** dibuat otomatis setiap malam; kunci pembukanya hanya dipegang pemilik.', 'Anda tidak perlu mengatur apa pun. Butuh pemulihan data? Hubungi tim Dentiva.'] },
];

// ── Checklist harian (sadar peran) ───────────────────────────────────────────
const DAILY = {
  admin: { title: 'checklist harian admin', to: '/admin', label: 'Dashboard', items: [
    'Buka **Dashboard**: lihat antrean hari ini dan ringkasan pendapatan.', 'Pantau **Lap. Keuangan** bila ada transaksi besar.',
    'Cek **Pengaturan → WhatsApp**: pastikan sakelar invoice, edukasi, dan pengingat aktif.', 'Catat **Pengeluaran** hari ini.',
    'Seminggu sekali, tengok **Audit Log** untuk aktivitas tak biasa.'] },
  dokter: { title: 'checklist harian dokter', to: '/dokter/jadwal', label: 'Jadwal Hari Ini', items: [
    'Buka **Jadwal Hari Ini** dan lihat pasien terjadwal.', 'Klik **Mulai** saat pasien masuk ruang periksa.',
    'Isi **Rekam Medis**: SOAP, odontogram, tindakan, resep.', 'Klik **Selesai** setelah tindakan — kasir lalu menerima pembayaran.',
    'Cek **Riwayat Kunjungan** bila perlu melanjutkan perawatan.'] },
  resepsionis: { title: 'checklist harian resepsionis', to: '/resepsionis', label: 'Dashboard', items: [
    'Cek **Booking Online**, lalu **Konfirmasi** atau **Tolak** permintaan baru.', 'Buka **Jadwal** hari ini; hubungi pasien yang belum pasti hadir.',
    'Pastikan **Layar Antrean** menyala di TV ruang tunggu.', 'Daftarkan pasien baru, buat kunjungan, dan atur antrean saat pasien datang.',
    'Terima **Pembayaran**: pilih **Lunas**, **Simpan** — invoice WhatsApp terkirim otomatis.', 'Tengok **Recall Pasien** untuk pasien lama yang perlu dihubungi.'] },
};
const TODO = /^(?:hari ini (?:aku |saya )?ngapain|(?:aku |saya )?(?:harus |perlu |mesti |sebaiknya )ngapain(?: hari ini)?)$|^(?:hari ini )?(?:aku |saya )?(?:harus |perlu |mesti |sebaiknya )?(?:apa yang (?:harus|perlu|sebaiknya) (?:aku |saya )?(?:dikerjakan|kerjakan|dilakukan|lakukan)|apa tugas(?: ?ku| saya)?|apa kerjaan(?: ?ku| saya)?)(?: hari ini)?$|^(?:tugas|kerjaan|checklist|rutinitas|to do|todo|daftar tugas|tugas harian|checklist harian|checklist hari ini|tugas hari ini|kerjaan hari ini|rutinitas harian)(?: list)?$|^(?:baiknya |sebaiknya )?mulai dari mana$/;

function dailyReply(role) {
  const d = DAILY[role] || DAILY.admin;
  return {
    intent: 'daily', state: 'idea',
    reply: `Ini **${d.title}**: 📋\n${d.items.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nMau saya buka **${d.label}** sekarang? Ketik *"ya"* atau klik tombol di bawah. 👇`,
    action: { type: 'offer', to: d.to, label: d.label },
  };
}

// ── Balasan ──────────────────────────────────────────────────────────────────
const listPages = (role) => {
  const rows = PAGES.filter((p) => allowed(p, role) && !p.id.startsWith('tab-')).map((p) => `• ${p.label}`);
  const tabs = PAGES.filter((p) => allowed(p, role) && p.id.startsWith('tab-')).map((p) => `• ${p.label.replace('Pengaturan › ', '')}`);
  return { rows, tabs };
};

const DENY_ENDS = ['Ada lagi yang bisa saya bantu?', 'Mau saya arahkan ke halaman lain?'];

function navReply(p, role, say) {
  if (!allowed(p, role)) {
    const reason = p.deny?.[role] || `Halaman **${p.label}** tidak tersedia untuk peran ${roleName[role] || role}.`;
    return { intent: 'navdeny', state: 'lock', reply: `${reason} ${DENY_ENDS[p.label.length % 2]}` };
  }
  const to = toFor(p, role);
  return { intent: 'nav', state: 'point', reply: say(p), action: { type: 'navigate', to, label: p.label } };
}

const stepsText = (tu) => tu.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

const tuTo = (tu, role) => (typeof tu.to === 'string' ? tu.to : tu.to?.[role] || null);

function tutorialReply(tu, role) {
  const to = tuTo(tu, role);
  const canOpen = Boolean(to) && tu.roles.includes(role);
  const head = `Siap, ini caranya **${tu.title}**: 🧭\n${stepsText(tu)}`;
  const tip = tu.tip ? `\n💡 ${tu.tip}` : '';
  if (tu.to && !tu.roles.includes(role)) {
    return { intent: 'guide', state: 'idea', reply: `${head}${tip}\n\n(Halaman ini dikerjakan oleh peran lain, jadi tidak bisa saya buka dari akun Anda.)` };
  }
  return {
    intent: 'guide', state: 'idea',
    reply: `${head}${tip}${canOpen ? `\n\nMau saya buka **${tu.label}** sekarang? Ketik *"ya"* atau klik tombol di bawah. 👇` : ''}`,
    ...(canOpen ? { action: { type: 'offer', to, label: tu.label } } : {}),
  };
}

/** Panduan lengkap: navigasi, "di mana", tutorial, daftar menu, kembali/muat ulang, dan jawaban "ya" untuk tawaran. */
export function guideReply(t0, { role = 'admin', offer = null } = {}) {
  if (!t0) return null;
  const t = stem(t0);
  if (offer && YES.test(t)) {
    return { intent: 'offerYes', state: 'point', reply: `Siap, saya buka **${offer.label}**. 👉`, action: { type: 'navigate', to: offer.to, label: offer.label } };
  }
  if (offer && NO.test(t)) {
    return { intent: 'offerNo', state: 'nod', reply: 'Oke, tidak saya buka. Kalau butuh, tinggal bilang saja. 😊' };
  }
  if (BACK.test(t)) return { intent: 'back', state: 'point', reply: 'Siap, kembali ke halaman sebelumnya. ⬅️', action: { type: 'back' } };
  if (FORWARD.test(t)) return { intent: 'forward', state: 'point', reply: 'Siap, maju ke halaman berikutnya. ➡️', action: { type: 'forward' } };
  if (RELOAD.test(t)) return { intent: 'reload', state: 'spin', reply: 'Siap, saya muat ulang halamannya. 🔄', action: { type: 'reload' } };
  if (LIST.test(t)) {
    const { rows, tabs } = listPages(role);
    return { intent: 'navlist', state: 'idea', reply: `Ini yang bisa saya buka untuk peran **${roleName[role] || role}**: 🧭\n${rows.join('\n')}\n\n**Tab di Pengaturan:**\n${tabs.join('\n')}\n\nCukup ketik *"buka …"* diikuti nama halamannya.` };
  }

  if (TODO.test(t)) return dailyReply(role);

  // tutorial: hanya bila kalimat diawali ajakan belajar ("cara …", "ajarkan …", "bagaimana …")
  if (TEACH_START.test(t)) {
    const tu = TUTORIALS.find((x) => x.re.test(t));
    if (tu) return tutorialReply(tu, role);
  }
  const concept = TUTORIALS.find((x) => x.concept && x.re.test(t));
  if (concept) return tutorialReply(concept, role);

  // "di mana …"
  const wm = t.match(WHERE_END) || t.match(WHERE_G);
  if (wm) {
    const p = findPage(wm[1]);
    if (p) {
      if (!allowed(p, role)) return navReply(p, role, () => '');
      return { intent: 'where', state: 'point', reply: `**${p.label}** ada di: ${p.where}. 🗺️ Mau saya buka sekarang?`, action: { type: 'offer', to: toFor(p, role), label: p.label } };
    }
  }

  // buka …
  const m = t.match(NAV_G);
  if (m) {
    const p = findPage(m[1]);
    if (p) return navReply(p, role, (pg) => `Siap, saya buka **${pg.label}**. 👉`);
    // permintaan eksplisit "buka halaman/menu/tab xyz" yang tidak dikenal → beri petunjuk
    if (/^(?:.*\b)?(?:halaman|menu|tab) /.test(t) && m[1].split(' ').length <= 3 && !/\b(pasien|rekam|medis)\b/.test(m[1])) {
      const { rows } = listPages(role);
      return { intent: 'navunknown', state: 'confused', reply: `Hmm, saya belum menemukan halaman **${tidy(m[1])}**. 🤔 Coba salah satu ini:\n${rows.slice(0, 8).join('\n')}\n\nAtau ketik *"menu apa saja"* untuk daftar lengkap.` };
    }
  }
  return null;
}

export { TUTORIALS };

/** Kata perintah/halaman/tutorial (≥ 4 huruf) — bahan koreksi salah ketik di normalizeChat. */
const wordsOf = (re) => String(re.source || re).replace(/\\./g, ' ').match(/[a-z]{4,}/g) || [];
export const GUIDE_WORDS = [...new Set([
  ...PAGES.flatMap((p) => p.aliases.flatMap((a) => a.split(' '))), ...TUTORIALS.flatMap((tu) => wordsOf(tu.re)),
  ...[BACK, FORWARD, RELOAD, LIST, TODO, YES, NO].flatMap(wordsOf), ...wordsOf(VERBS), ...wordsOf(TEACH),
].filter((w) => w.length >= 4))];
