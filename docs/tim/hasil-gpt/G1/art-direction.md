# Art Direction Denti HD
Status: DRAF ARAH DESAIN — untuk tinjauan Ketua
Tanggal: 2026-10-17
Sumber: 00 · Ringkasan Proyek, 01 · Tugas GPT, dan 03 · Aturan Kerja Tim.

> Disimpan apa adanya dari serahan GPT (17 Okt 2026). Tinjauan Ketua: `docs/tim/serah-terima/G1-tinjauan.md`.

## 1. Kritik desain saat ini

### Batas pemeriksaan
Kode dentiSvg.js, denti.css, dokumentasi maskot, dan gambar render belum
dilampirkan. Kritik berikut mengevaluasi karakteristik teknis yang dilaporkan
Ketua. Proporsi aktual, bentuk siluet, warna, dan kelengkapan rig belum
dapat dinilai secara langsung.

### Keterbacaan pada ukuran kecil
Menurut ringkasan, garis 2–3 unit pada viewBox 400×480 menjadi sangat tipis
ketika ditampilkan pada 58–68 px. Akibat yang perlu diperiksa pada render:
kontur wajah melemah, mulut kehilangan bentuk, dan detail ekspresi menyatu.

Masalah utamanya adalah hierarki detail: detail yang efektif pada ilustrasi
besar belum tentu menyampaikan informasi pada avatar kecil. Versi mini
harus digambar ulang secara optis, bukan sekadar diperkecil.

### Siluet dan proporsi
Belum dinilai dari sumber visual. Kriteria evaluasinya:
- Dalam siluet satu warna, Denti harus tetap terbaca sebagai gigi.
- Lekukan mahkota dan pemisahan akar harus terlihat pada ukuran minimum.
- Tangan tidak boleh menyatu dengan badan hingga mengaburkan bentuk gigi.
- Gestur harus terbaca tanpa bergantung pada jari atau aksesori kecil.

### Kontras
Belum ada nilai warna sumber sehingga belum ada hasil pengukuran kontras.
Risiko yang perlu diperiksa: badan putih menghilang pada latar terang,
serta detail wajah terlalu lembut ketika ilustrasi ditampilkan kecil.

Kontur dan wajah harus membawa keterbacaan. Kilau dan bayangan hanya
membantu bentuk, tidak menggantikan kontras dasarnya.

### Material dan kesan premium
Jumlah filter dan gradien bukan ukuran kualitas visual. Bila banyak efek
menumpuk pada ukuran kecil, bentuk berisiko tampak berkabut atau seperti
plastik bercahaya.

Arah perbaikan: enamel bersih, pantulan terbatas, pencahayaan konsisten,
dan ekspresi terkendali. Kesan premium datang dari ketepatan bentuk dan
konsistensi, bukan banyaknya ornamen.

### Animasi dan ketajaman
Ringkasan menyebut scale() dan bayangan pembungkus sebagai faktor blur.
Hal itu belum saya reproduksi. SVG tidak otomatis menjadi buram karena
memakai gradien atau transform; hasilnya bergantung pada filter, komposit,
ukuran render, browser, dan DPR.

Antigravity perlu membandingkan render statis, animasi aktif, dan animasi
dinonaktifkan sebelum menyimpulkan kontribusi setiap faktor.

## 2. Arah desain yang diusulkan

### 2.1 Karakter
Denti adalah pendamping kerja klinik: tenang, tanggap, hangat, dan kompeten.

Usulan perilaku:
- Senyum kecil sebagai ekspresi dasar.
- Tatapan jelas, tanpa ekspresi terus-menerus terkejut.
- Gestur singkat yang membantu memahami status.
- Ekspresi sorry menunjukkan empati, tanpa air mata atau kesedihan berlebihan.
- Tidak menggunakan atribut yang menyiratkan sertifikasi atau otoritas medis.

Ini adalah usulan arah karakter, bukan deskripsi aset lama.

### 2.2 Bentuk yang menyatukan semua LOD
Pertahankan bentuk dasar gigi, posisi wajah, panjang relatif tangan,
dan arah pencahayaan pada mini, standar, serta hero.

Usulan konstruksi:
- Mahkota membulat dengan lekukan atas yang jelas.
- Dua akar dengan celah yang tetap terbaca.
- Mata berbentuk oval sederhana.
- Mulut memiliki ruang negatif cukup lebar untuk tetap terbaca.
- Tangan berbentuk sarung sederhana, tanpa detail jari di mini.

Proporsi final mengikuti pemeriksaan rig lama. Jangan mengunci koordinat
baru sebelum pivot dan transform-origin yang ada diperiksa.

### 2.3 Palet calon
Nilai berikut adalah kandidat desain; belum menjadi palet final atau
klaim kelulusan kontras.

| Peran | Terang | Gelap |
|---|---|---|
| Latar acuan | #FFFFFF | #0B1220 |
| Enamel utama | #F8FAFC | #F8FAFC |
| Bayangan enamel | #CBD5E1 | #CBD5E1 |
| Kontur dan wajah | #163047 | #163047 |
| Aksen teal | #0F766E | #5EEAD4 |
| Detail dekoratif hangat | #E7C98B | #E7C98B |

