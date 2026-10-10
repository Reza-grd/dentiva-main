# Asisten AI — jalur cepat & pelajaran

Tujuan: pertanyaan yang sering muncul dijawab **seketika** (< 1 detik) tanpa memanggil model AI.
Urutan penanganan setiap pertanyaan chat (`supabase/functions/ai-assistant/index.ts`, mode `chat`):

1. **Jawaban terverifikasi sama persis** (`ai_knowledge`, dinilai 👍 oleh admin)
   - jenis *panduan* → selalu dipakai ulang;
   - jenis *data* → dipakai ulang hanya bila sidik data klinik (`data_fingerprint`) belum berubah
     dan bukan pertanyaan lanjutan.
2. **Jalur cepat** (`fast.ts`) — hanya untuk pertanyaan pertama (bukan lanjutan) dan bukan tanya ulang:
   - **DATA** (`INTENTS`): maksud dikenali dengan kata kunci, jawaban disusun dari `ai_snapshot()`
     — pendapatan hari ini/bulan ini, pengeluaran, laba kasar, kunjungan & pasien baru hari ini,
     jadwal 7 hari, stok menipis/kedaluwarsa, belum dibayar, recall, booking menunggu, tindakan terlaris.
   - **PANDUAN** (`GUIDES`): "pelajaran" cara pakai Dentiva yang sudah ditulis (layar antrean, booking
     online, undang pengguna, jadwal dokter, QRIS, daftar pasien, pembayaran, WhatsApp, SATUSEHAT,
     HPP, pengeluaran, recall, aplikasi desktop, tema, profil klinik, stok).
   - Pertanyaan yang mengandung analisis/perbandingan/periode khusus (`COMPLEX`: kenapa, bandingkan,
     bulan lalu, tanggal tertentu, simulasi, BEP, per dokter, …) **tidak** dijawab jalur cepat.
3. **AI** (Gemini / Claude / Groq) dengan ringkasan data + jawaban terverifikasi yang mirip sebagai acuan.

Jawaban jalur cepat & basis pengetahuan dicatat di `ai_usage` dengan `status = 'cached'`
(`model = 'jawaban-cepat:<intent>'` atau `'basis-pengetahuan'`) dan **tidak mengurangi kuota**.
Admin tetap dapat menilai 👍/👎; 👎 + "Tanyakan ulang" selalu diproses oleh AI.

## Menambah pelajaran

- **Pertanyaan data baru**: tambahkan entri di `INTENTS` (`id`, `match`, `answer`) yang hanya memakai
  field `ai_snapshot()`. Bila datanya belum ada di snapshot, tambahkan dulu ke fungsi SQL `ai_snapshot()`.
- **Panduan baru**: tambahkan entri di `GUIDES`. Jawaban harus menyebut nama menu persis seperti di
  Sidebar dan selaras dengan `guide.ts` (panduan untuk AI).
- Tambahkan contoh pertanyaan (yang harus cocok **dan** yang harus ditolak) di `fast.test.ts`, lalu
  `npx deno test --config supabase/functions/ai-assistant/deno.json supabase/functions/ai-assistant/fast.test.ts`.
- Pantau pertanyaan yang paling sering ditanyakan ke AI (`ai_usage` dengan `status = 'ok'`) — kandidat
  terbaik untuk dijadikan pelajaran berikutnya:

```sql
select question_norm, count(*) n from ai_usage
where feature = 'finance_chat' and status = 'ok' and created_at > now() - interval '30 days'
group by 1 order by n desc limit 30;
```
