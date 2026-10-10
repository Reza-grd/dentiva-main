# Dentiva — Briefing untuk Auditor Eksternal

Dokumen ini memberi gambaran lengkap sistem agar auditor (manusia atau AI) dapat menilai kode secara
presisi. Semua path relatif terhadap root repo `Reza-grd/dentiva-main`. Per 10 Okt 2026, commit `d76e28e`.

> Tidak ada rahasia (API key, service role key, kredensial) di repo. Rahasia disimpan di Supabase
> secrets / Vault dan GitHub Actions variables. Jangan meminta atau menempelkan rahasia.

---

## 1. Produk & konteks

Dentiva adalah SaaS manajemen klinik gigi untuk pasar **Indonesia** (multi-klinik / multi-tenant).
Pengguna per klinik: **admin** (pemilik/manajer), **dokter**, **resepsionis**. Pemilik platform mengelola
semua klinik lewat **Dentiva Console**. Data kesehatan tunduk pada UU PDP & regulasi rekam medis
(Permenkes 24/2022), dan klinik terhubung ke **SATUSEHAT** (platform data kesehatan nasional).

Fitur utama: pendaftaran pasien (PII terenkripsi), jadwal & antrean, booking online publik, rekam medis
elektronik (SOAP, odontogram, ICD-10/ICD-9-CM, resep, radiologi, informed consent, versi & kunci),
pembayaran (tunai/debit/transfer/QRIS), HPP/biaya bahan/stok, pengeluaran, laporan keuangan,
pengingat WhatsApp, layar antrean TV, recall pasien, dan **Asisten AI** (keuangan & manajemen).

## 1a. Peta sistem — di mana semuanya berada

| Bagian | Repo GitHub | Folder | Alamat / hosting |
|---|---|---|---|
| Aplikasi klinik (web) | `Reza-grd/dentiva-main` | `apps/clinic` | https://dentiva-main.vercel.app (Vercel, auto-deploy dari `main`) |
| Dentiva Console (operator platform) | `Reza-grd/dentiva-main` | `apps/console` | https://dentiva-main-console.vercel.app (Vercel) |
| Aplikasi desktop Windows/macOS | `Reza-grd/dentiva-main` | `apps/desktop` (Tauri 2) | Installer dibangun GitHub Actions `desktop.yml`, diunggah ke Supabase Storage bucket `downloads`, diunduh dari https://dentiva.id/unduh |
| Backend (DB, Auth, Storage, Edge Functions, cron) | `Reza-grd/dentiva-main` | `supabase/` | Supabase (satu proyek produksi) |
| Website resmi | `Reza-grd/dentiva_website` | root (HTML statis: `index.html`, `unduh.html`, `vercel.json`) | https://dentiva.id (Vercel; DNS domain di Hostinger) |

Auditor yang hanya membaca GitHub tidak melihat database secara langsung — struktur database ada di
`supabase/migrations/`, `supabase/archive/dentiva_schema_backup.sql`, dan `packages/supabase/src/database.types.ts`.

## 2. Peta repo

