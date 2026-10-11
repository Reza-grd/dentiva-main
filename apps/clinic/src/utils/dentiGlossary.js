/**
 * Kamus istilah Denti: "apa itu scaling?", "HPP itu apa?", "maksud odontogram", "arti BEP".
 * Berisi istilah klinik (dental) dan istilah di Dentiva. Penjelasan umum — keputusan perawatan tetap di tangan dokter.
 * Fungsi murni; teks masukan sudah dinormalkan (normalizeChat). Hanya istilah yang dikenal yang dijawab —
 * sisanya (pertanyaan data klinik) tetap diteruskan ke AI.
 */
import { PAGES } from './dentiGuide.js';

/** { id, label, aliases[], def, page? } — `page` = id halaman di PAGES untuk tawaran "buka". */
export const GLOSSARY = [
  // ── Istilah di Dentiva ──
  { id: 'soap', label: 'SOAP', aliases: ['soap', 'catatan soap', 'format soap'], page: 'tab-soap',
    def: 'Format catatan rekam medis: **S**ubjective (keluhan pasien), **O**bjective (hasil pemeriksaan), **A**ssessment (diagnosis), dan **P**lan (rencana perawatan). Template SOAP bisa diatur admin di Pengaturan.' },
  { id: 'odontogram', label: 'Odontogram', aliases: ['odontogram', 'peta gigi', 'bagan gigi'], page: 'rekam',
    def: 'Peta gigi pasien (32 gigi permanen atau 20 gigi susu) untuk mencatat kondisi tiap gigi: sehat, berlubang, tambalan, hilang, dan lainnya. Diisi **dokter** di Rekam Medis.' },
  { id: 'rm', label: 'Rekam Medis & No. RM', aliases: ['rekam medis', 'rekam medik', 'emr', 'no rm', 'nomor rm', 'norm', 'nomor rekam medis', 'no rekam medis', 'rm'], page: 'rekam',
    def: 'Rekam medis adalah catatan lengkap pemeriksaan dan perawatan pasien. **No. RM** adalah nomor unik pasien di klinik. Isinya data rahasia — hanya dokter yang menangani yang dapat membukanya.' },
  { id: 'recall', label: 'Recall', aliases: ['recall', 'recall pasien'], page: 'recall',
    def: 'Mengingatkan pasien lama untuk kontrol kembali (misalnya tiap 6 bulan). Daftarnya ada di **Recall Pasien** dan dikelola resepsionis.' },
  { id: 'hpp', label: 'HPP', aliases: ['hpp', 'hp', 'harga pokok', 'harga pokok penjualan', 'harga pokok produksi'], page: 'costing',
    def: '**Harga Pokok Penjualan**: total biaya untuk satu tindakan — bahan, tenaga, dan bagian biaya overhead. Harga jual dikurangi HPP = margin.' },
  { id: 'margin', label: 'Margin', aliases: ['margin', 'margin keuntungan', 'laba kotor'], page: 'costing',
    def: 'Selisih harga jual dan HPP. Dalam persen: (harga jual − HPP) ÷ harga jual × 100%. Makin besar margin, makin besar keuntungan per tindakan.' },
  { id: 'bep', label: 'BEP (titik impas)', aliases: ['bep', 'titik impas', 'break even', 'break even point'], page: 'costing',
    def: 'Jumlah pasien/tindakan per bulan yang dibutuhkan agar pendapatan **sama dengan** biaya (belum untung, belum rugi). Rumus: biaya tetap ÷ (harga − biaya variabel per tindakan).' },
  { id: 'overhead', label: 'Biaya overhead', aliases: ['overhead', 'biaya overhead', 'biaya tetap'], page: 'costing',
    def: 'Biaya tetap bulanan di luar bahan: sewa, listrik, gaji, internet, dan sejenisnya. Diisi di **Biaya & Modal**, lalu dibagi ke tiap tindakan.' },
  { id: 'satusehat', label: 'SATUSEHAT', aliases: ['satusehat', 'satu sehat'], page: 'tab-satusehat',
    def: 'Platform integrasi data kesehatan nasional dari Kemenkes. Dentiva dapat mengirim data kunjungan ke sana setelah klinik terhubung.' },
  { id: 'qris', label: 'QRIS', aliases: ['qris'], page: 'tab-qris',
    def: 'Kode QR standar pembayaran nasional dari Bank Indonesia. Kasir menampilkannya di halaman pembayaran.' },
  { id: 'mfa', label: 'Verifikasi dua langkah (MFA)', aliases: ['mfa', '2fa', 'verifikasi dua langkah', 'otentikasi dua faktor'], page: 'tab-keamanan',
    def: 'Lapisan keamanan tambahan: selain kata sandi, login meminta kode dari aplikasi autentikator. Akun tetap aman walau kata sandi bocor.' },
  { id: 'auditlog', label: 'Audit log', aliases: ['audit log', 'log audit', 'jejak audit'], page: 'audit',
    def: 'Catatan siapa melakukan apa dan kapan (pembayaran, pengguna, rekam medis). Kata sandi dan rahasia lain tidak pernah dicatat.' },
  { id: 'consent', label: 'Izin WhatsApp (consent)', aliases: ['izin whatsapp', 'consent', 'izin wa', 'persetujuan whatsapp'],
    def: 'Persetujuan pasien untuk dikirimi pesan WhatsApp (pengingat, invoice, edukasi). Dicentang saat pendaftaran — tanpa izin, pesan tidak dikirim.' },
  { id: 'lunas', label: 'Lunas', aliases: ['lunas', 'status lunas'],
    def: 'Status pembayaran yang sudah penuh. Bersifat **final**; setelah disimpan, invoice WhatsApp terkirim otomatis.' },
  { id: 'snapshot', label: 'Snapshot biaya', aliases: ['snapshot', 'snapshot biaya', 'snapshot stok'],
    def: 'Salinan biaya dan stok tindakan yang dicatat saat kunjungan selesai, agar laporan lama tidak berubah walau harga atau bahan berubah kemudian.' },
  { id: 'eresep', label: 'E-Prescription', aliases: ['e resep', 'eresep', 'e prescription', 'resep elektronik', 'resep obat'], page: 'rekam',
    def: 'Resep obat elektronik yang diisi dokter di Rekam Medis: nama obat, dosis, frekuensi, jumlah, dan aturan pakai.' },
  { id: 'informedconsent', label: 'Informed consent', aliases: ['informed consent', 'persetujuan tindakan', 'surat persetujuan'], page: 'rekam',
    def: 'Persetujuan tindakan: pasien menyatakan sudah paham dan setuju atas tindakan yang akan dilakukan. Tersedia di Rekam Medis (Informed Consents).' },

  // ── Istilah kedokteran gigi (umum) ──
  { id: 'scaling', label: 'Scaling', aliases: ['scaling', 'skeling', 'scalling'],
    def: 'Pembersihan **karang gigi** dengan alat ultrasonik. Dianjurkan tiap ±6 bulan agar gusi tetap sehat.' },
  { id: 'karanggigi', label: 'Karang gigi (kalkulus)', aliases: ['karang gigi', 'kalkulus', 'tartar', 'calculus'],
    def: 'Plak yang mengeras di permukaan gigi dan sela gusi. **Tidak bisa dihilangkan dengan sikat** — dibersihkan dokter lewat scaling.' },
  { id: 'plak', label: 'Plak', aliases: ['plak', 'plak gigi', 'plaque'],
    def: 'Lapisan lengket berisi bakteri yang terbentuk di permukaan gigi. Dibersihkan dengan menyikat gigi dan dental floss.' },
  { id: 'karies', label: 'Karies', aliases: ['karies', 'caries', 'gigi berlubang'],
    def: 'Gigi berlubang akibat asam yang dihasilkan bakteri dari sisa makanan manis, merusak email lalu dentin. Makin dini ditambal, makin mudah perawatannya.' },
  { id: 'gingivitis', label: 'Gingivitis', aliases: ['gingivitis', 'radang gusi'],
    def: 'Radang gusi tahap awal: gusi merah, bengkak, mudah berdarah. Biasanya bisa pulih bila kebersihan gigi membaik dan karang gigi dibersihkan.' },
  { id: 'periodontitis', label: 'Periodontitis', aliases: ['periodontitis'],
    def: 'Radang gusi tingkat lanjut yang merusak jaringan dan tulang penyangga gigi sehingga gigi bisa goyah. Perlu penanganan dokter gigi.' },
  { id: 'pulpa', label: 'Pulpa', aliases: ['pulpa', 'pulp'],
    def: 'Jaringan lunak di dalam gigi yang berisi saraf dan pembuluh darah. Bila terinfeksi, gigi terasa nyeri berdenyut.' },
  { id: 'dentin', label: 'Dentin', aliases: ['dentin', 'dentine'],
    def: 'Lapisan di bawah email gigi; lebih lunak dan berpori. Bila terbuka, gigi terasa ngilu terhadap dingin, manis, atau asam.' },
  { id: 'email', label: 'Email gigi (enamel)', aliases: ['email gigi', 'enamel', 'email'],
    def: 'Lapisan terluar gigi — jaringan **paling keras** di tubuh. Tidak tumbuh kembali bila rusak, tetapi bisa diperkuat lewat remineralisasi (mis. fluoride).' },
  { id: 'saluranakar', label: 'Perawatan saluran akar', aliases: ['saluran akar', 'perawatan saluran akar', 'root canal', 'endodontik', 'endodonti', 'psa'],
    def: 'Perawatan untuk menyelamatkan gigi yang pulpanya terinfeksi: saluran akar dibersihkan lalu ditutup, kemudian gigi ditambal atau dipasang mahkota.' },
  { id: 'tambal', label: 'Tambal gigi', aliases: ['tambal', 'tambalan', 'tambal gigi', 'resin komposit', 'komposit'],
    def: 'Menutup gigi berlubang dengan bahan tambal, misalnya **resin komposit** yang warnanya menyerupai gigi asli.' },
  { id: 'cabut', label: 'Pencabutan gigi (ekstraksi)', aliases: ['cabut gigi', 'pencabutan gigi', 'ekstraksi', 'ekstraksi gigi'],
    def: 'Mencabut gigi dari soketnya oleh dokter, umumnya dengan bius lokal. Dilakukan bila gigi tidak dapat dipertahankan.' },
  { id: 'crown', label: 'Mahkota gigi (crown)', aliases: ['crown', 'mahkota', 'mahkota gigi', 'dental crown'],
    def: 'Tutup buatan yang membungkus seluruh bagian gigi yang terlihat — untuk gigi rapuh atau yang sudah dirawat saluran akar.' },
  { id: 'veneer', label: 'Veneer', aliases: ['veneer', 'veneer gigi'],
    def: 'Lapisan tipis (porselen atau komposit) di permukaan depan gigi untuk memperbaiki warna atau bentuk.' },
  { id: 'bleaching', label: 'Bleaching', aliases: ['bleaching', 'whitening', 'pemutihan gigi', 'tooth whitening'],
    def: 'Pemutihan gigi dengan bahan pemutih di bawah pengawasan dokter. Hasil dan lamanya bergantung pada kebiasaan makan dan minum.' },
  { id: 'ortodonti', label: 'Ortodonti (behel)', aliases: ['ortodonti', 'orthodonti', 'ortodontik', 'behel', 'kawat gigi', 'braces'],
    def: 'Perawatan merapikan susunan gigi dan rahang memakai kawat dan braket (behel) atau alat lepasan. Perlu kontrol berkala.' },
  { id: 'sealant', label: 'Fissure sealant', aliases: ['sealant', 'fissure sealant', 'pit and fissure sealant'],
    def: 'Pelapis alur gigi geraham (terutama anak) agar sisa makanan tidak menumpuk dan gigi tidak mudah berlubang.' },
  { id: 'fluoride', label: 'Fluoride', aliases: ['fluoride', 'fluor', 'flouride'],
    def: 'Mineral yang menguatkan email dan membantu remineralisasi. Ada di pasta gigi dan dapat diaplikasikan dokter sebagai perawatan topikal.' },
  { id: 'bungsu', label: 'Gigi bungsu', aliases: ['gigi bungsu', 'geraham bungsu', 'impaksi', 'gigi impaksi', 'wisdom tooth', 'molar tiga'],
    def: 'Geraham ketiga yang tumbuh pada usia ±17–25 tahun. Bisa tumbuh miring atau tertahan (**impaksi**) dan kadang perlu dicabut — dokter yang menilai.' },
  { id: 'abses', label: 'Abses gigi', aliases: ['abses', 'abses gigi'],
    def: 'Kantung nanah akibat infeksi pada gigi atau gusi. Tandanya bengkak dan nyeri berdenyut — **perlu penanganan dokter segera**.' },
  { id: 'bruxism', label: 'Bruxism', aliases: ['bruxism', 'bruksisme', 'bruxisme'],
    def: 'Kebiasaan menggertakkan atau mengatupkan gigi, sering saat tidur. Dapat mengikis gigi; dokter bisa membuatkan pelindung gigi (night guard).' },
  { id: 'implan', label: 'Implan gigi', aliases: ['implan', 'implan gigi', 'dental implant', 'implant'],
    def: 'Akar gigi tiruan dari titanium yang ditanam di tulang rahang, lalu dipasangi mahkota di atasnya sebagai pengganti gigi yang hilang.' },
  { id: 'gigitiruan', label: 'Gigi tiruan', aliases: ['gigi tiruan', 'denture', 'protesa', 'gigi palsu'],
    def: 'Pengganti gigi yang hilang, bisa lepasan atau cekat, dibuat sesuai bentuk rahang pasien.' },
  { id: 'anestesi', label: 'Anestesi lokal', aliases: ['anestesi', 'anestesi lokal', 'bius lokal', 'bius gigi'],
    def: 'Obat bius yang membuat area gigi mati rasa sementara agar tindakan tidak terasa sakit.' },
  { id: 'rontgen', label: 'Rontgen gigi', aliases: ['rontgen gigi', 'rontgen', 'panoramik', 'periapikal', 'foto rontgen'],
    def: 'Foto sinar-X untuk melihat akar dan tulang. **Periapikal** memotret satu-dua gigi beserta akarnya; **panoramik** memotret seluruh rahang.' },
  { id: 'floss', label: 'Dental floss', aliases: ['dental floss', 'floss', 'benang gigi', 'flos'],
    def: 'Benang pembersih sela gigi yang tak terjangkau sikat. Dipakai sekali sehari, pelan agar gusi tidak terluka.' },
  { id: 'halitosis', label: 'Bau mulut (halitosis)', aliases: ['halitosis', 'bau mulut'],
    def: 'Bau mulut paling sering berasal dari sisa makanan dan bakteri di lidah serta sela gigi; bisa juga tanda masalah gusi. Bersihkan lidah dan lakukan scaling berkala.' },
  { id: 'ngilu', label: 'Gigi ngilu (hipersensitivitas)', aliases: ['hipersensitivitas', 'gigi ngilu', 'gigi sensitif', 'ngilu'],
    def: 'Rasa ngilu terhadap dingin, manis, atau asam karena dentin terbuka. Pasta gigi untuk gigi sensitif atau perawatan dokter dapat membantu.' },
  { id: 'gigisusu', label: 'Gigi susu', aliases: ['gigi susu', 'gigi sulung', 'gigi anak'],
    def: '20 gigi sementara pada anak. Mulai tumbuh ±6 bulan dan tanggal bertahap sekitar usia 6–12 tahun digantikan gigi tetap.' },
  { id: 'xerostomia', label: 'Mulut kering (xerostomia)', aliases: ['xerostomia', 'mulut kering', 'kering mulut'],
    def: 'Kurangnya air liur. Karena air liur melindungi gigi, mulut kering membuat gigi lebih mudah berlubang dan gusi bermasalah.' },
];

