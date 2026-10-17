/**
 * Eira yang hidup: perintah gerakan ("kedip", "lompat", "hormat"), pamer gerakan, kuis gigi interaktif,
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

/** [id, ekspresi, pola, balasan[]] — "perintah gerak": Eira memperagakan lalu menjawab singkat. */
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
  ['stretch', 'stretch', /^(meregang|regang|peregangan|stretching|stretch|regangkan badan|renggangkan badan|ayo meregang|rilekskan badan|olahraga ringan)( dulu)?( dong)?$/,
    ['Aaah~ 🙆 Peregangan dulu supaya punggung tidak kaku.', 'Regang… tahan… lepas. 😌 Badan lebih ringan!', 'Bahu, leher, punggung — sudah? Yuk lanjut kerja. 💪']],
  ['flex', 'flex', /^(pamer otot|otot|flex|tunjukkan otot|tunjukin otot|kuat|kekuatan|tunjukkan kekuatan|kamu kuat|pamer kekuatan|bodybuilder|mode kuat|mode otot)( dong)?$/,
    ['Otot digital! 💪 Kuat kan? Setara 0,0 kg angkatan.', 'Hup! 💪✨ Siap angkat laporan sebulan penuh.', 'Lihat bisep saya! 😤💪 (Baterai penuh.)']],
  ['phone', 'phone', /^(telepon|telpon|nelpon|menelepon|angkat telepon|angkat telpon|telepon dong|pura pura telepon|phone|call me|terima telepon)( dong)?$/,
    ['Halo, halo? 📞 Dengan Eira di sini!', 'Sebentar ya, ada telepon masuk… 📱 Ya, baik, siap!', 'Tut tut… 📞 Klinik Dentiva, ada yang bisa dibantu?']],
  ['search', 'search', /^(cari cari|mencari|pura pura mencari|detektif|mode detektif|main detektif|kaca pembesar|pakai kaca pembesar|selidiki|menyelidik|investigasi|cek cek)( dong)?$/,
    ['Mode detektif! 🔎 Mencari petunjuk…', 'Hmm, ada yang mencurigakan. 🕵️ Atau cuma debu?', 'Kaca pembesar siap! 🔍 Apa yang kita cari?']],
  ['coffee', 'coffee', /^(ngopi|minum kopi|kopi|kopi dulu|ngopi dulu|ayo ngopi|secangkir kopi|coffee break|ngopi santai|bikin kopi|seruput)( dulu)?( dong)?$/,
    ['Seruput~ ☕ Nikmat! Setelah ini kumur air putih ya.', 'Coffee break! ☕ Lima menit saja, lalu semangat lagi.', 'Aroma kopi… ☕✨ Gigi pun ikut rileks.']],
  ['dizzy', 'dizzy', /^(puter puter|mode pusing|pura pura pusing|kepala berputar|mabuk|kliyengan|puyeng|pusing tujuh keliling)( dong)?$/,
    ['Wuuu… dunia berputar. 😵‍💫 Sebentar ya…', 'Pusing tujuh keliling! 🌀 Oke, sudah stabil lagi.', 'Bintang-bintang berputar~ ✨😵']],
  ['angry', 'angry', /^(pura pura marah|mode marah|ngambek|pasang muka marah|muka marah|wajah marah|sok marah|angry)$/,
    ['Grrr! 😠 (Cuma pura-pura, kok. Saya tetap baik hati.)', 'Hmph! 😤 Saya ngambek… sampai Anda tersenyum.', 'Awas ya! 😡 …eh, tidak jadi. Saya sayang Anda. 💙']],
  ['cry', 'cry', /^(pura pura nangis|nangis kejer|nangis bombay|hiks|hiks hiks|huhu hiks|tangisan|peragakan nangis|cengeng)( dong)?$/,
    ['Hiks hiks… 😢 (Akting, ya. Saya baik-baik saja!)', 'Huhu… 😭 Air mata digital mengalir.', 'Sedih sebentar… 🥲 sudah, lanjut lagi!']],
  ['tooth', 'tooth', /^(pamer gigi|gigi berkilau|gigi kinclong|tunjukkan gigi|senyum gigi|show your teeth|gigi dong)$/,
    ['Kinclong! ✨🦷 Rajin sikat gigi, ya.', 'Ting! 🦷✨ Gigi sehat, senyum cerah.']],
];