| Path | Isi |
|---|---|
| `apps/clinic` | Aplikasi klinik — React 18 + Vite (JS/JSX), Tailwind, React Router. Deploy Vercel (`dentiva-main.vercel.app`). |
| `apps/clinic/src/services/*.js` | Lapisan akses data ke Supabase (patient, visit, payment, financial, expense, recall, ai, encryption, satusehat, …). |
| `apps/clinic/src/components/**` | Halaman & komponen (dashboard per peran, patient, medical-record, payment, financial, costing, schedule, recall, ai, queue, settings, admin). |
| `apps/clinic/src/App.jsx` | Routing + `ProtectedRoute allowedRoles`. |
| `apps/clinic/vercel.json` | Header keamanan & CSP. |
| `apps/console` | Dentiva Console (TypeScript, React) untuk operator platform. |
| `apps/desktop` | Aplikasi desktop **Tauri 2** (Windows/macOS). `src-tauri/tauri.conf.json` → `frontendDist: ../../clinic/dist` (UI dibundel saat build installer; perubahan UI butuh installer baru). |
| `packages/ui` | Komponen UI bersama (TS). `packages/shared` | Kontrak console-api & formatter. `packages/supabase` | `database.types.ts` (tipe skema hasil generate — rujukan struktur tabel). |
| `supabase/migrations` | 34 migrasi sejak 2026-09-28 (platform, tenant, keamanan, AI, dll.). |
| `supabase/archive` | `dentiva_schema_backup.sql` + `legacy-migrations/` — **skema dasar lama** sebelum folder migrasi aktif. |
| `supabase/functions/*` | Edge Functions (Deno). Lihat §6. `_shared/contract` = kontrak console-api. |
| `supabase/tests/database` | pgTAP (platform, isolasi tenant, provisioning/billing, security follow-ups). |
| `supabase/tests/smoke/migrations.smoke.mjs` | Smoke test migrasi di PGlite atas baseline sintetis (`legacy-baseline.sql`). |
| `.github/workflows/ci.yml` | Lint, typecheck, unit test, smoke DB, deno check, build, pgTAP. `desktop.yml` build installer. |
| `docs/` | `audit-2026-09-30.md` (audit sebelumnya), `rencana-ai.md`, `ai-jalur-cepat.md`, `dentiva-console.md`, `desktop.md`, SATUSEHAT runbook/log. |

## 3. Lingkungan & deploy

- **Supabase** (Postgres 15+, Auth, Storage, Edge Functions, pg_cron, pg_net, Vault). Satu proyek produksi.
- **Vercel**: `apps/clinic` (auto-deploy dari `main`). Console terpisah.
- **Website** (dentiva.id) ada di repo lain; domain dikelola di Hostinger.
- **Cron (pg_cron → pg_net → Edge Function, kunci dari Vault)**: `send-appointment-reminders` (*/15),
  `process-satusehat-outbox`, `platform-collect-usage-daily`, `platform-mark-overdue-invoices`,
  `ai-brief-midnight` (17:00 UTC) & `ai-brief-noon` (05:00 UTC).
- Branch kerja `console`; `main` = produksi.

## 4. Multi-tenant & otorisasi (inti keamanan)

- Hampir semua tabel publik punya `clinic_id`. Trigger `tenant_fill_clinic_id()` mengisi otomatis.
- `get_user_clinic_id()` = clinic dari **JWT `app_metadata.clinic_id`** yang **juga** cocok dengan
  `users.clinic_id` untuk `auth.uid()`, klinik berstatus trial/active, user invited/active.
  `get_user_role()` = `users.role` (`admin|dokter|resepsionis`). `has_permission()` untuk izin granular.
- Setiap tabel tenant: policy **RESTRICTIVE** `tenant_isolation` (`clinic_id = get_user_clinic_id()`)
  + policy PERMISSIVE per peran (lihat migrasi `20260928000400_tenant_guard.sql`, `20260930000300_rls_consolidate.sql`).
- Banyak logika via **RPC SECURITY DEFINER** (`set search_path` wajib — dicek smoke test). Fungsi ini
  memeriksa peran/klinik sendiri (`ai_require_admin()`, `recall_require_staff()`, dll.).
- Skema `platform` (Console): operator, billing (Midtrans), audit, usage — hanya `service_role`
  via `console-api` (koneksi Postgres langsung, `verify_jwt`, kontrak aksi + peran operator + audit log).

## 5. Perlindungan data pasien

- PII pasien (nama, NIK, WA, alamat) disimpan terenkripsi **`PGP:`** (pgcrypto, kunci di skema `private`);
  dibuka lewat RPC `decrypt_batch`/`decrypt_field` (staf klinik). Isi rekam medis memakai **`PGPM:`**
  yang hanya dapat dibuka **dokter** (`is_medical_reader()`), lihat `20260930171850_medical_confidentiality.sql`.
- `apps/clinic/src/services/encryptionService.js` (+ fallback lama `ENC:v1:` sisi klien).
- Storage bucket `klinik`, `radiologi`, `patient-photos`: segmen path pertama = `clinic_id`
  (`storage_object_in_my_clinic`); `avatars` per user; `downloads` publik (installer).
