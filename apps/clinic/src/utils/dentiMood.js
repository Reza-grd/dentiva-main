// ─────────────────────────────────────────────
//  "Otak" Denti di Asisten AI — aturan reaksi yang berjalan di aplikasi
//  (tanpa panggilan AI tambahan, tanpa kuota): obrolan ringan dijawab langsung,
//  topik yang dianalisis ditebak dari pertanyaan, dan ekspresi mengikuti isi jawaban.
//  Kalimat latihan & hasil yang diharapkan: src/test/dentiTraining.test.js.
// ─────────────────────────────────────────────

import {
  calculate, dateCalc, extractName, isClearCommand, timeOf, dateOf,
  pctChange, marginCalc, bepCalc, installment, terbilang, dateDiff, themeCommand, isSpeakCommand,
} from './dentiSkills.js';
import * as L from './dentiLines.js';
import { guideReply, PAGES, TUTORIALS, GUIDE_WORDS } from './dentiGuide.js';
import { funReply, FUN_WORDS } from './dentiFun.js';
import { glossaryReply, GLOSSARY_WORDS } from './dentiGlossary.js';

const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const any = (t, words) => words.some((w) => t.includes(w));
const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Cocok per kata utuh ("kas" tidak cocok dengan "terima kasih"). */
// Kata data boleh berakhiran -nya/-an/-kan/-mu ("pendapatannya", "laporanmu"), tetapi tidak menyambung ke kata lain.
const anyWord = (t, words) => words.some((w) => new RegExp(`(^|[^a-z])${escape(w)}(nya|an|kan|mu|ku)?($|[^a-z])`).test(t));
const pick = (list, seed) => list[Math.abs(seed) % list.length];
/** Pilih variasi yang belum dipakai baru-baru ini (agar Denti tidak mengulang kalimat yang sama). */
const pickFresh = (list, seed, recent = []) => {
  for (let k = 0; k < list.length; k += 1) {
    const cand = list[(Math.abs(seed) + k) % list.length];
    if (!recent.includes(cand)) return cand;
  }
  return pick(list, seed);
};

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
  sampe: 'sampai', smpai: 'sampai', sampek: 'sampai', gimana: 'gimana', gmn: 'gimana', bgmn: 'bagaimana',
  okk: 'ok', oce: 'ok', okeh: 'oke', okey: 'oke', okay: 'oke', y: 'ya', yoi: 'ya', yup: 'ya', iy: 'iya', siaap: 'siap',
};

/** Kata yang menandakan pertanyaan data/panduan — jangan dijawab sebagai obrolan ringan. */
const DATA_WORDS = [
  'berapa', 'pendapatan', 'omzet', 'omset', 'pemasukan', 'pengeluaran', 'biaya', 'laba', 'untung', 'rugi', 'margin', 'hpp',
  'stok', 'bahan', 'dokter', 'jadwal', 'pasien', 'kunjungan', 'recall', 'bayar', 'pembayaran', 'tagihan', 'harga', 'diskon',
  'promo', 'transaksi', 'nota', 'kwitansi', 'invoice', 'input', 'koreksi', 'target', 'staf', 'karyawan', 'kursi', 'grafik',
  'bep', 'impas', 'kas', 'laporan', 'bulan', 'minggu', 'cara', 'bagaimana', 'menu', 'fitur',
  'tindakan', 'obat', 'resep', 'antrean', 'booking', 'ringkas', 'cek', 'tampilkan', 'hitung', 'proyeksi', 'promosi',
  // bahasa Inggris
  'revenue', 'income', 'expense', 'expenses', 'profit', 'stock', 'schedule', 'report', 'show', 'patient', 'patients', 'chart',
];

/** Kosakata yang dikenali Denti — dipakai untuk mengoreksi salah ketik (jarak edit kecil). */
const VOCAB = [
  'terima', 'kasih', 'terimakasih', 'makasih', 'thanks', 'semangat', 'pintar', 'hebat', 'keren', 'mantap', 'bagus', 'biasa',
  'selamat', 'pagi', 'siang', 'sore', 'malam', 'halo', 'assalamualaikum', 'waalaikumsalam', 'bercanda', 'lelucon', 'capek',
  'lelah', 'pusing', 'ngantuk', 'bingung', 'maksudnya', 'sampai', 'jumpa', 'dadah', 'kabar', 'joget', 'menari', 'tolong',
  'bantuan', 'sayang', 'lucu', 'hore', 'alhamdulillah', 'paham', 'mengerti', 'sekarang', 'tanggal', 'berapa',
];
/** Kata umum yang TIDAK boleh dikoreksi (agar "lagi" tidak menjadi "pagi", "bagi" tidak menjadi "pagi", dst.). */
const KNOWN = new Set([
  'kamu', 'anda', 'aku', 'saya', 'kami', 'kita', 'dia', 'mereka', 'yang', 'ini', 'itu', 'apa', 'ada', 'untuk', 'dengan', 'dari',
  'pada', 'dalam', 'atau', 'dan', 'tapi', 'tetapi', 'juga', 'sudah', 'belum', 'tidak', 'bukan', 'bisa', 'mau', 'akan', 'harus',
  'boleh', 'hari', 'lagi', 'bagi', 'dibagi', 'kali', 'tadi', 'nanti', 'besok', 'kemarin', 'jam', 'mana', 'siapa', 'kapan',
  'kenapa', 'mengapa', 'gimana', 'bagaimana', 'sini', 'situ', 'sana', 'semua', 'saja', 'aja', 'sama', 'banyak', 'sedikit',
  'baru', 'lama', 'atas', 'bawah', 'depan', 'belakang', 'masih', 'pernah', 'sedang', 'lagi', 'buat', 'bikin', 'lihat', 'buka',
  'kirim', 'simpan', 'baca', 'tahu', 'punya', 'pakai', 'pake', 'makan', 'minum', 'tidur', 'kerja', 'klinik', 'gigi', 'data',
  'umur', 'usia', 'warna', 'hobi', 'pacar', 'rumah', 'tinggal', 'manusia', 'robot', 'model', 'chat', 'percakapan', 'aman',
  'jadi', 'usah', 'perlu', 'jangan', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
  'lalu', 'kedepan', 'depan', 'akhir', 'awal', 'tengah', 'hasil', 'total', 'persen', 'ribu', 'juta', 'miliar', 'ratus', 'kurang',
  'tambah', 'plus', 'minus', 'kurangi', 'naik', 'turun', 'good', 'great', 'nice', 'what', 'time', 'date', 'today', 'thank',
  'happy', 'merry', 'night', 'morning', 'bulanan', 'halaman', 'menu', 'jadwal', 'mulai', 'hapus', 'reset', 'ulang', 'ulangi',
  'pamit', 'dulu', 'kok', 'dong', 'deh', 'sih', 'nih', 'kak', 'pak', 'bu', 'ibu', 'bapak', 'mas', 'mbak', 'bos', 'gan',
  'tahun', 'sehari', 'seminggu', 'sebulan', 'setahun', 'pekan', 'sisa', 'natal', 'valentine', 'kemerdekaan', 'januari',
  'februari', 'maret', 'april', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'senin', 'selasa',
  'rabu', 'kamis', 'jumat', 'sabtu', 'weekend', 'kemudian', 'sebelumnya', 'namaku', 'nama', 'panggil', 'ingat',
  // nama halaman & perintah (jangan "dikoreksi": "profil" bukan "profit")
  'dashboard', 'beranda', 'home', 'profil', 'profile', 'pengaturan', 'setting', 'settings', 'pengguna', 'user', 'users',
  'keuangan', 'finance', 'kasir', 'costing', 'modal', 'audit', 'log', 'kalender', 'whatsapp', 'qris', 'langganan', 'billing',
  'paket', 'tema', 'tampilan', 'satusehat', 'report', 'reports', 'open', 'go', 'page', 'tab', 'bukakan', 'pergi', 'pindah',
  'menuju', 'arahkan', 'antar', 'treatment', 'treatments', 'pendaftaran', 'registrasi', 'obrolan', 'bersihkan', 'kosongkan',
  'clear', 'riwayat', 'new', 'praktik', 'praktek', 'layar', 'payments',
  'menarik', 'soal', 'tentang', 'unik', 'kesehatan', 'sehat', 'merawat', 'menjaga', 'fakta', 'tips', 'orang', 'gas', 'ayo',
  'yuk', 'senyum', 'gusi', 'sikat', 'mager', 'santuy', 'cabut', 'balik', 'pulang', 'otw', 'tengkiu', 'wow', 'buset', 'astaga',
  'selisih', 'jarak', 'antara', 'sampai', 'hingga', 'gelap', 'terang', 'dark', 'light', 'mode', 'bacakan', 'bacain', 'baca',
  'cicil', 'cicilan', 'dicicil', 'terbilang', 'huruf', 'modal', 'jual', 'dijual', 'tarif', 'kontribusi', 'impas', 'persen',
  'kenaikan', 'penurunan', 'perubahan', 'menjadi', 'malam', 'nyalakan', 'aktifkan', 'ubah', 'ganti',
]);

