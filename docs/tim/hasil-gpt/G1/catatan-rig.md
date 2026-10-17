# Catatan Rig dan Integrasi
Versi 1.0 · Acuan commit 36ba347 · Implementasi: Antigravity; keputusan: Ketua.

## Kontrak yang dipertahankan
Semua kelas pada markup dentiSvg.js dipertahankan persis di 18 aset, termasuk
pembungkus posisi, efek, dan properti tersembunyi. Urutan kepala sebelum lengan
tetap; koordinat geometri dasar dan pivot tidak digeser. d-root/d-lean berbeda
tanggung jawab dan jangan digabung. Audit struktur ada di bukti/validasi-struktur.json.

## Inventaris kelas sumber
`d-arm-l`, `d-arm-r`, `d-arrow`, `d-arrow-1`, `d-arrow-2`, `d-arrow-3`, `d-arrows`, `d-aura`, `d-bdot`, `d-bdot-1`, `d-bdot-2`, `d-bdot-3`, `d-body`, `d-book`, `d-brackets`, `d-brows`, `d-brows-w`, `d-brush`, `d-bub`, `d-bub-1`, `d-bub-2`, `d-bub-3`, `d-bub-4`, `d-bubble`, `d-bulb`, `d-cake`, `d-chart`, `d-check`, `d-cheeks`, `d-chest`, `d-chest-core`, `d-chest-heart`, `d-clip`, `d-cloud`, `d-cup`, `d-dizzy`, `d-ear-face`, `d-ear-l`, `d-ear-r`, `d-earhand`, `d-exclaim`, `d-eye`, `d-eye-coin`, `d-eye-happy`, `d-eye-heart`, `d-eye-l`, `d-eye-open`, `d-eye-r`, `d-eye-sleep`, `d-eye-star`, `d-eye-wow`, `d-eyeheart`, `d-eyes`, `d-facepalm`, `d-figure`, `d-fin-l`, `d-fin-r`, `d-finger`, `d-flag`, `d-flagcloth`, `d-flake`, `d-flake-1`, `d-flake-2`, `d-flake-3`, `d-flake-4`, `d-flake-5`, `d-flame`, `d-flame-2`, `d-foam`, `d-fx`, `d-gaze`, `d-gaze-soft`, `d-gift`, `d-glitch`, `d-growl`, `d-ha`, `d-ha-1`, `d-ha-2`, `d-ha-3`, `d-haha`, `d-hat`, `d-head`, `d-heart`, `d-heart-1`, `d-heart-2`, `d-heart-3`, `d-heart-4`, `d-heartbig`, `d-hearts`, `d-hourglass`, `d-lean`, `d-lens`, `d-lids`, `d-lock`, `d-mask`, `d-mic`, `d-mouth`, `d-mouth-flat`, `d-mouth-grin`, `d-mouth-o`, `d-mouth-sad`, `d-mouth-smile`, `d-mouth-talk`, `d-mouth-wavy`, `d-note`, `d-note-1`, `d-note-2`, `d-note-3`, `d-notes`, `d-orbit`, `d-orbit-dot`, `d-orbit-dot-1`, `d-orbit-dot-2`, `d-phone`, `d-pray`, `d-puff`, `d-puff-1`, `d-puff-2`, `d-puff-3`, `d-puff-4`, `d-puffs`, `d-q`, `d-q-1`, `d-q-2`, `d-quest`, `d-rain`, `d-rain-1`, `d-rain-2`, `d-rain-3`, `d-ring-1`, `d-ring-2`, `d-ring-3`, `d-root`, `d-scan`, `d-shades`, `d-shadow`, `d-shield`, `d-snow`, `d-spark`, `d-spark-1`, `d-spark-2`, `d-spark-3`, `d-spark-4`, `d-sparks`, `d-spin-arc`, `d-spinner`, `d-spiral`, `d-spiral-r`, `d-spirals`, `d-star`, `d-star-1`, `d-star-2`, `d-star-3`, `d-star-4`, `d-star-5`, `d-stars`, `d-steam`, `d-steam-1`, `d-steam-2`, `d-sun`, `d-sweat`, `d-tear`, `d-tear-1`, `d-tear-2`, `d-tear-3`, `d-tear-4`, `d-tears`, `d-thermo`, `d-thumb`, `d-tooth`, `d-tooth-star`, `d-tooth-star-2`, `d-vein`, `d-visor`, `d-visor-rim`, `d-warn`, `d-wave`, `d-wave-1`, `d-wave-2`, `d-wave-3`, `d-waves`, `d-whisper`, `d-xeyes`, `d-z`, `d-z-1`, `d-z-2`, `d-z-3`, `d-zzz`

