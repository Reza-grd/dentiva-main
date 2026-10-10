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
// Kata data boleh berakhiran -nya/-an/-kan/-mu ("pendapatannya", "laporanmu"), tetapi tidak menyambung ke kata lain.
const anyWord = (t, words) => words.some((w) => new RegExp(`(^|[^a-z])${escape(w)}(nya|an|kan|mu|ku)?($|[^a-z])`).test(t));
const pick = (list, seed) => list[Math.abs(seed) % list.length];

/** Kamus singkatan & salah ketik umum → bentuk baku (per kata). */
const SLANG = {
  brp: 'berapa', brapa: 'berapa', berapah: 'berapa', skrg: 'sekarang', skg: 'sekarang', skrang: 'sekarang', skr: 'sekarang',
  tgl: 'tanggal', hr: 'hari', bln: 'bulan', mgg: 'minggu', thn: 'tahun', yg: 'yang', dgn: 'dengan', utk: 'untuk',
  bhn: 'bahan', psn: 'pasien', pndptn: 'pendapatan', blm: 'belum', sdh: 'sudah', udh: 'sudah', udah: 'sudah', tdk: 'tidak',
  gak: 'tidak', ga: 'tidak', nggak: 'tidak', engga: 'tidak', enggak: 'tidak', gk: 'tidak', tak: 'tidak',
  mkasih: 'makasih', makasi: 'makasih', maksih: 'makasih', mksh: 'makasih', mks: 'makasih', trmksh: 'makasih', trmkasih: 'makasih',
  terimakasi: 'terimakasih', trimakasih: 'terimakasih', trima: 'terima', tysm: 'thanks', tks: 'thanks', thank: 'thanks',
  mantab: 'mantap', mantep: 'mantap', mantaap: 'mantap', bgus: 'bagus', bgs: 'bagus',
  hlo: 'halo', hallo: 'halo', helo: 'halo', slmt: 'selamat', met: 'selamat', pgi: 'pagi', mlm: 'malam', siank: 'siang',
  okk: 'ok', oce: 'ok', okeh: 'oke', okey: 'oke', okay: 'oke', y: 'ya', yoi: 'ya', yup: 'ya', iy: 'iya', siaap: 'siap',
};

/** Pesan yang isinya hanya emoji/tanda tanya → kalimat yang setara maknanya. */
const EMOJI = [
  [/[👍👌✅]/u, 'ok'], [/🙏/u, 'terima kasih'], [/[😂🤣😆😹]/u, 'haha'], [/[❤😍🥰💙💖💕😘]/u, 'sayang kamu'],
  [/👋/u, 'halo'], [/[🎉🥳💪🔥]/u, 'hore'], [/[😩😫😓]/u, 'capek'], [/😴/u, 'ngantuk'], [/[👎😡😠]/u, 'salah'],
  [/🤔/u, 'bingung'],
];
function emojiOnly(text) {
  const raw = (text || '').trim();
  if (!raw || raw.replace(/[\p{Extended_Pictographic}️‍\s?!.]/gu, '') !== '') return null;
  const hit = EMOJI.find(([re]) => re.test(raw));
  if (hit) return hit[1];
  return /\?/.test(raw) ? 'bingung' : null;
}

/**
 * Rapikan kalimat obrolan: huruf kecil, tanpa tanda baca/emoji, huruf berulang dipendekkan
 * ("makasihhh" → "makasih"), sapaan ke Denti & partikel penutup dibuang ("halo denti dong ya" → "halo").
 */
