# Serah Terima A4b — Pengerasan Isolasi Build E2E, Pemblokir Jaringan Keluar, & Pembedaan Galat Login
- Pembuat: Antigravity · Tanggal: 2026-10-17 · Cabang/berkas: `antigravity/A4b-mutu-poles` (`D:\dentiva\antigravity-A4b`)

## Ringkasan (≤ 5 kalimat)
Paket A4b menindaklanjuti 4 temuan peninjauan Ketua atas A4 agar suite E2E Playwright tidak pernah memakai ulang direktori `dist/` lama yang berpotensi mengandung URL produksi (`api.dentiva.id`). Kini `playwright.config.js` selalu mem-build segar ke `dist-e2e` (masuk `.gitignore`) dengan `VITE_E2E_ISOLATED_ENV=1` (mengabaikan `.env*` lokal) dan `reuseExistingServer: false`, dilengkapi pencegat `page.route('**')` di `syntheticClinic.js` yang mem-blokir (`abort`) serta mencatat setiap permintaan ke host non-localhost. Fungsi `normalizeLoginError` di `LoginPage.jsx` diperbaiki agar hanya galat kredensial (HTTP 400) yang dipetakan ke `"Email atau password salah."`, sedangkan galat jaringan menampilkan `"Tidak dapat terhubung ke server. Periksa koneksi Anda."` dan batas laju (HTTP 429) menampilkan `"Terlalu banyak percobaan. Coba lagi beberapa menit lagi."` (masing-masing diuji dengan tes E2E baru). Seluruh keluaran runtime (`visual/*.png`, `audit-ringkasan.json`, dan kandidat `*-linux.png`) kini diarahkan ke `apps/clinic/test-results/a4-artifacts/` yang di-ignore git sehingga eksekusi tes tidak pernah mengotori `git status`.

## Yang berubah / diserahkan (daftar berkas)
- `.gitignore` & `apps/clinic/.eslintignore`: Menambahkan `dist-e2e/` dan `apps/*/dist-e2e/` (serta `playwright-report/` & `test-results/` di `.eslintignore`) agar direktori build khusus E2E tidak terlacak git dan tidak dipindai oleh ESLint.
- `apps/clinic/vite.config.js`: Menambahkan `envDir: process.env.VITE_E2E_ISOLATED_ENV ? './tests/e2e/fixtures' : undefined` (agar berkas `.env*` di mesin pengembang tidak pernah terbaca saat build E2E) serta mengecualikan `dist-e2e/**` dari Vitest.
- `apps/clinic/playwright.config.js`: Mengubah `webServer.command` menjadi `npx vite build --mode desktop --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 3000 --strictPort` dengan `reuseExistingServer: false` dan `VITE_E2E_ISOLATED_ENV: '1'`; menghapus `updateSnapshots: 'missing'`.
- `apps/clinic/lighthouserc.cjs`: Mengarahkan `startServerCommand` ke `--outDir dist-e2e`.
- `apps/clinic/package.json`: Menambahkan skrip `"test:e2e:update-snapshots": "playwright test tests/e2e/visual-a11y.spec.js --update-snapshots"`.
- `apps/clinic/tests/e2e/fixtures/syntheticClinic.js`:
  - Menambahkan rute fallback `await page.route('**', ...)` yang meng-abort (`blockedbyclient`) dan mencatat semua permintaan ke host non-localhost (`localhost` / `127.0.0.1` / `data:` / `blob:`) ke dalam `ctrl.blockedRequests`.
  - Menambahkan dukungan simulasi `authErrorMode: 'network' | 'rate_limit'` pada endpoint `/auth/v1/token` serta metode `getBlockedRequests()` dan `setAuthErrorMode()`.
- `apps/clinic/src/contexts/AuthContext.jsx` & `apps/clinic/src/components/auth/LoginPage.jsx`:
  - Mempertahankan penanda status HTTP `429` dan kegagalan jaringan (`AuthRetryableFetchError` / `status === 0`) dari Supabase Auth di `AuthContext.signIn`.
  - Memperbarui `normalizeLoginError` di `LoginPage.jsx` agar membedakan:
    1. **Galat kredensial (`400` / `invalid login credentials`)** $\to$ `"Email atau password salah."`
    2. **Galat jaringan (`Failed to fetch` / koneksi terputus)** $\to$ `"Tidak dapat terhubung ke server. Periksa koneksi Anda."`
    3. **Batas laju (`429` / `over_request_rate_limit`)** $\to$ `"Terlalu banyak percobaan. Coba lagi beberapa menit lagi."`
