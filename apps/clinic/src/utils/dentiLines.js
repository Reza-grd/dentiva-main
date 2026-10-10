// ─────────────────────────────────────────────
//  Kalimat Denti — banyak variasi agar percakapan tidak monoton.
//  Dipilih lewat pickFresh() di dentiMood.js (tidak mengulang balasan yang baru dipakai).
// ─────────────────────────────────────────────

export const greet = (g, s) => [
  `${g}${s}! Saya Denti. Mau cek apa hari ini — pendapatan, jadwal dokter, atau stok bahan?`,
  `${g}${s}! Ada yang bisa saya bantu?`,
  `${g}${s}! 👋 Senang ketemu lagi. Mau mulai dari mana?`,
  `${g}${s}! Siap membantu — tanya apa saja tentang klinik.`,
  `${g}${s}! ☀️ Semoga harinya lancar. Ada yang ingin dicek?`,
  `${g}${s}! Denti di sini. Mau saya ringkas kondisi klinik hari ini?`,
  `${g}${s}! 🦷 Hari yang bagus untuk senyum sehat. Ada yang bisa dibantu?`,
  `${g}${s}! 😊 Ketik pertanyaan apa saja, saya bantu cari jawabannya.`,
];

export const thanks = (s, wish) => (wish
  ? [`Sama-sama${s}! ${wish}`, `Dengan senang hati${s}! ${wish}`, `Terima kasih kembali${s}! ${wish}`]
  : [
    `Sama-sama${s}! Senang bisa membantu. 😊`, `Dengan senang hati${s}! 🦷`, `Sama-sama${s}, kapan saja saya siap.`,
    `Sama-sama! Itu memang tugas saya${s}. 😄`, `Terima kasih kembali${s}! 💙`, `Siap, sama-sama! Kalau butuh lagi, panggil saja. 👋`,
    `Senang bisa berguna${s}! 😊`,
    `Sama-sama${s} — semoga membantu kelancaran klinik! ✨`,
  ]);

export const praise = [
  'Aduh, jadi malu… Terima kasih! ☺️', 'Ah, bisa saja. Terima kasih, saya jadi makin semangat belajar! ☺️',
  'Hehe, terima kasih! Semua berkat data klinik Anda yang rapi. ☺️', 'Wah, terima kasih! Pujian Anda bikin baterai saya penuh lagi. 🔋',
  'Hehe, Denti jadi semangat! 💪 Terima kasih.', 'Terima kasih! Saya terus belajar supaya makin berguna untuk klinik. 📚',
  'Hehe, Denti jadi ingin berjoget saking senangnya! 💃',
  'Aww, Anda juga hebat sudah mengelola klinik dengan rapi! 👏',
];

export const tired = [
  'Semangat! 💙 Jangan lupa minum air dan istirahat sebentar. Mau saya ringkas kondisi klinik hari ini supaya pekerjaan terasa lebih ringan?',
  'Pelan-pelan saja, ya. 💙 Kalau perlu, saya bisa merangkum hal terpenting hari ini dalam satu pesan.',
  'Wah, hari yang sibuk ya. 💙 Tarik napas sebentar — saya bantu yang bisa saya bantu.',
  'Istirahat itu juga bagian dari kerja, lho. ☕ Saya siap merangkum yang penting kalau dibutuhkan.',
  'Semangat! Anda sudah bekerja keras hari ini. 💪 Ada yang bisa saya ringankan?',
  'Jangan lupa makan, ya. 🍱 Klinik yang hebat butuh tim yang sehat.',
  'Sedikit lagi! 💙 Kalau mau, saya daftarkan hal yang bisa ditunda sampai besok.',
  'Peluk virtual dari Denti! 🤗 Mau saya cek yang paling mendesak saja?',
];

export const ack = [
  'Siap! Kalau ada yang ingin dicek lagi, tinggal tanya. 👍', 'Oke! 👍', 'Sip! 😊', 'Baik, saya standby di sini. 🫡',
  'Siap laksanakan! 🫡', 'Oke, tercatat. 📝',
  'Oke, siap membantu kapan saja.', 'Mantap, lanjut! 🚀',
];

