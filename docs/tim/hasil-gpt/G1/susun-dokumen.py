from pathlib import Path
import json,re
P=Path(__file__).resolve().parent;R=P.parents[3]
def put(n,s): (P/n).write_text(s.strip()+'\n',encoding='utf-8')
S=json.loads((P/'bukti/sumber.json').read_text(encoding='utf-8'))
put('art-direction.md','''
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
''')
put('lod-aturan.md','''
# Aturan LOD Denti
Versi 1.0 · Pemilik implementasi: Antigravity · Tinjauan: Ketua.
Semua ukuran adalah LEBAR CSS px. viewBox tetap 0 0 400 480.

| Aturan | mini | standar | hero |
|---|---|---|---|
| Pemilihan otomatis | ≤72 | >72 dan ≤160 | >160 |
| Ukuran verifikasi utama | 58,64,68,72 | 96,120,160 | 220,300 |
| Kontur/garis minimum aset | 13 unit | 7 unit | 4 unit |
| Mata terbuka | 34×42 unit | sama | sama |
| Lebar senyum | 44 unit | 44 unit | 44 unit |
| Gradien maksimum | 0 | 1, ≤3 stop | 3, masing-masing ≤3 stop |
| Filter / image / script | dilarang | dilarang | dilarang |
| Geometri DOM maksimum | 500 node termasuk rig tersembunyi | 500 | 500 |
| Geometri aktif acuan idle | target ≤45 primitif; ukur saat integrasi | target ≤60 | target ≤75 |
| Orbit, sparks, cincin tanah, brackets | tanpa geometri terlihat | detail sedang | detail penuh |
| Bubble di talk/think | tidak terlihat; gunakan teks aplikasi | boleh | boleh |
| Opacity | tanpa opacity atribut berlapis; CSS visibilitas state tetap | transisi tunggal | transisi tunggal |

Batas 500 sengaja menghitung rig 93 state yang dipertahankan; jangan mengartikan
mini sebagai pengurangan ukuran DOM besar. Penyederhanaan utama ialah bentuk
terlihat, warna, dan material. Optimasi penghapusan node memerlukan pemetaan
fallback state tersendiri oleh Antigravity, bukan klaim paket ini.

resolveDentiLod di DentiMascot.jsx:31–38 menjadi kontrak; jangan membuat celah
73–95 atau 161–219. Untuk size 58 komponen A1 membulatkan tinggi ke 70;
preserveAspectRatio bawaan menjaga proporsi gambar (rasio ideal tinggi 69,6).
Jangan mengubah menjadi peregangan nonuniform. Di bawah lebar 58, siapkan ikon
alternatif atau verifikasi baru; klaim keterbacaan tidak otomatis berlaku.

Rumus stroke: unit × lebar/400 × DPR. Kontur 13 pada lebar 58 @2× = 3,77 piksel
perangkat. Minimum 1,5 piksel perangkat adalah batas desain, bukan jaminan setiap
tepi jatuh tepat pada grid piksel. Uji tangkapan layar tetap diperlukan.
''')
classes=sorted(set(' '.join(re.findall(r'class="([^"]+)"',S['markup']['hero'])).split()))
pivots=[]
for i,line in enumerate(S['css'].splitlines(),1):
 if 'transform-origin:' in line:pivots.append(f'- denti.css:{i}: `{line.strip()}`')
