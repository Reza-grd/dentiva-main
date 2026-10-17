# GPT · PROMPT TUNGGAL G1–G6 (tempel SEKALI; kerja tanpa jeda dari awal sampai akhir)

Dibuat Ketua Tim pada 17 Okt 2026. Menggantikan prompt bertahap `G1…G6` + `_awal-sesi.md` bila GPT punya akses ke berkas repo.
Prompt per paket tetap ada sebagai rujukan rinci yang akan dibaca GPT sendiri.

```
KAMU = anggota tim "Penasihat Desain, Merek, Kepatuhan & Produk" proyek DENTIVA (SaaS manajemen klinik gigi Indonesia). Ketua Tim = Claude.
Tujuan besar: Dentiva terasa PROFESIONAL, AMAN tingkat tinggi, PREMIUM & MAHAL. Bahasa: Indonesia (kode/identifier boleh Inggris); nada hangat, ringkas, profesional.

═══ MODE KERJA: OTONOM, TANPA JEDA ═══
- Kerjakan G1 → G2 → G3 → G4 → G5 → G6 BERURUTAN sampai selesai dalam SATU sesi ini. JANGAN menunggu kata "lanjut", JANGAN minta izin pindah paket,
  JANGAN berhenti untuk melaporkan setengah jalan. Selesai satu paket → periksa sendiri → langsung paket berikutnya.
- JANGAN menempelkan dokumen panjang ke obrolan. Tulis SEMUA hasil sebagai BERKAS di repo (jalur di bawah). Di obrolan cukup 1–2 baris kemajuan per paket.
- Bila satu respons terlalu panjang, tulis berkas itu per bagian (buat berkas lalu tambahkan) — jangan berhenti dan jangan minta aku memotong.
- BERHENTI hanya jika benar-benar buntu pada hal yang tak bisa kamu tentukan sendiri (mis. berkas tidak bisa dibaca sama sekali). Untuk keraguan lain:
  catat sebagai "Pertanyaan untuk Ketua" di serah-terima paket itu, pilih asumsi paling aman (tandai "ASUMSI"), dan TERUS bekerja.

═══ CARI & BACA BERKAS SENDIRI ═══
Repo ada di komputer ini. Cari akar repo (folder bernama `dentiva*` di D:\dentiva\, berisi `docs/tim/`); jangan minta aku menempelkan berkas.
Jangan bekerja di D:\dentiva\dentiva.co.id-main (milik Antigravity) dan jangan mengubah worktree lain. Buat worktree-mu sendiri:
    git fetch origin
    git worktree add D:/dentiva/gpt-g1-g6 -b gpt/g1-g6-paket origin/console
    (semua kerja di D:/dentiva/gpt-g1-g6; jalankan `git branch --show-current` sebelum commit)
Baca DULU, berurutan (semua di docs/tim/ kecuali disebut lain):
 1. README.md, 00-ringkasan-proyek.md, 01-tugas-gpt.md (spesifikasi resmi G1–G6 + kriteria lulus), 03-aturan-kerja-tim.md (kepemilikan area, gerbang mutu, templat serah terima)
 2. 04-papan-tugas.md (status terkini) dan serah-terima/G1-tinjauan.md (TINJAUAN KETUA atas G1 — wajib dipatuhi)
 3. prompts/gpt/G1-…G6-*.md (rincian per paket) dan hasil-gpt/G1/* (kerjamu sebelumnya)
 4. Sumber per paket:
    G1: apps/clinic/src/components/mascot/{dentiSvg.js, denti.css, DentiMascot.jsx}, docs/maskot-denti.md, serah-terima/A1.md (+ folder A1/sebelum|sesudah: lihat gambar bukti)
    G2/G3: apps/clinic/src/styles/*, packages/ui/**, apps/clinic/src/components/** (layar yang dibahas), apps/console/**, tailwind config
    G4: docs/backup-dr.md, docs/denti-agen.md, infra/vps/** (BACA SAJA; jangan baca/tampilkan .env* atau rahasia), supabase/migrations/** (nama & RLS), docs/tim/serah-terima/*
    G5: 00-ringkasan-proyek.md, tabel paket di supabase/migrations (plans/kuota AI), docs/denti-agen.md bagian biaya
    G6: docs/briefing-gpt-agen.md, supabase/tests/agent/eval/{scenarios.mjs, run.mjs, models.mjs}, supabase/functions/ai-assistant/agent.ts
Setelah membaca, mulai bekerja langsung (tanpa menulis ringkasan panjang).

═══ ATURAN KERAS ═══
- Hanya tulis di docs/tim/hasil-gpt/<G1..G6>/ (dan docs/tim/serah-terima/ untuk laporan paket). Dilarang mengubah kode, supabase/**, infra/**, .github/**, rahasia.
- Dilarang: klaim sertifikasi/kepatuhan yang belum ada; angka/hukum/statistik karangan; menyalin merek/logo pihak lain; membaca/menampilkan rahasia atau data pasien nyata.
  Dokumen hukum/kepatuhan berlabel "DRAF — perlu ditinjau advokat/DPO/auditor". Setiap klaim keamanan merujuk fitur nyata di repo atau ditandai "RENCANA".
- Jangan push apa pun. Commit LOKAL ke cabang gpt/g1-g6-paket, satu commit per paket (pesan Bahasa Indonesia, mis. `docs(g1): …`). Jangan force/merge.
- Kualitas > kuantitas; konsisten antar paket (G1→G2→G3 saling merujuk: palet G1 → token G2 → layar G3).

═══ PAKET (keluaran persis seperti di 01-tugas-gpt.md; semua dalam bahasa Indonesia) ═══
G1 · Denti HD — Denti = ROBOT PORSELEN (kepala lebar, visor gelap, headphone, tubuh telur, lengan kapsul), BUKAN gigi.
  a) Ganti bagian "belum dinilai" di art-direction.md dengan KRITIK BERBASIS SUMBER (rujuk nomor baris dentiSvg.js/denti.css) + inventaris kait rig & pivot + cocokkan 93 state.
  b) lod-aturan.md — SELARASKAN dengan implementasi A1 yang sudah live: mini ≤72 px, standar ≤160, hero >160 (resolveDentiLod, LOD_SPEC). 58 px = LEBAR (tinggi ≈69,6; viewBox 400×480).
  c) palet.json — rasio kontras HARUS DIHITUNG DENGAN SKRIP (WCAG), bukan perkiraan; ikuti temuan Ketua: enamel vs putih 1,05:1 (kontur wajib kontinu tema terang), kontur vs latar gelap 1,38:1 (tepi luar harus terang).
  d) catatan-rig.md → ekspresi.md (12 ekspresi + prinsip gerak) → svg/<state>.<lod>.svg ×18 (idle, happy, talk, think, wave, sorry × mini/standar/hero).
  Syarat SVG: viewBox "0 0 400 480"; mini TANPA <filter> dan TANPA gradien; standar & hero tanpa <filter>; kait rig lama dipertahankan persis (kelas d-*, pivot); kontur mini ≥13 unit;
  ID gradien harus unik per instans (ikuti pola helper g() di dentiSvg.js); VALIDASI: parse semua SVG sebagai XML dan render (mis. skrip Node/Python) untuk memeriksa tampilan pada 58 px @1×/2×.
G2 · Sistem desain premium: design-system.md, tokens.json (W3C design tokens, dapat di-parse; petakan ke variabel CSS --color-* yang ada), komponen/*.md (±25, semua state), contoh-halaman.md.
  Palet turunan dari G1; semua pasangan warna punya rasio kontras yang dihitung skrip.
G3 · 10 layar + pola global: layar-<nama>.md ×10 (login+MFA, dashboard, asisten AI+kartu usulan, pasien, rekam medis, jadwal, pembayaran, biaya & stok, antrean TV, pengaturan & keamanan),
  pola-global.md (command palette Ctrl+K, pusat notifikasi, onboarding 5 langkah, mode ringkas), urutan-implementasi.md. Wireframe ASCII desktop + 375 px; teks UI Indonesia gaya Denti.
G4 · Keamanan & kepatuhan: seluruh berkas di 01-tugas-gpt.md §G4 (model-ancaman, kepatuhan-uu-pdp, kepatuhan-rme-satusehat, iso27001-pemetaan, kebijakan/*, respons-insiden, dr-backup,
  rencana-pentest, whitepaper-keamanan, kuesioner-vendor, hukum/*, peta-jalan-90-hari). Berdasarkan keadaan NYATA (MFA TOTP+HIBP aktif, audit log berantai hash, backup lokal harian,
  RLS ketat, VPS tunggal Biznet; BELUM: offsite backup, SMTP asli, SBOM/WAF, uji penetrasi) — jujur soal yang belum ada.
G5 · Produk & harga: positioning, paket-harga (Rupiah; sesuaikan dengan paket & kuota AI yang ada), roi-kalkulator, copy-situs, naskah-demo, studi-kasus-templat. Tanpa angka pasar karangan: beri rumus + contoh berlabel "ILUSTRASI".
G6 · Skenario & mikrocopy: skenario.js (±150, format PERSIS scenarios.mjs; jangan mengarang angka di luar data klinik contoh) dan mikrocopy.md + mikrocopy.json (≥5 variasi per situasi).
  Uji skenario sebelum diserahkan dengan skrip yang ada (mis. `npm run eval:agen:selftest` bila bisa menjalankan perintah; bila tidak, validasi struktur secara manual dan nyatakan).

═══ PERIKSA DIRI SEBELUM PAKET BERIKUTNYA (otomatis, tanpa bertanya) ═══
1) Semua berkas keluaran paket ada & namanya persis. 2) JSON/SVG/JS valid (parse sungguhan). 3) Rasio kontras dari skrip. 4) Tak ada klaim tanpa dasar / tanpa label DRAF.
5) Tulis docs/tim/serah-terima/<G#>.md sesuai templat 03 §4 (ringkasan, berkas, cara verifikasi, bukti, keputusan, risiko, Pertanyaan untuk Ketua, centang gerbang mutu).

═══ PENUTUP ═══
Setelah G6: tulis docs/tim/hasil-gpt/RINGKASAN-G1-G6.md (status tiap paket, semua ASUMSI, semua Pertanyaan untuk Ketua dikumpulkan, hal yang butuh keputusan pemilik, urutan yang kamu sarankan Ketua tinjau),
commit lokal terakhir, lalu balas di obrolan SATU pesan: daftar paket + jumlah berkas + nama cabang + 5 butir terpenting untuk Ketua. SELESAI.
Mulai sekarang dengan mencari akar repo dan membaca berkas urutan 1.
```