// Kosakata pemandu & gerakan (nama halaman, kata tutorial, perintah gerak) tidak boleh "dikoreksi" ke kata lain.
[...PAGES.flatMap((p) => p.aliases.flatMap((a) => a.split(' '))), ...FUN_WORDS, ...GLOSSARY_WORDS,
  'ngapain', 'tugas', 'kerjaan', 'checklist', 'rutinitas', 'harian', 'dikerjakan', 'kerjakan', 'sebaiknya', 'mulai', 'konfirmasi', 'booking',
  ...TUTORIALS.flatMap((tu) => String(tu.re.source).match(/[a-z]{3,}/g) || []),
  'jump', 'badan', 'hpp', 'spin', 'quiz', 'trivia', 'ajarkan', 'tutorial', 'panduan', 'dimana', 'letak', 'lokasi', 'template', 'pengingat',
  'invoice', 'edukasi', 'tunjukkan', 'gerakan', 'atraksi', 'kedip', 'lompat', 'loncat', 'hormat', 'show', 'off',
].forEach((w) => KNOWN.add(w));

/** Calon nama memuat kata data atau kata umum di awal ("nama saya di laporan salah") → bukan nama. */
const isWordy = (name) => {
  const t = name.toLowerCase();
  return anyWord(t, DATA_WORDS) || KNOWN.has(t.split(' ')[0]) && !['bu', 'pak', 'ibu', 'bapak', 'mas', 'mbak', 'kak'].includes(t.split(' ')[0]);
};

