# Rencana pengembangan: Asisten AI Dentiva (keuangan & manajemen klinik)

Disusun 8 Okt 2026. Status:
- **Fondasi & Fase A (Tanya Keuangan)**: selesai 8 Okt 2026.
- **Fase C, D, E**: selesai dibangun 9 Okt 2026 (lihat bagian 9).
- Semua fitur AI menunggu `ANTHROPIC_API_KEY` untuk uji coba (lihat `docs/ai-uji-pertanyaan.md`).
- Fase B (laporan & peringatan otomatis via WA/cron) belum dikerjakan.

## 1. Ringkasan

Dentiva bisa disematkan asisten AI (Claude, Anthropic) yang membantu pemilik/admin klinik:
membaca kondisi keuangan, memberi peringatan dini, menyiapkan laporan, dan membantu input data.
AI **tidak menebak angka**: setiap angka diambil dari database lewat fungsi baca yang aman,
lalu AI menjelaskan dan merangkumnya.

Data yang sudah tersedia dan menjadi bahan AI:

| Data | Tabel / view |
|---|---|
| Pembayaran, metode, diskon, status | `payments` |
| Pengeluaran per kategori | `expenses` |
| Overhead bulanan & target | `overhead_costs`, `overhead_monthly_target` |
| HPP & margin per tindakan | `treatment_cost_snapshot`, `treatments`, `tier_weights` |
| Stok, pembelian, kadaluarsa bahan | `master_bahan`, `material_purchases`, `material_batches`, `stok_movements` |
| Pendapatan harian/bulanan, tindakan terpopuler | `v_daily_revenue`, `v_monthly_revenue`, `v_popular_treatments` |
| Jadwal, kunjungan, booking | `visits`, `doctor_schedules`, `booking_requests` |

## 2. Fitur bertahap

### Fase A: "Tanya Keuangan" (chat di dalam aplikasi)
Pemilik/admin bertanya dalam bahasa sehari-hari, misalnya:
- "Berapa pendapatan bulan ini dibanding bulan lalu?"
- "Tindakan apa yang paling menguntungkan? Ada yang rugi?"
- "Kenapa margin September turun?"
- "Pendapatan per dokter minggu ini?"

AI menjawab dengan angka dari database, tabel/grafik kecil, dan saran tindakan.

### Fase B: Laporan & peringatan otomatis
- **Laporan pagi** (WA/email): pendapatan kemarin, jadwal hari ini, antrean booking.
- **Ringkasan mingguan/bulanan**: tren, tindakan terlaris, pengeluaran terbesar, margin.
- **Peringatan dini**: stok di bawah minimum, bahan mendekati kadaluarsa, tindakan dengan HPP
  melebihi harga jual, diskon tidak wajar, pembayaran belum lunas, overhead melonjak.

### Fase C: Bantu input data
- **Foto nota → pengeluaran / pembelian bahan**: AI membaca struk (vision), mengisi draf
  tanggal, pemasok, item, jumlah, kategori. **Pengguna wajib menyetujui** sebelum tersimpan.
- Kategori pengeluaran otomatis dan deteksi duplikat nota.

### Fase D: Simulasi & perencanaan
- "Kalau harga scaling naik 10%, berapa dampaknya?" (memakai volume historis).
- Titik impas (BEP) bulanan, proyeksi arus kas 3 bulan, target pendapatan per dokter.
- Rekomendasi harga berdasarkan HPP + overhead + margin target.

### Fase E: Asisten manajemen klinik
- Ringkasan hari ini untuk resepsionis (jadwal, pasien baru, booking menunggu).
- Daftar recall (kontrol 6 bulan, pasien lama yang belum kembali), draf pesan WA.
- Saran jadwal dokter dari pola kunjungan.
- Di **Dentiva Console** (pemilik Dentiva): ringkasan semua klinik, klinik berisiko berhenti,
  pemakaian fitur.

## 3. Arsitektur

```
Aplikasi klinik (React) ──► Edge Function `ai-assistant` (Supabase) ──► Claude API
                                 │  cek login, peran, paket, kuota
                                 │  alat (tools) = fungsi baca SQL terbatas
                                 ▼
                         RPC agregat keuangan (SECURITY DEFINER, per klinik, peran admin)
```

- **Kunci API hanya di server** (Supabase secret `ANTHROPIC_API_KEY`), tidak pernah di browser.
- **Alat AI = daftar fungsi tetap**, mis. `ai_revenue_summary(periode)`,
  `ai_treatment_margins(periode)`, `ai_expense_breakdown(periode)`, `ai_stock_alerts()`.
  Tidak ada SQL bebas. Semua fungsi memfilter `clinic_id` pemanggil dan memeriksa peran.