- Layar antrean publik `/antrean/<token>`: RPC `get_queue_display` (token di-hash SHA-256), hanya
  nomor, **inisial**, dokter, jam, status.
- Booking publik `/booking/<slug>`: `get_booking_page`, `submit_booking_request` (anon).
- `audit_logs` via trigger; Console punya audit sendiri.

## 6. Edge Functions

| Fungsi | Peran |
|---|---|
| `ai-assistant` | Asisten AI (lihat §7). |
| `console-api` | API Console (router + kontrak `_shared/contract/actions.ts`, tes `tests/router.test.ts`). |
| `admin-create-user` | Undang/buat pengguna klinik. |
| `send-whatsapp`, `whatsapp-webhook`, `send-appointment-reminders` | WhatsApp (Whapi), pengingat H-1. |
| `satusehat-*` | Sinkron SATUSEHAT (outbox, KFA, healthcheck, sandbox verify). |
| `midtrans-create-transaction`, `midtrans-webhook` | Pembayaran langganan SaaS. |

`verify_jwt=false` hanya untuk webhook (`midtrans-webhook`, `whatsapp-webhook`) — periksa validasi signature-nya.

## 7. Asisten AI (dibangun 8–10 Okt 2026)

Kode: `supabase/functions/ai-assistant/` (`index.ts`, `gemini.ts`, `groq.ts`, `guide.ts`, `fast.ts`,
`knowledge.ts` + `*.test.ts`). UI: `apps/clinic/src/components/ai/*`, `components/dashboard/AiBriefCard.jsx`,
`components/financial/ExpensesPage.jsx`, `components/recall/RecallPage.jsx`.
SQL: migrasi `2026100813*`–`20261009170624_*`.

- **Penyedia** dipilih via secrets: `AI_PROVIDER` (`anthropic|gemini|groq`), `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY` (+`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_THINKING`, `GEMINI_PAID`),
  `GROQ_API_KEY` (+model). Gemini memakai **Interactions API** (`/v1beta/interactions`, `store:false`).
- **Akses**: admin klinik, paket dengan `features.ai_assistant`, klinik mengaktifkan (consent di
  `clinic_settings`), kuota bulanan (`ai_status()`; Pro 300, Enterprise 1000).
- **Mode** (`body.mode`): `chat`, `receipt` (foto nota → draf pengeluaran, vision + JSON schema),
  `recall_template`, `brief` (admin) / `staff_brief` (resepsionis, tanpa angka uang), `info`,
  `cron_briefs` (hanya Authorization = service role; menyusun catatan semua klinik).
- **Alat (tools)** = RPC baca-saja agregat, dipanggil memakai **JWT pengguna**: `ai_revenue_summary`,
  `ai_treatment_performance`, `ai_expense_summary`, `ai_doctor_performance`, `ai_visit_stats`,
  `ai_stock_alerts`, `ai_unbilled_visits`, `ai_price_simulation`, `ai_break_even`,
  `ai_cashflow_projection`, `ai_today_summary`, `ai_doctor_schedule_load`, `ai_recall_stats`.
- **Urutan jawaban chat**: (1) jawaban terverifikasi sama persis (`ai_knowledge`; data hanya bila
  `data_fingerprint` snapshot sama) → (2) **jalur cepat** `fast.ts` (aturan kata kunci, dari
  `ai_snapshot()` / pelajaran panduan) → (3) model AI dengan `ai_snapshot()` + jawaban terverifikasi
  mirip (pg_trgm) sebagai acuan. Penilaian 👍/👎 via `ai_answer_feedback()`.
- **Privasi**: model hanya menerima angka agregat & foto nota; tanpa nama/NIK/rekam medis.
  `recall_candidates()` (daftar nama terenkripsi) dipakai halaman Recall, **tidak** dikirim ke AI.
