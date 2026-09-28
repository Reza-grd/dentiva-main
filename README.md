# Dentiva EMR

**Sistem Manajemen Klinik Gigi Digital** — Electronic Medical Record (EMR) berbasis React + Vite + Supabase dengan enkripsi data medis server-side, integrasi WhatsApp, dan multi-tenant SaaS.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| Auth | Supabase Auth |
| Enkripsi | Server-side AES-256 via Supabase RPC |
| Notifikasi | Whapi.cloud (WhatsApp) |
| Monitoring | Sentry |
| Deploy | Vercel |

---

## Prasyarat

- Node.js >= 18
- npm >= 9
- Akun Supabase (project sudah dibuat)
- Akun Vercel (untuk deploy)
- Token Whapi.cloud (opsional, untuk notifikasi WhatsApp)

---

## Cara Clone & Install

```bash
git clone https://github.com/Reza-grd/dentiva-main.git
cd dentiva-main
npm install   # menginstal semua workspace (apps/* dan packages/*)
```

---

## Environment Variables

Buat file `apps/clinic/.env.local` (jangan pernah commit file ini — sudah ada di `.gitignore`):

```env
# Supabase
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>

# Enkripsi data medis (WAJIB, gunakan string acak minimal 32 karakter)
VITE_ENCRYPTION_KEY=<random-string-min-32-chars>
```

> **Catatan:** `VITE_ENCRYPTION_KEY` digunakan untuk backward-compatibility dengan data lama yang terenkripsi client-side. Enkripsi utama dilakukan server-side oleh Supabase RPC dan tidak memerlukan key ini pada instalasi baru.

### Environment Variables Tambahan (opsional)

Untuk notifikasi WhatsApp dan Integrasi SATUSEHAT, tambahkan ke Supabase Edge Function Secrets (bukan di `.env` frontend):

```bash
# Notifikasi WhatsApp via Whapi
supabase secrets set WHAPI_TOKEN=<whapi-cloud-token> WHAPI_CHANNEL_ID=<channel-id>

# Integrasi SATUSEHAT Kemenkes RI
supabase secrets set SATUSEHAT_CLIENT_ID=<client-id>
supabase secrets set SATUSEHAT_CLIENT_SECRET=<client-secret>
supabase secrets set SATUSEHAT_ENVIRONMENT=sandbox # atau 'production'
supabase secrets set SATUSEHAT_ORGANIZATION_ID=<organization-id>
```

> **Keamanan Kritis:** `SATUSEHAT_CLIENT_SECRET` bersifat rahasia dan tidak boleh diletakkan di frontend (`src/`) atau diawali `VITE_` karena akan ter-bundle ke file JavaScript client. Panggilan SatuSehat wajib dialirkan melalui Edge Functions.

---

## Struktur Monorepo

```
apps/clinic/        Aplikasi klinik (React + Vite, JavaScript)
apps/console/       Dentiva Console — dashboard internal tim Dentiva (React + TypeScript)
packages/ui/        Komponen UI bersama + tailwind preset
packages/shared/    Konstanta, kontrak console-api, formatter
packages/supabase/  Klien Supabase + tipe database
supabase/           Migration (CLI), Edge Functions, tes pgTAP, snippet SQL
docs/               Dokumentasi (lihat docs/dentiva-console.md)
```

## Perintah

```bash
npm install            # sekali, dari root (npm workspaces)
npm run dev            # aplikasi klinik  → http://localhost:3000
npm run dev:console    # Dentiva Console  → http://localhost:5174
npm run build          # build kedua aplikasi
npm test               # tes unit klinik, console, shared, console-api
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm run db:smoke       # uji migration + RLS tanpa Docker (PGlite)
npm run db:test        # tes RLS/pgTAP (Supabase lokal)
npm run db:types       # generate tipe database ke packages/supabase
```

Variabel lingkungan: salin `apps/clinic/.env.example` dan `apps/console/.env.example` menjadi `.env.local` di folder masing-masing.

## Database & Migration

Migration dikelola **Supabase CLI** di `supabase/migrations/` (nama berbasis waktu, satu topik per file). Aturannya:

- Buat migration baru dengan `npm run db:new -- <nama>`.
- Migration yang sudah jalan di produksi **tidak pernah diedit**; perbaikan dibuat sebagai migration baru.
- Setelah migration, jalankan `npm run db:types` supaya kode yang memakai kolom lama gagal saat build.
- File lama bernomor manual (5–52) diarsipkan di `supabase/archive/`. Langkah baseline dari produksi ada di `supabase/archive/README.md`.

Arsitektur Console, hak akses operator, dan runbook rilis ada di **[docs/dentiva-console.md](docs/dentiva-console.md)**.

---

## Role Pengguna

| Role | Akses |
|------|-------|
| `admin` | Semua fitur, termasuk laporan, pengaturan, audit log |
| `dokter` | Rekam medis lengkap, jadwal, kunjungan |
| `resepsionis` | Registrasi pasien, pendaftaran kunjungan, pembayaran |

---

## Changelog

Lihat [CHANGELOG.md](CHANGELOG.md) untuk riwayat lengkap perubahan.

---

## Lisensi

Proyek ini bersifat privat. Dilarang mendistribusikan tanpa izin.
