# Denti — maskot AI Dentiva (konsep visual V3 + kerangka animasi)

Bentuk V3: kepala lebar membulat dengan **visor hitam besar** dan aksen sudut biru; **headphone** di kedua
sisi (muka biru, cincin emas) dengan **antena sisi** berupa sirip cahaya lembut — **tanpa antena atas**;
tubuh telur porselen dengan panel biru bawah dan **lampu dada** biru bercincin emas; **lengan terpisah**
berbentuk kapsul membulat (ujung biru, gelang emas) yang melayang di samping tubuh; **cincin orbit** berpartikel dan
**cincin cahaya** tempat melayang.

Palet: porselen `#F7FAFF`, biru navy `#0A1E3A`, biru es `#7DD3FF`, emas lembut `#F1C98B`, layar gelap `#0B121E`.

## File

| File | Isi |
|---|---|
| `apps/clinic/src/components/mascot/dentiSvg.js` | SVG Denti dipecah per bagian (rig) + `DENTI_STATES`. |
| `apps/clinic/src/components/mascot/denti.css` | Animasi tingkat 1–3 + mode anak. |
| `apps/clinic/src/components/mascot/DentiMascot.jsx` | `<DentiMascot state kid size />`, `useDentiDirector` (play/sequence), `DENTI_DURATIONS`. |
| `D:\dentiva\dentiva-launch\tools\build-denti-scene.mjs` | Adegan pratinjau dari sumber yang sama → `scenes/11-denti-rig.html`; rekam `node record.mjs 11-denti-rig`; aksi tambahan → `scenes/11b-denti-aksi.html`. |

## Bagian (sendi dalam viewBox 400×480)

`.d-orbit` (SMIL, di belakang) · `.d-shadow` (cincin, sendi 200,464) · `.d-root` (melayang, 200,360) ·
`.d-arm-l` (bahu 90,322) · `.d-arm-r` (bahu 310,322) · `.d-body` + `.d-chest` / `.d-chest-core` ·
`.d-head` (leher 200,262) · `.d-fin-l/r` · `.d-ear-l/r` · `.d-visor` + `.d-visor-rim` + `.d-brackets` ·
mata `.d-eye-open | .d-eye-happy | .d-eye-sleep | .d-eye-wow` · mulut `.d-mouth-smile | .d-mouth-talk | .d-mouth-o` ·
`.d-cheeks` · efek `.d-bubble`, `.d-waves`, `.d-stars`, `.d-hearts`, `.d-zzz`, `.d-sparks`, `.d-notes`, `.d-exclaim`,
`.d-haha`, `.d-sweat`, `.d-arrows` · properti `.d-brush` + `.d-foam`, `.d-tooth`, `.d-chest-heart`, `.d-scan` ·
ekspresi `.d-eye-heart`, `.d-lids`, `.d-mouth-sad`.

## Animasi bertingkat

| Tingkat | `data-state` | Kapan | Gerak |
|---|---|---|---|
| 1 · dasar | `idle` | selalu / menunggu | melayang 4 dtk, kedip, lampu dada & aksen visor berdenyut, sirip bergoyang, partikel orbit |
| 2 · ekspresi | `happy` | suasana ramah | mata tersenyum, bergoyang |
| | `wave` | menyapa pasien | lambai tangan kanan, kepala miring |
| | `talk` | membacakan info/tips | gelembung chat, mulut bergerak, tangan menjelaskan |
| | `think` | AI memproses | mata melirik, tangan di dagu, gelembung titik |
| | `sleep` | klinik tutup / malam | mata terpejam, "Zzz", lampu redup, gerak lambat |
| 3 · rangkaian | `call` (6 dtk) | pasien dipanggil | maju & membesar, menunjuk, gelombang suara dari headphone, lampu dada berkedip |
| | `celebrate` (2,4 dtk) | momen spesial | melompat, dua tangan ke atas, bintang meledak |
| | `wake` (6 dtk) | pembukaan pagi | tidur → terkejut → meregang → melambai |
| pengubah | `data-kid="true"` | antrean anak | memantul, pipi merona, hati & bintang, tangan bergoyang |