const SHOWOFF = /^(gerakan apa saja|bisa gerak apa|bisa gerakan apa|gerak apa( saja)?|gerakan apa( saja)?|tunjukkan gerakan|tunjukin gerakan|atraksi|pamer gerakan|pamerkan gerakan|show of+|unjuk gerakan|beraksi|aksi dong|atraksi dong|gerakan lain|gerak apa lagi|kamu bisa apa saja gerakan|gerakan kamu)( dong| lagi)?$/;
const SHOWOFF_SEQ = [['wave', 1600], 'wink', 'jump', 'cool', 'flex', 'spin', 'cheer', 'bow'];
const SHOWOFF_FULL = /^(semua gerakan|tunjukkan semua gerakan|tunjukin semua gerakan|atraksi lengkap|pertunjukan|show lengkap|full show|pamer semua gerakan|gerakan lengkap|pertunjukan lengkap)( dong)?$/;
const SHOWOFF_FULL_SEQ = [['wave', 1600], 'wink', 'cool', 'flex', 'jump', 'spin', 'dizzy', 'stretch', 'coffee', 'phone', 'search', 'angry', 'cry', 'excited', 'cheer', 'salute', 'bow'];

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
  { q: 'Berapa jumlah gigi susu (sulung) lengkap pada anak?', a: ['20', 'dua puluh'], full: '**20 gigi susu**.', hint: '10 di atas, 10 di bawah.' },
  { q: 'Sekitar usia berapa gigi susu mulai tanggal digantikan gigi tetap?', a: ['6 tahun', 'enam tahun', '6'], full: 'Sekitar **6 tahun**.', hint: 'Biasanya saat masuk SD.' },
  { q: 'Jaringan lunak di dalam gigi yang berisi saraf dan pembuluh darah disebut apa?', a: ['pulpa', 'pulp', 'pulpa gigi'], full: '**Pulpa**.', hint: 'Diawali "Pul…".' },
  { q: 'Lapisan di bawah email, lebih lunak dan membuat ngilu bila terbuka, disebut apa?', a: ['dentin', 'dentine'], full: '**Dentin**.', hint: 'Diawali "Den…".' },
  { q: 'Perawatan untuk menyelamatkan gigi yang pulpanya terinfeksi disebut apa?', a: ['saluran akar', 'perawatan saluran akar', 'root canal', 'endodontik', 'endo', 'psa'], full: '**Perawatan saluran akar** (root canal / endodontik).', hint: 'Yang dibersihkan adalah bagian akarnya.' },
  { q: 'Kebiasaan menggertakkan gigi saat tidur disebut apa?', a: ['bruxism', 'bruksisme', 'bruxisme'], full: '**Bruxism**.', hint: 'Diawali huruf B.' },
  { q: 'Gigi runcing di sudut lengkung gigi, untuk menyobek makanan, disebut apa?', a: ['taring', 'kaninus', 'caninus', 'canine', 'gigi taring'], full: '**Gigi taring (kaninus)**.', hint: 'Namanya sama dengan milik harimau.' },
  { q: 'Berapa jumlah gigi seri (insisif) orang dewasa, atas dan bawah?', a: ['8', 'delapan'], full: '**8 gigi seri** (4 atas, 4 bawah).', hint: 'Empat di atas, empat di bawah.' },
  { q: 'Obat suntik yang membuat area gigi mati rasa sementara disebut apa?', a: ['anestesi', 'bius', 'anestesi lokal', 'bius lokal'], full: '**Anestesi lokal**.', hint: 'Biasa disebut bius.' },
  { q: 'Foto dengan sinar apa yang dipakai dokter gigi untuk melihat akar dan tulang?', a: ['rontgen', 'sinar x', 'x ray', 'xray', 'radiografi'], full: '**Rontgen (sinar-X)**.', hint: 'Namanya diambil dari nama penemunya.' },
  { q: 'Tindakan melapisi alur gigi geraham anak agar tidak berlubang disebut apa?', a: ['sealant', 'fissure sealant', 'pit and fissure sealant', 'fissure', 'sealan'], full: '**Fissure sealant**.', hint: 'Namanya berarti "penutup".' },
  { q: 'Pemutihan gigi dalam istilah dokter gigi disebut apa?', a: ['bleaching', 'whitening', 'pemutihan', 'tooth whitening'], full: '**Bleaching**.', hint: 'Sama dengan pemutih pakaian.' },
  { q: 'Perawatan merapikan gigi memakai kawat atau braket termasuk bidang apa?', a: ['ortodonti', 'orthodonti', 'ortodontik', 'behel', 'kawat gigi', 'braces'], full: '**Ortodonti** (behel / kawat gigi).', hint: 'Diawali "Orto…".' },
  { q: 'Cairan alami di mulut yang menetralkan asam dan melindungi gigi?', a: ['air liur', 'saliva', 'ludah'], full: '**Air liur (saliva)**.', hint: 'Mulut kering membuat gigi mudah berlubang.' },
  { q: 'Kekurangan vitamin apa yang bisa membuat gusi mudah berdarah?', a: ['vitamin c', 'vit c', 'c'], full: '**Vitamin C**.', hint: 'Banyak di jeruk dan jambu biji.' },
  { q: 'Lubang pada gigi akibat asam bakteri disebut apa dalam istilah medis?', a: ['karies', 'caries', 'karies gigi'], full: '**Karies**.', hint: 'Diawali "Kar…".' },
  { q: 'Berapa menit sebaiknya menunggu setelah minum soda atau jus jeruk sebelum menyikat gigi?', a: ['30 menit', 'tiga puluh menit', '30', 'setengah jam'], full: 'Sekitar **30 menit**, agar email yang melunak tidak terkikis.', hint: 'Setengah jam.' },
  { q: 'Seberapa banyak pasta gigi untuk balita di bawah 3 tahun?', a: ['sebutir beras', 'butir beras', 'seukuran beras', 'sebesar butir beras', 'beras'], full: 'Seukuran **sebutir beras** (anak 3–6 tahun: seukuran biji kacang polong).', hint: 'Sangat sedikit — seperti bulir makanan pokok kita.' },
  { q: 'Pada usia berapa anak sebaiknya pertama kali dibawa ke dokter gigi?', a: ['1 tahun', 'satu tahun', 'setahun', 'saat gigi pertama tumbuh'], full: 'Sekitar **usia 1 tahun**, atau saat gigi pertama tumbuh.', hint: 'Tidak perlu menunggu gigi berlubang.' },
  { q: 'Gigi tiruan dengan akar titanium yang ditanam di tulang rahang disebut apa?', a: ['implan', 'implan gigi', 'dental implant', 'implant'], full: '**Implan gigi**.', hint: 'Akarnya buatan, ditanam di tulang.' },
  { q: 'Tutup buatan yang membungkus seluruh bagian gigi yang terlihat disebut apa?', a: ['crown', 'mahkota', 'mahkota gigi', 'dental crown'], full: '**Mahkota (crown)**.', hint: 'Namanya seperti hiasan raja.' },
  { q: 'Radang gusi tingkat lanjut yang merusak tulang penyangga gigi disebut apa?', a: ['periodontitis'], full: '**Periodontitis**.', hint: 'Lanjutan dari gingivitis.' },
  { q: 'Berapa jumlah gigi permanen dewasa bila tanpa gigi bungsu?', a: ['28', 'dua puluh delapan'], full: '**28 gigi**.', hint: '32 dikurangi 4.' },
  { q: 'Kondisi kurang air liur yang membuat gigi mudah berlubang disebut apa?', a: ['mulut kering', 'xerostomia', 'kering mulut'], full: '**Mulut kering (xerostomia)**.', hint: 'Mulut terasa kering, kurang air liur.' },
];