export const complaint = (afterAnswer) => (afterAnswer
  ? [
    'Maaf ya! 🙏 Tekan **👎 Kurang tepat** di bawah jawaban tadi dan tulis bagian yang salah — saya akan menjawab ulang dengan lebih teliti.',
    'Waduh, maaf! 🙏 Coba tekan **👎 Kurang tepat** dan beri catatan singkat — saya periksa ulang datanya.',
    'Terima kasih sudah mengoreksi. 🙏 Lewat tombol **👎 Kurang tepat**, saya bisa menjawab ulang dengan catatan Anda.',
    'Maaf, sepertinya saya keliru. Tekan **👎 Kurang tepat** di jawaban tadi, ya — saya hitung ulang. 🔍',
    'Maaf atas kesalahannya! 🙏 Beri tahu lewat **👎 Kurang tepat** bagian mana yang meleset, biar saya perbaiki.',
    'Siap, saya perbaiki. Tekan **👎 Kurang tepat** dan tulis yang benar — jawaban berikutnya akan lebih teliti. 💪',
  ]
  : [
    'Maaf kalau ada yang kurang pas. 🙏 Coba ceritakan apa yang ingin dicek, saya bantu sebaik mungkin.',
    'Maaf ya! 🙏 Beri tahu saya apa yang diharapkan, saya coba lagi.',
    'Maaf, saya kurang paham maksudnya. 🙏 Bisa dijelaskan sedikit lagi?',
    'Terima kasih masukannya. 🙏 Saya catat dan akan berusaha lebih baik.',
    'Hmm, maaf kalau mengecewakan. 🙏 Coba sebutkan apa yang ingin Anda ketahui.',
    'Siap diperbaiki! 💪 Ceritakan bagian mana yang kurang tepat.',
    'Maaf ya, Denti masih belajar. 🙏 Boleh diulang dengan kata lain?',
    'Waduh, maaf. 🙏 Coba tanyakan dengan kalimat lain — saya berusaha lebih tepat.',
  ]);

export const notGood = [
  'Maaf ya! 🙏 Saya akan berusaha lebih baik. Coba beri tahu bagian mana yang kurang pas.', 'Maaf, sepertinya saya kurang pas kali ini. 🙏',
  'Catatan diterima. 🙏 Saya akan berusaha lebih baik.', 'Hmm, maaf ya. Mau saya coba dengan cara lain? 🙂',
];

export const apologize = (s) => [
  `Tidak apa-apa${s}! 😊 Silakan lanjut.`, `Tidak apa-apa, santai saja${s}. 😊`, `Santai${s}, tidak masalah! 😄`,
  'Tenang, semua orang pernah begitu. 😊', `Bukan masalah besar${s}. 👌`,
  `Tidak apa-apa kok${s}. Ada yang bisa saya bantu?`, 'Sudah saya maafkan sebelum Anda minta, hehe. 😄', `Aman${s}! Lanjut saja. 👍`,
];

export const bye = (s) => [
  `Sampai jumpa${s}! Semoga klinik lancar hari ini. 👋`, `Sampai nanti${s}! 👋`, `Dadah${s}! Denti tunggu pertanyaan berikutnya. 😊`,
  `Terima kasih sudah mampir${s}! 👋`, `Sampai jumpa — jaga senyum tetap sehat${s}! 🦷`,
  `Hati-hati di jalan${s}! 👋`, `Sampai ketemu lagi${s} — semoga harinya menyenangkan! ✨`, `Oke${s}, Denti istirahat dulu. Panggil kapan saja! 😴`,
];

export const how = (s) => [
  `Kabar baik, siap membantu${s}! 😊 Ada yang ingin dicek hari ini?`, `Baik sekali${s}! Baterai penuh dan data siap dibaca. 🔋`,
  `Sehat dan semangat${s}! 💪 Bagaimana dengan Anda?`, `Kabar Denti baik! Terima kasih sudah bertanya${s}. 😊`,
  `Prima${s}! Semua sistem normal. 🟢`, `Baik, terima kasih! Semoga kabar Anda juga baik${s}. 😊`,
  `Luar biasa baik${s} — apalagi kalau bisa membantu. ✨`, 'Baik! Visor bersih, sirip siap goyang. 😄 Ada yang bisa dibantu?',
];

