# Art Direction Denti HD
Versi 1.0 · 17 Oktober 2026 · GPT · Acuan commit 36ba347.
Status: usulan aset dokumentasi, belum diintegrasikan atau disetujui sebagai rilis.

## 1. Kritik berbasis sumber
Denti adalah ROBOT PORSELEN. Usulan bentuk gigi pada draf pertama dibatalkan.
Sumber nomor baris merujuk berkas aplikasi pada commit acuan, bukan nomor baris bundel.

| Aspek | Bukti | Penilaian dan implikasi |
|---|---|---|
| Proporsi | dentiSvg.js:49–51, BODY/HEAD/VISOR | Kepala 260 unit lebar, tubuh 180; kepala dominan memudahkan pembacaan wajah. Pertahankan rasio ini untuk kesinambungan merek. |
| Siluet | dentiSvg.js:165–182, lengan/headphone/sirip | Headphone dan sirip membedakan robot; lengan kapsul terpisah memberi ruang negatif. Jangan menggantinya dengan akar gigi. |
| Kontur mini | dentiSvg.js:59–78 | shellStroke 5,5 menjadi 0,7975 CSS px pada lebar 58; partStroke 4,5 hanya 0,6525. Penuhi keputusan Ketua dengan kontur 13 unit (1,885 CSS px). |
| Wajah | dentiSvg.js:281–346 | Mata oval 34×42 unit terbaca lebih baik daripada sudut visor; mulut senyum hanya 32 unit lebar sehingga diperlebar menjadi 44 unit. Mata/mulut terang harus tetap di atas visor gelap. |
| Material | dentiSvg.js:185–219 | Sepuluh definisi gradien masih dibuat pada semua LOD. Halo transparan dan highlight kecil membuat mini lebih sibuk meski filter sudah dihapus. Mini memakai bidang datar. |
| Konsistensi rig | denti.css:15–31; dentiSvg.js:233–367 | Koordinat pivot viewBox dan urutan kepala lalu tangan penting untuk think/wave. Pertahankan pembungkus posisi dan animasi terpisah. |
| Kesan premium | geometri dan palet sumber di atas | Navy, porselen, aksen emas sudah memberi dasar baik. Banyak cincin dan kilau mikro menyaingi ekspresi; teal terkendali dan satu titik cahaya dada memberi hierarki lebih tenang. Ini penilaian desain, bukan pengukuran pasar. |

Bukti A1 yang diperiksa: serah-terima/A1/sebelum/isolasi-hipotesis-58px-dpr2-zoom4x.png
dan sesudah/perbandingan-sebelum-sesudah-zoom4x.png. Secara visual versi sesudah lebih
tegas dan halo berkurang. Angka CPU dalam laporan A1 merupakan hasil Antigravity,
bukan pengukuran ulang GPT. Gradien dan transform tidak otomatis menyebabkan blur;
hasil komposit perlu dibuktikan pada browser dan perangkat sasaran.

## 2. Art direction
### Karakter
Pendamping kerja yang tenang, tanggap, hangat, kompeten. Kepala lebar, visor gelap,
headphone, sirip sisi, tubuh telur, lengan kapsul, titik cahaya dada dipertahankan.
Tidak menambah jas dokter, lencana sertifikasi, atau atribut otoritas klinis.

### Palet dan tema
Nilai dan rasio hasil skrip ada di palet.json. Enamel #F8FAFC; kontur #163047;
visor #0B1220; wajah #5EEAD4; teal terang #0F766E; emas dekoratif #E7C98B.
Kontur gelap wajib kontinu pada latar putih. Pada tema gelap, kontur luar berubah
menjadi enamel melalui --d-outline; detail wajah tetap terang di atas visor.
Jangan menerapkan aturan lama “wajah gelap di enamel” pada wajah robot ber-visor.
Emas tidak membawa informasi status. Semua status disertai teks di aplikasi.

### Cahaya dan material
Sumber cahaya kiri atas. Mini datar tanpa gradien; standar satu gradien enamel;
hero tiga gradien (enamel, visor, teal). Tidak ada filter atau gambar raster.
Bayangan tanah mini dihilangkan; standar/hero berupa bidang warna datar.
Kilau luas yang mengikuti volume lebih tepat daripada garis rambut atau glow.

### Garis dan ruang negatif
Lebar mini minimum tervalidasi 58 CSS px; kategori ≤72 tidak menjamin ukuran 1–57.
13 unit ≈1,885 CSS px @1× dan 3,77 piksel perangkat @2×. Antialiasing tetap normal.
Jangan menebalkan seluruh badan dengan scale; pertahankan jarak visor dan cangkang.

### Gerak
Respons 160 ms, perubahan pose 240 ms, gestur sapaan 480 ms; easing
cubic-bezier(0.2,0.8,0.2,1). Anticipation 50 ms dengan rotasi kecil, overshoot
anggota tubuh 3–5 derajat. Dilarang scale seluruh root pada mini. Reduced motion:
pose bermakna tetap terlihat, animasi dan transisi berhenti. Ini usulan pengganti
gerak, bukan perubahan pada director produksi atau durasi state yang sudah ada.

### Ekspresi
Enam aset inti: idle, happy, talk, think, wave, sorry. Dua belas tambahan di
ekspresi.md memperluas kosakata visual; tidak menghapus daftar 93 state.
