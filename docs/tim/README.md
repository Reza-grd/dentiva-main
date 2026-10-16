# Paket Tim Dentiva — GPT · Antigravity · Ketua Tim (Claude)

Tujuan: membawa Dentiva menjadi produk **profesional, berkeamanan tingkat tinggi, dan premium** (termasuk Denti yang tajam/HD) lewat tiga peran dengan bidang berbeda.

| Berkas | Isi |
|---|---|
| `00-ringkasan-proyek.md` | Penjelasan proyek dari awal: produk, arsitektur, yang sudah ada, kekurangan, konvensi, peta berkas |
| `01-tugas-gpt.md` | Tugas GPT (G1–G6): desain/merek, kepatuhan, produk, skenario uji |
| `02-tugas-antigravity.md` | Tugas Antigravity (A1–A7): render Denti HD, sistem desain & layar, E2E, hardening, desktop, performa |
| `03-aturan-kerja-tim.md` | Kepemilikan area, cabang, gerbang mutu, templat serah terima, larangan |
| `04-papan-tugas.md` | Status semua paket + tugas tersimpan (mis. kunci Claude) + tugas Ketua |
| `prompts/gpt/` | Pesan pembuka + prompt siap tempel G1–G6 |
| `prompts/antigravity/` | Aturan misi + misi siap tempel A1–A7 |
| `hasil-gpt/`, `serah-terima/`, `usulan-ci/`, `usulan-infra/` | Tempat menyimpan hasil (dibuat sesuai kebutuhan) |

## Cara memulai (untuk pemilik)

**GPT** (ChatGPT; disarankan satu *Project* "Dentiva"):
1. `node scripts/tim/bundel-konteks.mjs` → membuat `docs/tim/bundel/GPT-*.md` (rahasia diredaksi; periksa sekilas).
2. Buat Project di ChatGPT; tempel isi `prompts/gpt/_awal-sesi.md` sebagai *Instructions*; unggah `GPT-umum.md` (+ bundel sesuai paket).
3. Tempel prompt paket (mis. `G1-denti-hd.md`) → kerjakan **berurutan & bertahap** (prompt sudah meminta "tunggu lanjut").
4. Simpan keluaran ke `docs/tim/hasil-gpt/<kode>/` dengan nama berkas persis, lalu kabari Ketua.

**Antigravity:**
1. Buka repo di Antigravity; buat cabang `antigravity/<kode>-<topik>` dari `console` terbaru.
2. Tempel `prompts/antigravity/_aturan-misi.md` sebagai *Workspace Rules* (atau di awal misi), lalu tempel misi paket (mulai **A1**).
3. Minta rencana dulu, setujui, biarkan ia mengukur & memverifikasi di browser. Pastikan bukti ada di `docs/tim/serah-terima/<kode>/`.
4. `git push origin antigravity/<kode>-…` lalu kabari Ketua untuk tinjauan & integrasi.

**Urutan gelombang & ketergantungan:** lihat `04-papan-tugas.md`.
