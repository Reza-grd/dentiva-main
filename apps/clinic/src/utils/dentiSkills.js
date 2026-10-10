// ─────────────────────────────────────────────
//  Keterampilan instan Denti (tanpa AI, tanpa kuota, < 1 ms):
//  kalkulator & diskon, hitung tanggal, ingat nama panggilan.
//  Dipakai oleh smallTalk() di utils/dentiMood.js.
// ─────────────────────────────────────────────

const MONTHS = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
const NUMBER_WORDS = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11,
  'dua belas': 12, se: 1,
};

export const timeOf = (now) => now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
export const dateOf = (d) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const weekdayOf = (d) => d.toLocaleDateString('id-ID', { weekday: 'long' });

// ── Angka & rupiah ─────────────────────────────────────────────────────────
const UNIT = { juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3, k: 1e3, ratus: 100, miliar: 1e9, milyar: 1e9 };

/** "1.500.000" | "1,500,000" | "1,5" | "1.5" | "350000" → angka. */
function parseNum(s) {
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return Number(s.replace(/,/g, ''));
  if (/^\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return NaN;
}

const fmtNum = (n) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });
const fmtRp = (n) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

const OPS = [
  [/^(\+|tambah|ditambah|plus)$/, '+'], [/^(-|−|kurang|dikurangi|minus)$/, '-'],
  [/^(x|×|\*|kali|dikali|dikalikan)$/, '*'], [/^(\/|÷|:|bagi|dibagi)$/, '/'],
];
const CALC_WORDS = new Set(['dari', 'diskon', 'potongan', 'potong', 'naik', 'turun', 'harga', 'untuk']);
/** Kata satuan yang boleh menempel pada angka tanpa mengubah hitungan. */
const COUNT_WORDS = new Set(['orang', 'pasien', 'buah', 'pcs', 'unit', 'item', 'sesi', 'bulan', 'hari', 'minggu', 'tahun', 'kursi', 'dokter']);

/** Pecah kalimat hitungan menjadi token angka/operator/kata. null bila ada kata lain (bukan hitungan murni). */
function tokenize(raw) {
  let s = raw.toLowerCase().replace(/[?!]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i += 1) {
    s = s.replace(/^(=\s*|tolong |coba |bantu |hitung(kan)? |berapa |hasil( dari)? |jadi berapa )/, '').trim();
    s = s.replace(/(\s*=|\s+berapa|\s+jadi berapa|\s+hasilnya( berapa)?|\s+ya)$/, '').trim();
  }
  const re = /\s*(?:(rp\.?\s*)?(\d[\d.,]*)\s*(juta|jt|ribu|rb|k|ratus|miliar|milyar)?\s*(%|persen)?(?![a-z])|([+\-−×*/÷:x])(?![a-z])|([a-z]+))/gy;
  const tokens = [];
  let m;
  while (re.lastIndex < s.length && (m = re.exec(s))) {
    if (m[2] !== undefined) {
      const base = parseNum(m[2].replace(/[.,]$/, ''));
      if (Number.isNaN(base)) return null;
      tokens.push({ type: 'num', value: base * (UNIT[m[3]] || 1), money: Boolean(m[1] || m[3]), pct: Boolean(m[4]) });
    } else {
      const w = m[5] || m[6];
      const op = OPS.find(([r]) => r.test(w));
      if (op) tokens.push({ type: 'op', op: op[1] });
      else if (CALC_WORDS.has(w)) tokens.push({ type: 'word', w });
      else if (COUNT_WORDS.has(w) && tokens[tokens.length - 1]?.type === 'num') continue; // "3 orang"
      else return null;
    }
  }
  if (re.lastIndex < s.length) return null;
  return tokens;
}