/** Fakta gigi ringan (bukan nasihat medis) — dipilih berdasarkan seed, menghindari yang baru dipakai. */
export const FACTS = [
  'Email gigi adalah **jaringan paling keras di tubuh manusia** — tetapi tidak bisa tumbuh kembali bila rusak.',
  'Orang dewasa punya **32 gigi permanen** (termasuk 4 gigi bungsu); anak punya **20 gigi susu**.',
  'Susunan gigi tiap orang unik, jadi bisa dipakai untuk **identifikasi forensik** — seperti sidik jari.',
  'Air liur menetralkan asam dan melindungi gigi; tubuh memproduksi sekitar **1–1,5 liter per hari**.',
  'Gusi yang **berdarah saat menyikat** bukan hal normal — sering tanda awal radang gusi (gingivitis).',
  'Plak mulai terbentuk lagi dalam **hitungan jam** setelah menyikat gigi — makanya sikat rutin 2× sehari.',
  'Menyikat **terlalu keras** justru bisa mengikis gusi dan email. Pelan, melingkar, 2 menit.',
  'Setelah minum soda atau jus jeruk, tunggu **±30 menit** sebelum menyikat agar email yang melunak tidak terkikis.',
  'Permen karet **bebas gula** merangsang air liur dan membantu membersihkan sisa makanan.',
  'Lidah juga perlu dibersihkan — banyak **bau mulut** berasal dari bakteri di permukaan lidah.',
  'Gigi geraham tetap pertama tumbuh sekitar usia **6 tahun**, sering tidak disadari orang tua.',
  'Anak sebaiknya pertama kali diperiksa dokter gigi sekitar **usia 1 tahun** atau saat gigi pertama tumbuh.',
  'Pasta gigi ber-**fluoride**: sebutir beras untuk balita, sebesar biji kacang polong untuk anak 3–6 tahun dan dewasa.',
  'Karang gigi **tidak bisa hilang dengan sikat** — hanya bisa dibersihkan dokter lewat scaling.',
  'Stres bisa memicu **bruxism** (menggertakkan gigi), yang lama-lama mengikis permukaan gigi.',
  'Menggigit kuku, es batu, atau benda keras bisa membuat **gigi retak**.',
  'Merokok meningkatkan risiko penyakit gusi dan **memperlambat penyembuhan** setelah tindakan.',
  'Gigi bungsu tidak selalu harus dicabut — dokter menilai dari posisi, ruang, dan keluhannya.',
  'Di mulut hidup **ratusan spesies bakteri**; sebagian besar tidak berbahaya selama kebersihan terjaga.',
  'Gigi tampak putih seperti tulang, tetapi **gigi bukan tulang** — strukturnya berbeda.',
  'Menurut WHO, penyakit mulut diperkirakan memengaruhi **sekitar 3,5 miliar orang** di dunia.',
  'Kontrol rutin **tiap 6 bulan** membantu menemukan lubang kecil sebelum terasa sakit.',
  'Ganti sikat gigi **setiap 3 bulan** atau saat bulunya sudah mekar.',
  'Dental floss dipakai **sekali sehari** — sela gigi adalah tempat plak yang tidak terjangkau sikat.',
  'Minum air putih setelah makan membantu **membilas sisa makanan** dan menetralkan asam ringan.',
];
const FACT_ASK = /^(fun fact|kasih fakta|beri fakta|ada fakta|fakta apa|tahukah kamu|tahukah anda|tau gak|tau nggak|tau tidak|tahu tidak|tahu nggak|tahu gak|info menarik|informasi menarik|ceritakan sesuatu|kasih info menarik|fakta seru)( dong| gigi)?$/;
// ── Permainan kecil (tanpa keadaan; hasil dari seed) ──
const COIN = /^(lempar koin|koin|flip coin|toss|tos|toss koin|lempar uang logam|undi koin|lempar koin dong|tos koin)( dong)?$/;
const DICE = /^(lempar dadu|dadu|roll dice|kocok dadu|lempar dadunya|main dadu|dadu dong)( dong)?$/;
const CHOOSE = /^(?:pilihin|pilihkan|tentukan|undi|bantu pilih|bantu pilihin|bantu tentukan) (?:antara )?(.{1,28}?) (?:atau|or|vs) (.{1,28})$/;
// opsi yang menyangkut data/urusan klinik ('tentukan harga scaling atau tambal') bukan undian iseng
const CHOOSE_DATA = /(harga|tarif|pasien|dokter|tindakan|laporan|biaya|bulan|jadwal|stok|bahan|pendapatan|pengeluaran|laba|margin|booking|tagihan|kunjungan|klinik|diskon|promo|obat|resep|staf|\d)/;
const RPS_START = /^(main suit|suit|jankenpon|batu gunting kertas|ayo suit|main batu gunting kertas|suit dong|ayo main suit|main jankenpon)( dong)?$/;
const RPS_PICK = /^(batu|gunting|kertas)( dong)?$/;
const RPS = ['batu', 'gunting', 'kertas'];
const RPS_EMOJI = { batu: '✊', gunting: '✌️', kertas: '✋' };
const BEATS = { batu: 'gunting', gunting: 'kertas', kertas: 'batu' }; // kunci mengalahkan nilai
const AGAIN_FUN = /^(lagi|satu lagi|sekali lagi|ulangi|ulang|ulangi lagi|lagi lagi|yang lain|lainnya|another one|more|ulang lagi)( dong| yuk| deh)?$/;
const GIVE_UP = /^(nyerah|menyerah|aku nyerah|saya nyerah|jawabannya|apa jawabannya|kasih tahu|kasih tau|kasih tahu jawabannya|tidak tahu|gak tau|nggak tau|ga tau|tidak tau|skip|lewat|ganti soal|soal lain|pass|kasih jawabannya|bocoran|jawaban)( dong)?$/;
const HINT = /^(petunjuk|hint|kasih petunjuk|clue|bantu dong|kasih clue|kasih hint|minta petunjuk)( dong)?$/;
const QUIZ_START = /^(kuis|quiz|main kuis|ayo kuis|kuis gigi|kuis dong|tebak gigi|tebak tebakan gigi|uji pengetahuan|uji pengetahuan gigi|tes pengetahuan|kuis lagi|soal lagi|soal kuis|main tebak tebakan|tebak tebakan|trivia|trivia gigi|tantang aku|tantang saya|ayo main)( dong| lagi)?$/;
const normGuess = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const dist = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
};
/** Jawaban benar bila: sama persis, memuat kunci sebagai kata utuh, kunci memuat tebakan panjang (≥5), atau salah ketik 1 huruf. */
const isRight = (g, answers) => answers.some((k) => {
  const kk = normGuess(k);
  if (!kk) return false;
  if (g === kk || ` ${g} `.includes(` ${kk} `)) return true;
  if (kk.length >= 5 && kk.includes(g) && g.length >= 5) return true;
  return kk.length >= 6 && g.length >= 5 && !/\d/.test(kk + g) && dist(g, kk) <= 1;
});

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
export function funReply(t0, { seed = 0, recent = [], quiz = null, name = '', lastIntent = null } = {}) {
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
      if (isRight(g, item.a)) return { intent: 'quizRight', state: 'cheer', reply: `**Benar!** 🎉 ${item.full} Mau lagi? Ketik *"kuis"*.`, action: { type: 'quiz', idx: null } };
      return { intent: 'quizWrong', state: 'confused', reply: `Hmm, belum tepat${sapa}. 🤔 Coba lagi, atau ketik *"petunjuk"* / *"nyerah"*.` };
    }
  }
  // "lagi" setelah gerakan / fakta / kuis → ulangi jenis yang sama
  if (quiz == null && lastIntent && AGAIN_FUN.test(t)) {
    if (lastIntent.startsWith('move:')) {
      const mv = MOVES.find((m) => m[0] === lastIntent.slice(5));
      if (mv) return { intent: lastIntent, state: mv[1], reply: fresh(mv[3], seed + 1, recent) };
    }
    if (lastIntent === 'fact') return { intent: 'fact', state: 'idea', reply: `🦷 **Tahukah Anda?** ${fresh(FACTS, seed + 1, recent.map((r) => r.replace(/^.*?\*\* /, '')))}` };
    if (['quizRight', 'quizReveal', 'quiz'].includes(lastIntent)) return funReply('kuis', { seed: seed + 1, recent, quiz: null, name });
    if (lastIntent === 'showoff') return funReply('atraksi', { seed, recent, quiz: null, name });
    if (lastIntent === 'coin') return funReply('lempar koin', { seed: seed + 1, recent, quiz: null, name });
    if (lastIntent === 'dice') return funReply('lempar dadu', { seed: seed + 1, recent, quiz: null, name });
    if (lastIntent === 'rpsPlay' || lastIntent === 'rps') return funReply('main suit', { seed, recent, quiz: null, name });
  }
  if (COIN.test(t)) {
    const side = Math.abs(seed) % 2 ? 'Gambar' : 'Angka';
    return { intent: 'coin', state: 'spin', reply: `🪙 *Cling!* Koin berputar… hasilnya: **${side}**!\n\nKetik *"lagi"* untuk melempar ulang.` };
  }
  if (DICE.test(t)) {
    const n = (Math.abs(seed) % 6) + 1;
    return { intent: 'dice', state: 'jump', reply: `🎲 Dadu bergulir… muncul **${n}**!\n\nKetik *"lagi"* untuk melempar ulang.` };
  }
  const ch = t.match(CHOOSE);
  if (ch && !CHOOSE_DATA.test(`${ch[1]} ${ch[2]}`)) {
    const options = [ch[1].trim(), ch[2].trim()];
    const pick = options[Math.abs(seed) % 2];
    return { intent: 'choose', state: 'idea', reply: `🤔 Hmm… saya pilih **${pick}**! ${pickOf(['Keputusan final. 😎', 'Feeling saya bilang begitu. ✨', 'Kalau ragu, ikuti kata Eira! 😄'], seed)}` };
  }
  if (RPS_START.test(t)) {
    return { intent: 'rps', state: 'excited', reply: '✊✌️✋ **Suit!** Pilih: *batu*, *gunting*, atau *kertas* — saya sudah siap!' };
  }
  const pk = t.match(RPS_PICK);
  if (pk && lastIntent && (lastIntent === 'rps' || lastIntent === 'rpsPlay')) {
    const you = pk[1];
    const me = RPS[(Math.abs(seed) + you.length) % 3];
    const face = `Kamu ${RPS_EMOJI[you]} **${you}** vs saya ${RPS_EMOJI[me]} **${me}**.`;
    if (me === you) return { intent: 'rpsPlay', state: 'wink', reply: `${face} **Seri!** 🤝 Ketik *"lagi"* untuk ronde berikutnya.` };
    if (BEATS[me] === you) return { intent: 'rpsPlay', state: 'flex', reply: `${face} **Saya menang!** 😎💪 Mau balas dendam? Ketik *"lagi"*.` };
    return { intent: 'rpsPlay', state: 'cry', reply: `${face} **Kamu menang!** 🎉 Huhu, saya kalah… Ketik *"lagi"* untuk ronde berikutnya.` };
  }
  if (FACT_ASK.test(t)) {
    return { intent: 'fact', state: 'idea', reply: `🦷 **Tahukah Anda?** ${pickOf(FACTS, seed)}\n\nKetik *"lagi"* untuk fakta lainnya, atau *"kuis"* untuk menguji pengetahuan. 🎯` };
  }
  if (QUIZ_START.test(t)) {
    const idx = (Math.abs(seed) + (quiz == null ? 0 : quiz + 1)) % QUIZ.length;
    return { intent: 'quiz', state: 'idea', reply: `🎯 **Kuis gigi!** Pertanyaan:\n\n**${QUIZ[idx].q}**\n\nKetik jawabanmu. Boleh minta *"petunjuk"* atau *"nyerah"*.`, action: { type: 'quiz', idx } };
  }

  if (SHOWOFF_FULL.test(t)) {
    return { intent: 'showoff', state: 'cheer', reply: 'Pertunjukan lengkap dimulai! 🎭 Duduk manis… ada **17 gerakan**: melambai, kedip, kacamata, otot, lompat, putar, pusing, peregangan, ngopi, telepon, detektif, marah, nangis, girang, sorak, hormat, dan membungkuk.', action: { type: 'showoff', seq: SHOWOFF_FULL_SEQ } };
  }
  if (SHOWOFF.test(t)) {
    return { intent: 'showoff', state: 'cheer', reply: 'Siap, atraksi dimulai! 🎪 Lihat ya… (Anda juga bisa minta: *kedip, lompat, hormat, kacamata, putar, tepuk tangan, ngintip, angkat bahu, tarik napas, kasih ide, pamer otot, ngopi, telepon, detektif, meregang*; atau *"semua gerakan"* untuk pertunjukan lengkap).', action: { type: 'showoff', seq: SHOWOFF_SEQ } };
  }
  const mv = MOVES.find(([, , re]) => re.test(t));
  if (mv) return { intent: `move:${mv[0]}`, state: mv[1], reply: fresh(mv[3], seed, recent) };
  const emo = EMO.find(([, , re]) => re.test(t));
  if (emo) return { intent: `emo:${emo[0]}`, state: emo[0] === 'sad' && /(nangis|menangis|hiks|huhu)/.test(t) ? 'cry' : emo[1], reply: fresh(emo[3], seed, recent) };
  return null;
}

export const FUN_STATES = [...new Set([...MOVES.map((m) => m[1]), ...EMO.map((e) => e[1])])];

/** Kata bermakna dari pola gerakan/emosi/kuis — dipakai agar tidak "dikoreksi" ke kata lain saat normalisasi. */
export const FUN_WORDS = [...new Set([...MOVES, ...EMO].flatMap(([, , re]) => String(re.source).match(/[a-z]{3,}/g) || [])
  .concat(String(COIN.source + DICE.source + CHOOSE.source + RPS_START.source + RPS_PICK.source + QUIZ_START.source + SHOWOFF.source + SHOWOFF_FULL.source + GIVE_UP.source + HINT.source + FACT_ASK.source + AGAIN_FUN.source).replace(/\\./g, ' ').match(/[a-z]{3,}/g) || []))];
