/**
 * Denti yang hidup: perintah gerakan ("kedip", "lompat", "hormat"), pamer gerakan, kuis gigi interaktif,
 * dan reaksi emosi tambahan. Fungsi murni — diuji di dentiTraining.test.js. Masukan sudah dinormalkan.
 */

const pickOf = (list, seed) => list[Math.abs(seed) % list.length];
const fresh = (list, seed, recent = []) => {
  for (let k = 0; k < list.length; k += 1) {
    const c = list[(Math.abs(seed) + k) % list.length];
    if (!recent.includes(c)) return c;
  }
  return pickOf(list, seed);
};

/** [id, ekspresi, pola, balasan[]] — "perintah gerak": Denti memperagakan lalu menjawab singkat. */
export const MOVES = [
  ['wink', 'wink', /^(kedip|kedipin|kedipkan|kedip mata|kedip dong|wink|coba kedip|kedipin dong|genit)( mata)?( dong)?$/,
    ['😉 Cring! Sudah, ya.', 'Kedip~ 😉 Kena deh!', 'Wink wink! 😉✨']],
  ['jump', 'jump', /^(lompat|loncat|melompat|meloncat|jump|lompat dong|loncat loncat|lompat tinggi|coba lompat)( tinggi)?( dong)?$/,
    ['Hup! 🦘 Tinggi, kan?', 'Satu, dua, **hop**! 🤸', 'Lompat! ✨ Untung tidak menyentuh langit-langit.']],
  ['cheer', 'cheer', /^(sorak|bersorak|sorakin|sorak dong|beri semangat|kasih semangat|semangati|cheer|cheer up|dukung aku|support aku)( aku)?( dong)?$/,
    ['Ayo ayo ayo! 🎉 Kamu pasti bisa!', 'Semangaaat! 📣✨ Saya di pihak Anda!', 'Hore! 🙌 Tim klinik hebat!']],
  ['bow', 'bow', /^(hormat|beri hormat|kasih hormat|salam hormat|membungkuk|bungkuk|bungkukkan badan|bow|permisi hormat|ojigi)( dong)?$/,
    ['🙇 Hormat saya untuk Anda.', 'Dengan hormat… 🙇‍♂️✨', '🙏 Terima kasih sudah mampir.']],
  ['salute', 'salute', /^(siap komandan|siap grak|hormat komandan|laksanakan|siap laksanakan|salut|hormat grak|siap 86|izin komandan)$/,
    ['Siap, laksanakan! 🫡', 'Siap grak! 🫡 Perintah diterima.', 'Laporan diterima, Komandan! 🫡']],
  ['shrug', 'shrug', /^(angkat bahu|shrug|entahlah|entah|gak tau|nggak tau|ga tau|tidak tau|tidak tahu|nggak tahu|gak tahu|kamu tau nggak)( dong)?$/,
    ['¯\\_(ツ)_/¯ Entahlah… itu di luar pengetahuan saya.', 'Hmm, kalau yang itu saya angkat bahu dulu. 🤷', 'Saya juga belum tahu. 🤷‍♂️ Tapi bisa kita cari tahu bareng!']],
  ['cool', 'cool', /^(kacamata|pakai kacamata|pake kacamata|kacamata hitam|gaya dong|pamer gaya|gaya keren|pose|pose dong|sok keren|cool|keren dong|tampil keren|mode keren|mode cool|gaya|swag)( dong)?$/,
    ['😎 Mode keren: aktif.', 'Kacamata hitam siap! 😎✨', 'Cool, kan? 😎 Giginya pun kinclong.']],
  ['sigh', 'sigh', /^(tarik napas|tarik nafas|helakan napas|hela napas|hufff?t?|huft|fiuh|fuh|lega|napas dulu|ambil napas|santai dulu|relax|rileks)( dulu)?( dong)?$/,
    ['Hhhh… 😮‍💨 Lega rasanya.', 'Tarik napas… hembuskan… 🌬️ Sudah lebih tenang?', 'Fiuh~ 😮‍💨 Istirahat sebentar tidak apa-apa.']],
  ['idea', 'idea', /^(kasih ide|beri ide|ada ide|punya ide|ide|minta ide|ide apa|brainstorm|usul|ada usul|saran|kasih saran|butuh ide|butuh saran)( dong)?( apa)?$/,
    ['💡 Ide! Coba **promo scaling + edukasi** untuk pasien lama yang sudah >6 bulan tidak kontrol.', '💡 Ide cepat: aktifkan **pengingat H-1 hari** dan **edukasi pasca tindakan** supaya pasien merasa dirawat.', '💡 Saran: rapikan **harga tindakan** dengan melihat margin di Biaya & Modal.', '💡 Coba pasang **layar antrean TV** di ruang tunggu — pasien jadi lebih tenang dan tertib!']],
  ['peek', 'peek', /^(ngintip|intip|mengintip|sembunyi|bersembunyi|petak umpet|main petak umpet|cilukba|ciluk ba|peek|peekaboo)( dong)?$/,
    ['Cilukba! 🙈', 'Sstt… saya mengintip dari sini. 👀', 'Ketemu! 😆 Atau saya yang ketemu Anda?']],
  ['excited', 'excited', /^(girang|heboh|excited|gembira|senang|seneng|bahagia|seru|euforia|tidak sabar)( dong)?$/,
    ['Wuaaah! 🥳 Ikut girang!', 'Yeay yeay yeay! 🎊 Hari yang menyenangkan!', 'Kyaaa~ 🤩 Saya juga excited!']],
  ['spin', 'spin', /^(putar|muter|berputar|putar putar|muter muter|spin|putar badan|muterin|muter dong|putar dong)( badan)?( dong)?$/,
    ['Wuuush! 🌀 Pusing sedikit…', 'Putar~ 🌀 Ta-da!', 'Satu putaran penuh! 🌪️']],
  ['clap', 'clap', /^(tepuk tangan|plok plok|plok|clap|bertepuk tangan|tepuk dong|kasih tepuk tangan|applause)( dong)?$/,
    ['👏👏👏 Plok plok plok!', 'Tepuk tangan untuk kita semua! 👏', '👏 Bravo!']],
  ['nod', 'nod', /^(angguk|mengangguk|angguk dong|anggukan|setuju gak|setuju nggak|nod)( dong)?$/,
    ['Mm-hm. 🙂 Setuju!', 'Angguk angguk. 👍', 'Betul sekali. 😊']],
  ['brush', 'brush', /^(sikat gigi|gosok gigi|menyikat gigi|brush|brushing|sikat gigi dong|peragakan sikat gigi|contohkan sikat gigi)( dong)?$/,
    ['Sikat gigi 2× sehari, 2 menit, gerakan lembut melingkar. 🪥', 'Zing zing! 🪥 Jangan lupa bagian belakang gigi dan lidah.', 'Gosok pelan-pelan ya, jangan terlalu keras. 🪥✨']],
  ['tooth', 'tooth', /^(pamer gigi|gigi berkilau|gigi kinclong|tunjukkan gigi|senyum gigi|show your teeth|gigi dong)$/,
    ['Kinclong! ✨🦷 Rajin sikat gigi, ya.', 'Ting! 🦷✨ Gigi sehat, senyum cerah.']],
];