## Pivot dan pengecualian sumber (nomor baris asli)
- denti.css:18: `.denti .d-root    { transform-origin: 200px 360px; }`
- denti.css:19: `.denti .d-head    { transform-origin: 200px 262px; }`
- denti.css:20: `.denti .d-arm-l   { transform-origin: 90px 322px; }`
- denti.css:21: `.denti .d-arm-r   { transform-origin: 310px 322px; }`
- denti.css:22: `.denti .d-fin-l   { transform-origin: 64px 128px; }`
- denti.css:23: `.denti .d-fin-r   { transform-origin: 336px 128px; }`
- denti.css:24: `.denti .d-shadow  { transform-origin: 200px 464px; }`
- denti.css:25: `.denti .d-chest   { transform-origin: 200px 336px; }`
- denti.css:26: `.denti .d-eyes    { transform-origin: 200px 160px; }`
- denti.css:29: `{ transform-box: fill-box; transform-origin: center; }`
- denti.css:30: `.denti .d-tooth       { transform-origin: 200px 6px; }`
- denti.css:31: `.denti .d-chest-heart { transform-origin: 200px 334px; }`
- denti.css:72: `.denti .d-lean      { transform-origin: 200px 440px; transform: rotate(calc(var(--look-x, 0) * 2.5deg)); transition: transform .6s ease-out; }`
- denti.css:119: `.denti[data-state="think"] .d-mouth-o { opacity: 1; transform: scale(.7); transform-box: fill-box; transform-origin: center; }`
- denti.css:375: `.denti[data-state="spin"] .d-root { transform-origin: 200px 262px; animation: d-spin 2s cubic-bezier(.4,0,.2,1) infinite; }`
- denti.css:479: `.denti .d-bulb, .denti .d-q { transform-origin: 200px -14px; }`
- denti.css:482: `.denti[data-state="wink"] .d-eye-r { animation: d-wink 1.5s ease-in-out infinite; transform-origin: 238px 160px; }`
- denti.css:611: `.denti .d-tear, .denti .d-spiral, .denti .d-puff, .denti .d-steam path { transform-box: fill-box; transform-origin: center; }`
- denti.css:612: `.denti .d-dizzy { transform-origin: 200px 40px; }`
- denti.css:630: `.denti[data-state="angry"] .d-vein { animation: d-bulb-glow .7s ease-in-out infinite; transform-origin: 320px 70px; }`
- denti.css:687: `.denti[data-state="search"] .d-mouth-o { opacity: 1; transform: scale(.7); transform-box: fill-box; transform-origin: center; }`
- denti.css:731: `.denti .d-rain, .denti .d-flake, .denti .d-flame, .denti .d-spin-arc, .denti .d-flagcloth { transform-box: fill-box; transform-origin: center; }`
- denti.css:742: `.denti .d-hat, .denti .d-mask { transform-origin: 200px 150px; }`
- denti.css:743: `.denti .d-hourglass { transform-origin: 200px 12px; } .denti .d-check, .denti .d-warn, .denti .d-lock, .denti .d-shield { transform-origin: 336px 46px; } .denti .d-chart { transform-origin: 336px 50px; }`
- denti.css:831: `.denti[data-state="shock"] .d-mouth-o { transform: scale(1.7); transform-box: fill-box; transform-origin: center; }`
- denti.css:853: `.denti[data-state="curious"] .d-mouth-o { transform: scale(.6); transform-box: fill-box; transform-origin: center; }`
- denti.css:981: `.denti[data-state="whisper"] .d-eyes { transform: translate(14px, 0); transition: transform .4s ease; } .denti[data-state="whisper"] .d-mouth-o { transform: scale(.55); transform-box: fill-box; transform-origin: center; }`
- denti.css:1120: `.denti[data-state="hot"] .d-sun { animation: d-v-pop 1.6s ease-in-out infinite; transform-origin: 340px 40px; }`
- denti.css:1123: `.denti[data-state="flag"] .d-flagcloth { animation: d-v-wave 1s ease-in-out infinite; transform-origin: 2px -68px; }`
- denti.css:1130: `.denti[data-state="growl"], .denti[data-state="hungry"] .d-growl { animation: d-v-pop .8s ease-in-out infinite; transform-origin: 200px 456px; }`

## Daftar 93 state (dentiSvg.js:28–45)
`idle`, `happy`, `wave`, `talk`, `think`, `call`, `celebrate`, `sleep`, `wake`, `brush`, `tooth`, `dance`, `spin`, `laugh`, `love`, `shy`, `surprise`, `sorry`, `scan`, `point`, `thanks`, `nod`, `clap`, `wink`, `cheer`, `jump`, `bow`, `shrug`, `cool`, `sigh`, `idea`, `confused`, `peek`, `excited`, `salute`, `angry`, `cry`, `dizzy`, `stretch`, `search`, `phone`, `coffee`, `flex`, `grateful`, `proud`, `worried`, `nervous`, `blush`, `sulk`, `hopeful`, `relieved`, `disappointed`, `gloomy`, `cozy`, `shock`, `giggle`, `smug`, `curious`, `suspicious`, `determined`, `focused`, `overwhelmed`, `dreamy`, `yawn`, `tired`, `sick`, `freezing`, `hot`, `hungry`, `welcome`, `goodbye`, `thumbsup`, `heart_hands`, `pray`, `whisper`, `shush`, `listen`, `slowclap`, `facepalm`, `party`, `birthday`, `gift`, `flag`, `sing`, `loading`, `success`, `warning`, `error`, `lock`, `shield`, `hourglass`, `chart`, `money`

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