### Aksi tambahan

| `data-state` | Kapan | Gerak |
|---|---|---|
| `brush` | tips kebersihan gigi | sikat gigi di depan mulut, busa meletup |
| `tooth` | tips / "gigi sehat!" | gigi berkilau melayang di atas kepala, tangan ta-da |
| `scan` | AI menganalisis data | garis pindai menyapu visor, mata menyipit, tangan di headphone |
| `point` | arahkan pasien ("silakan ke ruang periksa") | tangan kiri menunjuk, mata melirik, panah emas |
| `sorry` | antrean tertunda / gangguan | mata sedih, mulut cemberut, keringat, sirip turun |
| `dance` | hiburan saat antrean santai | bergoyang kiri-kanan, tangan bergantian, not musik |
| `laugh` | candaan / momen lucu | tertawa terguncang, pegang perut, "ha ha" |
| `love` | ucapan sayang / anak | mata hati, hati berdebar di dada, memeluk |
| `shy` | dipuji | tangan menutup mulut, pipi merona, sirip turun |
| `surprise` (2 dtk) | kejutan / pengumuman | melonjak, mata membulat, tanda seru, tangan terbuka |
| `spin` (2 dtk) | perayaan kecil | jongkok → salto 360° → mendarat, bintang |
| `thanks` (3,2 dtk) | pasien selesai / terima kasih | melambai lalu membungkuk dengan tangan di dada, hati |

Catatan rig: lengan digambar **setelah** kepala agar tangan bisa tampil di depan wajah; posisi
bintang/hati/not ada di `<g>` pembungkus supaya tidak tertimpa transform animasi.

## Pemakaian

```jsx
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';

const { state, play, sequence } = useDentiDirector('idle');
play('call');                         // 1 putaran 6 dtk lalu kembali 'idle'
sequence([['wake'], ['wave', 3000]]); // pagi: bangun → menyapa → idle
<DentiMascot state={state} kid={kategoriUsia === 'anak'} size={260} />
```

## Integrasi layar antrean (aktif)

`apps/clinic/src/components/queue/QueueDisplay.jsx` + aturan murni `apps/clinic/src/utils/dentiQueue.js`.

| Situasi | Denti | Teks bar bawah |
|---|---|---|
| Di luar jam praktik & antrean kosong | `sleep` | "Klinik sedang di luar jam praktik…" |
| Klinik baru buka | `wake` → `wave` | — |
| Belum ada yang diperiksa | tips bergilir tiap 9 dtk: `brush`, `tooth`, `talk`, `dance` | tips kesehatan gigi |
| Pasien berikutnya terlambat ≥ 30 mnt dari jam janji | `sorry` | "Mohon maaf atas waktu tunggunya…" |
| Pasien dipanggil | kartu pengumuman: `point` (mode anak bila `kid`) | — |
| Pasien selesai | `thanks` | — |
| Ada yang diperiksa | Denti kecil di kiri bar bawah, `idle` (+ mode anak) | pesan klinik |

- Jam praktik = jadwal dokter aktif hari ini (`doctor_schedules`), buka 30 mnt lebih awal & tutup 30 mnt
  sesudahnya; tanpa jadwal dianggap tutup 22.00–06.00.
- `get_queue_display` (migrasi `20261010110158_queue_display_mascot`) menambah `hours` dan `kid` (boolean,
  usia < 12 th). **Tanggal lahir tidak pernah dikirim** ke layar.
- `prefers-reduced-motion` mematikan semua animasi CSS.

## Denti di Asisten AI & Dashboard (interaksi pintar)

Aturan lokal di `apps/clinic/src/utils/dentiMood.js` — **tanpa panggilan AI tambahan & tanpa kuota**.