const SHOWOFF = /^(gerakan apa saja|bisa gerak apa|bisa gerakan apa|gerak apa( saja)?|gerakan apa( saja)?|tunjukkan gerakan|tunjukin gerakan|atraksi|pamer gerakan|pamerkan gerakan|show of+|unjuk gerakan|beraksi|aksi dong|atraksi dong|gerakan lain|gerak apa lagi|kamu bisa apa saja gerakan|gerakan kamu)( dong| lagi)?$/;
const SHOWOFF_SEQ = ['wave', 'wink', 'jump', 'cool', 'spin', 'cheer', 'bow'];

// ── Kuis gigi ────────────────────────────────────────────────────────────────
export const QUIZ = [
  { q: 'Berapa lama idealnya menyikat gigi setiap kali?', a: ['2 menit', 'dua menit', '2menit', '120 detik'], full: '**2 menit**, dua kali sehari.', hint: 'Angkanya kecil, satuannya menit.' },
  { q: 'Berapa jumlah gigi permanen orang dewasa (termasuk gigi bungsu)?', a: ['32', 'tiga puluh dua'], full: '**32 gigi** (28 bila tanpa gigi bungsu).', hint: 'Lebih dari 30, kurang dari 35.' },
  { q: 'Mineral apa pada pasta gigi yang menguatkan email gigi?', a: ['fluoride', 'fluor', 'florida', 'flouride'], full: '**Fluoride** — membantu remineralisasi email.', hint: 'Dimulai huruf F.' },
  { q: 'Lapisan terluar gigi yang paling keras disebut apa?', a: ['email', 'enamel'], full: '**Email (enamel)** — jaringan paling keras di tubuh manusia.', hint: 'Mirip kata surat elektronik, tapi untuk gigi.' },
  { q: 'Berapa bulan sekali sebaiknya kontrol ke dokter gigi?', a: ['6 bulan', 'enam bulan', 'setengah tahun', '6bulan'], full: '**Setiap 6 bulan** untuk pemeriksaan dan pembersihan karang gigi.', hint: 'Dua kali setahun.' },
  { q: 'Plak yang mengeras di gigi dan hanya bisa dibersihkan dokter disebut apa?', a: ['karang gigi', 'kalkulus', 'tartar', 'calculus'], full: '**Karang gigi (kalkulus)** — dibersihkan lewat scaling.', hint: 'Dibersihkan dengan tindakan scaling.' },
  { q: 'Makanan/minuman apa yang paling sering memicu gigi berlubang?', a: ['gula', 'manis', 'sugar', 'permen', 'minuman manis', 'makanan manis'], full: '**Gula** — diubah bakteri menjadi asam yang merusak email.', hint: 'Rasanya manis.' },
  { q: 'Berapa usia anak biasanya mulai tumbuh gigi susu pertama?', a: ['6 bulan', 'enam bulan', '6 sampai 10 bulan', '6bulan'], full: 'Sekitar **6 bulan** (kisaran 6–10 bulan).', hint: 'Setengah tahun.' },
  { q: 'Benang khusus untuk membersihkan sela gigi namanya apa?', a: ['dental floss', 'floss', 'benang gigi', 'flos', 'benang floss'], full: '**Dental floss** — pakai sekali sehari.', hint: 'Dalam bahasa Inggris, dimulai huruf F.' },
  { q: 'Radang pada gusi (gusi merah dan mudah berdarah) disebut apa?', a: ['gingivitis', 'ginggivitis', 'gingivitis'], full: '**Gingivitis** — tahap awal penyakit gusi, bisa pulih bila dirawat.', hint: 'Diawali "Gingi…"' },
  { q: 'Gigi yang tumbuh paling akhir, biasanya usia 17–25 tahun, disebut apa?', a: ['gigi bungsu', 'wisdom', 'wisdom tooth', 'molar tiga', 'molar 3', 'geraham bungsu'], full: '**Gigi bungsu (molar ketiga)**.', hint: 'Seperti anak paling kecil di keluarga.' },
  { q: 'Seberapa sering sebaiknya mengganti sikat gigi?', a: ['3 bulan', 'tiga bulan', '3bulan', 'setiap 3 bulan'], full: 'Ganti **setiap 3 bulan** atau saat bulunya mekar.', hint: 'Satu kuartal.' },
  { q: 'Vitamin yang membantu tubuh menyerap kalsium untuk tulang dan gigi?', a: ['d', 'vitamin d', 'vit d'], full: '**Vitamin D** — dari sinar matahari pagi dan makanan tertentu.', hint: 'Disebut vitamin sinar matahari.' },
  { q: 'Tindakan membersihkan karang gigi dengan alat ultrasonik disebut apa?', a: ['scaling', 'skeling', 'skaling'], full: '**Scaling**.', hint: 'Diawali huruf S, sering dijadwalkan tiap 6 bulan.' },
];
const GIVE_UP = /^(nyerah|menyerah|aku nyerah|saya nyerah|jawabannya|apa jawabannya|kasih tahu|kasih tau|kasih tahu jawabannya|tidak tahu|gak tau|nggak tau|ga tau|tidak tau|skip|lewat|ganti soal|soal lain|pass|kasih jawabannya|bocoran|jawaban)( dong)?$/;
const HINT = /^(petunjuk|hint|kasih petunjuk|clue|bantu dong|kasih clue|kasih hint|minta petunjuk)( dong)?$/;
const QUIZ_START = /^(kuis|quiz|main kuis|ayo kuis|kuis gigi|kuis dong|tebak gigi|tebak tebakan gigi|uji pengetahuan|uji pengetahuan gigi|tes pengetahuan|kuis lagi|soal lagi|soal kuis|main tebak tebakan|tebak tebakan|trivia|trivia gigi|tantang aku|tantang saya|ayo main)( dong| lagi)?$/;
const normGuess = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// ── Reaksi emosi tambahan ────────────────────────────────────────────────────
const EMO = [
  ['proud', 'cool', /^(?:aku|saya) (?:berhasil|lulus|menang|sukses|dapat|dapet)\b|^(?:sukses|lulus|menang)$/,
    ['Selamat! 🎉 Anda hebat — saya ikut bangga! 😎', 'Keren banget! 🥳 Pasti kerja kerasnya terbayar.', 'Yeay, congrats! 🎊']],
  ['sad', 'sorry', /^(?:(?:aku|saya) )?(?:sedih|kecewa|galau|down|sakit hati|patah hati|menangis|nangis)$|^huhu+( .*)?$/,
    ['Peluk virtual dulu ya… 🤗 Mau cerita? Saya siap mendengarkan.', 'Tidak apa-apa merasa begitu. 💙 Pelan-pelan saja, ya.', 'Saya di sini. 🤗 Tarik napas dulu, lalu kita cari jalan keluarnya.']],
  ['angry', 'sorry', /^(?:(?:aku|saya) )?(?:marah|kesal|jengkel|emosi|geram|sebel|sebal)$/,
    ['Wah, pasti melelahkan. 😮‍💨 Mau saya bantu cari akar masalahnya?', 'Saya paham. 🙏 Tarik napas dalam dulu — lalu ceritakan apa yang terjadi.']],
  ['scared', 'shy', /^(?:(?:aku|saya) )?(?:takut|cemas|khawatir|deg degan|gugup|panik)$/,
    ['Tenang, pelan-pelan ya. 🌿 Tarik napas… hembuskan. Kita hadapi bareng.', 'Wajar kok merasa begitu. 💙 Apa yang paling bikin khawatir?']],
  ['hungry', 'happy', /^(?:(?:aku|saya) )?(?:lapar|laper|haus)$|^(makan yuk|ngopi yuk|istirahat yuk|rehat yuk|break yuk)$/,
    ['Waktunya rehat! 🍜 Minum air putih dulu, ya — gigi juga senang.', 'Makan dulu, jangan lupa **sikat gigi** setelahnya! 🪥', 'Ngopi sebentar boleh. ☕ Tapi kumur air putih sesudahnya ya.']],
  ['sleepy', 'sigh', /^(?:aku|saya) (?:ngantuk|mengantuk|lemas|lesu)$|^(?:lemas|lesu)$/,
    ['Peregangan 1 menit dulu yuk! 🙆 Lalu air putih segelas.', 'Istirahat sebentar tidak apa-apa. 😴 Setelah itu pasti lebih segar.']],
  ['boredom', 'excited', /^(?:(?:aku|saya) )?(?:gabut|jenuh)$|^(?:aku|saya) (?:bosan|bosen)$|^ngapain$|^ngobrol yuk$|^temani aku$|^temenin aku$/,
    ['Gabut? Ayo **kuis gigi**! Ketik *"kuis"*. 🎯', 'Mau lihat gerakan? Ketik *"tunjukkan gerakan"*. 💃', 'Mau ngobrol? Tanya apa saja — atau minta *"lelucon"*! 😄']],
  ['wow', 'excited', /^(keren|hebat|mantap) (kamu|denti|animasinya|gerakannya|gerakanmu|ekspresinya)$|^(animasinya|gerakannya|ekspresinya) (keren|bagus|lucu|imut)$|^lucu gerakannya$/,
    ['Terima kasih! 🥰 Saya latihan terus supaya makin ekspresif.', 'Hehe, malu… 😳 Terima kasih ya!', 'Wah, senang sekali! 🤩 Mau lihat gerakan lainnya? Ketik *"tunjukkan gerakan"*.']],
];

