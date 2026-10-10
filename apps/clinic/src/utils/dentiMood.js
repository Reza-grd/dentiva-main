// ─────────────────────────────────────────────
//  "Otak" Denti di Asisten AI — aturan reaksi yang berjalan di aplikasi
//  (tanpa panggilan AI tambahan, tanpa kuota): obrolan ringan dijawab langsung,
//  topik yang dianalisis ditebak dari pertanyaan, dan ekspresi mengikuti isi jawaban.
//  Kalimat latihan & hasil yang diharapkan: src/test/dentiTraining.test.js.
// ─────────────────────────────────────────────

const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const any = (t, words) => words.some((w) => t.includes(w));
const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Cocok per kata utuh ("kas" tidak cocok dengan "terima kasih"). */
const anyWord = (t, words) => words.some((w) => new RegExp(`(^|[^a-z])${escape(w)}($|[^a-z])`).test(t));
const pick = (list, seed) => list[Math.abs(seed) % list.length];

/**
 * Rapikan kalimat obrolan: huruf kecil, tanpa tanda baca/emoji, huruf berulang dipendekkan
 * ("makasihhh" → "makasih"), sapaan ke Denti & partikel penutup dibuang ("halo denti dong ya" → "halo").
 */
export function normalizeChat(text) {
  let t = norm(text)
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\b(denti|kak|kakak|min|mimin|bot)\b/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i += 1) t = t.replace(/\s(ya|yah|yaa|ya|dong|deh|nih|sih|kok|lho|loh|banget|bgt|sekali|nya)$/, '').trim();
  return t;
}

/** Kata yang menandakan pertanyaan data/panduan — jangan dijawab sebagai obrolan ringan. */
const DATA_WORDS = [
  'berapa', 'pendapatan', 'omzet', 'pengeluaran', 'biaya', 'laba', 'untung', 'rugi', 'margin', 'hpp',
  'stok', 'bahan', 'dokter', 'jadwal', 'pasien', 'kunjungan', 'recall', 'bayar', 'tagihan', 'harga',
  'bep', 'impas', 'kas', 'laporan', 'bulan', 'minggu', 'hari ini', 'cara', 'bagaimana', 'menu', 'fitur',
  'tindakan', 'obat', 'resep', 'antrean', 'booking', 'ringkas', 'cek', 'tampilkan', 'hitung', 'proyeksi',
];

const JOKES = [
  'Kenapa gigi tidak pernah merasa kesepian? Karena selalu ditemani gusi yang setia. 😄',
  'Dokter gigi favorit para hantu? Yang praktiknya di "gigi-l" malam. 👻🦷',
  'Sikat gigi itu sahabat sejati — setiap pagi dan malam selalu ada untuk kita. 🪥',
  'Apa makanan kesukaan dokter gigi? Yang pasti bukan permen — nanti pasiennya kebanyakan. 🍬😁',
];

const CAPABILITIES = [
  'Ini yang bisa saya bantu:',
  '- **Keuangan** — pendapatan, pengeluaran, laba, tagihan yang belum dibayar',
  '- **Perencanaan** — simulasi harga, titik impas (BEP), proyeksi arus kas',
  '- **Operasional** — ringkasan hari ini, beban jadwal dokter, recall pasien, stok bahan',
  '- **Panduan Dentiva** — cara memakai menu & fitur',
  '',
  'Tulis saja pertanyaannya dengan bahasa sehari-hari, misalnya *"Berapa pendapatan bulan ini?"*',
].join('\n');

const timeOf = (now) => now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
const dateOf = (now) => now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Daftar intent obrolan. `whole` = harus seluruh kalimat (dicek sebelum saringan kata data),
 * `re` = cukup memuat pola. Urutan menentukan prioritas.
 */