- **Hanya baca** pada fase A/B/D. Aksi tulis (fase C/E) selalu berupa *draf* yang disetujui manusia.
- **Model**: Claude Opus 5.5 (`claude-opus-5-5`) sebagai bawaan. Untuk pekerjaan ringan bervolume
  tinggi (kategori nota, ringkasan harian) bisa dipertimbangkan model lebih murah setelah diuji.
- **Prompt caching** untuk instruksi sistem + definisi alat agar biaya per pertanyaan turun.
- **Log pemakaian**: tabel `ai_usage` (klinik, pengguna, token, biaya, waktu) dan audit pertanyaan.
- **Fitur per paket**: aktif di Pro/Enterprise dengan kuota bulanan; bisa dimatikan per klinik.

## 4. Privasi & kepatuhan (wajib sebelum rilis)

- **Data medis tidak dikirim ke AI keuangan.** Alat keuangan hanya mengembalikan agregat
  (jumlah, total, per tindakan/per dokter); tidak ada diagnosa, SOAP, nama/NIK pasien.
  Ini selaras dengan aturan "isi rekam medis hanya untuk dokter".
- Data diproses oleh penyedia AI di luar Indonesia → perbarui **Kebijakan Privasi** dan
  Syarat & Ketentuan, minta persetujuan klinik saat mengaktifkan fitur, sediakan tombol nonaktif.
- Pelajari dan tanda tangani ketentuan pemrosesan data (DPA) penyedia AI; konsultasikan dengan
  konsultan hukum terkait UU PDP.
- Jawaban AI diberi label "dibuat AI, periksa kembali"; keputusan keuangan tetap di tangan klinik.

## 5. Perkiraan biaya (kasar)

Harga Claude Opus 5.5: USD 4 per 1 juta token masuk, USD 20 per 1 juta token keluar.
Satu pertanyaan keuangan ± 6.000 token masuk (instruksi + data agregat) dan ± 800 token keluar
→ ± USD 0,04 per pertanyaan; dengan prompt caching lebih rendah.
Contoh: 300 pertanyaan + 30 laporan otomatis per klinik per bulan ≈ USD 12–15.
Angka nyata diukur di fase uji (log `ai_usage`), lalu dipakai untuk menetapkan kuota/harga paket.

## 6. Jadwal usulan

| Minggu | Pekerjaan | Hasil |
|---|---|---|
| 1 | Fondasi: RPC agregat keuangan, tabel `ai_usage`, feature flag per paket, edge function dasar, teks privasi | Fondasi aman siap dipakai |
| 2–3 | Fase A: panel "Tanya Keuangan" + set evaluasi 30 pertanyaan keuangan (jawaban dicek dengan angka DB) | Chat keuangan versi uji di 1 klinik |
| 4–5 | Fase B: laporan pagi/mingguan (cron) + peringatan dini via WA | Laporan otomatis |
| 6–7 | Fase C: foto nota → draf pengeluaran dengan persetujuan | Input pengeluaran lebih cepat |
| 8–9 | Fase D: simulasi harga, BEP, proyeksi arus kas | Alat perencanaan |
| 10+ | Fase E: asisten resepsionis, recall, Console AI | Asisten manajemen |

## 7. Yang dibutuhkan dari pemilik

1. Akun Anthropic (console.anthropic.com) + metode pembayaran; buat API key dan simpan sendiri
   sebagai Supabase secret `ANTHROPIC_API_KEY` (jangan dikirim lewat chat).
2. Keputusan: fitur AI masuk paket apa, kuota per bulan, harga tambahan atau tidak.
3. Persetujuan teks privasi/ketentuan AI (dengan konsultan hukum).
4. 1 klinik uji coba yang bersedia memberi masukan.

## 8. Prasyarat dari audit sebelumnya

Sebaiknya selesai lebih dulu: Supabase & Vercel Pro (backup, pemakaian komersial),
Sentry DSN (pemantauan error), nomor WA & data badan usaha di website, dan peringatan otomatis
saat fungsi terjadwal gagal (agar laporan AI tidak diam-diam berhenti).

## 9. Yang sudah dibangun (9 Okt 2026)