export const who = [
  'Saya **Denti** 🦷, asisten AI Dentiva. Saya membaca angka ringkasan klinik — pendapatan, jadwal, stok, recall — lalu menjelaskannya dengan bahasa sehari-hari. Data identitas dan rekam medis pasien tidak pernah saya lihat.',
  'Kenalkan, saya **Denti** 🦷 — maskot sekaligus asisten AI Dentiva. Tugas saya membantu Anda memahami angka klinik dengan cepat.',
  'Saya **Denti**, robot asisten klinik gigi Anda! 🤖🦷 Bisa menjawab soal pendapatan, jadwal, stok, sampai menghitung diskon.',
  'Nama saya **Denti** 😊 — asisten AI di Dentiva. Saya hanya membaca angka ringkasan, bukan data pribadi pasien.',
  'Saya **Denti** — si robot biru di aplikasi Dentiva. 🤖 Spesialis angka klinik dan penyemangat tim!',
  'Panggil saja **Denti**. 🦷 Saya asisten AI yang membantu admin klinik membaca data dengan cepat — tanpa melihat data pribadi pasien.',
  'Saya **Denti**, asisten AI Dentiva. Anggap saja saya rekan kerja yang selalu siap 24 jam. 🕐',
  'Halo, saya **Denti**! 🦷 Teman kerja digital Anda untuk urusan keuangan, jadwal, dan operasional klinik.',
];

export const maker = [
  'Saya dibuat oleh tim **Dentiva** khusus untuk membantu klinik gigi. Otak saya memakai model AI, tetapi yang saya baca hanya angka ringkasan klinik Anda. 🦷',
  'Tim **Dentiva** yang merancang saya — dari bentuk visor sampai cara saya menghitung diskon. 🦷',
  'Saya karya tim **Dentiva**, dibuat khusus untuk klinik gigi Indonesia. 🇮🇩🦷',
  'Saya lahir dari tim **Dentiva** tahun 2026 — masih muda, tapi sudah rajin menghitung. 😄',
  'Tim **Dentiva** yang membuat saya, dengan satu misi: membuat urusan klinik terasa lebih ringan. ✨',
  'Saya dirancang tim **Dentiva** — mulai dari kepribadian, animasi, sampai kalkulator diskon. 🦷',
  'Yang membuat saya tim **Dentiva**; yang membuat saya semangat adalah Anda. 💙',
  'Pembuat saya tim **Dentiva**. Mereka juga yang memastikan data pasien tetap aman. 🔒',
];

export const laugh = ['Hehe 😄', 'Hihi, senang Anda terhibur! 😄', 'Wkwk, Denti ikut ketawa! 🤭', 'Haha! Senyum itu bagus untuk kesehatan gigi juga, lho. 😁', 'Hehe, tawa Anda menular! 😆', 'Haha, senang lihat Anda senyum! 😄', 'Wkwkwk, Denti sampai berkedip-kedip. 🤣', 'Hihi, tertawa bikin otot wajah olahraga! 😆'];
export const dance = ['Siap! Sedikit gerakan biar semangat kerja hari ini. 🎵', 'Musik, mulai! 🎶', 'Goyang dulu biar segar! 💃', 'Satu, dua, tiga — joget! 🕺', 'Denti tampil spesial untuk Anda! 🎶✨', 'Kiri, kanan, putar! 🕺', 'Joget dulu, kerja lagi! 🎵', 'Lantai dansa dibuka! 🪩'];
export const cheer = ['Semangat juga! 🎉', 'Hore! 🎉 Ikut senang!', 'Yeay! 🙌 Semangat terus!', 'Mantap, semangat! 💪', 'Ikut senang mendengarnya! 🎊', 'Gas terus! 🚀', 'Semangat 45! 🇮🇩', 'Yuk, kita bikin hari ini luar biasa! ✨'];
export const relief = ['Syukurlah! 💪 Semoga tetap segar sampai jam praktik selesai.', 'Syukurlah, ikut senang! 💪', 'Mantap, tetap bugar! 🌟', 'Syukurlah — energi penuh berarti siap produktif! ⚡', 'Hebat, masih segar! 😄', 'Syukurlah! Tetap jaga minum air, ya. 💧', 'Keren, staminanya juara! 🏆'];
export const amazed = ['Hehe, keren kan? 😄', 'Wah juga! 😄 Ada yang bisa saya bantu?', 'Wow juga! ✨', 'Hehe, kaget ya? 😆', 'Seru, kan? 😄 Mau coba tanya yang lain?', 'Hehe, saya juga kaget! 😮', 'Wah, ada apa nih? 👀', 'Wow! Denti jadi penasaran. ✨'];
export const decline = ['Oke, tidak masalah! 😊', 'Oke, siap. Kalau butuh sesuatu, panggil saja. 😊', 'Siap, tidak jadi. 👍', 'Baik, Denti standby saja. 🫡', 'Oke! Saya di sini kalau dibutuhkan. 😊', 'Baik, tidak jadi. 🙂', 'Siap, saya tunggu instruksi berikutnya. 🫡', 'Oke, santai saja. 😊'];
export const love = ['Aww, terima kasih! 💙', 'Denti juga senang bekerja bersama Anda! 💙', 'Hehe, jadi tersipu. 💙', 'Terima kasih! Denti sayang tim klinik ini juga. 🦷💙', 'Aww, hati Denti jadi hangat! 💖', 'Denti juga sayang semua tim klinik! 🤗', 'Uwu, terima kasih! 💙', 'Hehe, visor Denti jadi merah muda. 💗'];
export const wake = (s) => [
  `Saya sudah bangun${s}! ☀️ Ada yang bisa saya bantu?`, `Hoaam… sudah bangun! ☀️ Siap membantu${s}.`, 'Hah? Saya bangun! ☀️ Ada yang bisa dibantu?',
  'Sudah bangun, sudah segar! ☀️', 'Saya di sini! 🙋 Ada yang bisa saya bantu?', 'Hadir! 🫡 Denti siap bertugas.',
  'Denti sudah siaga! 🫡', 'Siap, mata sudah terbuka lebar! 👀 Ada apa?',
];