export function normalizeChat(text) {
  let t = norm(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  // huruf ganda di akhir kata ("kerenn", "sipp", "okk"); vokal ganda di tengah ("maaf") dibiarkan
  t = t.replace(/([b-df-hj-kmnp-tv-z])\1+(?=\s|$)/g, '$1'); // tanpa "l" (well, all, still)
  t = t.split(' ').map((w) => SLANG[w] || w).join(' ');
  t = t.replace(/\b(denti|kak|kakak|min|mimin|bot)\b/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i += 1) t = t.replace(/\s(ya|yah|yaa|ya|dong|deh|nih|sih|kok|lho|loh|banget|bgt|sekali|nya)$/, '').trim();
  return t;
}

/** Kata yang menandakan pertanyaan data/panduan — jangan dijawab sebagai obrolan ringan. */
const DATA_WORDS = [
  'berapa', 'pendapatan', 'omzet', 'omset', 'pemasukan', 'pengeluaran', 'biaya', 'laba', 'untung', 'rugi', 'margin', 'hpp',
  'stok', 'bahan', 'dokter', 'jadwal', 'pasien', 'kunjungan', 'recall', 'bayar', 'pembayaran', 'tagihan', 'harga', 'diskon',
  'promo', 'transaksi', 'nota', 'kwitansi', 'invoice', 'input', 'koreksi', 'target', 'staf', 'karyawan', 'kursi', 'grafik',
  'bep', 'impas', 'kas', 'laporan', 'bulan', 'minggu', 'cara', 'bagaimana', 'menu', 'fitur',
  'tindakan', 'obat', 'resep', 'antrean', 'booking', 'ringkas', 'cek', 'tampilkan', 'hitung', 'proyeksi',
  // bahasa Inggris
  'revenue', 'income', 'expense', 'expenses', 'profit', 'stock', 'schedule', 'report', 'show', 'patient', 'patients', 'chart',
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
  'Contoh pertanyaan: *"Berapa pendapatan bulan ini?"*, *"Bahan apa yang hampir kadaluarsa?"*, *"Ringkas kondisi klinik hari ini."*',
].join('\n');

/** Sapaan mengikuti waktu yang diucapkan pengguna ("good morning" → "Selamat pagi"). */
const greetingFrom = (t) => (/(pagi|morning)/.test(t) ? 'Selamat pagi' : /(siang|afternoon)/.test(t) ? 'Selamat siang'
  : /sore/.test(t) ? 'Selamat sore' : /(malam|evening)/.test(t) ? 'Selamat malam' : '');

const timeOf = (now) => now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
const dateOf = (now) => now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Daftar intent obrolan. `whole` = harus seluruh kalimat (dicek sebelum saringan kata data),
 * `re` = cukup memuat pola. Urutan menentukan prioritas.
 */
const INTENTS = [
  // ── Dijawab dari jam perangkat (sebelum saringan kata data karena memuat "berapa"/"hari ini")
  { id: 'time', state: 'talk', whole: /^((sekarang|sudah) )?(jam|pukul) berapa( ya)?( sekarang)?$|^what time is it( now)?$/,
    reply: ({ now }) => `Sekarang pukul **${timeOf(now)}**. ⏰` },
  { id: 'date', state: 'talk', whole: /^((hari ini|sekarang) )?(tanggal berapa|hari apa|bulan apa|tahun berapa)( ya)?( (hari ini|sekarang))?$|^tanggal (hari ini|sekarang)$|^what (day|date) is it( today)?$/,
    reply: ({ t, now }) => (/bulan/.test(t) ? `Sekarang bulan **${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}**. 📅`
      : /tahun/.test(t) ? `Sekarang tahun **${now.getFullYear()}**. 📅` : `Hari ini **${dateOf(now)}**. 📅`) },
  { id: 'wake', state: 'wake', whole: /^(bangun|wake up|ada orang|halo ada orang|hai ada orang|kamu tidur|lagi tidur|masih (di sana|hidup|bangun))$/,
    reply: ({ sapa }) => [`Saya sudah bangun${sapa}! ☀️ Ada yang bisa saya bantu?`, `Hoaam… sudah bangun! ☀️ Siap membantu${sapa}.`] },
  { id: 'help', state: 'point', whole: /^((kamu|anda) )?(bisa (bantu )?apa( saja| aja)?|bisa ngapain( aja)?|apa (saja |aja )?(yang )?(bisa|dapat) (kamu|anda) (bantu|lakukan)|help|bantuan|tolong|apa (saja |aja )?fitur(mu| kamu| anda)?|fitur apa (saja |aja )?(yang )?(kamu|anda) (punya|miliki)|((gimana|bagaimana) )?cara (pakai|memakai|menggunakan|pake)( kamu| anda)?|what can you do|contoh pertanyaan(nya)?|(aku|saya) (harus|bisa) tanya apa( saja| aja)?|mulai dari mana)$/,
    reply: () => CAPABILITIES },
  { id: 'confused', state: 'think', whole: /^(maksudnya( (gimana|bagaimana|apa))?|maksud(mu| kamu| anda)|apa maksud(mu|nya| kamu| anda)?|hah|ha|huh|hm+|eh|tidak (ngerti|mengerti|paham)|kurang (paham|jelas|ngerti)|bingung|aku bingung|saya bingung|jelasin lagi|jelaskan lagi|ulangi|ulang|coba lagi)$/,
    reply: ({ afterAnswer }) => (afterAnswer
      ? 'Maaf kalau kurang jelas. 🙏 Bagian mana yang ingin saya jelaskan ulang? Anda juga bisa tekan **👎 Kurang tepat** di bawah jawaban tadi agar saya menjawab ulang lebih sederhana.'
      : 'Tidak apa-apa! 😊 Coba tanyakan dengan kalimat sehari-hari, misalnya *"Berapa pendapatan bulan ini?"* — atau ketik *"kamu bisa apa"* untuk melihat contoh.') },

  // ── Obrolan ringan
  { id: 'greet', state: 'wave', re: /^(assalamu ?alaikum|assalamualaikum|salamualaikum|ass wr wb|waalaikum ?salam|wassalamu ?alaikum|om swastiastu|sampurasun|punten|horas|shalom|salam sejahtera|namo buddhaya|salam kebajikan)\b/,
    reply: ({ t, sapa }) => {
      if (/^wassalam/.test(t)) return `Wa'alaikumussalam${sapa}, sampai jumpa! 🙏`;
      if (/^(assalam|salamu|ass wr)/.test(t)) return `Wa'alaikumussalam warahmatullahi wabarakatuh${sapa}! 🙏 Ada yang bisa saya bantu hari ini?`;
      if (/^waalaikum/.test(t)) return `Semoga hari Anda berkah${sapa}! Ada yang bisa saya bantu?`;
      if (/^om swastiastu/.test(t)) return `Om Swastiastu${sapa}! 🙏 Ada yang bisa saya bantu?`;
      if (/^sampurasun/.test(t)) return `Rampes${sapa}! 😊 Ada yang bisa saya bantu?`;
      if (/^punten/.test(t)) return `Mangga${sapa}! 😊 Ada yang bisa saya bantu?`;
      if (/^horas/.test(t)) return `Horas${sapa}! 😊 Ada yang bisa saya bantu?`;
      if (/^namo/.test(t)) return `Namo Buddhaya${sapa}! 🙏 Ada yang bisa saya bantu?`;
      if (/^salam kebajikan/.test(t)) return `Salam kebajikan${sapa}! 🙏 Ada yang bisa saya bantu?`;
      return `Shalom, salam sejahtera${sapa}! 🙏 Ada yang bisa saya bantu?`;
    } },
  { id: 'bye', state: 'thanks', re: /\b(dadah|(dah|sudah|sudahan|udahan) dulu|sampai (jumpa|besok|nanti|ketemu)|bye|goodbye|good night|selamat (tinggal|tidur|istirahat)|pamit|see you)\b/,
    reply: ({ t, sapa }) => (/(night|tidur|istirahat)/.test(t) ? `Selamat istirahat${sapa}! 🌙 Sampai jumpa besok.` : [`Sampai jumpa${sapa}! Semoga klinik lancar hari ini. 👋`, `Sampai nanti${sapa}! 👋`]) },
  { id: 'thanks', state: 'love', re: /\b(terima ?kasih|terimakasih|trimakasih|makasih|makasi|mksh|maksih|trims|thanks|thank you|thx|tq|ty|tengkyu|nuhun|hatur nuhun|matur ?nuwun|suwun|kamsia|xie ?xie|arigato|gracias|merci|danke)\b/,
    reply: ({ sapa }) => [`Sama-sama${sapa}! Senang bisa membantu. 😊`, `Dengan senang hati${sapa}! 🦷`, `Sama-sama${sapa}, kapan saja saya siap.`] },
  { id: 'apologize', state: 'happy', re: /^(maaf|mohon maaf|maafkan( aku| saya)?|sorry|sori|sory|maap)\b/,
    reply: ({ sapa }) => [`Tidak apa-apa${sapa}! 😊 Silakan lanjut.`, `Tidak apa-apa, santai saja${sapa}. 😊`] },
  { id: 'complaint', state: 'sorry', re: /\b(salah|keliru|ngaco|ngawur|tidak (tepat|benar|bener|akurat)|nggak (tepat|bener)|gak (tepat|bener)|(tidak|nggak|gak|kurang) (bagus|pintar|membantu|jelas|nyambung)|bukan itu|bodoh|goblok|bego|lemot|payah|jelek)\b/,
    reply: ({ afterAnswer }) => (afterAnswer
      ? 'Maaf ya! 🙏 Tekan **👎 Kurang tepat** di bawah jawaban tadi dan tulis bagian yang salah — saya akan menjawab ulang dengan lebih teliti.'
      : 'Maaf kalau ada yang kurang pas. 🙏 Coba ceritakan apa yang ingin dicek, saya bantu sebaik mungkin.') },
  { id: 'praise', state: 'shy', re: /\b(pintar|pinter|hebat|keren|mantap|mantul|bagus|luar biasa|good job|cakep|jago|top|the best|terbaik|amazing|nice|awesome|great|perfect|well done|brilliant|smart|jos|gokil|markotop|joss|keren abis)\b/,
    reply: () => ['Aduh, jadi malu… Terima kasih! ☺️', 'Ah, bisa saja. Terima kasih, saya jadi makin semangat belajar! ☺️', 'Hehe, terima kasih! Semua berkat data klinik Anda yang rapi. ☺️'] },
  { id: 'love', state: 'love', re: /\b(sayang (kamu|denti)|love you|i love|lucu banget|gemes|gemas|imut)\b/,
    reply: () => ['Aww, terima kasih! 💙', 'Denti juga senang bekerja bersama Anda! 💙'] },
  { id: 'who', state: 'wave', re: /(siapa (kamu|anda|namamu)|kamu siapa|anda siapa|nama (kamu|mu|anda)|kenalan|^(kamu|anda) (ini )?(apa|makhluk apa)$|^itu siapa$)/,
    reply: () => 'Saya **Denti** 🦷, asisten AI Dentiva. Saya membaca angka ringkasan klinik — pendapatan, jadwal, stok, recall — lalu menjelaskannya dengan bahasa sehari-hari. Data identitas dan rekam medis pasien tidak pernah saya lihat.' },
  { id: 'maker', state: 'wave', re: /(siapa (yang )?(membuat|bikin|buat|menciptakan) (kamu|anda|mu)|kamu (dibuat|buatan) (siapa|oleh)|pembuat(mu| kamu))/,
    reply: () => 'Saya dibuat oleh tim **Dentiva** khusus untuk membantu klinik gigi. Otak saya memakai model AI, tetapi yang saya baca hanya angka ringkasan klinik Anda. 🦷' },
  { id: 'joke', state: 'laugh', re: /\b(lelucon|jokes?|lawak|lawakan|bercanda|candaan|lucu lucuan|hibur|hiburan|terhibur|tebak tebakan)\b/,
    reply: ({ seed }) => pick(JOKES, seed) },
  { id: 'laugh', state: 'laugh', re: /^((ha ?ha|haha\w*|hehe\w*|hihi\w*|wkwk\w*|xixi\w*|lol|lucu|ngakak)( |$))+$/,
    reply: () => ['Hehe 😄', 'Hihi, senang Anda terhibur! 😄'] },
  { id: 'dance', state: 'dance', re: /\b(joget|menari|nari|dansa|nyanyi|goyang)\b/,
    reply: () => ['Siap! Sedikit gerakan biar semangat kerja hari ini. 🎵', 'Musik, mulai! 🎶'] },
  { id: 'tired', state: 'love', re: /\b(capek|cape|capai|lelah|melelahkan|kelelahan|pusing|stres|stress|ngantuk|sibuk banget|penat|bosan|bete|letih)\b/,
    reply: () => ['Semangat! 💙 Jangan lupa minum air dan istirahat sebentar. Mau saya ringkas kondisi klinik hari ini supaya pekerjaan terasa lebih ringan?', 'Pelan-pelan saja, ya. 💙 Kalau perlu, saya bisa merangkum hal terpenting hari ini dalam satu pesan.'] },
  { id: 'greet', state: 'wave', re: /^(halo|hallo|helo|hai|hay|hi|hey|hello|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|good (morning|afternoon|evening|day)|morning|permisi|p|ping|tes|test|testing)\b/,
    reply: ({ t, sapa, greeting }) => { const g = greetingFrom(t) || greeting; return [`${g}${sapa}! Saya Denti. Mau cek apa hari ini — pendapatan, jadwal dokter, atau stok bahan?`, `${g}${sapa}! Ada yang bisa saya bantu?`]; } },
  { id: 'cheer', state: 'celebrate', re: /\b(semangat|yeay|yey|hore|horee|asik|asyik|berhasil|alhamdulillah)\b/,
    reply: () => ['Semangat juga! 🎉', 'Hore! 🎉 Ikut senang!'] },
  { id: 'how', state: 'happy', re: /^(apa kabar(mu|nya)?|gimana kabar(nya|mu)?|kabar(mu| kamu)?( gimana| bagaimana)?|how are you|kumaha (damang|kabar)|piye kabare?|baik baik saja|sehat)$/,
    reply: ({ sapa }) => `Kabar baik, siap membantu${sapa}! 😊 Ada yang ingin dicek hari ini?` },
  { id: 'ack', state: 'happy', re: /^((ok|oke|okee|sip|siap|baik|baiklah|noted|mengerti|paham|ngerti|iya|ya|betul|benar|setuju|lanjut|alright|yes|yap|got it|understood|roger)( |$))+$/,
    reply: () => ['Siap! Kalau ada yang ingin dicek lagi, tinggal tanya. 👍', 'Oke! 👍'] },
];

/**
 * Obrolan ringan → { intent, state, reply } (null bila bukan obrolan ringan → kirim ke AI).
 * ctx: { name, greeting, seed, now, afterAnswer, lastIntent } — afterAnswer = sudah ada jawaban AI sebelumnya;
 * lastIntent = intent obrolan terakhir (untuk "lagi" / "yang lain").
 */
/** Intent terakhir yang bisa diminta "lagi" → intent yang diulang. */
const REPEATABLE = { joke: 'joke', laugh: 'joke', dance: 'dance' };
const AGAIN = /^(lagi|satu lagi|sekali lagi|yang lain|lainnya|another( one)?|more|terus|lanjutkan)$/;

export function smallTalk(text, { name = '', greeting = 'Halo', seed = 0, now = new Date(), afterAnswer = false, lastIntent = null } = {}) {
  const t = emojiOnly(text) || normalizeChat(text);
  if (!t || t.length > 70) return null;
  const ctx = { t, name, greeting, seed, now, afterAnswer, sapa: name ? `, ${name}` : '' };
  const answer = (it, sd = seed) => {
    const r = it.reply({ ...ctx, seed: sd });
    return { intent: it.id, state: it.state, reply: Array.isArray(r) ? pick(r, sd) : r };
  };

  if (AGAIN.test(t) && REPEATABLE[lastIntent]) {
    const again = INTENTS.find((it) => it.id === REPEATABLE[lastIntent]);
    return answer(again, seed + 1);
  }
  const whole = INTENTS.find((it) => it.whole && it.whole.test(t));
  if (whole) return answer(whole);
  if (anyWord(t, DATA_WORDS)) return null;
  const hit = INTENTS.find((it) => it.re && it.re.test(t));
  return hit ? answer(hit) : null;
}

// Urutan = prioritas: yang lebih spesifik di atas.
const TOPICS = [
  [['cara ', 'mengaktifkan', 'menu ', 'fitur', 'pengaturan', 'tautan'], 'panduan Dentiva'],
  [['belum dibayar', 'belum bayar', 'tagihan', 'piutang', 'tunggakan', 'pembayaran', 'tertunda'], 'tagihan'],
  [['booking', 'reservasi', 'janji temu'], 'booking online'],
  [['laba', 'untung', 'margin', 'hpp', 'profit'], 'margin tindakan'],
  [['bep', 'impas', 'break even'], 'titik impas'],
  [['arus kas', 'proyeksi', 'cashflow', 'cash flow'], 'arus kas'],
  [['harga', 'simulasi', 'tarif'], 'simulasi harga'],
  [['pendapatan', 'omzet', 'omset', 'pemasukan', 'revenue', 'income'], 'data pendapatan'],
  [['pengeluaran', 'biaya', 'belanja', 'expense'], 'data pengeluaran'],
  [['stok', 'stock', 'bahan', 'kadaluarsa', 'kedaluwarsa'], 'stok bahan'],
  [['staf', 'karyawan', 'resepsionis', 'pengguna', 'user'], 'staf & pengguna'],
  [['obat', 'resep'], 'obat & resep'],
  [['recall', 'kontrol ulang'], 'daftar recall'],
  [['antrean', 'antrian'], 'antrean'],
  [['promo', 'diskon', 'potongan'], 'promo & diskon'],
  [['dokter', 'jadwal', 'doctor'], 'jadwal & kinerja dokter'],
  [['pasien', 'kunjungan', 'patient'], 'data kunjungan'],
  [['hari ini', 'ringkas', 'kondisi'], 'kondisi klinik hari ini'],
];

/** Topik pertanyaan untuk teks "Menganalisis …". */
export function topicOf(question) {
  const t = norm(question);
  const hit = TOPICS.find(([words]) => any(t, words));
  return hit ? hit[1] : 'data klinik';
}

const ALERT = ['menipis', 'habis', 'kadaluarsa', 'kedaluwarsa', 'belum dibayar', 'tunggakan', 'defisit', 'rugi', 'turun', 'menurun',
  'anjlok', 'terlambat', 'perlu perhatian', 'waspada', 'penurunan', 'stagnan', 'berkurang', 'di bawah target', 'minus', 'negatif',
  'belum tersedia', 'tidak tersedia', 'belum ada data', 'tidak ada data', 'melonjak', '⟨costup⟩'];
const STRONG = ['kadaluarsa', 'kedaluwarsa', 'defisit', 'rugi', 'anjlok', 'minus', 'negatif'];
const GOOD = ['naik', 'meningkat', 'tertinggi', 'untung', 'surplus', 'bertumbuh', 'tumbuh', 'rekor', 'melampaui', 'lebih tinggi', 'aman',
  'lunas', 'kenaikan', 'bertambah', 'di atas target', 'membaik', '⟨costdown⟩'];
/** Untuk biaya/pengeluaran, arah dibalik: "biaya naik" = buruk, "pengeluaran turun" = baik. */
const COST_UP = /\b(biaya|pengeluaran|beban|ongkos|expense)((?:\s+\S+){0,3}?)\s+(naik|meningkat|bertambah|melonjak)/g;
const COST_DOWN = /\b(biaya|pengeluaran|beban|ongkos|expense)((?:\s+\S+){0,3}?)\s+(turun|menurun|berkurang)/g;
const GUIDE = ['langkah', 'buka menu', 'klik', 'pilih menu', 'pengaturan →', 'tekan tombol'];
/** Penyangkal sebelum kata peringatan: "tidak ada bahan yang kadaluarsa" bukan peringatan. */
const NEGATION = /(?:^|\s)(tidak ada|tak ada|belum ada|tidak ditemukan|tanpa|bebas|nihil|tidak|bukan|nol|0)\s+(\S+\s+){0,3}$/;

/** Hitung kata yang muncul, abaikan yang didahului penyangkal (dalam 4 kata sebelumnya). */
function countMeant(t, words) {
  let n = 0;
  for (const w of words) {
    let i = t.indexOf(w);
    while (i !== -1) {
      const ws = t.lastIndexOf(' ', i) + 1;
      const before = t.slice(Math.max(0, ws - 40), ws);
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
  const t = norm(answer).replace(COST_UP, '$1$2 ⟨costup⟩').replace(COST_DOWN, '$1$2 ⟨costdown⟩');
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
