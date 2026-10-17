/**
 * Latihan Eira v5 (siklus 54–63): kamus istilah, gerakan baru, "lagi", fakta & kuis lanjutan,
 * checklist harian, tutorial per peran, pemecahan masalah, dan jebakan agar pertanyaan data tetap ke AI.
 * Format sama dengan dentiTrainingV4.js (intents, ai, states, replies, actions).
 */
import { QUIZ } from '../../utils/dentiFun';
import { GLOSSARY } from '../../utils/dentiGlossary';

const resp = { role: 'resepsionis' };
const dok = { role: 'dokter' };

// "apa itu X", "X itu apa", "arti X", "jelaskan X", "maksud X" untuk setiap alias kamus — dibangkitkan otomatis.
const definePhrases = (ids) => GLOSSARY.filter((g) => ids.includes(g.id)).flatMap((g) => {
  const a = g.aliases[0];
  return [`apa itu ${a}`, `${a} itu apa`, `arti ${a}`, `jelaskan ${a}`, `maksud ${a}`];
});
const DENTIVA_TERMS = ['soap', 'odontogram', 'rm', 'recall', 'hpp', 'margin', 'bep', 'overhead', 'qris', 'mfa', 'auditlog', 'consent', 'lunas', 'snapshot', 'eresep', 'informedconsent'];
const DENTAL_TERMS = GLOSSARY.map((g) => g.id).filter((id) => !DENTIVA_TERMS.includes(id) && id !== 'satusehat');

// Kunci jawaban benar & jawaban salah untuk setiap soal kuis (dibangkitkan dari QUIZ).
const iOf = (re) => QUIZ.findIndex((q) => re.test(q.q));
const Q = { vitD: iOf(/Vitamin yang membantu/), vitC: iOf(/Kekurangan vitamin apa/), floss: iOf(/Benang khusus/), gingi: iOf(/Radang pada gusi/), email: iOf(/Lapisan terluar/) };
const quizRight = QUIZ.map((q, i) => [q.a[0], { quiz: i }]);
const quizWrong = QUIZ.map((_, i) => [i % 2 ? 'entahlah salah sekali' : 'bunga matahari', { quiz: i }]);

const OFFER = { offer: { to: '/admin/costing', label: 'Biaya & Modal' } };

