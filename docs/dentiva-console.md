# Dentiva Console — Arsitektur, Implementasi & Runbook

Dokumen ini adalah versi implementasi dari *Panduan Arsitektur & Migrasi Dentiva Console* (28 Sep 2026). Isinya mencatat apa yang sudah dibangun, di mana letaknya, bagian mana yang **berbeda atau ditambahkan** dari panduan awal beserta alasannya, dan langkah rilis ke produksi.

> Perbarui dokumen ini dan `CHANGELOG.md` setiap kali Console berubah.

---

## 1. Keputusan utama (tetap sama dengan panduan)

1. Console adalah **aplikasi terpisah** (`apps/console`), di domain `console.dentiva.co.id`, dengan proyek Vercel sendiri.
2. Repo berbentuk **monorepo** npm workspaces dengan paket bersama di `packages/`.
3. Hanya ada **satu proyek Supabase**. Data platform ada di skema `platform`; data klinik tetap di `public`.
4. Console **tidak menulis langsung** ke database. Semua aksi lewat Edge Function `console-api`.
5. Operator tercatat di `platform.operators`, bukan di `public.users`, dan **wajib MFA** (aal2).
6. Console **tidak membaca rekam medis**. Yang ditampilkan hanya angka agregat. Hal ini dijaga tes: tidak ada nama aksi yang memuat *patient/visit/emr/medical*.
7. Pengembangan **per modul**: satu entri kontrak, satu handler, satu halaman.

---

## 2. Struktur repo

```
dentiva/
├── apps/
│   ├── clinic/                 aplikasi klinik (React/JS, tidak berubah perilaku)
│   └── console/                Dentiva Console (React + TypeScript)
│       └── src/modules/        dashboard, clinics, users, billing, usage, audit, operators, announcements, auth
├── packages/
│   ├── ui/                     Button, Card, Dialog, Table, Tabs, Toast, … (TypeScript) + tailwind-preset + tokens.css
│   ├── shared/                 konstanta, kontrak console-api, formatter Rupiah/tanggal WIB
│   └── supabase/               createDentivaClient() + tipe database (npm run db:types)
├── supabase/
│   ├── migrations/             migration berbasis timestamp (CLI)
│   ├── tests/database/         tes pgTAP (supabase test db)
│   ├── snippets/               SQL operasional (operator pertama, verifikasi isolasi)
│   ├── archive/                migration lama (tidak dijalankan lagi)
│   └── functions/
│       ├── console-api/        router Console (src/router.ts, src/modules/*.ts)
│       └── _shared/contract/   ★ SUMBER KEBENARAN: nama aksi, skema zod, izin, konstanta, tipe
└── docs/dentiva-console.md     dokumen ini
```

**Kenapa kontrak ada di `supabase/functions/_shared/contract`, bukan di `packages/shared`?** Edge Function di-bundle dari folder `supabase/functions`, sehingga impor ke luar folder itu berisiko tidak ikut ter-deploy. Karena itu file fisiknya ada di sana, dan `packages/shared` hanya me-re-export-nya. Hasilnya tetap satu sumber kebenaran untuk Deno maupun browser.

---

## 3. Database

### 3.1 Migration (urut)