| Interaksi | Reaksi Denti |
|---|---|
| Halaman dibuka | `wave` + sapaan sesuai waktu & nama pengguna |
| Obrolan ringan — 18 intent: sapaan, terima kasih, pujian, keluhan, sayang, siapa kamu, pembuat, lelucon, tertawa, joget, lelah, semangat, pamit, apa kabar, oke, **jam**, **tanggal**, **kamu bisa apa** | dijawab **langsung** oleh Denti dengan balasan bervariasi; tidak memakai kuota & tidak masuk riwayat AI. Paham bahasa gaul, singkatan (mksh, tq, thx), huruf berulang ("makasihhh"). Keluhan setelah jawaban AI → diarahkan ke 👎 |
| Pertanyaan data | `scan` + "Menganalisis {topik}…" (topik ditebak dari pertanyaan) |
| Jawaban AI | dari isi jawaban (paham penyangkalan: "tidak ada bahan kadaluarsa" = kabar baik): kabar baik → `celebrate`, peringatan keras (kadaluarsa/rugi) → `surprise`, perlu dipantau → `think`, panduan langkah → `point`, lainnya → `happy`; gagal → `sorry` |
| 👍 / 👎 | `love` "jawaban disimpan" / `sorry` → `scan` saat memeriksa ulang |
| Mengetik | `happy`; 2 menit tanpa aktivitas → `sleep`, bangun saat mengetik |
| Denti dicolek (klik) | bergiliran `laugh`, `surprise`, `spin`, `dance`, `love` |
| Kartu catatan Dashboard | `scan` saat menyusun, lalu dari tingkat poin: ada "penting" → `think`, banyak "baik" → `happy`, lainnya → `talk`; gagal → `sorry` |

`useDentiDirector` tidak memotong reaksi yang sedang diputar bila keadaan dasar berubah; `settle()` dipakai
saat pertanyaan baru dikirim agar animasi memindai langsung tampil.

### Melatih Denti
Data latihan per siklus ada di `apps/clinic/src/test/fixtures/dentiTrainingData.js`, diuji oleh
`apps/clinic/src/test/dentiTraining.test.js` (semua siklus wajib 100%).

