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