| File | Isi |
|---|---|
| `20260928000100_platform_schema` | skema `platform`, `operators` (trigger: bukan user klinik, owner terakhir tidak bisa dihapus), `audit_logs` (append-only, bahkan untuk service_role), `clinic_notes`, `announcements`, RPC `public.get_active_announcements()` |
| `20260928000200_clinic_user_status` | kolom status & profil di `clinics` dan `users`, sinkron dua arah `is_active` ↔ `status`, sinkron klaim JWT `app_metadata.clinic_id`, RPC `get_my_account_status()` & `record_login()` |
| `20260928000300_tenant_columns` | **Tambahan.** `clinic_id` untuk 18 tabel yang belum punya, UNIQUE per klinik, trigger `tenant_fill_clinic_id()` |
| `20260928000400_tenant_guard` | `get_user_clinic_id()` tanpa fallback, policy **RESTRICTIVE** `tenant_isolation`, pembungkusan `(select …)`, RLS `clinics`, perbaikan `dynamic_audit_trigger()` |
| `20260928000500_billing_tables` | `invoices`, `payments`, penomoran `INV-YYYY-NNNNNN`, fungsi transaksional, order Midtrans dicatat di server, cron invoice jatuh tempo |
| `20260928000600_usage_daily` | `usage_daily`, `collect_usage_daily()`, cron 00:15 WIB, view `clinic_overview`, `dashboard_summary()` |
| `20260928000700_provision_clinic` | `provision_clinic()` (satu transaksi), `revoke_user_sessions()`, `write_audit()` |
| `20260929000100_security_followups` | Guard kolom sensitif `users` (menutup eskalasi role), bucket klinis privat + isolasi storage per klinik, nomor RM per klinik, cron SATUSEHAT lewat Vault |
| `20260929000200_advisor_hardening` | View `v_*` menjadi `security_invoker` & tertutup untuk anon, cabut EXECUTE fungsi SECURITY DEFINER dari anon, `search_path` tetap untuk semua fungsi |

### 3.2 Aturan akses tenant

`public.get_user_clinic_id()` mengembalikan `clinic_id` **hanya jika semua syarat ini terpenuhi**:
- klaim JWT `app_metadata.clinic_id` cocok dengan `public.users.clinic_id` milik `auth.uid()`;
- status klinik `trial` atau `active`;
- status user `invited` atau `active`.

Jika salah satu tidak terpenuhi, hasilnya `NULL`. Setiap tabel ber-`clinic_id` punya policy restrictive:

```sql
create policy tenant_isolation on public.<tabel> as restrictive for all to public
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));
```

Policy restrictive digabung dengan **AND** bersama semua policy lain. Karena itu, isolasi tetap berlaku walaupun ada policy lama yang longgar.

---

## 4. `console-api`

**Endpoint:** `POST /functions/v1/console-api` dengan body `{ "v": 1, "action": "...", "params": { … } }`

| Jawaban | Bentuk |
|---|---|
| sukses | `{ ok: true, data, requestId }` |
| gagal | `{ ok: false, error: { code, message, fields?, requestId } }` |

Kode error: `unauthenticated` 401 · `mfa_required` / `not_operator` / `forbidden` 403 · `invalid_request` / `invalid_params` / `unknown_action` / `unsupported_version` 400 · `not_found` 404 · `conflict` 409 · `precondition_failed` 422 · `audit_failed` / `internal` 500.

**Pipeline** (`src/router.ts`): token Supabase → `aal2` → bukan akun klinik → envelope → operator aktif & bukan user klinik → izin role → zod → handler.

**Aksi tulis** dijalankan dalam **satu transaksi Postgres** bersama baris `platform.audit_logs`. Jika handler lupa memanggil `ctx.audit()`, transaksi di-rollback (`audit_failed`). Efek samping di luar database ditangani dua hook:
- `ctx.afterCommit()`: dijalankan setelah commit, mis. email undangan.
- `ctx.onRollback()`: dijalankan bila transaksi gagal, mis. menghapus akun Auth yang sudah telanjur dibuat.

**Menambah aksi baru:**
1. Tambahkan entri di `supabase/functions/_shared/contract/actions.ts` (roles, mutates, params).
2. Tambahkan tipe jawaban di `contract/results.ts`. Build akan gagal jika lupa.
3. Tulis handler di `console-api/src/modules/<modul>.ts`, lalu daftarkan di `modules/index.ts`. Build Deno akan gagal jika lupa.
4. Di Console, panggil `useConsoleQuery("<aksi>")` atau `useConsoleMutation("<aksi>")`. Tipe params dan hasil otomatis mengikuti kontrak.

Arti aksi lama **tidak pernah diubah**. Jika butuh perilaku berbeda, buat aksi baru dan tandai yang lama `deprecated: true`.

### Secret Edge Function

