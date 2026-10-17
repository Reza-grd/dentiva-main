# GPT · G7b — Pusat Bantuan versi terbit (tempel sekali; kerja tanpa jeda)

```
G7b · PUSAT BANTUAN VERSI TERBIT — kerjakan sampai selesai tanpa jeda; berhenti hanya bila berkas tidak bisa dibaca.

Worktree baru dari console terbaru (G7 sudah digabung di sana):
  git fetch origin
  git worktree add D:/dentiva/gpt-g7b -b gpt/g7b-pusat-bantuan-final origin/console
Tulis HANYA di docs/tim/hasil-gpt/G7/ (perbarui berkas G7 yang ada) + docs/tim/serah-terima/G7b.md. Commit lokal, jangan push.

BACA DULU: docs/tim/04-papan-tugas.md (baris log "G7 Pusat Bantuan diterima" = catatan tinjauan Ketua),
docs/tim/serah-terima/G7.md, seluruh docs/tim/hasil-gpt/G7/**, docs/tim/hasil-gpt/G6/mikrocopy.md (nada Denti).

TUJUAN — artikel siap dibaca staf klinik (admin, dokter, resepsionis/kasir), bukan tim teknis:
1) Ganti istilah internal dengan bahasa pengguna. Contoh: "SMTP/email reset sandi belum aktif" → "Pengiriman email untuk mengatur ulang
   sandi belum tersedia. Minta admin klinik Anda membantu mengatur ulang sandi."; "backup offsite belum aktif" → kalimat yang menjelaskan
   apa yang perlu dilakukan pengguna, tanpa membuka detail infrastruktur. Hilangkan: SMTP, offsite, VPS, RLS, GoTrue, aal2, PGlite, edge function,
   nama berkas/komponen kode, dan istilah internal sejenis. Istilah yang memang tampil di aplikasi (mis. "MFA", "Denti", nama menu) boleh tetap.
2) Kumpulkan SEMUA keterbatasan sementara ke SATU berkas: artikel/status-layanan.md ("Fitur yang sedang disiapkan"), masing-masing dengan
   penanda STATUS yang mudah dicari (mis. <!-- STATUS:email-reset -->, <!-- STATUS:mfa-mandiri -->, <!-- STATUS:pemulihan-data -->).
   Artikel lain cukup menautkan ke sana dengan satu kalimat pendek — agar saat fitur aktif, cukup satu tempat yang diubah.
3) Tambahkan di README.md G7 tabel "Saat fitur aktif, ubah ini": penanda STATUS → berkas & kalimat yang harus diganti.
4) Jangan mengubah langkah klik yang sudah cocok dengan aplikasi (Ketua memverifikasi 159/170 label ada di kode). Jika menyunting teks langkah,
   periksa ulang labelnya di apps/clinic/src/components/** dan perbarui sumber-langkah.json.
5) Nada: hangat, ringkas, profesional, sesuai G6. Tiap artikel: judul, untuk siapa, langkah bernomor, catatan keamanan, artikel terkait.
   Tidak menjanjikan tanggal/fitur yang belum ada; tanpa data pasien nyata.

PERIKSA DIRI (otomatis, tanpa bertanya):
- Skrip pencarian: 0 kemunculan istilah terlarang di artikel/*.md (kecuali di status-layanan.md bila memang perlu, dan tetap tanpa istilah teknis).
- indeks.json terurai dan memuat status-layanan.md; semua tautan antar-artikel valid (tidak ada berkas yang dirujuk tapi hilang).
- Label tebal di artikel masih ditemukan di kode (ulang validasi.py atau skrip setara) — laporkan angkanya.
Akhiri dengan docs/tim/serah-terima/G7b.md (templat 03 §4) dan SATU pesan ringkas: jumlah artikel diubah, hasil tiga pemeriksaan di atas, nama cabang.
```
