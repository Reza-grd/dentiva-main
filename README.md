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
npm install
```

---

## Environment Variables

Buat file `.env` di root proyek (jangan pernah commit file ini — sudah ada di `.gitignore`):

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

## Menjalankan Migration Database

Semua migration SQL ada di folder `supabase/migrations/` (bernomor urut 01–32). Jalankan **secara berurutan** di Supabase Dashboard → SQL Editor, atau gunakan Supabase CLI:

```bash
# Menggunakan Supabase CLI (jika sudah di-link ke project)
npx supabase db push
```

Jika menjalankan manual, eksekusi file dari `01_...sql` sampai `32_...sql` secara berurutan.

---

## Menjalankan Dev Server

```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`.

### Perintah lainnya

```bash
npm run build    # Build production
npm run preview  # Preview production build lokal
npm run lint     # Jalankan ESLint
npm run test     # Jalankan test suite (Vitest)
```

---

## Struktur Direktori

```
src/
├── components/         # Komponen React
│   ├── admin/          # Dashboard & tools admin
│   ├── auth/           # Login, ProtectedRoute
│   ├── common/         # Navbar, Sidebar, ImageViewer, dll.
│   ├── dashboard/      # Dashboard per role
│   ├── financial/      # Laporan keuangan
│   ├── medical-record/ # Rekam medis, Odontogram, Informed Consent
│   ├── patient/        # Daftar & detail pasien
│   ├── payment/        # Form & daftar pembayaran
│   ├── profile/        # Profil pengguna & dokter
│   ├── queue/          # Display antrean (Smart TV)
│   ├── reports/        # Laporan
│   ├── schedule/       # Jadwal kunjungan
│   ├── settings/       # Pengaturan klinik
│   └── treatments/     # Master data tindakan
├── contexts/           # React Context (Auth)
├── services/           # Supabase service layer
└── utils/              # Utility functions (logger, dateUtils, dll.)
supabase/
└── migrations/         # SQL migration files (01–32)
scripts/                # Development & verification scripts
public/                 # Static assets (logo, dll.)
```

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