| Secret | Keterangan |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` | otomatis tersedia di Supabase |
| `CONSOLE_URL` | `https://console.dentiva.co.id` (tautan undangan operator, CORS) |
| `CLINIC_APP_URL` | URL aplikasi klinik (tautan undangan pemilik klinik → `/atur-password`) |
| `CONSOLE_ALLOWED_ORIGINS` | opsional, dipisah koma (mis. tambah URL preview Vercel) |

Tambahkan `CLINIC_APP_URL/atur-password` dan `CONSOLE_URL/set-password` ke **Authentication → URL Configuration → Redirect URLs**.

---

## 5. Hak akses operator

Diterapkan di `contract/actions.ts` dan dicek tes `peta izin sesuai tabel hak akses di panduan`.

| Aksi | owner | support | finance |
|---|:-:|:-:|:-:|
| Dashboard, daftar klinik, pemakaian, audit | ✓ | ✓ | ✓ |
| Daftarkan / ubah / aktifkan / tangguhkan / tutup klinik, perpanjang trial | ✓ | ✓ | – |
| Aktif/nonaktif user klinik, kirim ulang undangan, reset password | ✓ | ✓ | – |
| Buat & batalkan invoice, konfirmasi transfer manual | ✓ | – | ✓ |
| Ganti paket klinik, ubah harga/batas/fitur paket | ✓ | – | – |
| Kelola operator | ✓ | – | – |
| Catatan internal klinik | ✓ | ✓ | ✓ |
| Pengumuman | ✓ | ✓ | – |
| Baca rekam medis pasien | – | – | – |

---

## 6. Perbedaan & penyempurnaan terhadap panduan awal

Temuan ini muncul saat membaca kode dan migration yang ada. Semuanya sudah ditangani.

