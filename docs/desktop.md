# Dentiva Desktop (Windows & macOS) — Tauri 2

Aplikasi desktop membungkus `apps/clinic` (build mode `desktop`) dalam jendela
Tauri. Data tetap ke Supabase; tidak ada server lokal.

```
apps/desktop/
├─ package.json              @tauri-apps/cli; versi aplikasi (samakan dengan apps/clinic)
└─ src-tauri/
   ├─ tauri.conf.json        nama, identifier id.co.dentiva.app, jendela, CSP, bundle
   ├─ capabilities/          izin minimum (core + membuka tautan di browser)
   ├─ icons/                 dibuat dari apps/clinic/public/dentiva-logo.png (npm run icon)
   └─ src/lib.rs             single-instance + opener
```

Perbedaan build desktop (`vite --mode desktop`):
- tanpa service worker PWA (pembaruan lewat installer/updater);
- tautan untuk pasien (booking, layar antrean) & redirect email memakai
  `VITE_PUBLIC_APP_URL` (bawaan `https://dentiva-main.vercel.app`), bukan alamat internal aplikasi;
- tautan eksternal (wa.me, mailto, dsb.) dibuka di browser sistem.

## Build otomatis (disarankan)
Workflow `.github/workflows/desktop.yml`:
- jalan otomatis bila `apps/desktop/**` berubah di branch `console`, manual lewat *Run workflow*,
  atau saat push tag `desktop-v1.10.0` (→ draft GitHub Release);
- hasil: Windows `.exe` (NSIS) + `.msi`, macOS `.dmg` universal — diunduh dari tab *Artifacts* halaman run.

Isi dulu **Variables** repository (Settings → Secrets and variables → Actions → Variables):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key — sama dengan di Vercel),
`VITE_PUBLIC_APP_URL`, opsional `VITE_SENTRY_DSN`.

## Build lokal (opsional)
Windows: Visual Studio Build Tools 2022 (workload *Desktop development with C++*) + Rust (https://rustup.rs).
macOS: `xcode-select --install` + Rust.

```bash
npm ci
npm run dev -w @dentiva/desktop      # jendela Dentiva + hot reload
npm run build -w @dentiva/desktop    # installer di apps/desktop/src-tauri/target/release/bundle/
```

## Tahap berikutnya
| Tahap | Pekerjaan | Butuh dari pemilik |
|---|---|---|
| 1 (sekarang) | Installer uji tanpa tanda tangan | Variables repository |
| 2 | Cetak kwitansi/resep ke printer thermal, jendela layar antrean di monitor kedua, auto-start | Model printer klinik |
| 3 | Tanda tangan kode + auto-update (`latest.json` bertanda tangan) | Apple Developer (USD 99/th), sertifikat Windows / Azure Trusted Signing, kunci updater (dibuat pemilik, disimpan di GitHub Secrets) |
| 4 | Uji 3–5 komputer klinik, halaman unduh | Domain unduhan |

Catatan uji: jendela cetak kwitansi (`PaymentForm` → `window.open`) perlu diganti
cetak langsung di tahap 2; di WebView desktop dialog cetak mungkin tidak muncul.

## Branding installer
Gambar installer dibuat dari logo: `python apps/desktop/branding/generate.py`
(→ `src-tauri/installer/`: sidebar & header NSIS, banner & dialog MSI, latar DMG),
lalu ikon aplikasi: `npm run icon -w @dentiva/desktop`.

## Merilis ke halaman unduhan (/unduh)
Halaman publik `/unduh` (tautan di halaman login) membaca bucket Supabase Storage
**`downloads`** (publik, hanya baca) dan otomatis menampilkan berkas terbaru per jenis.

1. Jalankan workflow *Dentiva Desktop*, unduh artefak `dentiva-Windows` & `dentiva-macOS`.
2. Supabase Dashboard → Storage → `downloads` → **Upload file**: unggah apa adanya
   `Dentiva_<versi>_x64-setup.exe`, `Dentiva_<versi>_x64_en-US.msi`, `Dentiva_<versi>_universal.dmg`.
3. Halaman `/unduh` langsung menampilkan versi baru (versi dibaca dari nama berkas).
   Berkas versi lama boleh dihapus.

Rencana tahap 3: unggah otomatis dari workflow + auto-update.