Aturan:
- Wajah tetap gelap di atas enamel terang pada kedua tema.
- Kontur luar pada tema gelap dapat memakai tepi enamel terang.
- Aksen tema gelap tidak otomatis cocok pada latar putih.
- Warna dekoratif tidak dipakai untuk teks atau satu-satunya penanda status.
- palet.json harus mencantumkan rasio setiap swatch terhadap kedua latar
  acuan serta pasangan pemakaian sebenarnya, termasuk wajah terhadap enamel.
- Target teks biasa ≥4,5:1; detail grafis bermakna ≥3:1.
- Tidak semua warna enamel atau dekorasi harus lolos sebagai warna teks.

### 2.4 Cahaya dan material
Satu sumber cahaya dari kiri atas, konsisten di seluruh state.

Mini:
- Warna datar; satu bidang bayangan opsional.
- Tanpa filter dan tanpa gradien.
- Kilau kecil boleh dihilangkan sepenuhnya.

Standar:
- Maksimal satu gradien badan sederhana dengan 2–3 stop.
- Satu bidang pantulan luas; hindari kilau berupa garis rambut.
- Tanpa filter.

Hero:
- Maksimal tiga gradien sederhana untuk badan, pantulan, dan bayangan.
- Detail material mengikuti kelengkungan enamel.
- Tanpa glow atau efek yang mengaburkan kontur.

Bayangan tanah dibuat dengan bentuk elips berwarna datar, maksimal satu
lapisan transparansi. Hindari tumpukan elips untuk meniru blur.

### 2.5 Ketebalan garis dan ukuran tampil
Ukuran tampil harus disebut sebagai lebar atau tinggi, bukan hanya “58 px”.

Dengan viewBox 400×480 dan skala seragam:
- Bila lebar = 58 CSS px, stroke 7 unit ≈1,02 CSS px.
- Bila tinggi = 58 CSS px, stroke 7 unit ≈0,85 CSS px.
- Pada DPR 2, keduanya melebihi 1,5 piksel perangkat.
- Pada DPR 1, stroke 7 unit belum memenuhi target 1,5 piksel perangkat.

Usulan mini: kontur utama minimal 13 unit untuk ukuran tinggi 58 CSS px.
Itu menghasilkan sekitar 1,57 CSS px dan mencakup target DPR 1.

Jangan memakai garis tipis untuk mata atau mulut. Gunakan bentuk terisi
bila memungkinkan. Ukuran di bawah 58 px memerlukan batas minimum tersendiri;
kategori “≤72 px” bukan jaminan keterbacaan hingga ukuran tanpa batas.

### 2.6 Bahasa gerak
Gerak harus menyampaikan status tanpa menarik perhatian terus-menerus.

Usulan parameter:
- Respons ekspresi: 140–200 ms.
- Sapaan atau gestur tunggal: 360–520 ms.
- Anticipation gestur: 40–60 ms dengan perpindahan kecil.
- Easing dasar: cubic-bezier(0.2, 0.8, 0.2, 1).
- Kesan pegas melalui rotasi anggota tubuh dan overshoot kecil,
  bukan pembesaran seluruh maskot.
- Idle berupa kedipan jarang; hindari gerak melayang terus-menerus.

prefers-reduced-motion:
- Hilangkan gerak berulang, anticipation, dan overshoot.
- Tampilkan pose akhir yang tetap menjelaskan state.
- Pertahankan informasi status melalui teks aplikasi.

### 2.7 Dua belas ekspresi acuan
Ini adalah kosakata visual awal, bukan pengganti daftar 93 state yang ada.

| Ekspresi | Bentuk utama | Batas |
|---|---|---|
| idle | Mata terbuka, senyum kecil | Tidak terus bergoyang |
| happy | Mata sedikit melengkung, senyum lebar | Tanpa konfeti |
| talk | Mulut terbuka sederhana | Hindari perubahan skala badan |
| think | Tatapan ke samping, tangan mendekat ke wajah | Tetap terbaca di mini |
| wave | Satu tangan terangkat | Lambaian singkat |
| sorry | Alis bagian dalam naik, senyum diturunkan | Tanpa air mata |
| celebrate | Kedua tangan naik | Satu gerak per kejadian |
| confused | Alis tidak simetris, mulut kecil | Tidak menyalahkan pengguna |
| sleep | Mata tertutup, badan tenang | Tanpa simbol wajib |
| scan | Tatapan fokus, pose stabil | Tanpa laser atau glow |
| surprise | Mata terbuka, mulut oval | Singkat |
| thanks | Senyum hangat, kepala sedikit menunduk | Tidak membungkuk berulang |

Dua belas sketsa ekspresi tambahan yang diminta akan diserahkan di
ekspresi.md pada tahap aset.

## 3. Pemeriksaan sebelum produksi aset
- Tinjau arah karakter, material, palet calon, dan ketebalan garis.
- Periksa dentiSvg.js, denti.css, DentiMascot.jsx, dan dokumentasi maskot.
- Tetapkan apakah ukuran 58 px merujuk lebar atau tinggi.
- Susun inventaris kait rig dan pivot berdasarkan kode sumber.
- Ukur pasangan kontras sebelum menerbitkan palet.json.
- Setelah arah disetujui, buat 18 SVG dan verifikasi XML serta render-nya.