| # | Temuan | Dampak jika dibiarkan | Penanganan |
|---|---|---|---|
| 1 | **Policy migration 41** (`patients`, `visits`, `payments`, `medical_record_versions`, `audit_logs`) hanya memeriksa `has_permission()` tanpa `clinic_id` | Staf klinik A bisa membaca data klinik B. Mengubah `get_user_clinic_id()` saja **tidak cukup** karena policy ini tidak memanggilnya | Policy **RESTRICTIVE** `tenant_isolation` di setiap tabel ber-`clinic_id` |
| 2 | **18 tabel data klinik tanpa `clinic_id`** (`treatments`, `master_bahan`, stok, `informed_consents`, `visit_treatments`, `soap_templates`, …) dan UNIQUE global (`kode_treatment`, `kode_bahan`, `clinic_settings.key`) | Klinik baru dari Console langsung berbagi atau bentrok data dengan klinik lain | Migration tambahan `tenant_columns` |
| 3 | Skema `platform` tidak di-expose ke PostgREST, sehingga supabase-js di Edge Function **tidak bisa** menjangkaunya | `console-api` tidak berfungsi | `console-api` memakai koneksi Postgres langsung (`SUPABASE_DB_URL`). Bonusnya, perubahan data dan audit ditulis dalam satu transaksi |
| 4 | **Webhook Midtrans** memercayai `custom_field1/2` (clinic_id, plan_id) yang tidak ikut ditandatangani | Notifikasi pembayaran sah bisa diputar ulang dengan `clinic_id` lain untuk mengaktifkan paket klinik tersebut | Order dicatat di server (`register_midtrans_order`); webhook hanya memakai catatan itu, idempoten, dan mengecek nominal |
| 5 | Webhook menandai langganan `past_due` saat checkout batal atau kedaluwarsa | Klinik yang sudah bayar bisa tampak menunggak hanya karena batal checkout ulang | Kegagalan checkout hanya membatalkan invoice checkout tersebut |
| 6 | `admin-create-user` tidak mengisi `clinic_id` dan klaim JWT | User baru bisa gagal dibuat atau jatuh ke klinik default | Diperbaiki |
| 7 | `mediaService` / `storageService` jatuh ke klinik default bila klaim hilang | File bisa tersimpan di folder klinik lain | Fallback dihapus |
| 8 | `dynamic_audit_trigger()` mengisi `clinic_id` NULL untuk aksi user klinik | Insert audit gagal (kolom NOT NULL) | `clinic_id` diambil dari baris atau sesi |
| 9 | Kuota pasien dan fitur paket hanya membaca langganan `active` | Klinik trial tidak mendapatkan fitur maupun batas paketnya | `trialing` dan `past_due` ikut dihitung |
| 10 | Panduan menaruh arsip di `supabase/migrations/_archive/` | CLI memberi peringatan untuk file yang tidak sesuai pola | Arsip dipindah ke `supabase/archive/` |
| 11 | Panduan menyebut `electron/` & `electron-builder.yml` | Tidak ada di repo ini | Dilewati. Jika aplikasi desktop ada di repo lain, arahkan build-nya ke `apps/clinic` |
| 12 | Policy lama `users_update_own` tidak membatasi kolom | Dokter/resepsionis bisa mengubah `role` dirinya menjadi `admin` | Trigger `users_guard_sensitive`: role/status hanya oleh admin klinik; `clinic_id` tidak bisa diubah; status `suspended` khusus tim Dentiva |
| 13 | Bucket `radiologi`, `klinik`, `patient-photos` hanya memeriksa "sudah login" | Staf klinik mana pun bisa membuka rontgen & foto pasien klinik lain bila tahu path-nya | Policy restrictive berdasarkan folder `<clinic_id>/…`; file warisan hanya untuk klinik warisan; avatar hanya bisa ditulis ke folder sendiri |
| 14 | `no_rm` memakai sequence global | Klinik baru mendapat nomor RM yang melompat (mis. RM-004817) | Penomoran per klinik (`clinic_rm_counters`), UNIQUE `(clinic_id, no_rm)` |
| 15 | Cron SATUSEHAT memakai placeholder `YOUR_SERVICE_ROLE_KEY` | Outbox SATUSEHAT tidak pernah diproses otomatis | Dijadwalkan ulang dengan URL & kunci dari Supabase Vault |
| 16 | CSP klinik memakai `unsafe-inline` + `unsafe-eval` | Proteksi XSS lemah | Script tema dipindah ke `/theme-init.js`; CSP `script-src 'self' blob:` + `frame-ancestors 'none'` (bundle terverifikasi tanpa `eval`) |
| 18 | **Produksi:** `process_audit_log()` menulis `audit_logs` tanpa `clinic_id` (NOT NULL) | Setiap insert/update pasien, kunjungan, pembayaran, user **gagal** — tidak ada data baru sejak 18 Jul 2026 | Diperbaiki di awal migration 2 (harus sebelum update pertama ke `users`) |
| 19 | **Produksi:** bucket `radiologi`, `klinik`, `patient-photos` publik | Rontgen & foto pasien bisa dibuka tanpa login oleh siapa pun yang punya URL | Dijadikan privat (aplikasi sudah memakai signed URL) |
| 20 | **Produksi:** 4 view `v_*` SECURITY DEFINER + grant ke `anon` | Ringkasan pasien & pendapatan semua klinik terbaca **tanpa login** memakai anon key | `security_invoker = true`, akses anon dicabut |
| 21 | **Produksi:** 20 fungsi SECURITY DEFINER bisa dipanggil anon, 33 fungsi tanpa `search_path` | Permukaan serangan RPC; risiko search_path hijacking | EXECUTE dicabut dari anon; `search_path = public, extensions` |
| 22 | **Produksi:** policy `users` "Authenticated can view users" (`true`) | Semua user login bisa membaca data semua user | Tertutup oleh `tenant_isolation` restrictive |
| 17 | `VITE_ENCRYPTION_KEY` dipakai di browser | Semua variabel `VITE_*` ikut ter-bundle → kunci enkripsi lama terbaca publik | Browser tidak lagi membaca kunci; build **gagal** jika variabel itu diset; skrip migrasi memakai `LEGACY_ENCRYPTION_KEY` |