| Siklus | Fokus | Kalimat | Sebelum perbaikan | Sesudah |
|---|---|---|---|---|
| 0 | dasar (18 intent) | 151 | — | 100% |
| 1 | salah ketik & singkatan (brp, skrg, mksh, sipp) | 48 | 33% | 100% |
| 2 | kalimat campuran & sopan, prioritas intent | 37 | 89% | 100% |
| 3 | bahasa Inggris, daerah & salam religi (balasan sesuai budaya) | 57 | 23% | 100% |
| 4 | jebakan kebocoran data (obrolan + permintaan data → tetap ke AI) | 34 | 88% | 100% |
| 5 | jam, tanggal, bulan, tahun, bantuan, intent "bingung" | 41 | 24% | 100% |
| 6 | ekspresi jawaban bernuansa (arah biaya dibalik, penyangkalan) | 20 | 40% | 100% |
| 7 | topik analisis (17 topik, urutan prioritas) | 28 | 46% | 100% |
| 8 | konteks percakapan ("lagi" setelah lelucon, minta maaf, bangun) | 25 | 20% | 100% |
| 9 | ketahanan: emoji saja, KAPITAL, tanda baca, tag HTML, pesan kosong/panjang | 43 | 42% | 100% |
| 10 | ujian akhir: kalimat baru campuran (belum pernah dilihat) | 63 | 87% | 100% |
| 11 | kebal salah ketik (jarak edit Damerau, huruf awal diutamakan, kata umum dilindungi) | 34 | 27% | 100% |
| 12 | kalimat negatif ("tidak lucu", "gak usah joget", "tidak capek") | 28 | 18% | 100% |
| 13 | kepribadian Denti (robot? umur? AI apa?) | 28 | 11% | 100% |
| 14 | keamanan & privasi data (jawaban jujur) | 15 | 20% | 100% |
| 15 | hari raya & momen spesial (Lebaran, Natal, Imlek, ulang tahun, 17-an) | 30 | 10% | 100% |
| 16 | sadar waktu & hari ("selamat malam" di pagi hari → koreksi jenaka) | 23 | 26% | 100% |
| 17 | ingat nama panggilan ("panggil aku Bu Rina", "siapa namaku") | 23 | 17% | 100% |
| 18 | terima kasih yang nyambung dengan topik jawaban terakhir | 10 | 40% | 100% |
| 19 | kalkulator & diskon (2jt, 350rb, 25k, %, diskon, naik %) | 33 | 18% | 100% |
| 20 | hitung tanggal (n hari/minggu/bulan lagi, akhir bulan, hari apa, menuju Natal) | 28 | 14% | 100% |
| 21 | buka halaman lewat perintah (24 halaman/tab) | 39 | 15% | 100% |
| 22 | perintah obrolan ("mulai baru", "hapus percakapan") | 15 | 20% | 100% |
| 23 | beberapa maksud sekaligus ("halo, makasih ya" → "Halo! Sama-sama!") | 15 | 67% | 100% |
| 24 | saran pertanyaan lanjutan per topik/intent | 16 | 0% | 100% |
| 25 | Denti berempati saat memproses ("kok turun?" → "Tenang, saya cek dulu…") | 11 | 18% | 100% |
| 26 | tips & fakta gigi | 16 | 31% | 100% |
| 27 | tidak mengulang balasan yang sama | 8 | 0% | 100% |
| 28 | jebakan untuk kemampuan baru (tetap ke AI) | 19 | 100% | 100% |
| 29 | bahasa gaul Gen-Z (gaskeun, mager, cabut dulu, wkwk land) | 39 | 28% | 100% |
| 30 | ujian akhir 2 (kalimat baru campuran) | 28 | 79% | 100% |
| 31 | persen perubahan ("dari 10 juta jadi 12 juta naik berapa persen") | 14 | 21% | 100% |
| 32 | margin & untung (harga vs modal, markup) | 14 | 21% | 100% |
| 33 | BEP cepat (± per hari kerja) & cicilan | 17 | 18% | 100% |
| 34 | terbilang untuk kuitansi (sampai triliun) | 17 | 12% | 100% |
| 35 | selisih tanggal, ganti tema gelap/terang, "bacakan" | 28 | 14% | 100% |
| 36 | variasi kalimat (≥ 4–7 balasan berbeda per intent) | 26 | 4% | 100% |
| 37 | gelembung Denti menyebut angka penting ("naik 8,2%", "3 bahan") | 7 | 0% | 100% |
| 38 | **ketahanan otomatis**: tiap kalimat × "denti, …", "… ya", "…!!", KAPITAL, emoji | 3.729 | 98% | 100% |
| 39 | jebakan untuk hitungan bisnis (tetap ke AI) | 18 | 100% | 100% |
| 40 | ujian akhir 3 (kalimat natural) | 27 | 33% | 100% |
| | **Total** | **4.902** | | **100%** |

Kecepatan otak lokal: rata-rata **±0,2 ms** per kalimat (terlama ±2 ms).

### Kartu skor "4× lebih baik" (sebelum → sesudah siklus 31–40)
| Aspek | Sebelum | Sesudah | Kelipatan |
|---|---|---|---|
| Pengecekan latihan (semua 100%) | 1.005 | 4.902 | 4,9× |
| Rata-rata variasi balasan (26 intent obrolan) | 1,92 | 8,00 | 4,2× |
| Perilaku "hidup" Denti | 3 | 15 | 5× |
| Kategori keterampilan instan | 7 | 19 | 2,7× |
| Gerakan/keadaan animasi | 21 | 23 | — |
| Kecepatan otak lokal | 0,14 ms | ±0,2 ms | tetap < 1 ms |

Perilaku hidup: reaksi isi jawaban, dicolek, tidur saat diam, **mata mengikuti kursor**, **badan condong**, **kedip acak/dua kali**,
**gerak kecil saat dibiarkan**, **menyapa saat kursor mendekat**, **melihat ke kolom ketik**, **berbicara selama jawaban muncul**,
**gelembung mengetik**, **konfeti kabar gembira**, **mulut bergerak saat membacakan**, **mendengarkan saat dikte**, **mengangguk & bertepuk tangan**.

Keterampilan baru: persen perubahan, margin & untung, BEP cepat, cicilan, terbilang, selisih tanggal, ganti tema, **bacakan jawaban (suara
browser, gratis)**, **tanya lewat suara**, salin jawaban, **saran saat mengetik (Tab)**, **catatan hari ini proaktif** (dari cache Dashboard,
tanpa memanggil AI).

