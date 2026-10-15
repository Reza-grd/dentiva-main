# Denti Agen — Asisten AI yang bisa bertindak

Mulai 14 Okt 2026 Asisten AI admin (halaman **Asisten AI**) bukan hanya menjawab, tetapi juga **mengusulkan dan — setelah
disetujui admin — menjalankan** pekerjaan pengelolaan keuangan & bahan klinik.

## Prinsip keamanan (jangan dilonggarkan tanpa diskusi)

1. **Model AI tidak pernah menulis data.** Alat `usulkan_*` hanya memanggil `ai_agent_propose()`, yang memvalidasi lalu menyimpan
   *usulan* (`ai_actions`, status `pending`). Tidak ada alat yang menulis langsung ke tabel.
2. **Admin menyetujui.** Data berubah saat tombol *Setujui* → mode `agent_apply` → `ai_agent_apply()` (tanpa model AI, tanpa kuota).
   Kondisi dibaca ulang saat disetujui (mis. harga yang berubah sejak usulan membuat usulan ditolak), dan persetujuan banyak usulan
   bersifat **atomik** (satu gagal → tidak ada yang berubah).
3. **Semua di database**: `ai_require_admin()` (admin + klinik dari JWT), usulan hanya bisa dijalankan oleh admin pembuatnya,
   kedaluwarsa 30 menit, maksimal 60 usulan tertunda. Tabel `ai_actions` hanya bisa dibaca admin klinik sendiri; tulis langsung ditolak.
4. **Jejak audit & pembatalan**: setiap usulan tercatat (siapa, apa, hasil, kondisi sebelum). Tombol *Batalkan* tersedia untuk
   tindakan yang aman dibatalkan; stok masuk **tidak** dibatalkan otomatis (koreksi lewat opname).
5. Hasil alat (nama bahan, deskripsi, catatan) diperlakukan sebagai data, bukan perintah. Tidak ada data identitas/rekam medis pasien.

## Kemampuan

| Kelompok | Alat baca | Alat usulan (jenis di database) |
|---|---|---|
| Bahan & gudang | `cari_bahan`, `kartu_stok`, `saran_pemesanan`, `ringkasan_gudang`, `bahan_kadaluarsa`, `riwayat_harga_bahan` (banding pemasok), `draf_pesan_pemasok` | `bahan_tambah` (+stok awal), `bahan_tambah_banyak` (impor daftar ≤100), `bahan_ubah`, `stok_masuk` (harga rata-rata tertimbang + batch kadaluarsa), `stok_masuk_banyak` (satu nota ≤60 barang), `stok_opname`, `batch_buang` (kadaluarsa/rusak/hilang) |
| Pengeluaran | `cari_pengeluaran`, `anomali_pengeluaran` (lonjakan, biaya rutin belum tercatat, besar, kemungkinan ganda) | `pengeluaran_catat` (peringatan duplikat), `pengeluaran_ubah`, `pengeluaran_hapus` |
| Biaya & HPP | `daftar_overhead`, `cari_tindakan`, `resep_tindakan`, `analisis_margin` (HPP + overhead, status rugi/tipis/sehat) | `overhead_atur`, `overhead_target`, `resep_atur`, `resep_hapus` |
| Tarif | — | `tindakan_harga`, `tindakan_harga_massal`, `tindakan_tambah`, `tindakan_ubah` |
| Riwayat | `riwayat_agen` | — |

Di luar itu (pembayaran pasien, rekam medis, data pasien, pengguna, pengaturan) agen **tidak** bisa bertindak.

## Cara berpikir agen (lihat `AGENT_PROMPT` di `agent.ts`)

Agen diajari bekerja seperti rekan kerja operasional: **cari dulu baru bertindak**, tanyakan hanya yang penting, perbaiki sendiri bila alat menolak,
lalu menutup dengan satu langkah berikutnya. Ada protokol khusus untuk: *briefing harian* (gudang + keuangan + tagihan → maks. 3 prioritas),
*pembelian ulang* (saran → banding pemasok → draf pesan WA), *nota/daftar tempel* (urai baris, tanyakan yang meragukan, satu kartu),
*kadaluarsa* (usul buang stok), *harga & margin* (rekomendasi beralasan, usulan hanya bila diminta), dan *pengeluaran janggal*.
Untuk perintah bertindak, penalaran model dinaikkan (Claude `effort: high`, Gemini `thinking: medium`).

**Pindai nota** (ikon kamera di kolom tanya): foto nota dibaca (mode `receipt`) lalu dikirim ke Denti sebagai pesan ringkas
(`utils/notaMessage.js`) agar Denti memeriksa duplikat, mencatat pengeluaran, dan memasukkan barang ke stok.

## Contoh perintah