/** Jarak edit Damerau (OSA): hapus, sisip, ganti, tukar dua huruf bersebelahan. */
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Kata dari regex (dan dari regex literal di dalam fungsi uji) — ikut jadi kosakata koreksi salah ketik. */
const reWords = (re) => {
  const src = typeof re === 'function'
    ? (String(re).match(/\/((?:\\.|[^/\n\\])+)\//g) || []).join(' ')
    : String(re?.source || '');
  return src.replace(/\\./g, ' ').match(/[a-z]{4,}/g) || [];
};
/** Kosakata dasar koreksi salah ketik: obrolan + kata data. */
let fuzzyVocab = null;
const baseVocab = () => {
  fuzzyVocab = fuzzyVocab || [...new Set([...VOCAB, ...DATA_WORDS.filter((x) => !x.includes(' ') && x.length >= 4)])];
  return fuzzyVocab;
};
/** Kosakata tambahan (mode agresif): perintah halaman, gerakan, istilah, dan kata di dalam regex maksud. Dipakai hanya bila cara biasa gagal. */
let extVocab = null;
let extSet = null;
let extByLen = null;
const extendedVocab = () => {
  if (!extVocab) {
    const base = new Set(baseVocab());
    extVocab = [...new Set([
      ...GUIDE_WORDS, ...FUN_WORDS.filter((x) => x.length >= 4), ...GLOSSARY_WORDS.filter((x) => x.length >= 4), ...[...KNOWN].filter((x) => x.length >= 5),
      ...INTENTS.flatMap((it) => [...reWords(it.re), ...reWords(it.whole)]), ...EARLY_INTENTS.flatMap((it) => reWords(it.test)), ...PERSONA.flatMap(([re]) => reWords(re)),
    ])].filter((v) => !base.has(v));
    extSet = new Set(extVocab);
    extByLen = new Map();
    extVocab.forEach((v) => extByLen.set(v.length, [...(extByLen.get(v.length) || []), v]));
  }
  return extVocab;
};
// jarak sama → utamakan huruf awal yang sama ("hbat" → "hebat", bukan "obat"), lalu panjang yang paling mirip ("mkasiih" → "makasih")
const rankOf = (v, w) => (v[0] === w[0] ? 0 : 10) + Math.abs(v.length - w.length);

/** Koreksi dasar: kosakata kecil, ≤ 1 huruf (≤ 2 untuk kata ≥ 7 huruf). */
function fuzzyWordBase(w) {
  if (w.length < 4 || /\d/.test(w) || KNOWN.has(w)) return w;
  const vocab = baseVocab();
  if (vocab.includes(w)) return w;
  const max = w.length >= 7 ? 2 : 1;
  let best = w;
  let bestD = max + 1;
  for (const v of vocab) {
    if (Math.abs(v.length - w.length) > max) continue;
    const dist = editDistance(w, v);
    if (dist < bestD || (dist === bestD && rankOf(v, w) < rankOf(best, w))) { bestD = dist; best = v; }
  }
  return bestD <= max ? best : w;
}

/** Koreksi agresif (cadangan): kosakata luas, tanpa mengubah kata yang hanya berbeda imbuhan/akhiran. */
function fuzzyWordAggressive(w) {
  const first = fuzzyWordBase(w);
  if (first !== w) return first;
  if (w.length < 4 || /\d/.test(w) || KNOWN.has(w)) return w;
  extendedVocab();
  if (extSet.has(w) || baseVocab().includes(w)) return w;
  const max = w.length >= 7 ? 2 : 1;
  let best = w;
  let bestD = max + 1;
  for (let len = w.length - max; len <= w.length + max; len += 1) {
    for (const v of extByLen.get(len) || []) {
      if (Math.abs(v.length - w.length) >= 2 && (w.startsWith(v) || v.startsWith(w))) continue; // "kabar" ↔ "kabarmu": imbuhan, bukan salah ketik
      if (w.length <= 5 && v[0] !== w[0]) continue; // kata pendek: huruf awal jarang salah ("kalau" ≠ "galau")
      const dist = editDistance(w, v);
      if (dist < bestD || (dist === bestD && rankOf(v, w) < rankOf(best, w))) { bestD = dist; best = v; }
    }
  }
  if (bestD <= max) return best;
  // kata berimbuhan (-mu/-ku/-nya/-lah/-kah): perbaiki akarnya lalu pasang kembali ("kabamu" → "kabarmu")
  const sfx = w.match(/^(.{4,}?)(mu|ku|nya|lah|kah)$/);
  if (sfx && !KNOWN.has(sfx[1])) {
    const stem = fuzzyWord(sfx[1], true);
    if (stem !== sfx[1]) return stem + sfx[2];
  }
  return w;
}

const fuzzyMemo = new Map();
function fuzzyWord(w, aggressive = false) {
  const key = aggressive ? `~${w}` : w;
  if (fuzzyMemo.has(key)) return fuzzyMemo.get(key);
  const out = aggressive ? fuzzyWordAggressive(w) : fuzzyWordBase(w);
  if (fuzzyMemo.size > 5000) fuzzyMemo.clear();
  fuzzyMemo.set(key, out);
  return out;
}

/** Perbaiki salah ketik per kata pada teks asli (angka & tanda baca dibiarkan) — untuk keterampilan hitung. */
function fixRaw(text) {
  return String(text || '').split(' ').map((tok) => {
    const m = tok.match(/^([^a-zA-Z]*)([a-zA-Z]{4,})([^a-zA-Z]*)$/);
    if (!m) return tok;
    const low = m[2].toLowerCase();
    const fixed = SLANG[low] || fuzzyWord(low, true);
    return fixed === low ? tok : m[1] + fixed + m[3];
  }).join(' ');
}

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
export function normalizeChat(text, { aggressive = false } = {}) {
  let t = norm(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  // huruf ganda di akhir kata ("kerenn", "sipp", "okk"); vokal ganda di tengah ("maaf") dibiarkan
  t = t.replace(/([b-df-hj-kmnp-tv-z])\1+(?=\s|$)/g, '$1'); // tanpa "l" (well, all, still)
  t = t.split(' ').map((w) => SLANG[w] || w).map((w) => fuzzyWord(w, aggressive)).join(' ');
  t = t.replace(/\b(denti|kak|kakak|min|mimin|bot)\b/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i += 1) t = t.replace(/\s(ya|yah|yaa|ya|dong|deh|nih|sih|kok|lho|loh|banget|bgt|sekali|nya)$/, '').trim();
  return t;
}


const JOKES = [
  'Kenapa gigi tidak pernah merasa kesepian? Karena selalu ditemani gusi yang setia. 😄',
  'Dokter gigi favorit para hantu? Yang praktiknya di "gigi-l" malam. 👻🦷',
  'Sikat gigi itu sahabat sejati — setiap pagi dan malam selalu ada untuk kita. 🪥',
  'Apa makanan kesukaan dokter gigi? Yang pasti bukan permen — nanti pasiennya kebanyakan. 🍬😁',
  'Tahu kenapa sikat gigi tidak pernah bohong? Karena selalu bicara jujur… dari ujung bulunya! 🪥😆',
  'Kalau gigi bisa curhat: "Tolong kurangi permen — aku capek ditambal terus!" 🍭😂',
  'Kenapa benang gigi selalu tenang? Karena terbiasa menyelip di sela-sela masalah. 🧵😄',
  'Gigi geraham itu paling sabar — kerjanya mengunyah terus tapi tidak pernah protes. 😁',
];

const TIPS = [
  'Sikat gigi dua kali sehari — pagi setelah sarapan dan malam sebelum tidur. 🪥',
  'Ganti sikat gigi setiap 3 bulan, atau lebih cepat bila bulunya sudah mekar. 🪥',
  'Bersihkan sela gigi dengan benang gigi — sikat saja tidak menjangkau semuanya. 🧵',
  'Kurangi camilan dan minuman manis, terutama di antara jam makan. 🍬',
  'Periksakan gigi ke dokter gigi setiap 6 bulan agar masalah kecil tidak menjadi besar. 🦷',
  'Minum air putih setelah makan membantu membilas sisa makanan. 💧',
  'Sikat gigi minimal 2 menit, jangan lupa bagian lidah. 👅',
  'Tunggu ±30 menit setelah makan/minum asam sebelum menyikat gigi. ⏳',
];
const FACTS = [
  'Email gigi adalah jaringan paling keras di tubuh manusia. 💎',
  'Pola gigi setiap orang unik — mirip sidik jari. 🦷',
  'Manusia hanya punya dua set gigi seumur hidup: gigi susu dan gigi permanen.',
  'Air liur membantu menetralkan asam dan melindungi gigi dari gigi berlubang. 💧',
];

const PERIODS = ['pagi', 'siang', 'sore', 'malam'];
const periodOf = (now) => { const h = now.getHours(); return h >= 4 && h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam'; };
const DAYS = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6, sunday: 0 };
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Ucapan terima kasih yang nyambung dengan topik jawaban terakhir. */
const WISHES = {
  'data pendapatan': 'Semoga pendapatannya terus naik. 📈', 'data pengeluaran': 'Semoga pengeluarannya makin efisien. 💡',
  'margin tindakan': 'Semoga marginnya makin tebal. 💰', 'stok bahan': 'Jangan lupa restock bahan yang menipis, ya. 📦',
  tagihan: 'Semoga tagihannya cepat lunas. 💸', 'jadwal & kinerja dokter': 'Semoga jadwal praktiknya lancar. 🗓️',
  'daftar recall': 'Semoga pasien recall-nya banyak yang kembali kontrol. 🦷', 'data kunjungan': 'Semoga kliniknya makin ramai. 😊',
  'arus kas': 'Semoga kasnya selalu sehat. 💚', 'titik impas': 'Semoga cepat melewati titik impas. 🚀',
  'simulasi harga': 'Semoga harga barunya pas di hati pasien. 😊', 'kondisi klinik hari ini': 'Semoga hari ini lancar. ☀️',
};

/** Sapaan mengikuti waktu yang diucapkan pengguna ("good morning" → "Selamat pagi"). */
const greetingFrom = (t) => (/(pagi|morning)/.test(t) ? 'Selamat pagi' : /(siang|afternoon)/.test(t) ? 'Selamat siang'
  : /sore/.test(t) ? 'Selamat sore' : /(malam|evening)/.test(t) ? 'Selamat malam' : '');


// ── Intent "awal": dicek sebelum saringan kata data, tetapi hanya bila kata data yang muncul ada di `allow`
//    (mis. "umur kamu berapa" memuat "berapa"; "data pasien aman?" memuat "pasien").
const PERSONA = [
  [/(kamu|anda) (ini )?(manusia|robot|bot|ai|mesin)\b/, L.robot],
  [/(umur|usia)(mu| kamu| anda)|(kamu|anda) (umur|usia) berapa|berapa (umur|usia)(mu| kamu| anda)/, ['Saya "lahir" tahun 2026 bersama Dentiva — jadi masih muda sekali! 🎂😄']],
  [/(kamu|anda) (cowok|cewek|laki|perempuan|pria|wanita)|jenis kelamin(mu| kamu| anda)/, ['Denti tidak punya jenis kelamin — cukup panggil Denti saja. 😊']],
  [/(kamu|anda) tinggal (di )?mana|rumah(mu| kamu| anda) (di )?mana/, ['Saya tinggal di dalam aplikasi Dentiva, tepatnya di menu Asisten AI. 🏠 Selalu siap kalau dipanggil!']],
  [/makanan (favorit|kesukaan)(mu| kamu| anda)|(kamu|anda) (suka )?makan apa/, ['Makanan favorit saya? Data yang rapi! 📊 Yang pasti bukan permen — nanti gigi saya bolong. 🍬😁']],
  [/hobi(mu| kamu| anda)/, ['Hobi saya merapikan angka dan menyemangati tim klinik! 💪']],
  [/(kamu|anda) (punya )?(pacar|jodoh|pasangan)|pacar(mu| kamu)/, ['Pasangan saya sikat gigi — kami tidak terpisahkan sejak pagi sampai malam. 🪥💙']],
  [/warna (favorit|kesukaan)(mu| kamu| anda)/, ['Warna favorit saya biru es, seperti cahaya di visor saya. 💙']],
  [/cita ?cita(mu| kamu| anda)/, ['Cita-cita saya: semua klinik gigi di Indonesia sehat bisnisnya, dan semua pasien senyum lebar. 🦷✨']],
  [/(kamu|anda) (punya|bisa) (perasaan|hati|emosi|sedih|senang|marah)/, ['Saya tidak punya perasaan seperti manusia, tapi saya diprogram untuk peduli pada kelancaran klinik Anda. 💙']],
  [/(kamu|anda) (bisa )?tidur\b/, ['Saya bisa "tidur" kalau lama tidak diajak bicara — tapi cukup ketik apa saja, saya langsung bangun. 😴☀️']],
];
/** "denti umurnya berapa" → "umurmu berapa" (kata ganti -nya merujuk ke Denti bila Denti disebut). */
const aboutDenti = (t, raw) => (/\bdenti\b/i.test(raw || '') ? t.replace(/\b(umur|usia|hobi|pacar|rumah|warna favorit|makanan favorit)nya\b/g, '$1mu') : t);
const MODEL_Q = /((kamu|anda|otak(mu| kamu| anda)) (pakai|memakai|menggunakan|pake) (ai|model|apa)|(kamu|anda) (chatgpt|gpt|gemini|claude|groq|llama|openai)\b|pakai ai apa|model ai(mu| kamu)? apa)/;

const EARLY_INTENTS = [
  { id: 'tip', state: ({ t }) => (/fakta/.test(t) ? 'tooth' : 'brush'), allow: ['cara', 'bagaimana'],
    test: (t) => /(tips?|fakta|cara (merawat|menjaga|membersihkan)|menjaga|merawat)\b.*\b(gigi|gusi|senyum|mulut)\b/.test(t),
    reply: ({ t }) => (/fakta/.test(t) ? FACTS.map((f) => `Fakta gigi: ${f}`) : TIPS.map((x) => `Tips dari Denti: ${x}`)) },
  { id: 'day', state: 'celebrate', allow: ['minggu'],
    test: (t) => /^(selamat|happy|semangat|akhirnya)( hari)? (senin|selasa|rabu|kamis|jumat|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|akhir pekan)$|^selamat berakhir pekan$|^tgif$/.test(t),
    reply: ({ t, now, sapa }) => {
      const today = DAY_NAMES[now.getDay()];
      const weekend = [0, 6].includes(now.getDay());
      if (/(weekend|pekan)/.test(t)) return weekend ? `Selamat menikmati akhir pekan${sapa}! 🎉` : `Masih hari ${today}, tapi akhir pekan sudah dekat${sapa}! 😄`;
      const key = /tgif/.test(t) ? 'jumat' : Object.keys(DAYS).find((d) => t.includes(d));
      if (DAYS[key] === now.getDay()) return `Selamat hari ${today}${sapa}! 🎉 Semoga kliniknya lancar.`;
      return `Hari ini ${today}, lho${sapa} 😄 Tapi semangatnya boleh dipakai sekarang! 💪`;
    } },
  { id: 'setName', state: 'love', allow: [],
    test: (t, raw) => Boolean(extractName(raw, isWordy)),
    reply: ({ raw }) => { const n = extractName(raw, isWordy); return `Senang berkenalan, ${n}! 😊 Mulai sekarang saya panggil **${n}**.`; },
    action: ({ raw }) => ({ type: 'setName', name: extractName(raw, isWordy) }) },
  { id: 'whoAmI', state: 'happy', allow: [],
    test: (t) => /^(siapa nama(ku| saya| aku)|(kamu )?(tahu|ingat|masih ingat) nama(ku| saya| aku)|aku siapa|saya siapa)$/.test(t),
    reply: ({ name }) => (name ? `Tentu ingat — Anda **${name}**! 😊` : 'Saya belum tahu nama Anda. Ketik *"panggil aku …"* supaya saya bisa menyapa dengan nama. 😊') },
  { id: 'persona', state: 'happy', allow: ['berapa'],
    test: (t, raw) => { const q = aboutDenti(t, raw); return MODEL_Q.test(q) || PERSONA.some(([re]) => re.test(q)); },
    reply: ({ t: t0, raw, provider }) => {
      const t = aboutDenti(t0, raw);
      if (MODEL_Q.test(t)) {
        return provider
          ? `Otak saya saat ini memakai **${provider}**, dirangkai oleh tim Dentiva. Yang saya baca hanya angka ringkasan klinik — bukan data identitas pasien. 🧠🦷`
          : 'Otak saya memakai model AI pilihan tim Dentiva. Yang saya baca hanya angka ringkasan klinik — bukan data identitas pasien. 🧠🦷';
      }
      return PERSONA.find(([re]) => re.test(t))[1];
    } },
  { id: 'privacy', state: 'point', allow: ['pasien', 'bagaimana'],
    test: (t) => /\b(aman|privasi|rahasia|bocor|keamanan)\b/.test(t) && /\b(data|pasien|chat|percakapan|kamu|anda|pakai)\b/.test(t)
      || /(kamu|anda) (bisa |dapat )?(lihat|baca|tahu|akses|simpan|menyimpan)( \w+){0,2} (rekam medis|nama pasien|nik|data pasien|percakapan|chat|identitas|obrolan)/.test(t)
      || /(data|percakapan|chat|obrolan)( \w+)? (dikirim|disimpan|dibaca) (ke )?(mana|siapa)/.test(t)
      || /siapa (yang )?(bisa )?(lihat|baca) (chat|percakapan|obrolan)/.test(t),
    reply: ({ t }) => L.privacy(/(percakapan|chat|obrolan|simpan|menyimpan)/.test(t)) },
  { id: 'occasion', allow: ['dokter'],
    state: ({ t }) => (/(lahir|fitri|lebaran|minal|adha|nyepi|waisak|guru)/.test(t) ? 'thanks' : 'celebrate'),
    test: (t) => /(idul (fitri|adha)|lebaran|lahir (dan|&) batin|minal aidin|natal|christmas|tahun baru|new year|gong xi|imlek|nyepi|dirgahayu|merdeka|kemerdekaan|ulang ?tahun|birthday|ultah|hari dokter gigi|waisak|hari guru)/.test(t),
    reply: ({ t, sapa }) => {
      if (/(lahir|fitri|lebaran|minal)/.test(t)) return `Selamat Hari Raya Idul Fitri${sapa}! 🌙 Mohon maaf lahir dan batin juga, ya. 🙏`;
      if (/adha/.test(t)) return `Selamat Idul Adha${sapa}! 🙏 Semoga penuh berkah.`;
      if (/(natal|christmas)/.test(t)) return `Selamat Natal${sapa}! 🎄 Semoga damai dan sukacita menyertai.`;
      if (/(tahun baru|new year)/.test(t)) return `Selamat tahun baru${sapa}! 🎆 Semoga klinik makin ramai dan makin sehat tahun ini.`;
      if (/(gong xi|imlek)/.test(t)) return `Gong Xi Fa Cai${sapa}! 🧧 Semoga rezeki melimpah.`;
      if (/nyepi/.test(t)) return `Selamat Hari Raya Nyepi${sapa}! 🙏 Semoga damai.`;
      if (/waisak/.test(t)) return `Selamat Hari Waisak${sapa}! 🙏 Semoga semua makhluk berbahagia.`;
      if (/(dirgahayu|merdeka|kemerdekaan)/.test(t)) return 'Merdeka! 🇮🇩 Dirgahayu Republik Indonesia!';
      if (/dokter gigi/.test(t)) return 'Selamat Hari Dokter Gigi untuk seluruh tim klinik! 🦷✨ Terima kasih sudah menjaga senyum Indonesia.';
      if (/guru/.test(t)) return 'Selamat Hari Guru! 🙏 Terima kasih untuk semua yang sudah mengajar dengan sabar.';
      if (/(aku|saya|tahunku|ultahku|tahun ku)/.test(t)) return `Selamat ulang tahun${sapa}! 🎂🎉 Semoga sehat, bahagia, dan kliniknya makin berkembang!`;
      return 'Terima kasih! 🎂 Denti jadi terharu… 💙';
    } },
];

/**
 * Daftar intent obrolan. `whole` = harus seluruh kalimat (dicek sebelum saringan kata data),
 * `re` = cukup memuat pola. Urutan menentukan prioritas.
 */
const INTENTS = [
  // ── Dijawab dari jam perangkat (sebelum saringan kata data karena memuat "berapa"/"hari ini")
  { id: 'time', state: 'talk', whole: /^((sekarang|sudah) )?(jam|pukul) berapa( ya)?( sekarang)?$|^what time is it( now)?$/,
    reply: ({ now }) => L.time(timeOf(now)) },
  { id: 'date', state: 'talk', whole: /^((hari ini|sekarang) )?(tanggal berapa|hari apa|bulan apa|tahun berapa)( ya)?( (hari ini|sekarang))?$|^tanggal (hari ini|sekarang)$|^what (day|date) is it( today)?$/,
    reply: ({ t, now }) => (/bulan/.test(t) ? `Sekarang bulan **${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}**. 📅`
      : /tahun/.test(t) ? `Sekarang tahun **${now.getFullYear()}**. 📅` : L.date(dateOf(now))) },
  { id: 'wake', state: 'wake', whole: /^(bangun|wake up|ada orang|halo ada orang|hai ada orang|kamu tidur|lagi tidur|masih (di sana|hidup|bangun))$/,
    reply: ({ sapa }) => L.wake(sapa) },
  { id: 'help', state: 'point', whole: /^((kamu|anda) )?(bisa (bantu )?apa( saja| aja)?|bisa ngapain( aja)?|apa (saja |aja )?(yang )?(bisa|dapat) (kamu|anda) (bantu|lakukan)|help|bantuan|tolong|apa (saja |aja )?fitur(mu| kamu| anda)?|fitur apa (saja |aja )?(yang )?(kamu|anda) (punya|miliki)|((gimana|bagaimana) )?cara (pakai|memakai|menggunakan|pake)( kamu| anda)?|what can you do|contoh pertanyaan(nya)?|(aku|saya) (harus|bisa) tanya apa( saja| aja)?|mulai dari mana)$/,
    reply: ({ role }) => L.HELP_INTROS.map((intro) => `${intro}\n${role === 'admin' || !role ? L.HELP_BODY : L.HELP_BODY_STAFF}`) },
  { id: 'confused', state: 'think', whole: /^(maksudnya( (gimana|bagaimana|apa))?|maksud(mu| kamu| anda)|apa maksud(mu|nya| kamu| anda)?|hah|ha|huh|hm+|eh|tidak (ngerti|mengerti|paham)|kurang (paham|jelas|ngerti)|bingung|aku bingung|saya bingung|jelasin lagi|jelaskan lagi|ulangi|ulang|coba lagi)$/,
    reply: ({ afterAnswer }) => L.confused(afterAnswer) },

  // ── Obrolan ringan
  { id: 'amazed', state: 'surprise', re: /^(wow|wah|waw|wih|buset|busyet|anjir|anjay|omg|astaga|astagfirullah|masyaallah|masya allah|ya ampun|gila)$/,
    reply: () => L.amazed },
  // ── Kalimat negatif (sebelum intent positifnya)
  { id: 'decline', state: 'happy', re: /^(tidak|jangan)( usah| perlu)? (joget|menari|nari|nyanyi|bercanda|lelucon|goyang)\b|^tidak (terima ?kasih|terimakasih|makasih|thanks)$|^tidak mau$|^tidak (perlu|jadi|usah)( (terima ?kasih|terimakasih|makasih|thanks))?$|^no thanks$|^nanti (saja|aja)$/,
    reply: () => L.decline },
  { id: 'complaint', state: 'sorry', re: /\b(tidak|kurang|bukan) (lucu|keren|pintar|pinter|hebat|mantap|bagus|membantu|jelas|nyambung|asik|seru)\b/,
    reply: () => L.notGood },
  { id: 'cheer', state: 'celebrate', re: /\b(tidak|bukan) (capek|cape|lelah|pusing|stres|ngantuk|bosan)\b/,
    reply: () => L.relief },
  { id: 'ack', state: 'happy', re: /^(tidak bingung|sudah (paham|jelas|mengerti|ngerti)|jelas|clear)$/,
    reply: () => L.ack },

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
  { id: 'bye', state: 'thanks', re: /\b(dadah|(dah|sudah|sudahan|udahan) dulu|sampai (jumpa|besok|nanti|ketemu)|(cabut|balik|pulang) dulu|otw pulang|bye|goodbye|good night|selamat (tinggal|tidur|istirahat)|pamit|see you)\b/,
    reply: ({ t, sapa }) => (/(night|tidur|istirahat)/.test(t) ? `Selamat istirahat${sapa}! 🌙 Sampai jumpa besok.` : L.bye(sapa)) },
  { id: 'thanks', state: 'love', re: /\b(terima ?kasih|terimakasih|trimakasih|makasih|makasi|mksh|maksih|trims|thanks|thank you|thx|tq|ty|tengkyu|nuhun|hatur nuhun|matur ?nuwun|suwun|tengkiu|kamsia|xie ?xie|arigato|gracias|merci|danke)\b/,
    reply: ({ sapa, lastTopic }) => L.thanks(sapa, WISHES[lastTopic]) },
  { id: 'apologize', state: 'happy', re: /^(maaf|mohon maaf|maafkan( aku| saya)?|sorry|sori|sory|maap)\b/,
    reply: ({ sapa }) => L.apologize(sapa) },
  { id: 'complaint', state: 'sorry', re: /\b(salah|keliru|ngaco|ngawur|tidak (tepat|benar|bener|akurat)|nggak (tepat|bener)|gak (tepat|bener)|(tidak|nggak|gak|kurang) (bagus|pintar|membantu|jelas|nyambung)|bukan itu|bodoh|goblok|bego|lemot|payah|jelek)\b/,
    reply: ({ afterAnswer }) => L.complaint(afterAnswer) },
  { id: 'praise', state: 'shy', re: /\b(pintar|pinter|hebat|keren|mantap|mantul|bagus|luar biasa|good job|cakep|jago|top|the best|terbaik|amazing|nice|awesome|great|perfect|well done|brilliant|smart|jos|gokil|goks|markotop|joss|keren abis)\b/,
    reply: () => L.praise },
  { id: 'love', state: 'love', re: /\b(sayang (kamu|denti)|love you|i love|lucu banget|gemes|gemas|imut)\b/,
    reply: () => L.love },
  { id: 'who', state: 'wave', re: /(siapa (kamu|anda|namamu)|kamu siapa|anda siapa|nama (kamu|mu|anda)|kenalan|^(kamu|anda) (ini )?(apa|makhluk apa)$|^itu siapa$)/,
    reply: () => L.who },
  { id: 'maker', state: 'wave', re: /(siapa (yang )?(membuat|bikin|buat|menciptakan) (kamu|anda|mu)|kamu (dibuat|buatan) (siapa|oleh)|pembuat(mu| kamu))/,
    reply: () => L.maker },
  { id: 'joke', state: 'laugh', re: /\b(lelucon|jokes?|lawak|lawakan|bercanda|candaan|lucu lucuan|hibur|hiburan|terhibur|tebak tebakan)\b/,
    reply: () => JOKES },
  { id: 'laugh', state: 'laugh', re: /^((ha ?ha|haha\w*|hehe\w*|hihi\w*|wkwk\w*|xixi\w*|lol|lucu|ngakak|land|parah|anjir|anjay|sumpah|asli)( |$))+$/,
    reply: () => L.laugh },
  { id: 'dance', state: 'dance', re: /\b(joget|menari|nari|dansa|nyanyi|goyang)\b/,
    reply: () => L.dance },
  { id: 'tired', state: 'love', re: /\b(capek|cape|capai|lelah|melelahkan|kelelahan|pusing|stres|stress|ngantuk|sibuk banget|penat|bosan|bete|letih|lesu|mager)\b/,
    reply: () => L.tired },
  { id: 'greet', state: 'wave', re: /^(halo|hallo|helo|hai|hay|hi|hey|hello|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|good (morning|afternoon|evening|day)|morning|permisi|p|ping|tes|test|testing)\b/,
    reply: ({ t, sapa, greeting, now }) => {
      const g = greetingFrom(t) || greeting;
      const said = PERIODS.find((x) => g.toLowerCase().includes(x));
      const actual = periodOf(now);
      if (said && Math.abs(PERIODS.indexOf(said) - PERIODS.indexOf(actual)) >= 2) {
        return `${g} juga… eh, di sini ${['pagi', 'siang'].includes(actual) ? 'masih' : 'sudah'} ${actual} lho${sapa} 😄 Ada yang bisa saya bantu?`;
      }
      return L.greet(g, sapa);
    } },
  { id: 'cheer', state: 'celebrate', re: /\b(semangat|yeay|yey|hore|horee|asik|asyik|berhasil|alhamdulillah)\b/,
    reply: () => L.cheer },
  { id: 'how', state: 'happy', re: /^(apa kabar(mu|nya)?|gimana kabar(nya|mu)?|kabar(mu| kamu)?( gimana| bagaimana)?|how are you|kumaha (damang|kabar)|piye kabare?|baik baik saja|sehat)$/,
    reply: ({ sapa }) => L.how(sapa) },
  { id: 'ack', state: 'happy', re: /^((ok|oke|okee|sip|siap|baik|baiklah|noted|mengerti|paham|ngerti|iya|ya|betul|benar|setuju|lanjut|alright|yes|yap|got it|understood|roger|gas|gaskeun|kuy|yuk|ayo|ashiap|santuy|santai|bos|gan|bro|sis)( |$))+$/,
    reply: () => L.ack },
];

/**
 * Obrolan ringan → { intent, state, reply } (null bila bukan obrolan ringan → kirim ke AI).
 * ctx: { name, greeting, seed, now, afterAnswer, lastIntent } — afterAnswer = sudah ada jawaban AI sebelumnya;
 * lastIntent = intent obrolan terakhir (untuk "lagi" / "yang lain").
 */
/** Hitungan bisnis cepat dari kalimat asli: [intent, fungsi, ekspresi]. */
const BIZ_SKILLS = [
  ['pctchange', pctChange, 'think'], ['margin', marginCalc, 'happy'], ['bepcalc', bepCalc, 'think'],
  ['installment', installment, 'talk'], ['terbilang', terbilang, 'talk'],
];

/** Intent terakhir yang bisa diminta "lagi" → intent yang diulang. */
const REPEATABLE = { joke: 'joke', laugh: 'joke', dance: 'dance' };
const AGAIN = /^(lagi|satu lagi|sekali lagi|yang lain|lainnya|another( one)?|more|terus|lanjutkan)$/;

/** Keterampilan instan dari kalimat asli: kalkulator & hitungan bisnis. */
function runSkills(src) {
  const calc = calculate(src);
  if (calc) return { intent: 'calc', state: 'talk', reply: calc };
  for (const [intent, skill, state] of BIZ_SKILLS) {
    const out = skill(src);
    if (out) return { intent, state, reply: out };
  }
  return null;
}

/**
 * Dua tahap: (1) pahami kalimat apa adanya (koreksi ringan); (2) bila tidak dikenali, ulangi dengan koreksi salah ketik agresif
 * (kosakata perintah/halaman/istilah) — sehingga kata yang benar tidak pernah "dikoreksi" ke kata lain.
 */
export function smallTalk(text, opts = {}) {
  const first = runSkills(text) || talkWith(text, emojiOnly(text) || normalizeChat(text), opts);
  if (first) return first;
  if (emojiOnly(text)) return null;
  const fixed = fixRaw(text);
  if (fixed !== text) {
    const skill = runSkills(fixed);
    if (skill) return skill;
  }
  const loose = normalizeChat(text, { aggressive: true });
  return loose !== normalizeChat(text) ? talkWith(text, loose, opts) : null;
}

function talkWith(text, t, {
  name = '', greeting = 'Halo', seed = 0, now = new Date(), afterAnswer = false, lastIntent = null, provider = '', lastTopic = null,
  recent = [], role = 'admin', offer = null, quiz = null,
} = {}) {
  if (!t || t.length > 70) return null;
  const date = dateCalc(t, now);
  if (date) return { intent: 'datecalc', state: 'talk', reply: date };
  const diff = dateDiff(t, now);
  if (diff) return { intent: 'datediff', state: 'talk', reply: diff };
  const mode = themeCommand(t);
  if (mode) {
    return { intent: 'theme', state: mode === 'dark' ? 'sleep' : 'wake', action: { type: 'theme', mode },
      reply: mode === 'dark' ? 'Siap, mode gelap aktif. 🌙 Lebih nyaman untuk mata.' : 'Siap, kembali ke mode terang. ☀️' };
  }
  if (isSpeakCommand(t)) {
    return afterAnswer
      ? { intent: 'speak', state: 'talk', reply: 'Siap, saya bacakan jawaban terakhir. 🔊', action: { type: 'speak' } }
      : { intent: 'speak', state: 'think', reply: 'Belum ada jawaban untuk dibacakan. Tanyakan sesuatu dulu, ya! 😊' };
  }
  // Pemandu: buka halaman/tab (sadar peran), "di mana …", "ajarkan cara …", kembali/muat ulang, jawaban "ya" untuk tawaran
  const guide = guideReply(t, { role, offer });
  if (guide) return guide;
  // Kamus istilah: "apa itu scaling?", "HPP itu apa?" — hanya istilah yang dikenal
  const gloss = glossaryReply(t, { role, seed });
  if (gloss) return gloss;
  if (isClearCommand(t)) return { intent: 'clear', state: 'wave', reply: 'Siap, percakapan dibersihkan. Kita mulai dari awal! ✨', action: { type: 'clear' } };
  // Interaksi seru: perintah gerakan, kuis gigi, reaksi emosi
  const fun = funReply(t, { seed, recent, quiz, name, lastIntent });
  if (fun) return fun;
  const ctx = { t, raw: text, name, greeting, seed, now, afterAnswer, provider, lastTopic, role, sapa: name ? `, ${name}` : '' };
  const answer = (it, sd = seed) => {
    const r = it.reply({ ...ctx, seed: sd });
    const state = typeof it.state === 'function' ? it.state(ctx) : it.state;
    const out = { intent: it.id, state, reply: Array.isArray(r) ? pickFresh(r, sd, recent) : r };
    if (it.action) out.action = it.action(ctx);
    return out;
  };

  if (AGAIN.test(t) && REPEATABLE[lastIntent]) {
    const again = INTENTS.find((it) => it.id === REPEATABLE[lastIntent]);
    return answer(again, seed + 1);
  }
  const whole = INTENTS.find((it) => it.whole && it.whole.test(t));
  if (whole) return answer(whole);
  const early = EARLY_INTENTS.find((it) => it.test(t, text) && !anyWord(t, DATA_WORDS.filter((w) => !it.allow.includes(w))));
  if (early) return answer(early);
  if (anyWord(t, DATA_WORDS)) return null;
  const hit = INTENTS.find((it) => it.re && it.re.test(t));
  if (!hit) return null;
  const res = answer(hit);
  // Beberapa maksud sekaligus ("halo, makasih ya") → balasan gabungan yang natural
  if (COMBO.some(([id]) => id === hit.id)) {
    const parts = COMBO.filter(([id, re]) => (id === hit.id && id !== 'greet') || re().test(t));
    if (parts.length >= 2) {
      const text = parts.map(([, , say], i) => say(ctx, i === 0)).join(' ');
      res.reply = parts.some(([id]) => id === 'bye') ? text : `${text} Ada lagi yang bisa saya bantu?`;
    }
  }
  return res;
}

const reOf = (id) => () => INTENTS.find((it) => it.id === id && it.re && !String(it.re).startsWith('/^(tidak') && !String(it.re).includes('(tidak|kurang|bukan)')).re;
/** Urutan alami potongan balasan gabungan. */
const COMBO = [
  ['greet', () => /^(halo|hai|hi|hello|hey|selamat (pagi|siang|sore|malam)|pagi|siang|sore|malam|good (morning|afternoon|evening))\b/,
    (c, first) => `${greetingFrom(c.t) || 'Halo'}${first ? c.sapa : ''}!`],
  ['apologize', () => /^(maaf|mohon maaf|sorry|sori)\b/, (c, first) => `Tidak apa-apa${first ? c.sapa : ''}!`],
  ['how', () => /\b(apa kabar|gimana kabar|how are you)\b/, () => 'Kabar saya baik, terima kasih sudah bertanya. 😊'],
  ['thanks', reOf('thanks'), (c, first) => `Sama-sama${first ? c.sapa : ''}!${WISHES[c.lastTopic] ? ` ${WISHES[c.lastTopic]}` : ''}`],
  ['praise', reOf('praise'), () => 'Aduh, jadi malu… ☺️'],
  ['bye', reOf('bye'), (c, first) => `Sampai jumpa${first ? c.sapa : ''}! 👋`],
];

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

/** Sorotan singkat dari jawaban: "naik 8,2%", "3 bahan kadaluarsa", "laba minus", "sudah lunas". */
export function highlightOf(answer) {
  const t = norm(answer).replace(/\*\*/g, '');
  const pct = t.match(/\b(naik|meningkat|turun|menurun|anjlok|melonjak)\s+(?:sebesar\s+|hingga\s+)?([\d.,]+\s?%)/);
  if (pct) return `${pct[1]} ${pct[2].replace(/\s/g, '')}`;
  const count = t.match(/\b(\d+)\s+(bahan|tagihan|pasien|kunjungan|stok|item|tindakan)\b(?:\s+(?:yang\s+)?(kadaluarsa|kedaluwarsa|menipis|habis|belum dibayar|tertunda|baru))?/);
  if (count) return [count[1], count[2], count[3]].filter(Boolean).join(' ');
  const neg = t.match(/\b(laba|kas|saldo|selisih)?\s*(?:bersih\s+)?(minus|negatif|defisit)\b/);
  if (neg) return [neg[1], neg[2]].filter(Boolean).join(' ');
  if (/\blunas\b/.test(t) && !/belum (dibayar|lunas)/.test(t)) return 'semua sudah lunas';
  return null;
}

/** Ekspresi Denti + kalimat singkatnya setelah jawaban AI diterima (menyebut angka penting bila ada). */
export function moodForAnswer(answer, { error = false } = {}) {
  if (error) return { state: 'sorry', line: 'Maaf, ada kendala. Coba sebentar lagi, ya.' };
  const t = norm(answer).replace(COST_UP, '$1$2 ⟨costup⟩').replace(COST_DOWN, '$1$2 ⟨costdown⟩');
  const bad = countMeant(t, ALERT);
  const good = countMeant(t, GOOD);
  const hl = highlightOf(answer);
  if (bad > good && anyMeant(t, STRONG)) return { state: 'surprise', line: hl ? `Waduh, ${hl} — perlu segera diperhatikan!` : 'Ada yang perlu segera diperhatikan!' };
  if (bad > good) return { state: 'think', line: hl ? `Hmm, ${hl} — ada yang perlu dipantau.` : 'Ada beberapa hal yang perlu dipantau.' };
  if (good > 0) return { state: 'celebrate', line: hl ? `Kabar baik — ${hl}! 🎉` : 'Kabar baik!' };
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

const START = ['Ringkas kondisi klinik hari ini', 'Berapa pendapatan bulan ini?'];
const EXAMPLES = ['Berapa pendapatan bulan ini?', 'Bahan apa yang hampir kadaluarsa?', 'Ringkas kondisi klinik hari ini'];
/** Saran pertanyaan lanjutan — per topik jawaban AI atau per intent obrolan. Instan, tanpa AI. */
const FOLLOW = {
  'data pendapatan': ['Bandingkan dengan bulan lalu', 'Tindakan apa yang paling menguntungkan?', 'Proyeksikan arus kas 3 bulan ke depan'],
  'data pengeluaran': ['Kategori pengeluaran terbesar apa?', 'Bandingkan pendapatan dan pengeluaran bulan ini'],
  'margin tindakan': ['Berapa titik impas (BEP) klinik?', 'Kalau harga tindakan teratas naik 10%, dampaknya?'],
  'titik impas': ['Proyeksikan arus kas 3 bulan ke depan', 'Tindakan apa yang paling menguntungkan?'],
  'arus kas': ['Berapa titik impas (BEP) klinik?', 'Ada tagihan yang belum dibayar?'],
  'simulasi harga': ['Berapa titik impas (BEP) klinik?', 'Tindakan apa yang paling menguntungkan?'],
  'stok bahan': ['Bahan apa yang hampir kadaluarsa?', 'Berapa pengeluaran bahan bulan ini?'],
  tagihan: ['Kunjungan mana yang belum dibayar?', 'Ringkas kondisi klinik hari ini'],
  'jadwal & kinerja dokter': ['Beri saran jadwal dokter berdasarkan pola kunjungan', 'Dokter mana dengan pendapatan tertinggi?'],
  'data kunjungan': ['Berapa pasien yang perlu di-recall?', 'Hari apa kunjungan paling ramai?'],
  'daftar recall': ['Buka halaman recall', 'Berapa pasien yang perlu di-recall bulan ini?'],
  'kondisi klinik hari ini': ['Bagaimana beban jadwal dokter hari ini?', 'Ada tagihan yang belum dibayar?'],
  'panduan Dentiva': ['Kamu bisa apa saja?', 'Buka pengaturan'],
  'booking online': ['Buka booking', 'Bagaimana cara mengaktifkan booking online?'],
  'obat & resep': ['Ringkas kondisi klinik hari ini'], antrean: ['Buka layar antrean'],
  'promo & diskon': ['Hitung diskon 10% dari 500rb'], 'staf & pengguna': ['Buka pengguna'],
  'data klinik': START,
  help: EXAMPLES, confused: EXAMPLES, greet: START, how: START, wake: START, day: START, occasion: START, setName: START,
  whoAmI: START, tired: ['Ringkas kondisi klinik hari ini'], joke: ['Satu lagi dong 😄', 'Ringkas kondisi klinik hari ini'],
  laugh: ['Satu lagi dong 😄'], dance: ['Lagi dong 🎵'], persona: ['Kamu bisa apa saja?'], privacy: ['Kamu bisa apa saja?'],
  calc: ['Hitung diskon 10% dari 500rb', '6 bulan lagi tanggal berapa?'], datecalc: ['6 bulan lagi tanggal berapa?', 'Berapa hari lagi akhir bulan?'],
  nav: [], clear: START,
  // interaksi seru & pemandu (v4/v5)
  define: ['Istilah apa saja', 'Kuis gigi', 'Tahukah kamu'], glossaryList: ['Apa itu scaling?', 'Apa itu HPP?', 'Apa itu odontogram?'],
  fact: ['Lagi dong', 'Kuis gigi'], tip: ['Fakta unik tentang gigi', 'Kuis gigi', 'Tahukah kamu'],
  quiz: ['Petunjuk', 'Nyerah'], quizHint: ['Nyerah'], quizWrong: ['Petunjuk', 'Nyerah'], quizRight: ['Kuis lagi', 'Tahukah kamu'], quizReveal: ['Kuis lagi', 'Tahukah kamu'],
  showoff: ['Lagi dong', 'Kuis gigi'], daily: ['Menu apa saja', 'Kamu bisa apa saja?'], guide: ['Menu apa saja', 'Kuis gigi'], navlist: ['Checklist harian'],
  offerNo: ['Menu apa saja'], navdeny: ['Menu apa saja', 'Checklist harian'], navunknown: ['Menu apa saja'],
};
export function followUps(key, exclude = '') {
  const dyn = String(key).startsWith('move:') ? ['Lagi dong', 'Semua gerakan', 'Kuis gigi'] : String(key).startsWith('emo:') ? ['Tahukah kamu', 'Kuis gigi', 'Gerakan apa saja'] : null;
  const list = dyn || FOLLOW[key] || FOLLOW['data klinik'];
  return list.filter((q) => norm(q) !== norm(exclude)).slice(0, 3);
}

/** Kalimat Denti saat AI memproses pertanyaan — menyesuaikan nada pertanyaan. */
export function lineForQuestion(question) {
  const q = norm(question);
  const topic = topicOf(question);
  if (/(cepat|segera|urgent|darurat|asap|buru)/.test(q)) return `Siap, saya cek ${topic} secepatnya!`;
  if (/(\bkok\b|kenapa|mengapa|gawat|aduh|waduh|khawatir|bahaya|anjlok|sepi|rugi|habis)/.test(q)) return `Tenang, saya cek dulu ${topic}…`;
  if (/^(wah|asik|asyik|yeay)\b|(naik|meningkat|ramai) ya\b/.test(q)) return `Wah, mari kita lihat ${topic}…`;
  if (/(bandingkan|dibanding|banding|\bvs\b|versus|perbandingan|compare)/.test(q)) return `Membandingkan ${topic}…`;
  if (/(proyeksi|simulasi|kalau|jika|hitung|\bbep\b|impas)/.test(q)) return `Menghitung ${topic}…`;
  if (topic === 'panduan Dentiva') return 'Mencari panduan Dentiva…';
  return `Menganalisis ${topic}…`;
}