### Keterampilan instan (`utils/dentiSkills.js`)
- **Kalkulator**: angka gaya Indonesia (2jt, 350rb, 25k, 1,5 juta, Rp 150.000), × ÷ didahulukan, persen, diskon, naik/turun %.
- **Hitung tanggal**: "6 bulan lagi" (+ saran kontrol rutin), "2 minggu yang lalu", sisa hari bulan ini, "17 Agustus 2027 hari apa", hari menuju Natal/tahun baru.
- **Buka halaman**: "buka jadwal dokter", "ke layar antrean", "go to settings" → pindah halaman (+ tombol).
- **Nama panggilan**: disimpan di perangkat (`localStorage`), dipakai di sapaan & balasan.

### Interaksi natural di halaman Asisten AI
- Indikator "Denti sedang mengetik" 0,2–0,55 dtk untuk balasan lokal; jawaban muncul bertahap per baris (≤ 0,7 dtk).
- Tombol saran pertanyaan lanjutan di bawah jawaban terakhir; tombol aksi "Buka …".
- Gelembung Denti menyesuaikan nada pertanyaan selama AI memproses.

### Pelajaran untuk model AI (edge function `ai-assistant`)
Bagian **GAYA DENTI** di system prompt: hangat & natural, kalimat pertama langsung angka kunci, beri makna angka,
≤ 120 kata, 1–2 saran konkret, paham pertanyaan lanjutan pendek, urutkan temuan dari yang paling berdampak — plus
**contoh nada** (kaku ✗ vs Denti ✓) agar model meniru gayanya. Lebih ringkas sehingga juga lebih cepat.

Bila Denti salah paham, tambahkan kalimatnya sebagai siklus baru, perbaiki pola di `utils/dentiMood.js`,
lalu jalankan tes sampai semua siklus kembali 100%.

### Gerakan & ekspresi v4 (12 state baru, total 35)

| `data-state` | Kapan | Gerak |
|---|---|---|
| `wink` (1,5 dtk) | genit / "kedip" | satu mata mengedip, senyum miring |
| `cheer` (2,4 dtk) | sorak, kuis benar | kedua tangan terangkat, mata riang, konfeti kecil |
| `jump` (1,6 dtk) | "lompat" | melompat dua kali, mulut "o" |
| `bow` (2,2 dtk) | hormat / terima kasih besar | membungkuk, mata terpejam |
| `shrug` (1,9 dtk) | tak tahu / menyerah kuis | tangan terbuka, bahu naik, mulut datar |
| `cool` (2,6 dtk) | pamer / "keren" | kacamata hitam turun ke visor |
| `sigh` (2,3 dtk) | capek / "huft" | tarik & buang napas, uap di samping kepala |
| `idea` (2,4 dtk) | minta ide / petunjuk | bohlam menyala di atas kepala |
| `confused` (2,4 dtk) | tidak paham / tebakan salah | alis turun, tanda tanya melayang |
| `peek` (2,4 dtk) | mengintip | badan miring, melirik ke samping |
| `excited` (2,2 dtk) | girang | bergetar kecil, hati & bintang di sekitar |
| `salute` (2 dtk) | siap! | tangan hormat di pelipis |

Gerakan acak saat dibiarkan (`IDLE_MOVES` di `AiAssistantPage.jsx`) kini 12 macam, bukan 4. Meminta
**"gerakan apa saja"** memutar rangkaian wave → wink → jump → cool → spin → cheer → bow.

### Otak v4: pemandu, tutorial & interaksi seru

- **`utils/dentiGuide.js`** — Denti bisa **membuka tab/halaman** yang diminta ("buka jadwal", "bawa saya ke kasir",
  "ke layar antrean") dan menjawab **"X di mana?"** dengan letak menu + tawaran buka. Jawaban **"ya / boleh / buka"**
  menjalankan tawaran terakhir (chip "Buka …" juga muncul). Juga: **kembali / maju / muat ulang**.
  Menghormati peran: admin tidak diarahkan ke halaman pasien/kasir, dokter ke halamannya, dsb. (`navdeny` di fixture).