- "Catat pengeluaran listrik Oktober Rp 1.250.000, nota PLN-001."
- "Bahan apa yang perlu dipesan ulang? Buatkan pesan WA ke pemasoknya."
- "Stok masuk lidocaine 2 box @ Rp 60.000, kadaluarsa Des 2027."
- "Opname kapas: hasil hitung fisik 25."
- "Tambahkan bahan: masker bedah earloop, pcs, stok awal 50, harga 1000, minimum 20." (daftar panjang → satu usulan per baris, *Setujui semua*).
- "Naikkan harga semua tindakan 5%, dibulatkan 5.000." / "Atur overhead sewa ruko 8 juta."
- "Briefing hari ini: apa yang perlu saya urus?" / "Bahan apa yang sudah kadaluarsa? Buang stoknya."
- "Tindakan mana yang margin-nya tipis? Rekomendasikan harga." / "Ada pengeluaran yang janggal bulan ini?"

## Arsitektur singkat

```
Admin ──chat──▶ edge function ai-assistant ──alat baca (RPC ai_*)──▶ data klinik
                      │ usulkan_*  ──▶ ai_agent_propose() ──▶ ai_actions (pending) ──┐
                      ▼                                                              │
              kartu usulan di halaman  ◀── payload.actions ◀────────────────────────┘
Admin ──Setujui──▶ mode agent_apply ──▶ ai_agent_apply() ──▶ tabel bisnis (1 transaksi)
Admin ──Batalkan─▶ mode agent_undo  ──▶ ai_agent_undo()  ──▶ kondisi sebelum dipulihkan
```

Berkas: `supabase/migrations/20261014090000_ai_agen.sql` (tabel, validasi, eksekusi, pembatalan, alat baca) dan `20261015090000_ai_agen_lanjutan.sql` (tindakan massal, buang stok, analitik),
`supabase/functions/ai-assistant/agent.ts` (definisi alat), `apps/clinic/src/components/ai/AgentActions.jsx` (kartu).

## Melatih agen — evaluasi berbasis data

Kualitas agen ditentukan model yang dipakai. **Penyedia produksi saat ini Gemini flash** (lihat `ai_usage.model`), bukan Claude — model kecil
lebih mudah salah memilih alat, mengarang angka, atau mengklaim "sudah dicatat". Karena itu "melatih" = menyetel **prompt, skema alat, dan
penjaga deterministik** dengan ukuran yang jelas, bukan menebak.

```bash
npm run eval:agen:selftest     # CI: skrip ideal vs alat & data nyata (tanpa jaringan) — bukti skenario konsisten
npm run eval:agen:negative     # CI: skrip dirusak sengaja; penilai harus menandai ≥ 90% skenario gagal
GEMINI_API_KEY=… npm run eval:agen -- --provider gemini --repeat 3 --json hasil.json   # model SUNGGUHAN
```

Harness (`supabase/tests/agent/eval/`) memakai **instruksi sistem, alat, dan pelaksana alat yang sama dengan produksi** (`core.ts`, `agent.ts`) di atas
database skema produksi (PGlite) berisi klinik contoh yang realistis, lalu menilai: alat yang dipanggil, usulan (jenis + argumen), isi jawaban,
dan invarian *"data bisnis tidak berubah tanpa persetujuan"*. 32 skenario awal mencakup briefing, analitik, pengeluaran, bahan (ambigu, daftar, nota),
kadaluarsa, tarif/overhead/resep, konfirmasi lanjutan, di luar cakupan, dan injeksi prompt.

Alur menyetel: jalankan dengan kunci penyedia → lihat skenario gagal (jejak alat + jawaban dicetak) → ubah `AGENT_PROMPT` / deskripsi alat / penjaga →
ulangi sampai ≥ 85% (`--min`) → tambahkan skenario baru untuk setiap kegagalan nyata dari produksi. Lapisan penjaga yang tidak bergantung model:
koersi argumen ("Rp 1.250.000", "60rb", "14/10/2026", "10%"), alat usulan hanya disodorkan bila relevan (`needsWriteTools`), `briefing_agen`
(prioritas dihitung di database), dan `guardAgentAnswer` (koreksi klaim palsu "sudah dicatat", jawaban kosong → ringkasan usulan).
Panduan membuat skenario tambahan dengan bantuan GPT: `docs/briefing-gpt-agen.md`.

## Menambah kemampuan baru (satu jenis tindakan)

1. Database: tambah `ai_agent_p_<jenis>` (validasi + pratinjau), `ai_agent_x_<jenis>` (eksekusi, kembalikan `{hasil, sebelum, bisa_batal}`),
   `ai_agent_u_<jenis>` (pembatalan, bila aman) dan masukkan nama ke `ai_agent_kinds()`.
2. `agent.ts`: tambah definisi alat `usulkan_<…>` di `AGENT_WRITE_TOOLS` dan petakan di `WRITE_KIND`.
3. Uji di `supabase/tests/agent/agent.test.mjs` (`npm run db:agent`) dan `agent.test.ts` (`deno test`).

## Menguji

```bash
npm run db:agent   # fungsi database pada skema produksi ASLI (PGlite, tanpa Docker)
npx -y deno test --config supabase/functions/ai-assistant/deno.json supabase/functions/ai-assistant/
npm test -w apps/clinic -- aiAgentActions
```