const INTENTS = [
  // ── Dijawab dari jam perangkat (sebelum saringan kata data karena memuat "berapa"/"hari ini")
  { id: 'time', state: 'talk', whole: /^(sekarang )?(jam|pukul) berapa( sekarang)?$/,
    reply: ({ now }) => `Sekarang pukul **${timeOf(now)}**. ⏰` },
  { id: 'date', state: 'talk', whole: /^((hari ini|sekarang) )?(tanggal berapa|tgl berapa|hari apa)( (hari ini|sekarang))?$/,
    reply: ({ now }) => `Hari ini **${dateOf(now)}**. 📅` },
  { id: 'help', state: 'point', whole: /^((kamu|anda|denti) )?(bisa (bantu )?apa( saja| aja)?|bisa ngapain( aja)?|apa (saja |aja )?(yang )?(bisa|dapat) (kamu|anda) (bantu|lakukan)|help|bantuan|tolong|apa (saja |aja )?fitur(mu| kamu| anda)?)$/,
    reply: () => CAPABILITIES },

  // ── Obrolan ringan
  { id: 'thanks', state: 'love', re: /\b(terima ?kasih|terimakasih|trimakasih|makasih|makasi|mksh|maksih|trims|thanks|thank you|thx|tq|ty|tengkyu|nuhun|matur nuwun|suwun)\b/,
    reply: ({ sapa }) => [`Sama-sama${sapa}! Senang bisa membantu. 😊`, `Dengan senang hati${sapa}! 🦷`, `Sama-sama${sapa}, kapan saja saya siap.`] },
  { id: 'complaint', state: 'sorry', re: /\b(salah|keliru|ngaco|ngawur|tidak (tepat|benar|akurat)|nggak (tepat|bener)|gak (tepat|bener)|(tidak|nggak|gak|kurang) (bagus|pintar|membantu|jelas|nyambung)|bukan itu|bodoh|goblok|bego|lemot|payah|jelek)\b/,
    reply: ({ afterAnswer }) => (afterAnswer
      ? 'Maaf ya! 🙏 Tekan **👎 Kurang tepat** di bawah jawaban tadi dan tulis bagian yang salah — saya akan menjawab ulang dengan lebih teliti.'
      : 'Maaf kalau ada yang kurang pas. 🙏 Coba ceritakan apa yang ingin dicek, saya bantu sebaik mungkin.') },
  { id: 'praise', state: 'shy', re: /\b(pintar|pinter|hebat|keren|mantap|mantul|bagus|luar biasa|good job|cakep|jago|top|the best|terbaik|amazing|nice)\b/,
    reply: () => ['Aduh, jadi malu… Terima kasih! ☺️', 'Ah, bisa saja. Terima kasih, saya jadi makin semangat belajar! ☺️', 'Hehe, terima kasih! Semua berkat data klinik Anda yang rapi. ☺️'] },
  { id: 'love', state: 'love', re: /\b(sayang (kamu|denti)|love you|i love|lucu banget|gemes|gemas|imut)\b/,
    reply: () => ['Aww, terima kasih! 💙', 'Denti juga senang bekerja bersama Anda! 💙'] },
  { id: 'who', state: 'wave', re: /(siapa (kamu|anda|namamu)|kamu siapa|anda siapa|nama (kamu|mu|anda)|kenalan)/,
    reply: () => 'Saya **Denti** 🦷, asisten AI Dentiva. Saya membaca angka ringkasan klinik — pendapatan, jadwal, stok, recall — lalu menjelaskannya dengan bahasa sehari-hari. Data identitas dan rekam medis pasien tidak pernah saya lihat.' },
  { id: 'maker', state: 'wave', re: /(siapa (yang )?(membuat|bikin|buat|menciptakan) (kamu|anda|mu)|kamu (dibuat|buatan) (siapa|oleh)|pembuat(mu| kamu))/,
    reply: () => 'Saya dibuat oleh tim **Dentiva** khusus untuk membantu klinik gigi. Otak saya memakai model AI, tetapi yang saya baca hanya angka ringkasan klinik Anda. 🦷' },
  { id: 'joke', state: 'laugh', re: /\b(lelucon|jokes?|lawak|lawakan|bercanda|candaan|lucu lucuan|hibur)\b/,
    reply: ({ seed }) => pick(JOKES, seed) },
  { id: 'laugh', state: 'laugh', re: /^(ha ?ha|haha\w*|hehe\w*|hihi\w*|wkwk\w*|xixi\w*|lol|lucu)$/,
    reply: () => ['Hehe 😄', 'Hihi, senang Anda terhibur! 😄'] },
  { id: 'dance', state: 'dance', re: /\b(joget|menari|nari|dansa|nyanyi|goyang)\b/,
    reply: () => ['Siap! Sedikit gerakan biar semangat kerja hari ini. 🎵', 'Musik, mulai! 🎶'] },
  { id: 'tired', state: 'love', re: /\b(capek|cape|capai|lelah|pusing|stres|stress|ngantuk|sibuk banget|penat|bosan|bete)\b/,
    reply: () => ['Semangat! 💙 Jangan lupa minum air dan istirahat sebentar. Mau saya ringkas kondisi klinik hari ini supaya pekerjaan terasa lebih ringan?', 'Pelan-pelan saja, ya. 💙 Kalau perlu, saya bisa merangkum hal terpenting hari ini dalam satu pesan.'] },
  { id: 'cheer', state: 'celebrate', re: /\b(semangat|yeay|yey|hore|horee|asik|asyik|berhasil|alhamdulillah)\b/,
    reply: () => ['Semangat juga! 🎉', 'Hore! 🎉 Ikut senang!'] },
  { id: 'bye', state: 'thanks', re: /\b(dadah|sampai jumpa|bye|selamat tinggal|pamit|selamat istirahat|see you)\b/,
    reply: ({ sapa }) => [`Sampai jumpa${sapa}! Semoga klinik lancar hari ini. 👋`, `Sampai nanti${sapa}! 👋`] },
  { id: 'how', state: 'happy', re: /^(apa kabar|gimana kabar(nya|mu)?|kabar(mu| kamu)?( gimana| bagaimana)?|how are you)$/,
    reply: ({ sapa }) => `Kabar baik, siap membantu${sapa}! 😊 Ada yang ingin dicek hari ini?` },
  { id: 'ack', state: 'happy', re: /^(ok|oke|okay|okey|okee|sip|siap|baik|baiklah|noted|mengerti|paham|ngerti|iya|ya|yup|betul|benar|setuju|lanjut)$/,
    reply: () => ['Siap! Kalau ada yang ingin dicek lagi, tinggal tanya. 👍', 'Oke! 👍'] },
  { id: 'greet', state: 'wave', re: /^(halo|hallo|helo|hai|hay|hi|hey|hello|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|assalamu ?alaikum|assalamualaikum|permisi|p|ping|tes|test|testing)\b/,
    reply: ({ sapa, greeting }) => [`${greeting}${sapa}! Saya Denti. Mau cek apa hari ini — pendapatan, jadwal dokter, atau stok bahan?`, `${greeting}${sapa}! Ada yang bisa saya bantu?`] },
];