**Penyempurnaan tambahan:**
- `get_user_clinic_id()` juga memeriksa status user, sehingga suspend user langsung memutus akses tanpa menunggu token kedaluwarsa. Klaim JWT dicocokkan dengan `public.users`, sehingga klaim palsu atau basi ditolak.
- Trigger mencegah owner aktif terakhir dinonaktifkan, dan mencegah satu akun menjadi operator sekaligus user klinik.
- `audit_logs` tidak bisa diubah maupun dihapus, bahkan oleh service_role.
- Invoice dan pembayaran tidak pernah dihapus (pakai status `void` / `refunded`).
- Console logout otomatis setelah 30 menit tanpa aktivitas. Password operator minimal 12 karakter. Akun klinik ditolak sebelum sempat mendaftarkan MFA.
- CSP Console ketat (tanpa `unsafe-inline` / `unsafe-eval`), `noindex`, dan `frame-ancestors 'none'`.

---

## 7. Tes

| Perintah | Isi |
|---|---|
| `npm test` | klinik (12) + Console (9) + kontrak/formatter (10) + router console-api (26) |
| `npm run typecheck` | TypeScript: packages & console |
| `npm run lint` | ESLint semua workspace |
| `npm run db:smoke` | **Tanpa Docker**: Postgres WASM (PGlite) membangun skema lama sintetis **yang disamakan dengan produksi** (policy bocor migration 41, `users_update_own`, `process_audit_log` rusak, view SECURITY DEFINER, bucket publik), mereproduksi bug-bug itu, menjalankan semua migration, lalu memeriksa 93 hal: isolasi, status, platform, audit, provisioning, billing, pemakaian, eskalasi role, storage, nomor RM, cron. Ikut di CI |
| `npm run db:test` | pgTAP: isolasi antar-klinik, klinik/user suspended, klaim JWT palsu, skema platform tertutup, audit append-only, provisioning, billing, idempotensi Midtrans. **Butuh baseline dan Docker** |
| `deno check supabase/functions/console-api/index.ts` | tipe Edge Function |

---

## 8. Runbook rilis (Fase 5)

### A. Persiapan (sekali)
1. Buat proyek Supabase **staging**.
2. Instal Supabase CLI ≥ 2.100, lalu jalankan `supabase login`.
3. Buat **baseline** dari produksi (lihat `supabase/archive/README.md`):
   ```bash
   supabase link --project-ref <ref-produksi>
   supabase db dump --schema public,private,storage -f supabase/migrations/20260927000000_baseline.sql
   supabase db dump --data-only -f backup-produksi-$(date +%F).sql   # simpan di tempat aman, JANGAN commit
   ```
4. Terapkan ke staging:
   ```bash
   supabase link --project-ref <ref-staging>
   supabase db push                # baseline + 7 migration Console
   npm run db:smoke                # cek cepat tanpa Docker
   supabase test db --linked       # pgTAP
   ```
