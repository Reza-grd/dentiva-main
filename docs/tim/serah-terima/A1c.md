# Serah Terima A1c — Denti Teal (Penerapan Desain GPT G1 ke Rig Produksi)

- **Pembuat:** Antigravity · **Tanggal:** 2026-10-17 · **Cabang/berkas:** `antigravity/A1c-denti-teal` (worktree terpisah `D:\dentiva\antigravity-A1c`)

## Ringkasan (≤ 5 kalimat)

Paket A1c menerapkan spesifikasi material **Denti Teal** dari hasil GPT G1 (`docs/tim/hasil-gpt/G1/palet.json` dan `spesifikasi-lod.md`) ke dalam rig maskot interaktif produksi (`apps/clinic/src/components/mascot/dentiSvg.js` dan `denti.css`) tanpa mengubah satu pun dari 189 kait kelas CSS (`d-*`), struktur DOM, maupun 93 state ekspresi/gerakan. Seluruh permukaan cangkang enamel (`#F8FAFC`), kontur biru-batu (`#163047`), visor gelap (`#0B1220`), wajah mint (`#5EEAD4`), aksen teal klinis (`#0F766E`), dan cincin emas hangat (`#E7C98B`) telah diselaraskan, termasuk aturan jumlah gradien per LOD (`mini`: 0 gradien & 0 filter; `standar`: 1 gradien badan & 0 filter; `hero`: 3 gradien & 0 filter) serta ketebalan garis (`mini`: 13 unit, `standar`: 7 unit, `hero`: 4 unit). Dua temuan tinjauan Ketua Tim atas G1 juga telah diselesaikan langsung di kode: (1) siluet luar Denti pada tema gelap (`.dark` dan `.qd`) otomatis memakai `--d-outline: #5EEAD4` (kontras **12,66:1** terhadap `#0B1220`) sedangkan kontur dalam tetap `--d-outline-inner: #163047`, dan (2) alis state `sorry`/`.d-lids` diubah dari blok penutup gelap menjadi kurva alis miring ramah berwarna `#5EEAD4`. Seluruh polesan gerak dari A1b (orbit `offset-path` tanpa SMIL, pegas `celebrate` tanpa `scale()` pada badan, dan pendaran radial teal tanpa `<filter>`) tetap terjaga penuh dengan penurunan ukuran bundel maskot menjadi **23.776 byte gzip** (-12 byte dari A1b).

## Yang berubah / diserahkan (daftar berkas)

1. `apps/clinic/src/components/mascot/dentiSvg.js` — Pembaruan palet material Denti Teal G1 (`#F8FAFC`, `#CBD5E1`, `#163047`, `#0B1220`, `#5EEAD4`, `#0F766E`, `#14B8A6`, `#E7C98B`), variabel kontur adaptif `--d-outline` (luar) & `--d-outline-inner` (dalam), konfigurasi `LOD_SPEC` (`mini`: `shellStroke: 13`, 0 gradien, 0 filter; `standar`: `shellStroke: 7`, 1 gradien `shell`, 0 filter; `hero`: `shellStroke: 4`, 3 gradien `shell`, `blue`, `eyeGlow`, 0 filter), pelebaran senyum `.d-mouth-smile` ke 44 unit (`M178 196 Q200 216 222 196`), serta perbaikan `.d-lids` (state `sorry`) menjadi kurva alis lengkung ramah `#5EEAD4`.
2. `apps/clinic/src/components/mascot/denti.css` — Penyelarasan aturan CSS `.dark .denti, .qd .denti` (`--d-outline: #5EEAD4; --d-outline-inner: #163047`), warna aksen interaktif `.d-chest-core` dan `.d-ear-face` sesuai palet teal/emas/merah/hijau, serta transisi `.d-lids` pada state `sorry`, `sad`, `cry`, `sigh`, `gloomy`, `disappointed`, `tired`, dan `sick`.
3. `apps/clinic/src/test/dentiMascot.test.jsx` — Penambahan pengujian otomatis rasio kontras WCAG Denti Teal (outline terang `#163047` vs `#FFFFFF` $\ge 3:1$, outline gelap `#5EEAD4` vs `#0B1220` $\ge 3:1$, wajah `#5EEAD4` vs visor `#0B1220` $\ge 4,5:1$), verifikasi anggaran gradien & filter per LOD (`mini` = 0 gradien, `standar` $\le 1$ gradien, `hero` $\le 3$ gradien, 0 `<filter>` di semua LOD), dan verifikasi perbaikan alis `sorry` (`.d-lids` memakai `fill="none"` dan `stroke="#5EEAD4"`).
4. `docs/tim/serah-terima/A1c/` — Bukti tangkapan layar matriks 93 state × 3 LOD × 2 tema, perbandingan sebelum (A1b Biru) vs sesudah (A1c Teal) @1× & @2× DPR, dan integrasi 4 konteks layar aplikasi.
5. `docs/tim/serah-terima/A1c.md` — Laporan serah terima paket A1c ini.

