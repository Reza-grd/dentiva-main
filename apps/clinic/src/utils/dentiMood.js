// ─────────────────────────────────────────────
//  "Otak" Denti di Asisten AI — aturan reaksi yang berjalan di aplikasi
//  (tanpa panggilan AI tambahan, tanpa kuota): obrolan ringan dijawab langsung,
//  topik yang dianalisis ditebak dari pertanyaan, dan ekspresi mengikuti isi jawaban.
// ─────────────────────────────────────────────

const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const any = (t, words) => words.some((w) => t.includes(w));
const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Cocok per kata utuh ("kas" tidak cocok dengan "terima kasih"). */
const anyWord = (t, words) => words.some((w) => new RegExp(`(^|[^a-z])${escape(w)}($|[^a-z])`).test(t));

/** Kata yang menandakan pertanyaan data/panduan — jangan dijawab sebagai obrolan ringan. */
const DATA_WORDS = [
  'berapa', 'pendapatan', 'omzet', 'pengeluaran', 'biaya', 'laba', 'untung', 'rugi', 'margin', 'hpp',
  'stok', 'bahan', 'dokter', 'jadwal', 'pasien', 'kunjungan', 'recall', 'bayar', 'tagihan', 'harga',
  'bep', 'impas', 'kas', 'laporan', 'bulan', 'minggu', 'hari ini', 'cara', 'bagaimana', 'menu', 'fitur',
];

const JOKES = [
  'Kenapa gigi tidak pernah merasa kesepian? Karena selalu ditemani gusi yang setia. 😄',
  'Dokter gigi favorit para hantu? Yang praktiknya di "gigi-l" malam. 👻🦷',
  'Sikat gigi itu sahabat sejati — setiap pagi dan malam selalu ada untuk kita. 🪥',
];

/**
 * Obrolan ringan → balasan lokal + aksi Denti (null bila bukan obrolan ringan).
 *   smallTalk('terima kasih') → { state: 'love', reply: 'Sama-sama! …' }
 */