5. Jalankan `supabase/snippets/verify_tenant_isolation.sql` di staging. Kueri 1–6 & 8 harus kosong.
6. Simpan rahasia cron SATUSEHAT di Vault (SQL Editor, sekali per lingkungan):
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'dentiva_project_url');
   select vault.create_secret('<service-role-key>', 'dentiva_service_role_key');
   ```
7. **Migrasi enkripsi lama** (jika `verify_tenant_isolation.sql` kueri 8 tidak kosong):
   ```bash
   cd apps/clinic
   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… LEGACY_ENCRYPTION_KEY=<kunci-lama> node scripts/migrate_encryption.js
   ```
   Lalu **hapus `VITE_ENCRYPTION_KEY` dari environment Vercel** (build klinik sekarang menolak berjalan bila variabel itu ada) dan rotasi service role key.

### B. Uji ujung-ke-ujung di staging
1. Buat operator owner: undang user lewat Dashboard, lalu jalankan `supabase/snippets/create_first_operator.sql`.
2. Login ke Console staging, lalu aktifkan MFA.
3. Daftarkan klinik baru. Pemilik menerima email, membuat password di `/atur-password`, lalu login ke aplikasi klinik.
4. Buat pasien di klinik baru. Pastikan klinik lama **tidak** melihatnya, begitu pula sebaliknya.
5. Tangguhkan klinik dari Console. Staf harus langsung melihat halaman "Klinik sedang ditangguhkan".
6. Aktifkan kembali klinik. Akses harus pulih.
7. Buat invoice, konfirmasi transfer, lalu pastikan dashboard (MRR, tagihan) berubah dan audit log mencatat setiap langkah.
8. Uji checkout Midtrans sandbox dari aplikasi klinik. Invoice harus lunas dan langganan diperpanjang.

### C. Produksi (di jam sepi)
1. Backup (langkah A3).
2. `supabase link --project-ref <ref-produksi>`
3. `supabase migration repair --status applied 20260927000000`
4. `supabase db push`
5. Dashboard → **Authentication → Multi-Factor → TOTP: enabled**, dan **Authentication → Passwords → Leaked password protection: enabled**.
6. Dashboard → **API → Exposed schemas**: pastikan `platform` **tidak** ada di daftar.
7. Deploy fungsi:
   ```bash
   supabase secrets set CONSOLE_URL=https://console.dentiva.co.id CLINIC_APP_URL=https://<domain-klinik>
   supabase functions deploy console-api
   supabase functions deploy midtrans-create-transaction midtrans-webhook admin-create-user
   ```
8. Jalankan `create_first_operator.sql`, lalu aktifkan MFA owner.
9. Vercel, proyek **baru** `dentiva-console`: Root Directory `apps/console`, env `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_ENV=production`, dan `VITE_SENTRY_DSN` (proyek Sentry terpisah). Domain: `console.dentiva.co.id`.
10. Vercel, proyek klinik yang sudah ada: ubah Root Directory ke `apps/clinic`, lalu redeploy.
11. Jalankan `verify_tenant_isolation.sql` di produksi.

> **Setelah migration:** user klinik yang token lamanya belum di-refresh bisa melihat data kosong hingga ±1 jam. Sesi akan pulih otomatis saat token diperbarui; logout lalu login juga langsung memulihkannya. Umumkan jendela pemeliharaan lewat menu Pengumuman di Console.

### Checklist sebelum rilis
- [ ] Staging dibuat dan backup produksi tersimpan
- [ ] Baseline dibuat dari produksi dan di-`repair` sebagai applied
- [ ] `npm test`, `npm run build`, dan `supabase test db` lulus
- [ ] `verify_tenant_isolation.sql`: kueri 1–6 & 8 kosong di staging
- [ ] Data `ENC:v1:` sudah dimigrasikan dan `VITE_ENCRYPTION_KEY` dihapus dari Vercel
- [ ] Rahasia Vault `dentiva_project_url` & `dentiva_service_role_key` diset
- [ ] Skema `platform` tidak ada di Exposed schemas
- [ ] TOTP diaktifkan di Auth
- [ ] Secret `CONSOLE_URL` & `CLINIC_APP_URL` diset, dan redirect URL didaftarkan
- [ ] Operator owner pertama dibuat, MFA aktif
- [ ] Domain `console.dentiva.co.id` terpasang di proyek Vercel kedua
- [ ] Uji ujung-ke-ujung (bagian B) di staging lulus
- [ ] Migration produksi dijalankan di jam sepi setelah backup

---

## 9. Pekerjaan lanjutan yang disarankan

- **Storage lama**: kolom URL di `patient_media` masih menyimpan public URL untuk bucket yang kini privat. Pertimbangkan menyimpan path saja dan memakai signed URL (sudah dilakukan untuk foto pasien).
- **Transaksi vs Pembayaran** di aplikasi klinik masih memakai komponen yang sama (TODO lama di `App.jsx`) — keputusan bisnis.
- **SATUSEHAT Fix F** (`diagnosis.use`) masih perlu diuji di sandbox (lihat `docs/satusehat-remediation-log.md`).
- Tahap lanjutan Console: ekspor laporan pendapatan ke Excel, pengingat tagihan via WhatsApp, riwayat login, dan akses dukungan dengan persetujuan admin klinik.