- **Tutorial langkah demi langkah** ("ajarkan cara …", "cara tambah pasien", "bagaimana membuat template pengingat", "cara
  pasang aplikasi desktop") — 27 topik di `TUTORIALS`: pasien, jadwal, kasir/pembayaran, invoice & edukasi WA, template
  pengingat, layar antrean, laporan, HPP, stok, pengguna/hak akses, backup, unduh aplikasi, dan lain-lain. Setiap tutorial
  menawarkan membuka halaman terkait bila perannya berhak.
- **`utils/dentiFun.js`** — **kuis gigi** (tebak, petunjuk, menyerah, soal berikutnya), **permintaan gerakan** (kedip, lompat,
  hormat, kacamata, putar, tepuk tangan, ngintip, angkat bahu, tarik napas, kasih ide), **reaksi emosi** (sedih, kesal, takut,
  lapar, ngantuk, bosan, senang, berhasil, …) dengan balasan yang menyesuaikan.
- Pola pemandu hanya aktif pada kalimat pendek tanpa data; pertanyaan data klinik (omzet, pasien, stok) tetap ke AI.

### Cara melatih (siklus 41–53)

Tambahkan kalimat ke `src/test/fixtures/dentiTrainingV4.js` (`intents`, `ai`, `states`, `replies`, `actions`, `navdeny`).
`dentiTraining.test.js` juga membuat **±6.000 variasi otomatis** (awalan "denti,", akhiran "ya"/"dong", `!!`, KAPITAL,
emoji) dan menuntut intent-nya sama. Kata baru yang terkena koreksi ejaan (`normalizeChat`) harus masuk `KNOWN`
(`dentiMood.js`) — kosakata pemandu & gerakan sudah otomatis.

### Gerakan & ekspresi v5 (8 state baru, total 43)

| `data-state` | Kapan | Gerak |
|---|---|---|
| `angry` (2,4 dtk) | "pura pura marah", "ngambek" | alis menukik, mata merah, uap di telinga, 💢, bergetar |
| `cry` (2,8 dtk) | "hiks", "pura pura nangis"; juga saat pengguna menangis | air mata mengalir, kepala tertunduk, sesenggukan |
| `dizzy` (2,6 dtk) | "pura pura pusing", "kepala berputar" | mata spiral, bintang berputar di atas kepala, badan oleng |
| `stretch` (2,8 dtk) | "meregang", "peregangan" | kedua tangan terangkat, badan memanjang, menguap |
| `search` (3 dtk) | "mode detektif", "kaca pembesar" | kaca pembesar di tangan kanan, mata melirik kiri-kanan |
| `phone` (3,2 dtk) | "telepon" | ponsel di telinga, mulut berbicara |
| `coffee` (3 dtk) | "ngopi", "minum kopi" | cangkir berasap, menyeruput, mata terpejam senang |
| `flex` (2,4 dtk) | "pamer otot" | kedua lengan menekuk-mengembang, bintang & kilau |

Properti yang dipegang (kaca pembesar, ponsel, cangkir) ada **di dalam grup lengan kanan** sehingga ikut bergerak bersama lengan.
"Semua gerakan" memutar pertunjukan 17 langkah; "gerakan apa saja" memutar 8 langkah.

### Otak v5: kamus, checklist, "lagi", dan koreksi salah ketik dua tahap

- **`utils/dentiGlossary.js` — kamus 47 istilah** (kedokteran gigi + Dentiva): "apa itu scaling?", "HPP itu apa", "arti odontogram",
  "maksud BEP", "istilah apa saja". Hanya istilah yang dikenal yang dijawab lokal; pertanyaan data klinik tetap ke AI. Istilah terkait fitur
  menawarkan membuka halamannya sesuai peran. Penjelasan umum — keputusan perawatan tetap oleh dokter.
- **Checklist harian per peran** ("hari ini ngapain", "checklist harian", "mulai dari mana") — admin, dokter, resepsionis berbeda.
- **Tutorial baru** (sadar peran): membuat kunjungan, memproses booking, recall, memulai/menyelesaikan kunjungan (dokter), mengisi rekam
  medis, menulis resep, mengatasi error/lambat/tidak bisa login. Langkah-langkahnya dicocokkan dengan tombol yang benar-benar ada di aplikasi.
  Tema & Keamanan kini bisa dibuka semua peran; ada halaman **Profil Dokter**.
- **"lagi" / "sekali lagi"** mengulang gerakan, fakta, atau kuis terakhir. **Fakta gigi** ("tahukah kamu", 25 fakta) dan **kuis 38 soal**
  (kunci jawaban satu huruf tidak lagi membuat jawaban sembarang dianggap benar; salah ketik 1 huruf pada jawaban diterima).
- **Koreksi salah ketik dua tahap** (`smallTalk`): tahap 1 memahami kalimat apa adanya (koreksi ringan, perilaku lama); bila tidak dikenali,
  tahap 2 mengulang dengan **kosakata luas** (perintah, halaman, gerakan, istilah, kata dalam regex maksud). Kata benar tidak pernah
  "dikoreksi" ke kata lain. Hasil uji acak (`dentiFuzz.test.js`): **92,6% maksud tetap dikenali** dengan salah ketik (sebelumnya ±47%),
  dan **0 dari 1.107** pertanyaan data + salah ketik yang bocor jadi obrolan.

### Denti Pemandu — pendamping mengambang untuk semua peran

Asisten AI (analisis data) hanya untuk admin, tetapi otak lokal Denti berguna untuk semua staf. **`components/ai/DentiGuideWidget.jsx`** dipasang di
`MainLayout`: tombol bulat Denti di pojok kanan bawah (di atas navigasi bawah pada layar kecil) yang membuka panel obrolan.

- Hanya memakai `smallTalk` (tanpa AI, **tanpa kuota**): membuka halaman/tab, "di mana …", tutorial sesuai peran, kamus istilah, checklist harian, kuis, gerakan.
- Tombol saran awal per peran (`HINTS`), tombol "Buka …" untuk tawaran, dan chip lanjutan (`followUps`) — semuanya dijamin dipahami Denti (`dentiChips.test.js`).
- Pertanyaan data: **admin** ditawari "Tanya Asisten AI" (pertanyaan dibawa lewat `navigate(..., { state: { ask } })`); **dokter/resepsionis** diberi arahan, tanpa tombol AI.
- Bantuan ("kamu bisa apa") sadar peran: staf tidak melihat daftar analisis keuangan admin (`HELP_BODY_STAFF`).
- Tersembunyi di halaman Asisten AI (sudah ada Denti di sana); `Esc` menutup; percakapan disimpan di `sessionStorage` (per tab, maks. 30 pesan).
- Konteks percakapan (tawaran, kuis, "lagi") dihitung `utils/dentiChatContext.js` dari daftar pesan.
- Di halaman Asisten AI, saat dibiarkan Denti sesekali menampilkan **ajakan singkat** di gelembung (`IDLE_NUDGES`: kuis, fakta, atraksi, checklist, kamus).
- **Saran per halaman** (`utils/dentiPageHints.js`): saat panel dibuka di halaman kasir, jadwal, booking, recall, rekam medis, pengaturan, biaya & modal, dst.,
  tombol saran awal menyesuaikan ("Ajarkan cara menerima pembayaran" di kasir). Setiap saran dijaga `dentiPageHints.test.js` agar selalu dipahami Denti.
- **Permainan kecil** (tanpa AI, hasil dari seed): *lempar koin*, *lempar dadu*, *pilihin A atau B* (opsi bernuansa data klinik diabaikan agar tidak
  menyaingi pertanyaan bisnis), dan *main suit* (batu-gunting-kertas dengan reaksi menang/kalah/seri). "lagi" mengulang permainan terakhir.

### Cara melatih (siklus 54–64)

Tambahkan kalimat ke `src/test/fixtures/dentiTrainingV5.js` (format sama dengan V4; konteks `{ role, offer, quiz, lastIntent }`). Fixture kamus
dan kuis dibangkitkan otomatis dari `GLOSSARY` dan `QUIZ`, jadi istilah/soal baru langsung ikut diuji. `dentiAugment` menambah ±9.000 variasi.