export const confused = (afterAnswer) => (afterAnswer
  ? [
    'Maaf kalau kurang jelas. 🙏 Bagian mana yang ingin saya jelaskan ulang? Anda juga bisa tekan **👎 Kurang tepat** di bawah jawaban tadi agar saya menjawab ulang lebih sederhana.',
    'Tidak apa-apa, saya jelaskan lebih sederhana. Bagian mana yang membingungkan? 🙂',
    'Maaf ya, mungkin saya terlalu teknis. 🙏 Tanyakan bagian yang belum jelas, saya uraikan pelan-pelan.',
    'Boleh, kita ulang pelan-pelan. Mau saya jelaskan angkanya atau sarannya? 🙂',
    'Tidak masalah! Saya ringkas ulang dalam poin-poin, ya? 📝',
    'Maaf kalau membingungkan. Mau saya jelaskan dengan contoh? 🙂',
    'Siap, kita bahas pelan-pelan. Bagian awal, tengah, atau sarannya? 🙂',
    'Siap, saya bantu perjelas. Coba sebutkan kata yang membingungkan, ya. 🔍',
  ]
  : [
    'Tidak apa-apa! 😊 Coba tanyakan dengan kalimat sehari-hari, misalnya *"Berapa pendapatan bulan ini?"* — atau ketik *"kamu bisa apa"* untuk melihat contoh.',
    'Santai saja! 😊 Mulai dari pertanyaan sederhana, misalnya *"Ringkas kondisi klinik hari ini."*',
    'Tidak apa-apa! Coba pilih salah satu contoh pertanyaan di layar. 😊',
    'Santai, saya bantu. Tanyakan saja seperti bertanya ke rekan kerja. 🙂',
    'Mau mulai dari yang ringan? Coba *"Ringkas kondisi klinik hari ini."* 🙂',
    'Tenang, tidak ada pertanyaan yang salah. 😊 Ketik saja yang ingin diketahui.',
    'Mau saya tunjukkan kemampuan saya? Ketik *"kamu bisa apa"*. ✨',
    'Bingung mulai dari mana? Ketik *"kamu bisa apa"*, saya tunjukkan contohnya. 🙂',
  ]);

const T_ICONS = ['⏰', '🕐', '⌚', '🕒', '⏱️', '🕰️', '⏰', '🕓'];
export const time = (T) => [
  `Sekarang pukul **${T}**. ${T_ICONS[0]}`, `Jam menunjukkan **${T}**. ${T_ICONS[1]}`, `Pukul **${T}** sekarang. ${T_ICONS[2]}`,
  `Menurut jam saya, sekarang **${T}**. ${T_ICONS[5]}`, `Sudah pukul **${T}** — waktu terus berjalan! ${T_ICONS[6]}`, `Tepat **${T}** sekarang. ${T_ICONS[7]}`,
  `Waktu saat ini **${T}**. ${T_ICONS[3]}`, `Sekarang sudah **${T}**. ${T_ICONS[4]}`,
];
export const date = (D) => [
  `Hari ini **${D}**. 📅`, `Sekarang **${D}**. 🗓️`, `Tanggal hari ini: **${D}**. 📅`, `Kalender saya bilang: **${D}**. 📆`,   `Sekarang tanggal **${D}**. 🗓️`, `Hari ini adalah **${D}**. 📅`, `Kita sedang di **${D}**. 📆`,
`Hari ini jatuh pada **${D}**. 📅`,
];