export const GLOSSARY_WORDS = [...new Set(GLOSSARY.flatMap((g) => g.aliases.flatMap((a) => a.split(' '))).concat(['istilah', 'kamus', 'arti', 'artinya', 'maksud', 'maksudnya', 'pengertian', 'definisi']))];

const POLITE = '(?:(?:tolong|coba|bisa|boleh|mau|ayo|kak|oh|eh|btw|nah|hmm|lalu|terus|kamu|anda|jadi|dong) )*';
const ASK = [
  new RegExp(`^${POLITE}(?:apa itu|apa sih|apa arti|apa artinya|apa yang dimaksud(?: dengan)?|apakah itu|arti|artinya|pengertian|definisi|maksud|maksudnya|jelaskan(?: tentang| soal| apa itu)?|jelasin(?: tentang| soal)?|terangkan|kenalkan|ceritakan tentang|mau tahu(?: tentang| soal)?|info(?: tentang| soal)?|istilah) (.+)$`),
  new RegExp(`^${POLITE}(.+?) (?:itu apa|artinya apa|maksudnya apa|apa artinya|apa maksudnya|itu artinya apa|apaan|itu apaan|adalah apa)$`),
];
const LIST = /^(?:istilah apa saja|daftar istilah|kamus istilah|kamus|kamus gigi|istilah gigi|istilah di dentiva|istilah dentiva|ada istilah apa saja|istilah apa yang kamu tahu)$/;