- `apps/clinic/tests/e2e/auth.spec.js`: Menambahkan 3 tes E2E baru (total 11 tes di `auth.spec.js`, 33 tes di seluruh suite):
  1. Login saat galat jaringan menampilkan `"Tidak dapat terhubung ke server. Periksa koneksi Anda."`
  2. Login saat terkena batas laju (`429`) menampilkan `"Terlalu banyak percobaan. Coba lagi beberapa menit lagi."`
  3. Verifikasi `fx.getBlockedRequests()` bernilai `[]` selama alur login & navigasi, serta pembuktian bahwa `fetch('https://api.dentiva.id/...')` langsung di-abort dan tercatat oleh pemblokir.
- `apps/clinic/tests/e2e/visual-a11y.spec.js`: Mengarahkan penulisan tangkapan layar runtime, kandidat `*-linux.png`, dan `audit-ringkasan.json` ke `apps/clinic/test-results/a4-artifacts/` (masuk `.gitignore`).
- `docs/tim/usulan-ci/e2e.yml`: Menambahkan pemicu `workflow_dispatch` (`generate_linux_baselines`), menggunakan `--outDir dist-e2e` pada job Lighthouse, dan mengunggah artefak `apps/clinic/test-results/` (termasuk kandidat `*-linux.png`).

## Cara memverifikasi (perintah + langkah klik)
1. **Bukti Perbaikan (1) — Jalankan Playwright saat `dist/` lama berisi URL produksi `https://api.dentiva.id`:**
   ```powershell
   cd D:\dentiva\antigravity-A4b
   # 1. Buat dist/ lama dengan URL produksi api.dentiva.id
   $env:VITE_SUPABASE_URL="https://api.dentiva.id"
   $env:VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-simulation"
   npm run build:clinic
   Select-String -Path apps/clinic/dist/assets/*.js -Pattern "api\.dentiva\.id" | Select-Object -First 2

   # 2. Jalankan Playwright tanpa menghapus dist/ (Playwright membangun & memakai dist-e2e)
   npm --workspace=@dentiva/clinic run test:e2e
   ```
2. **Jalankan Playwright putaran ke-2 & pastikan `git status` tetap bersih (tidak ada berkas terlacak yang tertimpa):**
   ```powershell
   npm --workspace=@dentiva/clinic run test:e2e
   git status --short
   ```
3. **Jalankan gerbang mutu penuh:**
   ```powershell
   $env:VITE_SUPABASE_URL="http://localhost:54321"
   $env:VITE_SUPABASE_ANON_KEY="dummy-anon-key"
   npm run lint
   npm run typecheck
   npm test
   npm run build:clinic
   ```

## Bukti (tangkapan layar / hasil tes / tautan berkas)
- **Putaran 1 Playwright (dengan `apps/clinic/dist/` berisi `https://api.dentiva.id`):** `33 passed` (0 gagal, 0 permintaan keluar ke `api.dentiva.id`).
- **Putaran 2 Playwright (verifikasi konsistensi & kebersihan kerja git):** `33 passed` (`git status` tetap bersih setelah run karena seluruh artefak ditulis ke `apps/clinic/test-results/a4-artifacts/`).
- **Gerbang Mutu Repositori:** `lint` bersih, `typecheck` bersih, `npm test` (`545` clinic + `9` console + `10` shared + `26` console-api = `590` unit/API test) hijau, dan `build:clinic` berhasil.

## Keputusan desain & alasan
1. **Isolasi Ganda Build E2E (`--outDir dist-e2e` + `VITE_E2E_ISOLATED_ENV=1` + `reuseExistingServer: false`):**
   - Memisahkan `dist-e2e` dari `dist` memastikan hasil `npm run build:clinic` milik pengembang/Ketua tidak pernah terpakai oleh server preview Playwright, dan sebaliknya pengujian E2E tidak merusak `dist/` produksi.
   - Mengarahkan `envDir` ke `./tests/e2e/fixtures` saat `VITE_E2E_ISOLATED_ENV=1` menjamin Vite tidak membaca berkas `.env` / `.env.local` di direktori proyek.