/** Kalkulator: "2 juta dibagi 30", "15% dari 2 juta", "diskon 20% dari 350rb", "2 juta naik 10%". */
export function calculate(raw) {
  if (!/\d/.test(raw || '')) return null;
  const tk = tokenize(raw);
  if (!tk || tk.length < 3) return null;
  const sig = tk.map((x) => (x.type === 'num' ? (x.pct ? 'P' : 'N') : x.type === 'op' ? x.op : x.w)).join(' ');
  const nums = tk.filter((x) => x.type === 'num');
  const money = nums.some((x) => x.money);
  const out = (v) => (money ? fmtRp(v) : fmtNum(v));
  // operand ditampilkan apa adanya (pengali "× 3" bukan "× Rp 3"); hasil memakai Rupiah bila ada nilai uang
  const show = (x) => (x.pct ? `${fmtNum(x.value)}%` : x.money ? fmtRp(x.value) : fmtNum(x.value));

  // persen dari: "15% dari 2 juta"
  if (/^P dari N$/.test(sig)) {
    const [p, b] = nums;
    return `${show(p)} dari ${out(b.value)} = **${out((p.value / 100) * b.value)}**`;
  }
  // diskon: "diskon 20% dari 350rb" / "harga 350rb diskon 10%"
  const disc = /^(diskon|potongan) P (dari|untuk) N$/.test(sig) ? [nums[1], nums[0]]
    : /^(harga )?N (diskon|potong|potongan) P$/.test(sig) ? [nums[0], nums[1]] : null;
  if (disc) {
    const [b, p] = disc;
    const cut = (p.value / 100) * b.value;
    return `Diskon ${show(p)} dari ${out(b.value)} = **${out(cut)}** → harga setelah diskon **${out(b.value - cut)}**. 🏷️`;
  }
  // naik/turun persen: "2 juta naik 10%", "350rb + 10%"
  const change = sig.match(/^N (naik|turun|\+|-) P$/);
  if (change) {
    const [b, p] = nums;
    const up = change[1] === 'naik' || change[1] === '+';
    const delta = (p.value / 100) * b.value;
    return `${out(b.value)} ${up ? 'naik' : 'turun'} ${show(p)} = **${out(up ? b.value + delta : b.value - delta)}** (${up ? 'bertambah' : 'berkurang'} ${out(delta)})`;
  }
  // ekspresi biasa: N op N op N … (× ÷ didahulukan)
  if (!/^N( [-+*/] N)+$/.test(sig)) return null;
  const vals = [nums[0].value];
  const ops = [];
  tk.forEach((x, i) => { if (x.type === 'op') { ops.push(x.op); vals.push(tk[i + 1].value); } });
  if (ops.some((o, i) => o === '/' && vals[i + 1] === 0)) return 'Waduh, angka tidak bisa dibagi nol. 😅';
  const stack = [vals[0]];
  const pend = [];
  ops.forEach((o, i) => {
    const v = vals[i + 1];
    if (o === '*') stack[stack.length - 1] *= v;
    else if (o === '/') stack[stack.length - 1] /= v;
    else { pend.push(o); stack.push(v); }
  });
  const result = pend.reduce((acc, o, i) => (o === '+' ? acc + stack[i + 1] : acc - stack[i + 1]), stack[0]);
  const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const expr = tk.map((x) => (x.type === 'num' ? show(x) : sym[x.op])).join(' ');
  return `${expr} = **${out(result)}**`;
}

// ── Tanggal ────────────────────────────────────────────────────────────────
const ymd = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((ymd(b) - ymd(a)) / 864e5);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
function addMonths(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}
const NUMW = '(\\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua belas)';
const UNITW = '(hari|minggu|pekan|bulan|tahun)';
const ASK = '(?:tanggal berapa|hari apa|kapan|jatuh (?:tanggal|hari) apa|tanggal)';
const REL = new RegExp(`^(?:${ASK} )?(?:${NUMW} ${UNITW}|se(hari|minggu|pekan|bulan|tahun))( lagi| ke ?depan| dari sekarang| kemudian| yang lalu| lalu| sebelumnya)(?: ${ASK})?$`);
const MONTHW = `(${MONTHS.join('|')})`;
const WEEKDAY_Q = new RegExp(`^(?:hari apa (?:tanggal )?)?(?:tanggal )?(\\d{1,2}) ${MONTHW}(?: (\\d{4}))?(?: itu)?(?: hari apa)?$`);
const EVENTS = { 'tahun baru': [0, 1, '🎆'], natal: [11, 25, '🎄'], '17 agustus': [7, 17, '🇮🇩'], 'hari kemerdekaan': [7, 17, '🇮🇩'], valentine: [1, 14, '💝'] };
const UNTIL = new RegExp(`^(?:berapa hari lagi (?:ke |menuju )?(${Object.keys(EVENTS).join('|')})|(${Object.keys(EVENTS).join('|')}) (?:berapa hari lagi|tinggal berapa hari))$`);
const EOM = /^(berapa hari lagi (ke )?akhir bulan|akhir bulan (berapa hari lagi|tinggal berapa hari)|sisa hari( di)? bulan ini|bulan ini (tinggal|sisa) berapa hari)$/;