export function smallTalk(text, { name = '', greeting = 'Halo', seed = 0 } = {}) {
  const t = norm(text).replace(/[!?.,]+/g, ' ').trim();
  if (!t || t.length > 60 || anyWord(t, DATA_WORDS)) return null;
  const sapa = name ? `, ${name}` : '';

  if (/(terima ?kasih|makasih|trims|thanks|thank you|thx|tengkyu)/.test(t)) {
    return { state: 'love', reply: `Sama-sama${sapa}! Senang bisa membantu. 😊` };
  }
  if (/(pintar|hebat|keren|mantap|mantul|bagus|luar biasa|good job|\btop\b)/.test(t)) {
    return { state: 'shy', reply: 'Aduh, jadi malu… Terima kasih! Saya akan terus belajar dari data klinik Anda. ☺️' };
  }
  if (/(siapa (kamu|anda|namamu)|kamu siapa|anda siapa|nama (kamu|mu|anda))/.test(t)) {
    return { state: 'wave', reply: 'Saya **Denti** 🦷, asisten AI Dentiva. Saya membaca angka ringkasan klinik — pendapatan, jadwal, stok, recall — lalu menjelaskannya dengan bahasa sehari-hari. Data identitas dan rekam medis pasien tidak pernah saya lihat.' };
  }
  if (/(lucu|bercanda|lelucon|jokes?|lawak|haha|wkwk|hehe)/.test(t)) {
    return { state: 'laugh', reply: JOKES[Math.abs(seed) % JOKES.length] };
  }
  if (/(joget|menari|nari|dansa|nyanyi)/.test(t)) {
    return { state: 'dance', reply: 'Siap! Sedikit gerakan biar semangat kerja hari ini. 🎵' };
  }
  if (/(dadah|sampai jumpa|bye|selamat tinggal|pamit)/.test(t)) {
    return { state: 'thanks', reply: `Sampai jumpa${sapa}! Semoga klinik lancar hari ini. 👋` };
  }
  if (/^(halo|hallo|hai|hi|hey|hello|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|assalamualaikum|assalamu'alaikum|permisi)\b/.test(t)) {
    return { state: 'wave', reply: `${greeting}${sapa}! Saya Denti. Mau cek apa hari ini — pendapatan, jadwal dokter, atau stok bahan?` };
  }
  return null;
}

const TOPICS = [
  [['pendapatan', 'omzet', 'pemasukan', 'revenue'], 'data pendapatan'],
  [['pengeluaran', 'biaya', 'belanja'], 'data pengeluaran'],
  [['laba', 'untung', 'margin', 'hpp', 'menguntungkan'], 'margin tindakan'],
  [['bep', 'impas'], 'titik impas'],
  [['arus kas', 'proyeksi', 'cashflow'], 'arus kas'],
  [['harga', 'simulasi', 'naik'], 'simulasi harga'],
  [['stok', 'bahan', 'kadaluarsa', 'kedaluwarsa'], 'stok bahan'],
  [['recall', 'kontrol ulang'], 'daftar recall'],
  [['belum dibayar', 'tagihan', 'piutang', 'tunggakan'], 'tagihan'],
  [['dokter', 'jadwal'], 'jadwal & kinerja dokter'],
  [['pasien', 'kunjungan'], 'data kunjungan'],
  [['cara', 'bagaimana', 'menu', 'fitur', 'mengaktifkan', 'membuat'], 'panduan Dentiva'],
];

/** Topik pertanyaan untuk teks "Menganalisis …". */
export function topicOf(question) {
  const t = norm(question);
  const hit = TOPICS.find(([words]) => any(t, words));
  return hit ? hit[1] : 'data klinik';
}

const ALERT = ['menipis', 'habis', 'kadaluarsa', 'kedaluwarsa', 'belum dibayar', 'tunggakan', 'defisit', 'rugi', 'turun', 'menurun', 'anjlok', 'terlambat', 'perlu perhatian', 'waspada'];
const STRONG = ['kadaluarsa', 'kedaluwarsa', 'defisit', 'rugi', 'anjlok'];
const GOOD = ['naik', 'meningkat', 'tertinggi', 'untung', 'surplus', 'bertumbuh', 'tumbuh', 'rekor', 'melampaui', 'lebih tinggi'];
const GUIDE = ['langkah', 'buka menu', 'klik', 'pilih menu', 'pengaturan →', 'tekan tombol'];
const count = (t, words) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);

/** Ekspresi Denti + kalimat singkatnya setelah jawaban AI diterima. */
export function moodForAnswer(answer, { error = false } = {}) {
  if (error) return { state: 'sorry', line: 'Maaf, ada kendala. Coba sebentar lagi, ya.' };
  const t = norm(answer);
  const bad = count(t, ALERT);
  const good = count(t, GOOD);
  if (bad > good && any(t, STRONG)) return { state: 'surprise', line: 'Ada yang perlu segera diperhatikan!' };
  if (bad > good) return { state: 'think', line: 'Ada beberapa hal yang perlu dipantau.' };
  if (good > 0) return { state: 'celebrate', line: 'Kabar baik!' };
  if (any(t, GUIDE)) return { state: 'point', line: 'Ikuti langkah-langkah ini, ya.' };
  return { state: 'happy', line: 'Ini hasilnya.' };
}

/** Ekspresi Denti untuk catatan Dashboard (dari tingkat tiap poin). */
export function moodForBrief(brief) {
  const poin = brief?.poin || [];
  const n = (lvl) => poin.filter((p) => p.tingkat === lvl).length;
  if (n('penting') > 0) return 'think';
  if (n('baik') > 0 && n('baik') >= n('perhatian')) return 'happy';
  return 'talk';
}

/** Reaksi saat Denti "dicolek" (berurutan). */
export const POKE_REACTIONS = [
  { state: 'laugh', line: 'Hihi, geli!' },
  { state: 'surprise', line: 'Eh, kaget!' },
  { state: 'spin', line: 'Salto untuk Anda!' },
  { state: 'dance', line: 'Ayo semangat!' },
  { state: 'love', line: 'Terima kasih sudah menyapa!' },
];

/** Sapaan pembuka sesuai waktu. */
export function greetLine(greeting, name) {
  return `${greeting}${name ? `, ${name}` : ''}! Saya Denti — tanyakan apa saja tentang klinik.`;
}