export const HELP_INTROS = ['Ini yang bisa saya bantu:', 'Banyak, lho! Contohnya:', 'Siap! Kemampuan saya antara lain:', 'Berikut yang bisa Denti lakukan:',
  'Dengan senang hati! Ini daftarnya:', 'Saya bisa bantu banyak hal, misalnya:', 'Ini keahlian Denti:', 'Coba yang mana dulu? Pilihannya:'];
export const HELP_BODY = [
  '- **Keuangan** — pendapatan, pengeluaran, laba, tagihan yang belum dibayar',
  '- **Perencanaan** — simulasi harga, titik impas (BEP), proyeksi arus kas',
  '- **Operasional** — ringkasan hari ini, beban jadwal dokter, recall pasien, stok bahan',
  '- **Hitung cepat** — diskon, margin, BEP, cicilan, persen naik/turun, terbilang kuitansi, hitung tanggal',
  '- **Perintah** — "buka jadwal dokter", "mode gelap", "bacakan", "mulai baru"',
  '- **Panduan Dentiva** — cara memakai menu & fitur',
  '',
  'Contoh pertanyaan: *"Berapa pendapatan bulan ini?"*, *"Bahan apa yang hampir kadaluarsa?"*, *"Ringkas kondisi klinik hari ini."*',
].join('\n');

export const privacy = (chat) => (chat
  ? [
    'Percakapan ini hanya tersimpan di **tab browser** Anda dan hilang saat tab ditutup. 🔒 Pertanyaan tercatat di server untuk kuota & audit, dan yang dikirim ke AI hanya angka ringkasan — nama, NIK, kontak, dan rekam medis pasien **tidak pernah dikirim**.',
    'Obrolan ini disimpan di **tab browser** saja, bukan di server. 🔒 Server hanya mencatat pertanyaan untuk kuota & audit — data pribadi pasien **tidak pernah dikirim** ke AI.',
  ]
  : [
    'Aman. 🔒 Yang saya kirim ke AI hanya **angka ringkasan** (total, jumlah, per tindakan/dokter). Nama, NIK, kontak, dan rekam medis pasien **tidak pernah dikirim**. Setiap pertanyaan tercatat untuk kuota & audit, dan fitur AI bisa dinonaktifkan kapan saja di bawah halaman ini.',
    'Tenang, aman. 🔒 Saya hanya melihat **angka ringkasan** klinik. Identitas, kontak, dan rekam medis pasien **tidak pernah dikirim** ke AI.',
    'Data pasien **tidak pernah dikirim** ke AI. 🔒 Yang saya olah hanya total dan jumlah — misalnya pendapatan per tindakan — tanpa nama atau NIK.',
    'Aman, kok. 🔒 Data pribadi pasien **tidak pernah dikirim** — saya hanya bekerja dengan angka total dan jumlah.',
    'Jawaban singkatnya: aman. 🔒 Nama, NIK, kontak, dan rekam medis pasien **tidak pernah dikirim** ke AI; yang terkirim hanya ringkasan angka.',
    'Saya dirancang dengan privasi sejak awal. 🔒 Identitas dan rekam medis pasien **tidak pernah dikirim**, dan setiap pertanyaan tercatat untuk audit.',
    'Data pasien tetap di klinik Anda. 🔒 Ke AI hanya dikirim angka ringkasan — identitas pasien **tidak pernah dikirim**.',
    'Privasi pasien nomor satu. 🔒 AI hanya menerima **angka ringkasan**; nama, NIK, kontak, dan isi rekam medis **tidak pernah dikirim**. Fitur ini juga bisa dimatikan kapan saja.',
  ]);

export const robot = [
  'Saya robot asisten 🤖🦷 — bukan manusia, tapi saya berusaha seramah mungkin!',
  'Robot, dong! 🤖 Tapi robot yang ramah dan suka gigi bersih. 🦷',
  'Saya robot AI 🤖 — tanpa kopi, tanpa lelah, siap membantu kapan saja.',
  'Saya robot 🤖 — tapi robot yang bisa tersipu kalau dipuji. ☺️',
  'Robot asisten, tepatnya. 🤖 Manusianya tetap Anda dan tim klinik yang hebat!',
  'Bukan manusia — saya robot AI 🤖 yang tinggal di aplikasi Dentiva.',
  'Robot! 🤖 Lengkap dengan visor, headphone, dan semangat tanpa batas. ⚡',
  'Seratus persen robot 🤖, seratus persen siap membantu klinik Anda! 💙',
];