/**
 * Obrolan ringan → { intent, state, reply } (null bila bukan obrolan ringan → kirim ke AI).
 * ctx: { name, greeting, seed, now, afterAnswer } — afterAnswer = sudah ada jawaban AI sebelumnya.
 */
export function smallTalk(text, { name = '', greeting = 'Halo', seed = 0, now = new Date(), afterAnswer = false } = {}) {
  const t = normalizeChat(text);
  if (!t || t.length > 70) return null;
  const ctx = { name, greeting, seed, now, afterAnswer, sapa: name ? `, ${name}` : '' };
  const answer = (it) => {
    const r = it.reply(ctx);
    return { intent: it.id, state: it.state, reply: Array.isArray(r) ? pick(r, seed) : r };
  };

  const whole = INTENTS.find((it) => it.whole && it.whole.test(t));
  if (whole) return answer(whole);
  if (anyWord(t, DATA_WORDS)) return null;
  const hit = INTENTS.find((it) => it.re && it.re.test(t));
  return hit ? answer(hit) : null;
}

const TOPICS = [
  [['pendapatan', 'omzet', 'pemasukan', 'revenue'], 'data pendapatan'],
  [['pengeluaran', 'biaya', 'belanja'], 'data pengeluaran'],
  [['laba', 'untung', 'margin', 'hpp', 'menguntungkan'], 'margin tindakan'],
  [['bep', 'impas'], 'titik impas'],
  [['arus kas', 'proyeksi', 'cashflow'], 'arus kas'],
  [['harga', 'simulasi'], 'simulasi harga'],
  [['stok', 'bahan', 'kadaluarsa', 'kedaluwarsa'], 'stok bahan'],
  [['recall', 'kontrol ulang'], 'daftar recall'],
  [['belum dibayar', 'tagihan', 'piutang', 'tunggakan'], 'tagihan'],
  [['dokter', 'jadwal'], 'jadwal & kinerja dokter'],
  [['pasien', 'kunjungan'], 'data kunjungan'],
  [['cara', 'bagaimana', 'menu', 'fitur', 'mengaktifkan', 'membuat'], 'panduan Dentiva'],
  [['hari ini', 'ringkas', 'kondisi'], 'kondisi klinik hari ini'],
];