const clean = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const lead = /^(?:(?:arti|maksud|pengertian|definisi)(?: dari| kata)? |(?:itu|tindakan|perawatan|istilah|kata|fitur|menu|yang namanya|namanya|soal|tentang) )+/;

function dist(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/** Cari istilah: cocok persis → cocok dengan 1–2 salah ketik (kata ≥ 6 huruf). */
export function findTerm(raw) {
  const x0 = clean(raw).replace(lead, '').replace(/ (?:itu|ya|dong|sih|deh|apa)$/, '').trim();
  if (!x0 || x0.split(' ').length > 4) return null;
  // "scaling gigi" → "scaling"
  const forms = [x0, x0.replace(/ gigi$/, '')].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const x of forms) {
    const exact = GLOSSARY.find((g) => g.aliases.some((a) => clean(a) === x));
    if (exact) return exact;
  }
  const x = forms[forms.length - 1];
  if (x.length < 6) return null;
  let best = null; let bestD = 9;
  for (const g of GLOSSARY) {
    for (const a of g.aliases) {
      const al = clean(a);
      if (al.length < 6) continue;
      const lim = al.length >= 11 ? 2 : 1;
      const dd = dist(x, al);
      if (dd <= lim && dd < bestD) { best = g; bestD = dd; }
    }
  }
  return best;
}

