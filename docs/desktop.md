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
   ├─ tauri.release.conf.json  dipakai saat rilis: createUpdaterArtifacts (installer .sig)
   └─ src/lib.rs             single-instance + opener + updater + process
```

Perbedaan build desktop (`vite --mode desktop`):
- tanpa service worker PWA (pembaruan lewat updater — lihat bagian Pembaruan otomatis);
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

## Pembaruan otomatis (updater)

Aplikasi yang terpasang mengecek `latest.json` 8 detik setelah dibuka lalu tiap 6 jam
(`apps/clinic/src/components/common/DesktopUpdater.jsx`). Bila ada versi baru, muncul kartu
"Dentiva x.y.z tersedia" → **Perbarui sekarang** (unduh, pasang, mulai ulang) atau **Nanti**.
Pembaruan ditandatangani; aplikasi menolak file yang tanda tangannya tidak cocok dengan kunci publik
di `tauri.conf.json` → `plugins.updater.pubkey`.

Repo kode privat, jadi file rilis diterbitkan ke repo **publik** `Reza-grd/dentiva-desktop-releases`
(hanya installer, `.sig`, dan `latest.json` — tanpa kode). Endpoint:
`https://github.com/Reza-grd/dentiva-desktop-releases/releases/latest/download/latest.json`.

### Persiapan sekali (oleh pemilik)
1. Buat repo publik **dentiva-desktop-releases** di akun Reza-grd, centang *Add a README* (perlu 1 commit).
2. Buat kunci penanda tangan di laptop (tanpa Rust):
   `npx @tauri-apps/cli signer generate -w "%USERPROFILE%\.tauri\dentiva-updater.key"` — isi kata sandi.
   Simpan file `.key` + kata sandinya baik-baik (hilang = aplikasi lama tidak bisa diperbarui lagi).
3. GitHub repo **dentiva-main** → Settings → Secrets and variables → Actions → **Secrets**:
   - `TAURI_SIGNING_PRIVATE_KEY` = isi file `dentiva-updater.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = kata sandinya
   - `RELEASES_TOKEN` = fine-grained personal access token, *Repository access: Only select repositories →
     dentiva-desktop-releases*, *Permissions → Contents: Read and write*.
4. Isi kunci **publik** (`dentiva-updater.key.pub`) ke `plugins.updater.pubkey`.

### Merilis versi baru
1. Naikkan `version` di `apps/desktop/package.json` (dan `src-tauri/Cargo.toml`), commit & push.
2. Push tag yang sama: `git tag desktop-v1.11.0 && git push origin desktop-v1.11.0`.
3. Workflow memeriksa versi/kunci/secrets → membuat draft rilis `v1.11.0` di repo publik → build Windows &
   macOS bertanda tangan → menerbitkan rilis. Aplikasi klinik menawarkan pembaruan dalam ≤ 6 jam
   (atau saat dibuka ulang).

Catatan: pembaruan pertama baru bisa diterima oleh installer yang **sudah** memuat updater — pasang
installer rilis pertama (dari repo publik) sekali secara manual di tiap komputer.

## Tahap berikutnya
| Tahap | Pekerjaan | Butuh dari pemilik |
|---|---|---|
| 1 (sekarang) | Installer uji tanpa tanda tangan | Variables repository |
| 2 | Cetak kwitansi/resep ke printer thermal, jendela layar antrean di monitor kedua, auto-start | Model printer klinik |
| 3 | Tanda tangan kode (auto-update **sudah** — lihat di atas) | Apple Developer (USD 99/th), sertifikat Windows / Azure Trusted Signing, kunci updater (dibuat pemilik, disimpan di GitHub Secrets) |
| 4 | Uji 3–5 komputer klinik, halaman unduh | Domain unduhan |

Catatan uji: jendela cetak kwitansi (`PaymentForm` → `window.open`) perlu diganti
cetak langsung di tahap 2; di WebView desktop dialog cetak mungkin tidak muncul.

## Branding installer
Gambar installer dibuat dari logo: `python apps/desktop/branding/generate.py`
(→ `src-tauri/installer/`: sidebar & header NSIS, banner & dialog MSI, latar DMG),
lalu ikon aplikasi: `npm run icon -w @dentiva/desktop`.

## Merilis ke halaman unduhan
Halaman unduhan ada di **website resmi**: `https://dentiva.id/unduh` (repo `Reza-grd/dentiva_website`,
berkas `unduh.html`). Rute `/unduh` di aplikasi hanya mengalihkan ke sana.
Berkas installer disimpan di bucket Supabase Storage **`downloads`** (publik, hanya baca).

1. Jalankan workflow *Dentiva Desktop*, unduh artefak `dentiva-Windows` & `dentiva-macOS`.
2. Supabase Dashboard → Storage → `downloads` → **Upload file**: unggah apa adanya
   `Dentiva_<versi>_x64-setup.exe` dan `Dentiva_<versi>_universal.dmg`.
3. Di repo website, ubah `var VERSION = "..."` di `unduh.html` ke versi baru, lalu deploy.
   Ukuran & tanggal berkas dibaca otomatis dari server unduhan.

Rencana tahap 3: unggah otomatis dari workflow + auto-update.
