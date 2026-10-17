# GPT · G8 — Persona & suara Eira (tempel sekali; kerja tanpa jeda)

```
G8 · PERSONA & SUARA EIRA — kerjakan sampai selesai tanpa jeda; berhenti hanya bila berkas tidak bisa dibaca.

Konteks: sejak 17 Okt 2026 asisten AI & maskot Dentiva bernama EIRA (dulu "Denti"; "Denti Agen" → "Eira Agen"). Warna Eira BIRU.
Kode, prompt server, dan Pusat Bantuan sudah memakai "Eira"; dokumen desain/produk lama (hasil G1–G6) masih menyebut "Denti".

Worktree baru:
  git fetch origin
  git worktree add D:/dentiva/gpt-g8 -b gpt/g8-persona-eira origin/console
Tulis HANYA di docs/tim/hasil-gpt/** dan docs/tim/serah-terima/G8.md. Commit lokal, jangan push. Jangan mengubah kode.

BACA DULU: docs/tim/05-rencana-besar-2.md (rencana & aturan baru), docs/tim/04-papan-tugas.md (log 17 Okt), docs/denti-agen.md,
docs/maskot-denti.md, supabase/functions/ai-assistant/core.ts (bagian GAYA EIRA) & agent.ts (AGENT_PROMPT), apps/clinic/src/utils/dentiLines.js,
docs/tim/hasil-gpt/G6/mikrocopy.md, docs/tim/hasil-gpt/G7/artikel/*.md.

KELUARAN (docs/tim/hasil-gpt/G8/):
1) persona-eira.md — siapa Eira: peran (rekan kerja operasional klinik gigi: keuangan, stok, jadwal, panduan aplikasi), nilai, kepribadian,
   batas tegas (bukan dokter/tenaga medis, tidak mendiagnosis, tidak menjanjikan hasil, tidak mengambil keputusan klinis, selalu minta persetujuan
   sebelum mengubah data), cara menyebut diri ("saya"), cara menyapa pengguna per peran & jam, sikap saat salah/tidak tahu, sikap terhadap
   data pasien. Hindari kata ganti bergender untuk Eira.
2) suara-dan-nada.md — prinsip bahasa (Indonesia baku-santai, ringkas, angka Rupiah & tanggal Indonesia), 40 pasang contoh jawaban BAIK vs BURUK
   yang meliputi: pertanyaan keuangan, usulan agen (kartu), penolakan sopan, kesalahan/maaf, pengguna marah, basa-basi, peringatan risiko,
   permintaan di luar kemampuan, data tidak cukup. Daftar kata/ungkapan yang dihindari & penggantinya.
3) Perbarui "Denti" → "Eira" (dan "Denti Agen" → "Eira Agen") di dokumen hasil GPT lama: hasil-gpt/G1..G6 (*.md, *.json, mikrocopy) —
   KECUALI berkas sejarah serah-terima & bukti PNG/SVG. Catat daftar berkas yang diubah. Pastikan mikrocopy.json tetap terurai.
4) usulan-prompt.md — usulan perbaikan bagian GAYA EIRA di core.ts & AGENT_PROMPT di agent.ts yang selaras persona (sebagai teks usulan;
   Ketua yang menerapkan dan mengevaluasi). Jangan mengubah aturan keselamatan agen (usulan→setujui, gerbang hapus, dll.).

PERIKSA DIRI: 0 kemunculan kata utuh "Denti" di berkas yang diperbarui (kecuali kutipan sejarah yang ditandai); JSON terurai;
40 pasang contoh lengkap; tidak ada klaim medis. Akhiri dengan docs/tim/serah-terima/G8.md (templat 03 §4) dan SATU pesan ringkas.
```