2. **Prosedur 1× Pembuatan Baseline `*-linux.png` di CI & Penghapusan Fallback Toleransi 6% (Poin 4):**
   Berikut langkah terstruktur setelah `e2e.yml` dipasang di `.github/workflows/e2e.yml`:
   - **Langkah 1 (Ambil Baseline Linux dari CI Pertama):**
     Saat workflow `Mutu Otomatis` berjalan pertama kali di runner `ubuntu-latest` (atau dipicu manual lewat tab *Actions* $\to$ *Run workflow* dengan centang `generate_linux_baselines: true`), unduh artefak **`playwright-report-clinic`** dari halaman ringkasan run GitHub Actions.
   - **Langkah 2 (Salin & Commit 12 Berkas `*-linux.png`):**
     Salin ke-12 berkas `*-linux.png` dari folder `test-results/a4-artifacts/linux-baselines/` (atau `__screenshots__/`) di dalam artefak ke direktori `apps/clinic/tests/e2e/__screenshots__/`.
   - **Langkah 3 (Hapus Fallback Toleransi 6% di `visual-a11y.spec.js`):**
     Di `apps/clinic/tests/e2e/visual-a11y.spec.js` (baris 121–159), hapus blok sementara `if (!hasNativePlatformBaseline ...)` dan sederhanakan pemanggilan menjadi murni:
     ```js
     await expect(page).toHaveScreenshot(filename, {
       fullPage: false,
       animations: 'disabled',
       maxDiffPixelRatio: 0.02,
       threshold: 0.2,
     });
     ```
   - **Langkah 4 (Commit Bersama):**
     ```bash
     git add apps/clinic/tests/e2e/__screenshots__/*-linux.png apps/clinic/tests/e2e/visual-a11y.spec.js
     git commit -m "test(e2e): tambah baseline visual linux dan kunci toleransi 2%"
     ```

## Risiko, batasan, dan hal yang belum selesai
- Pembuatan berkas `*-linux.png` memerlukan satu kali eksekusi di runner `ubuntu-latest` GitHub Actions (setelah Ketua menyalin `docs/tim/usulan-ci/e2e.yml` ke `.github/workflows/e2e.yml`) agar font FreeType Ubuntu dirender langsung oleh image runner resmi GitHub.
- Sebagaimana didokumentasikan pada A4, E2E tetap menggunakan `--mode desktop` (tanpa Service Worker PWA) agar pencegatan `page.route()` tidak terganggu cache Service Worker.

## Pertanyaan untuk Ketua
- Tidak ada pertanyaan penghambat; setelah menyerahkan A4b ini kami langsung melanjutkan pengerjaan **Paket A1c (`antigravity/A1c-denti-teal`)** di worktree terpisah `D:\dentiva\antigravity-A1c`.

## Daftar centang gerbang mutu (1–7) — centang yang terpenuhi + catatan
- [x] **1. Lint, typecheck, test, build:** `npm run lint`, `npm run typecheck`, `npm test` (`590` tes), dan `npm run build:clinic` lulus dengan kode keluar `0`.
- [x] **2. Tes baru untuk perilaku baru:** Menambahkan 3 tes E2E baru di `auth.spec.js` (galat jaringan login, batas laju HTTP 429, dan pemblokir permintaan keluar non-localhost `api.dentiva.id`), sehingga total suite E2E menjadi **33 tes** (`33/33` hijau pada 2× putaran termasuk saat `dist/` berisi URL produksi).
- [x] **3. Bukti visual:** Baseline `*-win32.png` tetap terjaga di `apps/clinic/tests/e2e/__screenshots__/`, dan tangkapan layar hasil run disimpan ke `apps/clinic/test-results/a4-artifacts/visual/` tanpa mengotori git.
- [x] **4. Aksesibilitas:** 7 halaman utama tetap lulus audit `axe-core` dengan **0 pelanggaran `serious`/`critical`**.
- [x] **5. Keamanan:** `dist-e2e` terisolasi dari `.env` lokal dan `dist/` produksi; semua permintaan ke host non-localhost di-abort otomatis oleh `page.route('**')`; pesan login membedakan jaringan/429 tanpa membocorkan eksistensi email pada galat 400.
- [x] **6. Performa:** Tidak ada dampak ukuran bundel produksi.
- [x] **7. Dokumentasi:** Prosedur pembuatan sekali baseline `*-linux.png` di CI dan penghapusan fallback 6% telah ditulis rinci pada bagian *Keputusan desain & alasan* di atas.