- **Catatan Dashboard**: `ai_insights` (cache), dibaca dengan `cached_only` saat login; diperbarui cron.
  `ai_service_snapshots(clinic)` (service_role saja) menghitung snapshot dengan **mengatur
  `request.jwt.claims` ke admin klinik** agar fungsi `ai_*` lolos pemeriksaan peran — mohon dinilai.
- Log: `ai_usage` (token, biaya, status `ok|error|refused|cached`, jawaban, question_norm, fingerprint).

## 8. Pengujian

- `apps/clinic`: Vitest + Testing Library (61 tes) — `npx vitest run --root apps/clinic`.
- `apps/console`: Vitest. `console-api`: `npm run test:api`.
- Edge Functions: `bash scripts/check-edge-functions.sh` (deno check); unit Deno di `ai-assistant/*.test.ts`.
- DB: `npm run db:smoke` (PGlite, 142 cek: migrasi, search_path, hak akses), pgTAP di CI.
- Sebagian besar jalur AI diuji dengan **mock**; uji end-to-end terhadap penyedia AI masih terbatas.

## 9. Keterbatasan & risiko yang diketahui

1. Skema dasar (patients, visits, payments, …) berasal dari sebelum folder migrasi aktif
   (`supabase/archive`); smoke test memakai baseline **sintetis**, bukan salinan produksi.
2. Desktop membundel UI — versi desktop tertinggal sampai installer dibangun ulang.
3. Edge Function `ai-assistant` belum punya rate limit per pengguna di luar kuota bulanan.
4. Layar antrean memakai polling 10 detik (bukan realtime).
5. Kunci auth Gemini format `AQ.` sempat ditolak Google (401); kode sudah mendukung Interactions API.
6. Banyak fungsi SECURITY DEFINER bisa dieksekusi `authenticated` (pemeriksaan peran di dalam fungsi) —
   advisor Supabase menandainya; mohon verifikasi setiap fungsi benar-benar memeriksa peran & klinik.
7. Website, kebijakan privasi, dan DPA penyedia AI belum final (lihat `docs/rencana-ai.md` §4).

## 10. Permintaan audit (fokus)

Mohon laporkan temuan dengan **path:baris**, tingkat (Kritis/Tinggi/Sedang/Rendah), skenario
eksploitasi/kegagalan konkret, dan usulan perbaikan.

1. **Isolasi tenant**: adakah tabel/view/RPC yang bisa membaca/menulis data klinik lain? Periksa semua
   `security definer` (`supabase/migrations/*.sql`, `supabase/archive/*`) — apakah memfilter `clinic_id`
   pemanggil dan memeriksa peran? View yang mem-bypass RLS?
2. **Kerahasiaan medis**: dapatkah peran non-dokter membuka `PGPM:`? Apakah ada jalur (RPC, export,
   AI, laporan, queue display) yang membocorkan PII/rekam medis?
3. **Edge Functions**: validasi input, otorisasi, CORS (`ALLOWED_ORIGINS`), penanganan service role,
   webhook signature (Midtrans/WhatsApp), `cron_briefs` (pembandingan header Authorization).
4. **Asisten AI**: prompt injection lewat data/nota/pertanyaan; apakah alat bisa dipakai keluar dari
   klinik pemanggil; keamanan `ai_service_snapshots` (impersonasi via `request.jwt.claims`);
   kebenaran jalur cepat (`fast.ts`) — pola yang salah menjawab; cache `ai_knowledge` (data basi).
5. **Frontend**: XSS (render Markdown AI: `utils/miniMarkdown.js` + DOMPurify), penyimpanan sesi,
   `ProtectedRoute`, CSP di `vercel.json`, file upload (foto nota, QRIS).
6. **Logika bisnis**: perhitungan pembayaran/diskon, HPP & margin, laporan keuangan, BEP/proyeksi
   (`ai_break_even`, `ai_cashflow_projection`), status kunjungan & penomoran antrean.
7. **Kualitas & keandalan**: race condition, error handling, migrasi idempoten, indeks yang kurang,
   biaya query (snapshot memanggil banyak fungsi), kesesuaian dengan UU PDP.

Konteks tambahan: `docs/audit-2026-09-30.md` (temuan & perbaikan audit sebelumnya).