/** Topik pertanyaan untuk teks "Menganalisis …". */
export function topicOf(question) {
  const t = norm(question);
  const hit = TOPICS.find(([words]) => any(t, words));
  return hit ? hit[1] : 'data klinik';
}

const ALERT = ['menipis', 'habis', 'kadaluarsa', 'kedaluwarsa', 'belum dibayar', 'tunggakan', 'defisit', 'rugi', 'turun', 'menurun', 'anjlok', 'terlambat', 'perlu perhatian', 'waspada'];
const STRONG = ['kadaluarsa', 'kedaluwarsa', 'defisit', 'rugi', 'anjlok'];
const GOOD = ['naik', 'meningkat', 'tertinggi', 'untung', 'surplus', 'bertumbuh', 'tumbuh', 'rekor', 'melampaui', 'lebih tinggi', 'aman', 'lunas'];
const GUIDE = ['langkah', 'buka menu', 'klik', 'pilih menu', 'pengaturan →', 'tekan tombol'];
/** Penyangkal sebelum kata peringatan: "tidak ada bahan yang kadaluarsa" bukan peringatan. */
const NEGATION = /(?:^|\s)(tidak ada|tak ada|belum ada|tidak ditemukan|tanpa|bebas|nihil|tidak|bukan|nol|0)\s+(\S+\s+){0,3}$/;

/** Hitung kata yang muncul, abaikan yang didahului penyangkal (dalam 4 kata sebelumnya). */
function countMeant(t, words) {
  let n = 0;
  for (const w of words) {
    let i = t.indexOf(w);
    while (i !== -1) {
      const before = t.slice(Math.max(0, i - 40), i);
      if (!NEGATION.test(before)) { n += 1; break; }
      i = t.indexOf(w, i + w.length);
    }
  }
  return n;
}
const anyMeant = (t, words) => countMeant(t, words) > 0;

/** Ekspresi Denti + kalimat singkatnya setelah jawaban AI diterima. */
export function moodForAnswer(answer, { error = false } = {}) {
  if (error) return { state: 'sorry', line: 'Maaf, ada kendala. Coba sebentar lagi, ya.' };
  const t = norm(answer);
  const bad = countMeant(t, ALERT);
  const good = countMeant(t, GOOD);
  if (bad > good && anyMeant(t, STRONG)) return { state: 'surprise', line: 'Ada yang perlu segera diperhatikan!' };
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