put('catatan-rig.md','''
# Catatan Rig dan Integrasi
Versi 1.0 · Acuan commit 36ba347 · Implementasi: Antigravity; keputusan: Ketua.

## Kontrak yang dipertahankan
Semua kelas pada markup dentiSvg.js dipertahankan persis di 18 aset, termasuk
pembungkus posisi, efek, dan properti tersembunyi. Urutan kepala sebelum lengan
tetap; koordinat geometri dasar dan pivot tidak digeser. d-root/d-lean berbeda
tanggung jawab dan jangan digabung. Audit struktur ada di bukti/validasi-struktur.json.

## Inventaris kelas sumber
'''+', '.join('`'+c+'`' for c in classes)+'''

## Pivot dan pengecualian sumber (nomor baris asli)
'''+ '\n'.join(pivots)+'''

## Daftar 93 state (dentiSvg.js:28–45)
'''+', '.join('`'+x+'`' for x in S['states'])+'''

Jumlah tepat 93 dibaca dari ekspor DENTI_STATES; seluruh kelas sumber dibandingkan
otomatis terhadap tiap SVG. Itu BUKTI STRUKTUR, bukan bukti gerak 93 state.
Perlu matriks 93×3 di aplikasi untuk menguji animasi, mode anak, gaze, dan director.
Ada selector growl pada CSS, tetapi growl bukan state terdaftar: jangan menambahkannya
diam-diam. Konsistensi semantik setiap properti mini masih perlu tinjauan Ketua.

## Perubahan aset
- Kontur utama mini 13, standar 7, hero 4 unit; stroke lain minimal sama pada aset ini.
- Mini tanpa gradien, filter, partikel orbit terlihat, kilau mikro yang dipilih,
  brackets, bubble, dan cincin tanah. Kait node tetap ada agar selector tidak putus.
- Standard satu dan hero tiga gradien; ganti navy/biru dengan palet G1 terkendali.
- Mulut senyum diperlebar dari 32 ke 44 unit. Wajah terang tetap pada visor.
- CSS internal aset menampilkan snapshot satu pose dan menonaktifkan animasi.
  JANGAN mencangkok CSS snapshot ke aplikasi: ambil defs dan rig, pertahankan CSS
  animasi produksi. Aturan mini, kontur tema, dan perubahan material perlu diterapkan
  secara selektif, bukan menyalin semua berkas secara buta.

## Namespace ID per instans
ID dalam SVG ekspor mengandung dm/ds/dh, state, dan token INSTANCE. Berkas mandiri
valid XML, tetapi dua salinan inline berkas yang sama MASIH memerlukan namespace.
Gunakan helper g(n) milik dentiSvg.js:121, berbasis uid useId di DentiMascot.jsx:47.
instans-svg.mjs adalah adapter usulan yang memperbarui SEMUA id dan url(#id),
termasuk clipPath. Token INSTANCE bukan generator runtime. Jangan memasukkan
`${g(...)}` mentah ke berkas .svg karena SVG harus tetap XML yang bisa dirender.
Jangan menambahkan dangerouslySetInnerHTML dari input pengguna; aset hanya sumber
tepercaya yang ditinjau. Uji dua instans state/LOD sama dan berbeda sebelum merge.

## Rekomendasi denti.css (belum dipasang)
1. Tambahkan --d-outline per tema untuk kontur shell/part; jangan mengubah stroke
   mata dengan variabel yang sama.
2. Pertahankan pivot eksplisit pada grup animasi; translate posisi tetap di anak.
3. Mini: kurangi gerak kontinu, pertahankan blink dan pose akhir yang bermakna.
4. Reduced motion harus mempertahankan wave/think statis, bukan hanya mematikan
   keyframe yang sebelumnya menjadi satu-satunya sumber pose tangan.
5. Uji transform bersarang; stroke di node berskala bisa mengecil meski atribut 13.
   Aset inti tanpa skala tambahan pada kepala/badan/lengan; aksesori tersembunyi
   tidak termasuk klaim kontur utama. Bila aksesori dipakai pada state lain, uji lagi.
''')
expressions=[('celebrate','Kedua lengan naik; mata happy; senyum lebar','rotate(138 90 322)','rotate(-138 310 322)','M140 170 Q162 140 184 170 M216 170 Q238 140 260 170','M178 196 Q200 220 222 196'),('love','Mata hati kecil; tangan mendekat dada','rotate(-52 90 322)','rotate(52 310 322)','M146 148 Q162 130 178 148 L162 178 Z M222 148 Q238 130 254 148 L238 178 Z','M178 196 Q200 214 222 196'),('confused','Kepala miring; mata tidak simetris; mulut datar','','','M150 160 H174 M226 150 H250','M182 204 H218'),('sleep','Mata tertutup; tangan turun; tanpa Z wajib','','','M142 164 Q162 176 182 164 M218 164 Q238 176 258 164','M184 204 H216'),('scan','Tatapan fokus; tangan kanan di headphone','','rotate(-141 310 322)','M142 160 H182 M218 160 H258','M184 204 H216'),('point','Lengan kiri menunjuk; tatapan mengarah tujuan','rotate(84 90 322)','','M142 156 H176 M218 156 H252','M178 196 Q200 212 222 196'),('cool','Kacamata menyatu pada visor; kilau opsional','','','M138 146 H188 V172 H138 Z M212 146 H262 V172 H212 Z','M178 196 Q200 210 222 196'),('shy','Tangan mendekat mulut; senyum kecil','rotate(-155 90 322)','rotate(155 310 322)','M142 166 Q162 146 182 166 M218 166 Q238 146 258 166','M184 202 Q200 210 216 202'),('surprise','Mata bulat dan mulut O; gestur satu kali','rotate(56 90 322)','rotate(-56 310 322)','M146 143 H178 V177 H146 Z M222 143 H254 V177 H222 Z','M190 198 Q200 182 210 198 Q218 218 200 222 Q182 218 190 198'),('idea','Mata terbuka; satu tangan naik; bohlam hanya standar/hero','','rotate(-154 310 322)','M142 160 H182 M218 160 H258','M178 196 Q200 214 222 196'),('bow','Kepala tunduk; mata tertutup; tangan mendekat tubuh','rotate(-40 90 322)','rotate(40 310 322)','M142 164 Q162 176 182 164 M218 164 Q238 176 258 164','M184 204 Q200 212 216 204'),('thanks','Senyum happy; tangan kanan pada dada','','rotate(100 310 322)','M140 170 Q162 140 184 170 M216 170 Q238 140 260 170','M178 196 Q200 214 222 196')]
e=['# Lembar 12 Ekspresi Tambahan','Versi 1.0 · Sketsa diagram, bukan aset rig produksi. Semua viewBox 400×480.','Durasi usulan gestur 480–700 ms, kecuali celebrate 900 ms. Anticipation 50 ms, easing cubic-bezier(0.2,0.8,0.2,1). Reduced motion menampilkan pose akhir tanpa gerak berulang. Jangan mengganti DENTI_DURATIONS tanpa evaluasi integrasi.']
for name,desc,l,r,eyes,mouth in expressions:
 e.extend([f'## {name}',desc,f'''```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" role="img">
 <title>Denti — sketsa {name}</title>
 <ellipse cx="200" cy="354" rx="90" ry="90" fill="#F8FAFC" stroke="#163047" stroke-width="13"/>
 <rect x="70" y="56" width="260" height="206" rx="80" fill="#F8FAFC" stroke="#163047" stroke-width="13"/>
 <rect x="96" y="88" width="208" height="152" rx="52" fill="#0B1220"/>
 <path d="{eyes}" fill="none" stroke="#5EEAD4" stroke-width="13" stroke-linecap="round"/>
 <path d="{mouth}" fill="none" stroke="#5EEAD4" stroke-width="13" stroke-linecap="round"/>
 <g transform="{l or 'translate(0 0)'}"><rect x="66" y="306" width="48" height="108" rx="24" fill="#F8FAFC" stroke="#163047" stroke-width="13"/></g>
 <g transform="{r or 'translate(0 0)'}"><rect x="286" y="306" width="48" height="108" rx="24" fill="#F8FAFC" stroke="#163047" stroke-width="13"/></g>
</svg>
```'''])
put('ekspresi.md','\n\n'.join(e))
print('Dokumen G1 dan 12 sketsa ditulis.')