/**
 * → { intent, state, reply, action? } | null
 * ctx: { seed, recent, quiz } — quiz = indeks soal yang sedang berjalan (atau null).
 */
export function funReply(t0, { seed = 0, recent = [], quiz = null, name = '' } = {}) {
  if (!t0) return null;
  const t = t0.replace(/^(?:(?:coba|tolong|bisa|boleh|mau|ayo|yuk|kamu) )+/, '');
  const sapa = name ? `, ${name}` : '';

  // sedang kuis: tebakan / menyerah / petunjuk
  if (quiz != null && QUIZ[quiz]) {
    const item = QUIZ[quiz];
    if (GIVE_UP.test(t)) {
      return { intent: 'quizReveal', state: 'shrug', reply: `Tidak apa-apa! Jawabannya: ${item.full} 😊 Mau soal lain? Ketik *"kuis"*.`, action: { type: 'quiz', idx: null } };
    }
    if (HINT.test(t)) return { intent: 'quizHint', state: 'idea', reply: `💡 Petunjuk: ${item.hint}` };
    const g = normGuess(t);
    if (g && g.split(' ').length <= 6 && !QUIZ_START.test(t)) {
      const right = item.a.some((k) => {
        const kk = normGuess(k);
        return g === kk || g.includes(kk) || (kk.length >= 5 && kk.includes(g) && g.length >= 5);
      });
      if (right) return { intent: 'quizRight', state: 'cheer', reply: `**Benar!** 🎉 ${item.full} Mau lagi? Ketik *"kuis"*.`, action: { type: 'quiz', idx: null } };
      return { intent: 'quizWrong', state: 'confused', reply: `Hmm, belum tepat${sapa}. 🤔 Coba lagi, atau ketik *"petunjuk"* / *"nyerah"*.` };
    }
  }
  if (QUIZ_START.test(t)) {
    const idx = (Math.abs(seed) + (quiz == null ? 0 : quiz + 1)) % QUIZ.length;
    return { intent: 'quiz', state: 'idea', reply: `🎯 **Kuis gigi!** Pertanyaan:\n\n**${QUIZ[idx].q}**\n\nKetik jawabanmu. Boleh minta *"petunjuk"* atau *"nyerah"*.`, action: { type: 'quiz', idx } };
  }

  if (SHOWOFF.test(t)) {
    return { intent: 'showoff', state: 'cheer', reply: 'Siap, atraksi dimulai! 🎪 Lihat ya… (Anda juga bisa minta: *kedip, lompat, hormat, kacamata, putar, tepuk tangan, ngintip, angkat bahu, tarik napas, kasih ide*).', action: { type: 'showoff', seq: SHOWOFF_SEQ } };
  }
  const mv = MOVES.find(([, , re]) => re.test(t));
  if (mv) return { intent: `move:${mv[0]}`, state: mv[1], reply: fresh(mv[3], seed, recent) };
  const emo = EMO.find(([, , re]) => re.test(t));
  if (emo) return { intent: `emo:${emo[0]}`, state: emo[1], reply: fresh(emo[3], seed, recent) };
  return null;
}

export const FUN_STATES = [...new Set([...MOVES.map((m) => m[1]), ...EMO.map((e) => e[1])])];

/** Kata bermakna dari pola gerakan/emosi/kuis — dipakai agar tidak "dikoreksi" ke kata lain saat normalisasi. */
export const FUN_WORDS = [...new Set([...MOVES, ...EMO].flatMap(([, , re]) => String(re.source).match(/[a-z]{3,}/g) || [])
  .concat(String(QUIZ_START.source + SHOWOFF.source + GIVE_UP.source + HINT.source).match(/[a-z]{3,}/g) || []))];