## Cara memverifikasi (perintah + langkah klik)

```bash
# 1. Dari worktree A1c (atau cabang antigravity/A1c-denti-teal)
npm run lint
npm run typecheck

# 2. Jalankan seluruh unit test dengan variabel lingkungan sintetis
VITE_SUPABASE_URL="http://127.0.0.1:54321" VITE_SUPABASE_ANON_KEY="sintetis-anon-key-uji-lokal" npm test

# 3. Verifikasi build klinik produksi
VITE_SUPABASE_URL="http://127.0.0.1:54321" VITE_SUPABASE_ANON_KEY="sintetis-anon-key-uji-lokal" npm run build:clinic
```

**Langkah verifikasi visual interaktif:**
1. Buka aplikasi klinik dan perhatikan **widget mengambang Denti (58 px, LOD `mini`)** di pojok kanan bawah: siluet luar `#163047` tebal (13 unit), 0 gradien, wajah mint `#5EEAD4` tajam di atas visor `#0B1220`.
2. Buka **Dashboard → Kartu Briefing Pagi (`AiBriefingCard`, 68 px)** dan **Halaman Asisten AI (`AiAssistantPage`, 120 px / 220 px)**: pastikan warna teal `#0F766E` dan cincin emas `#E7C98B` selaras dengan identitas produk.
3. Aktifkan **Mode Gelap (`.dark`)** atau buka **Layar Antrean TV (`QueueDisplayPage`, `.qd`)**: pastikan tepi luar Denti otomatis berubah menjadi mint `#5EEAD4` yang kontras jelas terhadap latar `#0B1220`, sedangkan garis tangan di depan tubuh/wajah tetap memakai `#163047`.
4. Uji state **`sorry`** pada panggung Asisten AI: pastikan alis tampil sebagai lengkungan miring ramah berwarna `#5EEAD4` tanpa balok gelap yang menutupi mata.

## Bukti (tangkapan layar / hasil tes / tautan berkas)

1. **Matriks Regresi 93 State × 3 LOD × 2 Tema (@2× DPR, `prefers-reduced-motion: reduce`):**
   - [01-matriks-93-state-mini-terang-gelap.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/01-matriks-93-state-mini-terang-gelap.png) — 93 state pada LOD `mini` (58 px, 0 gradien, 0 filter, stroke 13 unit) di tema terang & gelap.
   - [02-matriks-93-state-standar-terang-gelap.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/02-matriks-93-state-standar-terang-gelap.png) — 93 state pada LOD `standar` (88–120 px, 1 gradien badan, 0 filter, stroke 7 unit) di tema terang & gelap.
   - [03-matriks-93-state-hero-terang-gelap.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/03-matriks-93-state-hero-terang-gelap.png) — 93 state pada LOD `hero` (3 gradien, 0 filter, stroke 4 unit + pendaran radial teal) di tema terang & gelap.
2. **Perbandingan Sebelum (A1b Biru) vs Sesudah (A1c Teal) & Ketajaman Sub-Piksel (@1× & @2× DPR):**
   - [04-sebelum-sesudah-lod-terang-gelap.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/04-sebelum-sesudah-lod-terang-gelap.png) — Perbandingan berdampingan A1b (Biru) vs A1c (Teal) pada ukuran 58 px (`idle`, `talk`), 120 px (`happy`), dan 220 px (`idle`, `sorry`) di tema terang & gelap.
   - [05-mini-58px-dpr1x.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/05-mini-58px-dpr1x.png) — Perbandingan LOD `mini` 58×70 px pada DPR 1× (terang & gelap).
   - [05-mini-58px-dpr2x.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/05-mini-58px-dpr2x.png) — Perbandingan LOD `mini` 58×70 px pada DPR 2× (terang & gelap).