const pageOffer = (g, role) => {
  const p = g.page && PAGES.find((x) => x.id === g.page);
  if (!p || !p.roles.includes(role)) return null;
  return { to: typeof p.to === 'string' ? p.to : p.to[role], label: p.label };
};

const SAMPLE = ['scaling', 'odontogram', 'HPP', 'BEP', 'SOAP', 'gingivitis', 'saluran akar', 'bruxism', 'sealant', 'recall', 'karies', 'implan gigi'];

/** → { intent: 'define' | 'glossaryList', state, reply, action? } | null */
export function glossaryReply(t, { role = 'admin', seed = 0 } = {}) {
  if (!t) return null;
  if (LIST.test(t)) {
    const shown = SAMPLE.slice(seed % 3, (seed % 3) + 9);
    return { intent: 'glossaryList', state: 'idea', reply: `Saya paham **${GLOSSARY.length} istilah** — dari kedokteran gigi sampai fitur Dentiva. 📖 Contoh: ${shown.map((s) => `*${s}*`).join(', ')}.\n\nTanya saja, misalnya *"apa itu ${shown[0]}?"*` };
  }
  let term = null;
  for (const re of ASK) {
    const m = t.match(re);
    if (m) { term = findTerm(m[1]); if (term) break; }
  }
  if (!term) return null;
  const others = GLOSSARY.filter((g) => g.id !== term.id);
  const next = others[(Math.abs(seed) + term.id.length) % others.length];
  const offer = pageOffer(term, role);
  const out = {
    intent: 'define', state: 'idea',
    reply: `📖 **${term.label}** — ${term.def}${offer ? `\n\nMau saya buka **${offer.label}**? Ketik *"ya"*.` : ''}\n\n*Penjelasan umum; keputusan perawatan tetap oleh dokter.* Istilah lain? Coba *"apa itu ${next.aliases[0]}?"*`,
  };
  if (offer) out.action = { type: 'offer', to: offer.to, label: offer.label };
  return out;
}