export const CYCLES_V5 = [
  {
    name: 'Siklus 54 · kamus istilah Dentiva',
    intents: {
      define: [
        'apa itu scaling', 'apa itu hpp', 'hpp itu apa', 'apa itu HPP?', 'jelaskan arti BEP', 'arti odontogram', 'apa itu SOAP', 'soap itu apa',
        'apa itu recall', 'maksud recall', 'apa itu margin', 'margin itu apa', 'arti margin', 'apa itu overhead', 'apa itu biaya overhead', 'apa itu qris',
        'qris itu apa', 'apa itu mfa', 'apa itu verifikasi dua langkah', 'apa itu audit log', 'apa itu izin whatsapp', 'apa itu consent', 'apa itu lunas',
        'lunas itu apa', 'apa itu snapshot biaya', 'apa itu e resep', 'apa itu e prescription', 'apa itu informed consent', 'apa itu rekam medis', 'rekam medis itu apa',
        'apa itu no rm', 'apa itu nomor rm', 'apa itu titik impas', 'titik impas itu apa', 'apa itu break even point', 'apa itu harga pokok', 'apa itu biaya tetap',
        'apa itu peta gigi', 'apa itu odontogam', 'apa itu odontogramm', 'apa itu overheed', 'apa itu snapsot', 'jelasin hpp', 'jelasin soap', 'jelasin odontogram',
        'terangkan margin', 'pengertian recall', 'definisi hpp', 'apa yang dimaksud dengan hpp', 'apa yang dimaksud bep', 'maksudnya hpp apa', 'hpp artinya apa',
        'bep maksudnya apa', 'apa arti soap', 'apa artinya margin', 'mau tahu tentang odontogram', 'info soal hpp', 'ceritakan tentang bep', 'kenalkan soap',
        'tolong jelaskan apa itu hpp', 'coba jelaskan odontogram', 'kak apa itu recall', 'denti apa itu bep', 'APA ITU HPP', 'apa itu hpp ya', 'apa itu hpp dong',
        'oh apa itu margin', 'apa sih hpp', 'apa sih itu odontogram', 
        ...definePhrases(DENTIVA_TERMS),
      ],
    },
    replies: [
      ['apa itu hpp', 'Harga Pokok Penjualan'], ['apa itu bep', 'titik impas'], ['apa itu soap', 'keluhan pasien'], ['apa itu odontogram', 'dokter'],
      ['apa itu recall', 'kontrol'], ['apa itu lunas', 'final'], ['apa itu margin', 'HPP'], ['apa itu qris', 'Bank Indonesia'], ['apa itu consent', 'Persetujuan'],
      ['apa itu hpp', 'Penjelasan umum'],
    ],
    actions: [
      ['apa itu hpp', 'offer', '/admin/costing'], ['apa itu margin', 'offer', '/admin/costing'], ['apa itu qris', 'offer', '/admin/pengaturan?tab=payments'],
      ['apa itu audit log', 'offer', '/admin/audit-log'], ['apa itu soap', 'offer', '/admin/pengaturan?tab=soap-templates'],
      ['apa itu odontogram', 'offer', '/dokter/rekam-medis', dok], ['apa itu recall', 'offer', '/resepsionis/recall', resp],
    ],
    states: [['apa itu hpp', 'idea'], ['apa itu scaling', 'idea']],
  },
  {
    name: 'Siklus 55 · kamus istilah kedokteran gigi',
    intents: {
      define: [
        'apa itu scaling', 'apa itu skeling', 'apa itu karang gigi', 'karang gigi itu apa', 'apa itu kalkulus', 'apa itu tartar', 'apa itu plak', 'apa itu plak gigi', 'apa itu karies',
        'karies itu apa', 'apa itu gigi berlubang', 'apa itu gingivitis', 'gingivitis itu apa', 'apa itu radang gusi', 'apa itu periodontitis', 'apa itu pulpa', 'pulpa itu apa',
        'apa itu dentin', 'apa itu email gigi', 'apa itu enamel', 'apa itu saluran akar', 'apa itu root canal', 'root canal itu apa', 'apa itu perawatan saluran akar', 'apa itu endodontik',
        'apa itu tambal gigi', 'apa itu tambalan', 'apa itu resin komposit', 'apa itu cabut gigi', 'apa itu ekstraksi', 'apa itu pencabutan gigi', 'apa itu crown', 'apa itu mahkota gigi',
        'apa itu veneer', 'apa itu bleaching', 'apa itu pemutihan gigi', 'apa itu behel', 'apa itu kawat gigi', 'apa itu ortodonti', 'apa itu sealant', 'apa itu fissure sealant',
        'apa itu fluoride', 'apa itu fluor', 'apa itu gigi bungsu', 'apa itu impaksi', 'apa itu gigi impaksi', 'apa itu abses', 'apa itu abses gigi', 'apa itu bruxism',
        'apa itu bruksisme', 'apa itu implan gigi', 'apa itu dental implant', 'apa itu gigi tiruan', 'apa itu denture', 'apa itu anestesi lokal', 'apa itu bius lokal',
        'apa itu rontgen gigi', 'apa itu panoramik', 'apa itu periapikal', 'apa itu dental floss', 'apa itu floss', 'apa itu benang gigi', 'apa itu halitosis',
        'apa itu bau mulut', 'apa itu gigi ngilu', 'apa itu hipersensitivitas', 'apa itu gigi susu', 'apa itu xerostomia', 'apa itu mulut kering',
        'apa itu gingivits', 'apa itu periodontits', 'apa itu skeling gigi', 'arti scaling', 'arti gingivitis', 'maksud karies', 'jelaskan scaling',
        'jelasin bleaching', 'terangkan veneer', 'pengertian karies', 'definisi plak', 'apa yang dimaksud dengan scaling', 'apa yang dimaksud gingivitis',
        'scaling itu apa', 'bleaching itu apa', 'veneer itu apa', 'implan itu apa', 'sealant itu apa', 'behel itu apa', 'abses itu apa', 'pulpa artinya apa',
        'bruxism maksudnya apa', 'impaksi artinya apa', 'mau tahu tentang scaling', 'ceritakan tentang gingivitis', 'apa itu tindakan scaling', 'apa itu perawatan saluran akar',
        'apa itu istilah karies', 'apa itu karies gigi', 'apa itu scaling gigi', 'apa itu gigi sulung', 'apa itu gigi palsu', 'apa itu wisdom tooth', 'apa itu geraham bungsu', 'apa itu foto rontgen',
        ...definePhrases(DENTAL_TERMS),
      ],
    },
    replies: [
      ['apa itu scaling', 'karang gigi'], ['apa itu karies', 'berlubang'], ['apa itu gingivitis', 'gusi'], ['apa itu abses', 'dokter'], ['apa itu bruxism', 'menggertakkan'],
      ['apa itu sealant', 'geraham'], ['apa itu gigi bungsu', 'impaksi'], ['apa itu dental floss', 'sela gigi'], ['apa itu implan', 'titanium'], ['apa itu rontgen', 'panoramik'],
    ],
    ai: ['apa itu pendapatan', 'apa itu laba bersih bulan ini', 'apa itu tren kunjungan bulan lalu', 'jelaskan tentang pasien yang menunggak', 'apa itu stok menipis'],
  },
  {
    name: 'Siklus 56 · jebakan kamus (pertanyaan data harus ke AI)',
    ai: [
      'berapa pasien scaling bulan ini', 'harga scaling berapa', 'tindakan scaling paling laris', 'berapa hpp scaling', 'hpp scaling naik atau turun', 'margin bulan ini berapa',
      'berapa bep klinik per bulan', 'apakah margin scaling cukup bagus', 'bandingkan hpp dan margin', 'berapa pasien recall bulan ini', 'berapa pasien dengan gingivitis',
      'apa itu pendapatan bersih bulan ini', 'jelaskan laporan keuangan bulan ini', 'jelaskan kenapa margin turun', 'jelaskan hpp tindakan scaling bulan ini berapa',
      'kenapa hpp tambal gigi lebih tinggi dari harga', 'berapa pasien bleaching minggu ini', 'tindakan veneer berapa banyak', 'stok sealant tinggal berapa',
      'berapa sisa stok fluoride', 'pasien implan bulan ini siapa saja', 'jadwal dokter untuk pasien abses besok', 'berapa pendapatan dari behel',
      'bandingkan pendapatan scaling dan tambal', 'apa saja tindakan dengan margin tertinggi', 'tolong hitung hpp kalau bahan naik 10%', 'berapa overhead per tindakan',
      'overhead bulan ini berapa', 'berapa total biaya tetap bulan ini', 'apa penyebab pendapatan turun', 'kenapa pasien recall sedikit', 'berapa pasien lunas hari ini',
      'berapa pembayaran yang belum lunas', 'snapshot biaya bulan lalu berapa', 'berapa kopi yang dibeli klinik bulan ini', 'pasien yang marah bulan ini ada berapa',
      'telepon pasien yang belum bayar', 'berapa pasien yang nangis kemarin', 'bandingkan margin dan hpp semua tindakan', 'laporan soap hari ini',
      'berapa soap yang sudah dikunci', 'daftar pasien dengan karies', 'berapa biaya implan di klinik lain', 'berapa harga behel per bulan',
    ],
  },
  {
    name: 'Siklus 57 · gerakan baru (meregang, otot, telepon, detektif, kopi, pusing, marah, nangis)',
    intents: {
      'move:stretch': ['meregang', 'regang', 'peregangan', 'stretching', 'stretch', 'regangkan badan', 'renggangkan badan', 'ayo meregang', 'rilekskan badan', 'coba meregang', 'meregang dulu', 'peregangan dong'],
      'move:flex': ['pamer otot', 'flex', 'tunjukkan otot', 'tunjukin otot', 'pamer kekuatan', 'mode kuat', 'mode otot', 'coba pamer otot', 'kamu kuat', 'bodybuilder'],
      'move:phone': ['telepon', 'telpon', 'nelpon', 'menelepon', 'angkat telepon', 'angkat telpon', 'pura pura telepon', 'terima telepon', 'coba telepon'],
      'move:search': ['cari cari', 'mencari', 'pura pura mencari', 'detektif', 'mode detektif', 'main detektif', 'kaca pembesar', 'pakai kaca pembesar', 'selidiki', 'investigasi', 'cek cek'],
      'move:coffee': ['ngopi', 'minum kopi', 'kopi', 'kopi dulu', 'ngopi dulu', 'ayo ngopi', 'secangkir kopi', 'coffee break', 'ngopi santai', 'bikin kopi', 'seruput', 'coba ngopi'],
      'move:dizzy': ['puter puter', 'mode pusing', 'pura pura pusing', 'kepala berputar', 'mabuk', 'kliyengan', 'puyeng', 'pusing tujuh keliling'],
      'move:angry': ['pura pura marah', 'mode marah', 'ngambek', 'pasang muka marah', 'muka marah', 'wajah marah', 'sok marah', 'angry'],
      'move:cry': ['pura pura nangis', 'nangis kejer', 'nangis bombay', 'hiks', 'hiks hiks', 'tangisan', 'peragakan nangis', 'cengeng'],
      showoff: ['semua gerakan', 'tunjukkan semua gerakan', 'atraksi lengkap', 'pertunjukan', 'show lengkap', 'full show', 'pamer semua gerakan', 'gerakan lengkap', 'pertunjukan lengkap',
        'gerakan apa saja', 'bisa gerak apa', 'atraksi', 'tunjukkan gerakan'],
    },
    states: [
      ['meregang', 'stretch'], ['pamer otot', 'flex'], ['telepon', 'phone'], ['mode detektif', 'search'], ['ngopi', 'coffee'], ['puter puter', 'dizzy'], ['pura pura marah', 'angry'], ['pura pura nangis', 'cry'],
      ['hiks', 'cry'], ['kaca pembesar', 'search'], ['minum kopi', 'coffee'], ['kepala berputar', 'dizzy'],
      // empati: pengguna yang menangis dihibur Eira dengan ekspresi sedih berair mata, bukan pura-pura marah
      ['aku menangis', 'cry'], ['huhu', 'cry'], ['aku marah', 'sorry'], ['aku kesal', 'sorry'],
    ],
    actions: [['semua gerakan', 'showoff', null], ['gerakan apa saja', 'showoff', null]],
    replies: [['semua gerakan', '17 gerakan'], ['ngopi', '☕'], ['mode detektif', 'Mencari'], ['pamer otot', '💪']],
    ai: ['berapa kopi yang dibeli klinik bulan ini', 'jadwal meregang untuk staf', 'telepon pasien yang belum bayar', 'cari pasien atas nama budi', 'pasien yang marah bulan ini berapa',
      'cari data pembayaran kemarin', 'nangis kenapa pasien bulan ini', 'berapa stok kopi'],
  },
  {
    name: 'Siklus 58 · "lagi" setelah gerakan, fakta, dan kuis',
    intents: {
      'move:wink': [['lagi', { lastIntent: 'move:wink' }], ['sekali lagi', { lastIntent: 'move:wink' }], ['ulangi', { lastIntent: 'move:wink' }], ['lagi dong', { lastIntent: 'move:wink' }], ['satu lagi', { lastIntent: 'move:wink' }]],
      'move:coffee': [['lagi', { lastIntent: 'move:coffee' }], ['ulangi lagi', { lastIntent: 'move:coffee' }], ['sekali lagi', { lastIntent: 'move:coffee' }]],
      'move:flex': [['lagi', { lastIntent: 'move:flex' }], ['sekali lagi', { lastIntent: 'move:flex' }]],
      'move:stretch': [['lagi', { lastIntent: 'move:stretch' }]],
      'move:jump': [['lagi', { lastIntent: 'move:jump' }], ['sekali lagi', { lastIntent: 'move:jump' }]],
      fact: [['lagi', { lastIntent: 'fact' }], ['satu lagi', { lastIntent: 'fact' }], ['sekali lagi', { lastIntent: 'fact' }], ['lagi dong', { lastIntent: 'fact' }]],
      quiz: [['lagi', { lastIntent: 'quizRight' }], ['soal lagi', { lastIntent: 'quizRight' }], ['kuis lagi', { lastIntent: 'quizReveal' }], ['sekali lagi', { lastIntent: 'quizRight' }], ['lagi', { lastIntent: 'quizReveal' }]],
      showoff: [['lagi', { lastIntent: 'showoff' }], ['ulangi', { lastIntent: 'showoff' }]],
    },
    states: [['lagi', 'spin', { lastIntent: 'coin' }], ['lagi', 'jump', { lastIntent: 'dice' }], ['lagi', 'excited', { lastIntent: 'rpsPlay' }], ['lagi', 'wink', { lastIntent: 'move:wink' }], ['lagi', 'coffee', { lastIntent: 'move:coffee' }], ['lagi', 'idea', { lastIntent: 'fact' }]],
    distinct: [['ngopi', 3], ['pamer otot', 3], ['mode detektif', 3], ['pura pura marah', 3], ['pura pura nangis', 3], ['telepon', 3], ['meregang', 3]],
    ai: [['lagi', { lastIntent: 'unknown' }], ['tampilkan lagi laporan tadi', {}], ['berapa lagi sisa hari bulan ini', {}]],
  },
  {
    name: 'Siklus 59 · fakta gigi & kuis (semua soal)',
    intents: {
      fact: ['tahukah kamu', 'tahukah anda', 'fun fact', 'tau gak', 'tau nggak', 'tahu tidak', 'info menarik', 'informasi menarik', 'ceritakan sesuatu', 'kasih fakta', 'beri fakta',
        'ada fakta', 'fakta apa', 'fakta seru', 'kasih info menarik', 'tahukah kamu dong'],
      quiz: ['kuis', 'main kuis', 'ayo kuis', 'kuis gigi', 'tebak gigi', 'uji pengetahuan gigi', 'quiz', 'trivia gigi', 'tantang aku', 'soal kuis'],
      quizRight: quizRight,
      quizWrong: quizWrong,
    },
    replies: [['tahukah kamu', 'Tahukah Anda'], ['kuis', 'Kuis gigi'], ['fun fact', 'lagi']],
    // pastikan kata kunci satu huruf ("c", "d") tidak membuat jawaban sembarang dianggap benar
    states: [['dua puluh', 'confused', { quiz: Q.vitD }], ['kamu', 'confused', { quiz: Q.vitD }], ['vitamin d', 'cheer', { quiz: Q.vitD }], ['vitamin c', 'cheer', { quiz: Q.vitC }],
      ['dental flos', 'cheer', { quiz: Q.floss }], ['gingivits', 'cheer', { quiz: Q.gingi }], ['2 menit', 'cheer', { quiz: 0 }], ['5 menit', 'confused', { quiz: 0 }], ['nyerah', 'shrug', { quiz: Q.email }],
      ['petunjuk', 'idea', { quiz: Q.email }]],
    ai: ['tau gak harga scaling', 'tahukah kamu berapa pasien hari ini', 'berapa pasien tahun lalu', 'fakta pendapatan bulan ini', 'kuis keuangan dong bulan ini'],
  },
  {
    name: 'Siklus 60 · checklist harian (sadar peran)',
    intents: {
      daily: [
        'hari ini ngapain', 'aku harus ngapain', 'saya harus ngapain', 'harus ngapain hari ini', 'apa yang harus dikerjakan', 'apa yang harus aku kerjakan', 'apa yang perlu dikerjakan',
        'apa yang sebaiknya dilakukan', 'apa tugas saya', 'apa tugasku', 'apa kerjaan saya', 'tugas hari ini', 'kerjaan hari ini', 'checklist', 'checklist harian', 'checklist hari ini',
        'daftar tugas', 'tugas harian', 'rutinitas harian', 'to do', 'todo', 'mulai dari mana', 'baiknya mulai dari mana', 'sebaiknya mulai dari mana',
        ['hari ini ngapain', resp], ['tugas hari ini', resp], ['checklist harian', resp], ['mulai dari mana', resp], ['hari ini ngapain', dok], ['checklist harian', dok],
        ['apa tugas saya', dok], ['daftar tugas', dok], ['mulai dari mana', dok],
      ],
    },
    replies: [
      ['checklist harian', 'checklist harian admin'], ['checklist harian', 'Audit Log'], ['checklist harian', 'Booking Online', resp], ['checklist harian', 'Layar Antrean', resp],
      ['checklist harian', 'Mulai', dok], ['checklist harian', 'Rekam Medis', dok], ['checklist harian', 'Pembayaran', resp],
    ],
    actions: [['checklist harian', 'offer', '/admin'], ['checklist harian', 'offer', '/resepsionis', resp], ['checklist harian', 'offer', '/dokter/jadwal', dok]],
    // "ngapain" polos = curhat bosan, bukan permintaan checklist
    states: [['ngapain ya', 'excited']],
    ai: ['tugas pasien hari ini apa saja', 'daftar tugas dokter alya hari ini', 'checklist stok bahan bulan ini', 'berapa pasien hari ini', 'apa yang harus dikerjakan untuk menaikkan pendapatan'],
  },
  {
    name: 'Siklus 61 · tutorial per peran (resepsionis & dokter)',
    intents: {
      guide: [
        ['cara buat jadwal kunjungan', resp], ['cara bikin jadwal kunjungan', resp], ['ajarkan cara tambah kunjungan', resp], ['gimana cara jadwalkan janji temu', resp],
        ['bagaimana cara input kunjungan', resp], ['tolong ajarkan cara membuat jadwal kunjungan', resp], ['cara membuat kunjungan', resp],
        ['cara konfirmasi booking', resp], ['cara proses booking', resp], ['ajarkan cara menolak booking', resp], ['gimana cara terima booking', resp], ['bagaimana cara konfirmasi permintaan booking', resp],
        ['cara recall pasien', resp], ['cara pakai recall', resp], ['gimana cara menghubungi pasien lama', resp], ['ajarkan recall', resp], ['bagaimana recall dikerjakan', resp], ['cara hubungi pasien lama', resp],
        ['cara mulai kunjungan', dok], ['cara memulai pemeriksaan', dok], ['ajarkan cara menyelesaikan kunjungan', dok], ['gimana cara selesaikan tindakan', dok], ['bagaimana cara mengakhiri kunjungan', dok],
        ['cara isi rekam medis', dok], ['cara mengisi soap', dok], ['ajarkan cara isi odontogram', dok], ['gimana cara menulis rekam medis', dok], ['cara kunci catatan', dok], ['cara cetak rekam medis', dok],
        ['cara tulis resep', dok], ['cara memberi obat', dok], ['ajarkan cara buat resep', dok], ['gimana cara isi resep', dok], ['bagaimana cara menulis resep obat', dok],
        // peran lain tetap mendapat langkah-langkah (dengan catatan tidak bisa dibuka dari akunnya)
        'cara buat jadwal kunjungan', 'cara konfirmasi booking', 'cara recall pasien', 'cara mulai kunjungan', 'cara isi rekam medis', 'cara tulis resep',
      ],
    },
    replies: [
      ['cara buat jadwal kunjungan', 'Tambah Jadwal Kunjungan', resp], ['cara konfirmasi booking', 'Kabari via WA', resp], ['cara konfirmasi booking', 'Daftarkan pasien', resp],
      ['cara recall pasien', 'tidak ada yang terkirim otomatis', resp], ['cara recall pasien', 'Dihubungi', resp], ['cara mulai kunjungan', 'Mulai', dok], ['cara mulai kunjungan', 'Selesai', dok],
      ['cara isi rekam medis', 'Simpan Rekam Medis', dok], ['cara isi rekam medis', 'Kunci Catatan', dok], ['cara tulis resep', 'E-Prescription', dok], ['cara tulis resep', 'aturan pakai', dok],
      ['cara mulai kunjungan', 'peran lain'], ['cara isi rekam medis', 'peran lain', resp],
    ],
    actions: [
      ['cara buat jadwal kunjungan', 'offer', '/resepsionis/jadwal', resp], ['cara konfirmasi booking', 'offer', '/booking-requests', resp], ['cara recall pasien', 'offer', '/resepsionis/recall', resp],
      ['cara mulai kunjungan', 'offer', '/dokter/jadwal', dok], ['cara isi rekam medis', 'offer', '/dokter/rekam-medis', dok], ['cara tulis resep', 'offer', '/dokter/rekam-medis', dok],
    ],
    ai: ['cara kerja dokter alya hari ini', 'jadwal kunjungan pasien budi', 'konfirmasi booking yang masuk hari ini berapa', 'berapa pasien recall minggu ini', 'berapa resep obat bulan ini',
      'rekam medis pasien yang belum diisi berapa', 'berapa kunjungan yang belum selesai'],
  },
  {
    name: 'Siklus 62 · pemecahan masalah, tema & keamanan semua peran, profil dokter',
    intents: {
      guide: [
        'aplikasi lemot', 'aplikasi saya error', 'halaman kosong', 'halaman putih', 'layar saya blank', 'sistem lambat', 'dentiva macet', 'aplikasi hang', 'halaman loading terus', 'tidak bisa login',
        'gak bisa login', 'nggak bisa masuk', 'gagal login', 'error terus', 'muncul error', 'kok error', 'loading lama', 'halaman tidak bisa dibuka', 'sistem ini lemot', 'aplikasi ini macet',
        ['aplikasi lemot', dok], ['tidak bisa login', resp], ['halaman kosong', resp], ['kok error', dok],
        ['cara ganti password', dok], ['cara ganti password', resp], ['cara ganti tema', dok], ['cara ubah tampilan', resp], ['gimana cara ganti kata sandi', resp],
      ],
      nav: [
        ['buka tema', dok], ['buka tema', resp], ['buka tampilan', dok], ['buka keamanan', dok], ['buka kata sandi', resp], ['buka password', dok],
        ['buka profil dokter', dok], ['buka data dokter', dok], ['buka biodata dokter', dok], ['buka jadwal hari ini', dok], ['buka jadwal hari ini', resp], ['buka jadwal harian', dok],
      ],
      navdeny: [['buka profil dokter', resp], 'buka profil dokter', ['buka data dokter', resp], 'buka biodata dokter'],
    },
    actions: [
      ['buka tema', 'navigate', '/pengaturan?tab=appearance', dok], ['buka tema', 'navigate', '/pengaturan?tab=appearance', resp], ['buka tema', 'navigate', '/admin/pengaturan?tab=appearance'],
      ['buka keamanan', 'navigate', '/pengaturan?tab=security', dok], ['buka keamanan', 'navigate', '/admin/pengaturan?tab=security'], ['buka kata sandi', 'navigate', '/pengaturan?tab=security', resp],
      ['buka profil dokter', 'navigate', '/dokter/profil-dokter', dok], ['buka jadwal hari ini', 'navigate', '/dokter/jadwal', dok], ['buka jadwal hari ini', 'navigate', '/resepsionis/jadwal', resp],
      ['cara ganti password', 'offer', '/pengaturan?tab=security', dok], ['cara ganti tema', 'offer', '/pengaturan?tab=appearance', resp], ['cara ganti password', 'offer', '/admin/pengaturan?tab=security'],
    ],
    replies: [['aplikasi lemot', 'muat ulang'], ['tidak bisa login', 'Lupa password'], ['aplikasi error', 'hubungi tim Dentiva'], ['buka profil dokter', 'Profil Dokter', dok]],
    ai: ['kenapa pendapatan turun terus', 'kenapa pasien sedikit', 'laporan error bulan lalu', 'berapa pasien gagal bayar', 'kok pendapatan hari ini kosong', 'halaman pasien yang belum bayar',
      'kenapa kunjungan macet bulan ini', 'tampilkan error pembayaran kemarin'],
  },
  {
    name: 'Siklus 63 · ragam kalimat campuran & jebakan lanjutan',
    intents: {
      define: ['denti, apa itu scaling??', 'APA ITU KARIES!!', 'apa itu bruxism ya?', 'kak, scaling itu apa sih?', 'plak itu apaan'],
      'move:coffee': ['denti ngopi dulu', 'ngopi dulu dong'],
      daily: ['denti hari ini ngapain', 'tugas hari ini dong', 'kak checklist harian'],
      fact: ['denti tahukah kamu'],
    },
    ai: [
      'jelaskan scaling dan hitung berapa pasien yang butuh scaling bulan ini', 'apa itu scaling dan berapa harganya di klinik saya', 'bandingkan karies dan gingivitis bulan ini',
      'apa itu plak dan berapa pasien dengan plak', 'tolong jelaskan laporan keuangan bulan ini secara lengkap', 'jelaskan kenapa laba bersih turun dibanding bulan lalu',
      'apa yang harus dikerjakan untuk menaikkan margin', 'hari ini ngapain saja pasien dokter alya', 'checklist stok bahan untuk bulan depan', 'kuis berapa pendapatan hari ini',
    ],
  },
  {
    name: 'Siklus 65 · jawaban tawaran buka halaman (ya / tidak, ragam bahasa)',
    intents: {
      offerYes: [
        'ya', 'iya', 'oke', 'boleh', 'silakan', 'buka', 'bukakan', 'buka dong', 'ya buka', 'iya tolong', 'ya tolong buka', 'oke buka', 'siap buka', 'gas', 'gaskeun', 'yuk',
        'ayo buka', 'mau', 'mau dong', 'lanjut', 'lanjutkan', 'setuju', 'betul', 'tentu', 'tentu saja', 'pasti', 'langsung buka', 'buka halamannya', 'ke sana', 'bawa aku ke sana',
        'antar ke sana', 'tampilkan', 'ok', 'sip', 'yoi', 'ya dong', 'iya deh', 'boleh banget', 'ya silakan', 'okee', 'Iya!', 'YA', 'yap', 'yup', 'baik', 'jelas', 'benar',
        'ya boleh', 'oke silakan', 'siap', 'ayo', 'lanjutin', 'hayuk', 'ya ya', 'mau buka', 'yuk buka', 'ya sekarang', 'buka sekarang', 'bukain',
      ].map((p) => [p, OFFER]),
      offerNo: [
        'tidak', 'nggak', 'gak usah', 'nanti aja', 'jangan', 'batal', 'batalkan', 'skip', 'lewati', 'lain kali', 'tidak jadi', 'gak jadi', 'tidak perlu', 'nggak dulu', 'belum',
        'jangan dibuka', 'tidak usah', 'ga usah', 'tak usah', 'nanti', 'tidak dulu', 'jangan dulu', 'enggak', 'ga', 'nanti saja', 'gak perlu', 'jangan buka',
      ].map((p) => [p, OFFER]),
    },
    actions: [['ya', 'navigate', '/admin/costing', OFFER], ['buka halamannya', 'navigate', '/admin/costing', OFFER], ['ke sana', 'navigate', '/admin/costing', OFFER], ['gas', 'navigate', '/admin/costing', OFFER]],
    replies: [['ya', 'Biaya & Modal', OFFER], ['tidak', 'tidak saya buka', OFFER]],
    // tanpa tawaran → bukan perintah buka halaman
    ai: ['ke sana', 'buka halamannya', 'bawa aku ke sana', 'antar ke sana', 'langsung buka'],
  },
  {
    name: 'Siklus 66 · permainan kecil (koin, dadu, undi pilihan, suit) & "lagi"',
    intents: {
      coin: ['lempar koin', 'koin', 'flip coin', 'toss', 'toss koin', 'undi koin', 'tos koin', 'lempar uang logam', 'lempar koin dong', 'LEMPAR KOIN', 'lempar koinn'],
      dice: ['lempar dadu', 'dadu', 'roll dice', 'kocok dadu', 'main dadu', 'dadu dong', 'lempar dadunya'],
      choose: ['pilihin kopi atau teh', 'tentukan makan atau tidur', 'undi budi atau ani', 'pilihkan merah atau biru', 'bantu pilih nasi atau mie', 'pilihin a vs b', 'tentukan siapa traktir aku atau kamu',
        'pilihin pizza or burger', 'undi kiri atau kanan', 'tentukan sate atau bakso dong'],
      rps: ['main suit', 'suit', 'jankenpon', 'batu gunting kertas', 'ayo suit', 'main batu gunting kertas', 'suit dong', 'ayo main suit'],
      rpsPlay: [['batu', { lastIntent: 'rps' }], ['gunting', { lastIntent: 'rps' }], ['kertas', { lastIntent: 'rps' }], ['batu dong', { lastIntent: 'rpsPlay' }], ['Gunting!', { lastIntent: 'rpsPlay' }],
        ['kertas', { lastIntent: 'rpsPlay' }], ['BATU', { lastIntent: 'rps' }]],
    },
    states: [['lempar koin', 'spin'], ['lempar dadu', 'jump'], ['pilihin kopi atau teh', 'idea'], ['main suit', 'excited']],
    replies: [['lempar koin', 'Cling'], ['lempar dadu', 'Dadu'], ['pilihin kopi atau teh', 'saya pilih'], ['main suit', 'batu'], ['batu', 'vs saya', { lastIntent: 'rps' }]],
    ai: ['batu', 'gunting', 'kertas', 'harga kertas hvs berapa', 'koin berapa', 'tentukan harga scaling atau tambal', 'pilihin dokter alya atau budi untuk jadwal', 'tentukan jadwal besok atau lusa',
      'undi pasien mana yang dipanggil duluan', 'pilihin tindakan paling untung atau paling laris', 'tentukan margin 30% atau 40%', 'bantu pilih bahan scaling atau tambal'],
  },
];
