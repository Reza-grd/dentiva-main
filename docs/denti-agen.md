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
| Bahan & gudang | `cari_bahan`, `kartu_stok`, `saran_pemesanan` | `bahan_tambah` (+stok awal), `bahan_ubah`, `stok_masuk` (harga rata-rata tertimbang + batch kadaluarsa), `stok_opname` |
| Pengeluaran | `cari_pengeluaran` | `pengeluaran_catat` (peringatan duplikat), `pengeluaran_ubah`, `pengeluaran_hapus` |
| Biaya & HPP | `daftar_overhead`, `cari_tindakan`, `resep_tindakan` | `overhead_atur`, `overhead_target`, `resep_atur`, `resep_hapus` |
| Tarif | — | `tindakan_harga`, `tindakan_harga_massal`, `tindakan_tambah`, `tindakan_ubah` |
| Riwayat | `riwayat_agen` | — |

Di luar itu (pembayaran pasien, rekam medis, data pasien, pengguna, pengaturan) agen **tidak** bisa bertindak.

## Contoh perintah

- "Catat pengeluaran listrik Oktober Rp 1.250.000, nota PLN-001."
- "Bahan apa yang perlu dipesan ulang? Buatkan pesan WA ke pemasoknya."
- "Stok masuk lidocaine 2 box @ Rp 60.000, kadaluarsa Des 2027."
- "Opname kapas: hasil hitung fisik 25."
- "Tambahkan bahan: masker bedah earloop, pcs, stok awal 50, harga 1000, minimum 20." (daftar panjang → satu usulan per baris, *Setujui semua*).
- "Naikkan harga semua tindakan 5%, dibulatkan 5.000." / "Atur overhead sewa ruko 8 juta."

## Arsitektur singkat

```
Admin ──chat──▶ edge function ai-assistant ──alat baca (RPC ai_*)──▶ data klinik
                      │ usulkan_*  ──▶ ai_agent_propose() ──▶ ai_actions (pending) ──┐
                      ▼                                                              │
              kartu usulan di halaman  ◀── payload.actions ◀────────────────────────┘
Admin ──Setujui──▶ mode agent_apply ──▶ ai_agent_apply() ──▶ tabel bisnis (1 transaksi)
Admin ──Batalkan─▶ mode agent_undo  ──▶ ai_agent_undo()  ──▶ kondisi sebelum dipulihkan
```

Berkas: `supabase/migrations/20261014090000_ai_agen.sql` (tabel, validasi, eksekusi, pembatalan, alat baca),
`supabase/functions/ai-assistant/agent.ts` (definisi alat), `apps/clinic/src/components/ai/AgentActions.jsx` (kartu).

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