/** Hitung tanggal dari kalimat ternormalisasi. null bila bukan pertanyaan tanggal murni. */
export function dateCalc(t, now) {
  const rel = t.match(REL);
  if (rel) {
    const n = rel[1] ? (Number(rel[1]) || NUMBER_WORDS[rel[1]]) : 1;
    const unit = rel[2] || rel[3];
    const past = /(lalu|sebelumnya)/.test(rel[4]);
    const k = past ? -n : n;
    const d = unit === 'hari' ? addDays(now, k) : (unit === 'minggu' || unit === 'pekan') ? addDays(now, 7 * k)
      : unit === 'bulan' ? addMonths(now, k) : addMonths(now, 12 * k);
    const label = `${n} ${unit}`;
    if (past) return `${label} yang lalu adalah **${dateOf(d)}**. 📅`;
    const recall = unit === 'bulan' && [3, 6, 12].includes(n) ? ' — pas untuk jadwal kontrol rutin pasien. 🦷' : '';
    return `${label} lagi jatuh pada **${dateOf(d)}**. 📅${recall}`;
  }
  if (EOM.test(t)) {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const n = daysBetween(now, last);
    return n === 0 ? 'Hari ini sudah akhir bulan! 🗓️' : `Bulan ini tinggal **${n} hari** lagi (sampai ${dateOf(last)}). 🗓️`;
  }
  const until = t.match(UNTIL);
  if (until) {
    const key = until[1] || until[2];
    const [m, day, icon] = EVENTS[key];
    let target = new Date(now.getFullYear(), m, day);
    if (daysBetween(now, target) < 0) target = new Date(now.getFullYear() + 1, m, day);
    const n = daysBetween(now, target);
    return n === 0 ? `Hari ini ${key}! ${icon}` : `**${n} hari** lagi menuju ${key} (${dateOf(target)}). ${icon}`;
  }
  const wq = t.match(WEEKDAY_Q);
  if (wq && /hari apa/.test(t)) {
    const day = Number(wq[1]);
    const m = MONTHS.indexOf(wq[2]);
    let year = wq[3] ? Number(wq[3]) : now.getFullYear();
    let d = new Date(year, m, day);
    if (d.getMonth() !== m) return null;
    if (!wq[3] && daysBetween(now, d) < 0) { year += 1; d = new Date(year, m, day); }
    return `${day} ${wq[2][0].toUpperCase()}${wq[2].slice(1)} ${year} jatuh pada hari **${weekdayOf(d)}**. 📅`;
  }
  return null;
}

// ── Nama panggilan ─────────────────────────────────────────────────────────
const NAME_RE = /^(?:perkenalkan,?\s+)?(?:panggil\s+(?:aku|saya)|nama\s+(?:saya|aku|ku)(?:\s+adalah)?|namaku(?:\s+adalah)?|call\s+me)\s+(.+)$/i;
const TITLES = /^(drg|dr|drh)\.?$/i;