| Fase | Fitur | Lokasi |
|---|---|---|
| C | Halaman **Pengeluaran** (tambah/ubah/hapus, ringkasan per kategori, foto bukti) | `/admin/pengeluaran` |
| C | **Pindai nota (AI)**: foto → draf (tanggal, pemasok, no. nota, total, kategori, barang); admin wajib memeriksa & menyimpan; peringatan nota ganda (no. nota sama, atau jumlah sama ±3 hari) | edge `ai-assistant` mode `receipt` |
| D | Alat AI `simulasi_harga`, `titik_impas`, `proyeksi_arus_kas` (angka dihitung SQL, AI hanya menjelaskan) | RPC `ai_price_simulation`, `ai_break_even`, `ai_cashflow_projection` |
| E | Alat AI `ringkasan_hari_ini`, `beban_jadwal_dokter`, `statistik_recall` | RPC `ai_today_summary`, `ai_doctor_schedule_load`, `ai_recall_stats` |
| E | Halaman **Recall Pasien** (admin & resepsionis): pasien ≥ N bulan tidak kembali tanpa jadwal mendatang, tautan WA berisi pesan (hanya bila pasien mengizinkan WA), catatan sudah dihubungi; template pesan bisa disusun AI tanpa data pasien | `/admin/recall`, `/resepsionis/recall`, tabel `recall_contacts` |
| E | **Console: Kesehatan klinik**: skor 0–100 + alasan (login staf, tren kunjungan, pencatatan pembayaran, tagihan, trial, adopsi fitur) | `platform.clinic_health()`, aksi `insights.clinicHealth`, Dashboard Console |

Catatan desain:
- Proyeksi arus kas memakai rata-rata 3 bulan penuh terakhir (lebih stabil daripada garis tren bila ada satu bulan ekstrem); tren tetap dilaporkan sebagai informasi.
- BEP memakai overhead bulanan (menu Biaya & Modal); bila kosong, rata-rata pengeluaran. Rasio biaya bahan dari snapshot HPP bila ada.
- Skor kesehatan klinik di Console sengaja **tanpa model AI** (aturan tetap, bisa dijelaskan) dan hanya memakai angka agregat.
- Pemakaian pindai nota & draf template dihitung ke kuota AI bulanan yang sama (`ai_usage.feature` = `receipt_scan` / `recall_template`).

## 10. Memilih penyedia AI (Claude atau Gemini) — tanpa ubah kode

Diatur lewat Supabase → Edge Functions → Secrets (atau `npx supabase secrets set ... --project-ref ggwratzhpukgsiduqely`):

| Secret | Isi | Keterangan |
|---|---|---|
| `AI_PROVIDER` | `anthropic`, `gemini`, atau `groq` | Opsional. Bila kosong: pakai Claude bila `ANTHROPIC_API_KEY` ada, selain itu Gemini. |
| `GEMINI_API_KEY` | kunci dari aistudio.google.com → Get API key | Wajib bila memakai Gemini. |
| `GEMINI_MODEL` | mis. `gemini-flash-latest` | Opsional; bawaan `gemini-flash-latest` (Flash versi stabil terbaru). |
| `GEMINI_PAID` | `true` | Isi hanya bila proyek Google sudah berbayar. Mengubah teks persetujuan di aplikasi. |
| `ANTHROPIC_API_KEY` | kunci dari console.anthropic.com | Wajib bila memakai Claude. |
| `GROQ_API_KEY` | kunci dari console.groq.com → API Keys | Wajib bila memakai Groq (`AI_PROVIDER=groq`). |
| `GROQ_MODEL` | mis. `openai/gpt-oss-120b` | Opsional; model chat + alat + template. |
| `GROQ_VISION_MODEL` | mis. `qwen/qwen3.8-27b` | Opsional; harus model yang bisa membaca gambar (pindai nota). |

Perubahan secret langsung berlaku (tanpa deploy ulang). Aplikasi menampilkan penyedia aktif di halaman
Asisten AI, dan teks persetujuan otomatis menyesuaikan.

Penting — **Gemini versi gratis**: menurut ketentuan Google, data yang dikirim lewat kuota gratis dapat dipakai
Google untuk meningkatkan produknya dan dapat dibaca peninjau manusia. Yang dikirim Dentiva hanya angka ringkasan
keuangan dan foto nota pembelian (tanpa identitas/rekam medis pasien), tetapi gunakan versi gratis hanya untuk
uji coba. Untuk klinik pelanggan, pakai Gemini berbayar (`GEMINI_PAID=true`) atau Claude.
Biaya Gemini dicatat 0 di `ai_usage` (token tetap dicatat); tagihan Gemini berbayar dipantau di Google AI Studio.
Batas kuota gratis Gemini bisa berubah; bila tercapai, aplikasi menampilkan "batas pemakaian penyedia AI tercapai".

Catatan Gemini (9 Okt 2026): AI Studio kini hanya mengeluarkan kunci format `AQ.`, dan saat ini kunci tersebut
ditolak Google (401 ACCESS_TOKEN_TYPE_UNSUPPORTED) — masalah di sisi Google. Sementara itu uji coba memakai Groq.
Groq sering mengganti model; bila model bawaan dihentikan, ganti lewat `GROQ_MODEL` / `GROQ_VISION_MODEL`
(lihat console.groq.com/docs/models).