3. **Integrasi 4 Konteks Layar Aplikasi (Terang & Gelap):**
   - [06-konteks-layar-aplikasi-terang-gelap.png](file:///D:/dentiva/antigravity-A1c/docs/tim/serah-terima/A1c/06-konteks-layar-aplikasi-terang-gelap.png) — Widget mengambang (58 px), kartu briefing (68 px), halaman Asisten AI (120 px), layar antrean TV (`.qd` / `.dark`, 220 px), serta state `sorry` di mode gelap.
4. **Tabel Rasio Kontras WCAG & Ukuran Bundel:**

| Pasangan Elemen | Warna Depan | Warna Latar | Rasio Kontras | Ambang | Status |
|---|---|---|---|---|---|
| Kontur luar tema terang vs kartu putih | `#163047` | `#FFFFFF` | **13,57 : 1** | $\ge 3,0 : 1$ | Lulus |
| Kontur luar tema terang vs enamel badan | `#163047` | `#F8FAFC` | **12,97 : 1** | $\ge 3,0 : 1$ | Lulus |
| Kontur luar tema gelap (`.dark`/`.qd`) vs latar gelap | `#5EEAD4` | `#0B1220` | **12,66 : 1** | $\ge 3,0 : 1$ | Lulus |
| Wajah/mata/mulut vs visor gelap | `#5EEAD4` | `#0B1220` | **12,66 : 1** | $\ge 4,5 : 1$ | Lulus |
| Aksen teal bawah/telinga vs enamel badan | `#0F766E` | `#F8FAFC` | **5,22 : 1** | $\ge 3,0 : 1$ | Lulus |

| Metrik Ukuran & Performa | Sebelum (A1b Biru) | Sesudah (A1c Teal) | Selisih / Ambang |
|---|---|---|---|
| Ukuran mentah (`dentiSvg.js` + `denti.css`) | `140.848` byte | `140.258` byte | **-590 byte** |
| Ukuran terkompresi (`gzip -9`) | `23.788` byte | `23.776` byte | **-12 byte** (Target: tidak naik > 5 KB) |
| Beban CPU Idle 5 detik (Chrome CDP `TaskDuration`) | ~12,5% | **12,31%** | $\le 15\%$ (Lulus) |
| Jumlah elemen `<filter>` (semua LOD) | `0` | **`0`** | Wajib `0` (Lulus) |

## Keputusan desain & alasan

1. **Pemisahan `--d-outline` (Kontur Luar) dan `--d-outline-inner` (Kontur Dalam):**
   - Di spesifikasi G1, kontur `#163047` memiliki kontras sangat tinggi di atas latar putih (`13,57:1`), tetapi hanya `1,38:1` di atas latar gelap `#0B1220`. Jika seluruh garis diubah menjadi `#5EEAD4` pada mode gelap, maka properti tangan yang berada *di depan* cangkang enamel putih (`#F8FAFC`) seperti `.d-finger` (`shush`), `.d-whisper`, `.d-facepalm`, dan `.d-pray` akan kehilangan keterbacaan terhadap badan putih.
   - Karena itu, siluet luar (`.d-body`, `.d-head`, `.d-arm-l/r`, `.d-ear-l/r`, `.d-fin-l/r`, `.d-thumb`, `.d-earhand`) memakai `var(--d-outline, #163047)` yang otomatis menjadi `#5EEAD4` pada `.dark .denti` dan `.qd .denti`, sedangkan garis tangan di depan enamel memakai `var(--d-outline-inner, #163047)` agar tetap tegas di atas badan `#F8FAFC`.
2. **Perbaikan Alis State `sorry` (`.d-lids` & `.d-brows-w`):**
   - Pada rig lama dan render G1, `.d-lids` menggunakan `<path fill="#0b1530">` berbentuk balok tebal yang turun menutupi bagian atas mata sehingga tampak seperti balok hitam kaku di LOD `hero`.
   - Di A1c, `.d-lids` dan `.d-brows-w` diubah menjadi kurva alis lengkung miring (`fill="none" stroke="#5EEAD4" stroke-linecap="round"` dengan ketebalan adaptif `browStroke`) disertai sedikit pergeseran kelopak mata pada CSS state `sorry` (`transform: translateY(-2px)`), menghasilkan ekspresi menyesal/empatik yang ramah dan bersih di semua ukuran.
3. **Proporsi `detailStroke` untuk Properti Kecil pada LOD `mini`:**
   - Mengikuti G1, `shellStroke` pada LOD `mini` ditetapkan `13` unit ($\approx 1,88\text{ px}$ fisik pada lebar 58 px). Agar properti jari/tangan kecil (`.d-finger`, `.d-pray`, `.d-whisper`, `.d-thumb`, `.d-brush`) tidak saling menutup bentuk internalnya pada ukuran 58 px, properti kecil tersebut diberi `detailStroke: 6.5` (masih $\approx 1\text{ px}$ fisik di 58 px).

## Risiko, batasan, dan hal yang belum selesai

- **Tidak ada batasan fungsional yang tersisa pada komponen maskot.** Berkas statis SVG referensi di `docs/tim/hasil-gpt/G1/` tidak diubah karena merupakan area baca-saja milik GPT sesuai `03-aturan-kerja-tim.md` §1; seluruh perbaikan langsung diterapkan di rig produksi `apps/clinic/src/components/mascot/`.

## Pertanyaan untuk Ketua

- Tidak ada pertanyaan penghambat. Paket **A1c** (dan **A4b** di cabang `antigravity/A4b-mutu-poles`) siap ditinjau dan digabungkan ke `console`. Apakah setelah tinjauan ini kami dapat langsung memulai **Paket A2 (`antigravity/A2-sistem-desain`)**?

## Daftar centang gerbang mutu (1–7)

- [x] **1. Lint, typecheck, unit test, dan build bersih:** `npm run lint` bersih, `npm run typecheck` bersih, `npm test` lulus **549/549 tes unit** (`apps/clinic`: 530 tes termasuk 20 tes di `dentiMascot.test.jsx`, `apps/console`: 9 tes, `packages/shared`: 10 tes), dan `npm run build:clinic` berhasil.
- [x] **2. Tes baru untuk perilaku baru:** Ditambahkan pengujian kontras WCAG Denti Teal (terang & gelap), aturan jumlah gradien per LOD (`mini` = 0, `standar` $\le 1$, `hero` $\le 3$), dan pengujian struktur alis `.d-lids` pada `apps/clinic/src/test/dentiMascot.test.jsx`.
- [x] **3. Bukti visual lengkap:** Disertakan matriks 93 state × 3 LOD × 2 tema (@2× DPR), perbandingan A1b vs A1c (@1× & @2× DPR), dan 4 konteks layar aplikasi di `docs/tim/serah-terima/A1c/`.
- [x] **4. Aksesibilitas:** Kontras tepi luar $\ge 12,66:1$ di tema terang maupun gelap ($\ge 3:1$), kontras fitur wajah `#5EEAD4` di atas visor `#0B1220` sebesar `12,66:1` ($\ge 4,5:1$), `role="img"` dan `aria-label` terjaga, serta `prefers-reduced-motion: reduce` menghentikan seluruh animasi.
- [x] **5. Keamanan:** Tidak ada rahasia di diff, tidak ada tambahan dependensi baru, tidak menyentuh `apps/clinic/src/components/ai/**`, `supabase/**`, `infra/**`, maupun `.github/workflows/**`.
- [x] **6. Performa:** `0` elemen `<filter>` di seluruh LOD, `0` gradien di LOD `mini`, ukuran gzip berkurang 12 byte (`23.776` byte), dan CPU idle 5 detik tercatat `12,31%` ($\le 15\%$).
- [x] **7. Dokumentasi diperbarui:** Komentar JSDoc dan penjelasan palet/LOD pada `dentiSvg.js` dan `denti.css` telah diperbarui dalam Bahasa Indonesia.