/** "panggil aku Bu Rina" → "Bu Rina" (null bila bukan nama yang wajar). `isWordy` menolak kata data/umum. */
export function extractName(raw, isWordy) {
  const m = (raw || '').trim().match(NAME_RE);
  if (!m) return null;
  let name = m[1].replace(/[\p{Extended_Pictographic}️!?,…]+/gu, ' ').replace(/\s+/g, ' ').trim();
  name = name.replace(/\s+(ya|yah|dong|aja|saja|deh|ok|oke)$/i, '').replace(/\.$/, '').trim();
  const words = name.split(' ');
  if (!name || name.length > 30 || words.length > 4 || !/^[\p{L}][\p{L} .'-]*$/u.test(name) || isWordy(name)) return null;
  return words.map((w) => (TITLES.test(w) && words.length > 1 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join(' ');
}

// ── Buka halaman ───────────────────────────────────────────────────────────
/** Halaman admin yang bisa dibuka Denti: [alias…], rute, label. */
const PAGES = [
  [['dashboard', 'beranda', 'home', 'halaman utama', 'halaman depan'], '/admin', 'Dashboard'],
  [['pasien', 'data pasien', 'daftar pasien', 'patients'], '/pasien', 'Data Pasien'],
  [['pendaftaran pasien', 'registrasi pasien', 'tambah pasien', 'pasien baru'], '/pasien/daftar', 'Pendaftaran Pasien'],
  [['keuangan', 'dashboard keuangan', 'finance'], '/keuangan', 'Keuangan'],
  [['pembayaran', 'kasir', 'transaksi', 'payments'], '/admin/pembayaran', 'Pembayaran'],
  [['tindakan', 'master tindakan', 'daftar tindakan', 'treatment', 'treatments'], '/admin/treatments', 'Master Tindakan'],
  [['biaya dan modal', 'biaya & modal', 'biaya modal', 'costing', 'modal', 'hpp'], '/admin/costing', 'Biaya & Modal'],
  [['pengeluaran', 'expenses'], '/admin/pengeluaran', 'Pengeluaran'],
  [['recall', 'recall pasien'], '/admin/recall', 'Recall Pasien'],
  [['laporan', 'report', 'reports'], '/admin/laporan', 'Laporan'],
  [['pengaturan', 'setting', 'settings'], '/admin/pengaturan', 'Pengaturan'],
  [['pengguna', 'user', 'users', 'staf', 'karyawan', 'akun pengguna'], '/admin/pengguna', 'Pengguna'],
  [['audit', 'log audit', 'audit log'], '/admin/audit-log', 'Log Audit'],
  [['jadwal dokter', 'jadwal praktik', 'jadwal praktek'], '/admin/jadwal-dokter', 'Jadwal Dokter'],
  [['jadwal', 'kalender', 'jadwal kunjungan', 'janji temu', 'schedule'], '/admin/jadwal', 'Jadwal Kunjungan'],
  [['booking', 'permintaan booking', 'booking masuk'], '/booking-requests', 'Permintaan Booking'],
  [['layar antrean', 'layar antrian', 'antrean tv', 'layar tv', 'tv antrean'], '/admin/pengaturan?tab=queue-display', 'Pengaturan › Layar Antrean TV'],
  [['pengaturan booking', 'booking online'], '/admin/pengaturan?tab=booking', 'Pengaturan › Booking Online'],
  [['pengaturan whatsapp', 'pengaturan whatsap', 'whatsapp', 'whatsap', 'wa', 'pengaturan wa'], '/admin/pengaturan?tab=whatsapp', 'Pengaturan › WhatsApp'],
  [['qris', 'pengaturan pembayaran'], '/admin/pengaturan?tab=payments', 'Pengaturan › Pembayaran & QRIS'],
  [['langganan', 'billing', 'paket langganan'], '/admin/pengaturan?tab=billing', 'Pengaturan › Langganan'],
  [['tema', 'tampilan', 'tema tampilan'], '/admin/pengaturan?tab=appearance', 'Pengaturan › Tampilan Tema'],
  [['satusehat', 'satu sehat'], '/admin/pengaturan?tab=satusehat', 'Pengaturan › SATUSEHAT'],
  [['profil', 'profil saya', 'profile'], '/profil', 'Profil Saya'],
];
const NAV_RE = /^(?:tolong |coba )?(?:buka|bukakan|ke|pergi ke|pindah ke|tampilkan|lihat|arahkan( saya| aku)? ke|antar( saya| aku)? ke|menuju|go to|open|show)( halaman| menu| page| tab)? (.+?)(nya)?$/;

/** "buka jadwal dokter" → { to, label }. Hanya bila sisa kalimat persis nama halaman. */
export function navigateTo(t) {
  const m = t.match(NAV_RE);
  if (!m) return null;
  const target = m[4].replace(/^(halaman|menu|page) /, '').trim();
  const page = PAGES.find(([aliases]) => aliases.includes(target));
  return page ? { to: page[1], label: page[2] } : null;
}

/** "hapus percakapan", "mulai baru" → bersihkan obrolan. */
export const isClearCommand = (t) => /^(hapus|bersihkan|reset|kosongkan|clear)( semua)? (percakapan|obrolan|chat|riwayat( chat| obrolan| percakapan)?)( ini)?$|^mulai (baru|dari awal|percakapan baru|obrolan baru)$|^(new chat|clear chat)$/.test(t);
