# 00 · Ringkasan Proyek Dentiva (untuk seluruh tim)

> Dokumen ini adalah **satu-satunya sumber konteks** yang harus dibaca lebih dulu oleh GPT, Antigravity, dan siapa pun yang bergabung.
> Dibuat 17 Okt 2026 oleh Ketua Tim (Claude). Perbarui bila arsitektur berubah.

## 1. Apa itu Dentiva

**Dentiva** adalah sistem manajemen klinik gigi berbasis SaaS untuk pasar Indonesia: rekam medis elektronik (RME), jadwal & antrean, kasir, stok bahan,
laporan keuangan, WhatsApp, integrasi SATUSEHAT (Kemenkes), dan **Denti** — asisten AI maskot yang memandu staf dan, untuk admin, bisa *bertindak*
(mencatat pengeluaran, stok, tarif, dst. setelah disetujui).

- **Pengguna & peran:** Admin/pemilik klinik, Dokter, Resepsionis (kasir). Operator Dentiva (internal) memakai **Console**.
- **Multi-tenant:** satu platform, banyak klinik; isolasi data per `clinic_id` dipaksa di database (RLS).
- **Posisi pasar yang dituju:** produk **premium, aman, dan "mahal"** — klinik membayar karena percaya pada keamanan data pasien, kualitas tampilan,
  dan kecerdasan produknya. Setiap keputusan desain/teknis harus mendukung kesan dan kenyataan itu.

## 2. Arsitektur (garis besar)

```
Pengguna ──► Vercel (apps/clinic · React 18 + Vite 5 + Tailwind 3)  ──┐
Desktop  ──► Tauri 2 (apps/desktop, membungkus apps/clinic)           ├──► https://api.dentiva.id  (VPS Biznet, Indonesia)
Console  ──► Vercel (apps/console, operator internal)                 ┘       Caddy → Envoy API gateway
                                                                            ├ Supabase self-host: Postgres 17 (RLS, RPC SECURITY DEFINER, pg_cron, pg_net, Vault)
                                                                            ├ Auth (GoTrue) · REST (PostgREST) · Realtime · Storage
                                                                            ├ Edge Functions (Deno): ai-assistant, kirim WhatsApp, Midtrans, SATUSEHAT, pengingat, dll.
                                                                            └ wa-sidecar (WhatsApp Web, sesi tersimpan) · backup harian
Layanan luar: Gemini/Claude (AI), Whapi/WA sidecar (WhatsApp), Midtrans (pembayaran langganan), SATUSEHAT (Kemenkes), Sentry
```

Repo (monorepo npm workspaces): `apps/clinic` (aplikasi utama), `apps/console`, `apps/desktop` (Tauri), `packages/ui` (komponen), `packages/shared`,
`supabase/` (migrasi SQL, edge functions, tes), `infra/vps/` (skrip server), `docs/`, `scripts/`. Repo situs pemasaran terpisah: `Reza-grd/dentiva_website`.

## 3. Yang sudah ada (jangan dibangun ulang)

| Area | Keadaan |
|---|---|
| Data & keamanan inti | RLS ketat per klinik (policy *restrictive*), `anon` tanpa hak tabel, peran dipisah (admin **tidak** boleh membaca data pasien/klinis — hanya laporan agregat; kasir hanya resepsionis; tindakan klinis hanya dokter), enkripsi data medis di server (envelope), audit log, trigger penjaga (kunjungan terkunci/lunas), CORS dibatasi di gateway, CSP & Permissions-Policy di Vercel, 46+ migrasi, uji pgTAP + smoke di CI |
| Fitur klinik | Pasien, jadwal, booking online, rekam medis (odontogram, SOAP, resep, consent), antrean TV, kasir/invoice, recall, WhatsApp (pengingat, konfirmasi), laporan, SATUSEHAT (sandbox) |
| Keuangan & bahan | Pengeluaran (pindai nota AI), master bahan/stok/batch/opname, resep bahan, overhead, HPP & margin, laporan keuangan |
| **Denti (AI)** | Maskot SVG+CSS **93 state**, otak lokal tanpa kuota (panduan, kuis, empati), widget mengambang, halaman Asisten AI; **Denti Agen** (usulan → setujui → jalankan → batalkan) dengan 15+ jenis tindakan, briefing terurut, analitik; harness evaluasi 45 skenario. Lihat `docs/denti-agen.md`, `docs/maskot-denti.md` |
| Desktop | Tauri 2 (Windows/macOS), build lewat GitHub Actions; **belum** bertanda tangan kode |
| Kualitas | ~110 komponen React, 24+ berkas tes (vitest), CI GitHub (lint, tes, smoke DB, pgTAP, Deno, build), 23+ uji DB agen |
| Infrastruktur | VPS Biznet (Indonesia), Docker Compose, skrip `infra/vps/*`, backup harian lokal |

## 4. Kekurangan yang harus ditutup (inti misi "profesional, aman, premium")

**Tampilan & merek**
1. **Denti terlihat blur / kurang HD.** Penyebab (sudah dianalisis): SVG di-*render* kecil (58–68 px di widget & kartu briefing) dari gambar berkoordinat 400×480
   sehingga garis 2–3 unit menjadi ±0,3–0,5 px; ±30 `filter` SVG (blur/glow) + 20 gradien memaksa rasterisasi beresolusi rendah; animasi `transform: scale()` pada
   grup ter-*composite* membesarkan bitmap; `filter: drop-shadow` pada pembungkus. Dibutuhkan desain & render bertingkat (LOD) yang tajam di 1×/2×/3× DPR.
2. Bahasa visual belum seragam "premium": token ada (`theme.css`, `packages/ui`) tetapi pemakaiannya tidak konsisten; belum ada panduan desain, command palette,
   status kosong/pemuatan yang elegan di semua layar, mikro-interaksi, atau tipografi bermerek.

**Keamanan & kepatuhan (target "tingkat tinggi")**
3. **Belum ada MFA/TOTP**, manajemen sesi perangkat, auto-kunci layar untuk data klinis, kebijakan sandi.
4. **Email (SMTP) belum ada** → tak ada verifikasi/reset email bermerek. **Backup offsite & uji pemulihan belum ada** (RPO/RTO belum terukur). VPS menunggu reboot kernel.
5. Belum ada pemindaian rantai pasok di CI (CodeQL, gitleaks, SBOM, Dependabot), belum ada WAF/rate-limit tingkat gateway yang terdokumentasi, belum ada pemantauan &
   peringatan eksternal (uptime/error), belum ada uji penetrasi independen.
6. **Dokumen kepatuhan belum ada:** model ancaman, kebijakan keamanan, rencana insiden, DR/backup runbook, kebijakan retensi, daftar subprosesor, ToS/Privasi/DPA,
   pemetaan UU PDP (UU 27/2022), Permenkes RME (24/2022), ISO 27001/27799.
7. Aplikasi desktop belum bertanda tangan (SmartScreen/Gatekeeper memberi peringatan); kunci pembaruan otomatis belum dibuat.

**Produk & bisnis**
8. Paket/harga & pesan penjualan belum mencerminkan posisi premium; belum ada SLA, onboarding "white-glove", studi kasus, atau kalkulator ROI.
9. AI produksi masih memakai Gemini **paket gratis (20 permintaan/hari)**; keputusan: pindah ke **Claude Sonnet 5.5 (chat/agen)** + **Haiku 5.5 (catatan dashboard)** — menunggu kunci API.

## 5. Struktur tim & pembagian bidang (ringkas; rinci di 01/02/03)

| Peran | Bidang | Akses |
|---|---|---|
| **Ketua Tim — Claude** | Arsitektur, database/RLS/RPC, edge function & agen AI, infrastruktur VPS, MFA backend, backup/DR, tinjauan & integrasi semua hasil, deploy produksi | Penuh (satu-satunya yang menyentuh produksi, `main`, rahasia, migrasi) |
| **GPT** | Strategi desain & merek, sistem desain, spesifikasi layar, **art direction & aset SVG Denti HD**, dokumen keamanan/kepatuhan, produk & harga, skenario uji agen | Tanpa akses repo (menerima *bundel konteks*, menyerahkan dokumen/SVG/JSON) |
| **Antigravity** | Implementasi di kode: render Denti HD, sistem desain & layar premium, E2E/visual/aksesibilitas, hardening sisi aplikasi & rantai pasok, polesan desktop, performa | Repo (cabang `antigravity/*`), terminal, browser; **tanpa** produksi/rahasia/`main` |

## 6. Konvensi proyek (wajib diikuti)

- **Bahasa:** UI, komentar, commit, dan dokumen dalam **Bahasa Indonesia** (kode/identifier boleh Inggris). Nada: hangat, profesional, ringkas.
- **Perintah penting:** `npm test` (semua), `npm run lint`, `npm run typecheck`, `npm run db:smoke`, `npm run db:agent` (uji DB agen di skema produksi via PGlite),
  `npm run eval:agen:selftest`, `npx -y deno test --config supabase/functions/ai-assistant/deno.json supabase/functions/ai-assistant/`, `npm run build:clinic`.
- **Windows:** hati-hati escape backslash di heredoc/`node -e`; berkas kerja berakhiran CRLF (git `eol=lf`); tulis berkas lewat editor/alat, bukan `echo`.
- **Keamanan sebelum estetika:** jangan melemahkan RLS, CSP, atau pemeriksaan peran demi tampilan. Jangan menaruh rahasia/kunci di repo, prompt, atau tangkapan layar.
- **Aksesibilitas:** target WCAG 2.2 AA; hormati `prefers-reduced-motion`; kontras ≥ 4,5:1.
- **Perubahan kecil & dapat diverifikasi:** satu tujuan per cabang/commit, tes menyertai kode.

## 7. Peta berkas penting

| Topik | Berkas |
|---|---|
| Aplikasi klinik | `apps/clinic/src/` (`components/*`, `services/*`, `utils/*`, `styles/theme.css`) |
| Komponen dasar | `packages/ui/src/*.tsx` · `apps/clinic/src/components/ui/*` |
| Maskot Denti | `apps/clinic/src/components/mascot/` (`DentiMascot.jsx`, `dentiSvg.js` markup SVG, `denti.css` rig animasi), `docs/maskot-denti.md` |
| Asisten AI & agen | `apps/clinic/src/components/ai/*`, `supabase/functions/ai-assistant/*`, `docs/denti-agen.md` |
| Database | `supabase/migrations/*.sql`, `supabase/tests/*` (baseline, smoke, pgTAP, agent) |
| Infrastruktur | `infra/vps/*` (README, skrip, compose), `docs/migrasi-vps-indonesia.md` |
| Audit & sejarah | `docs/audit-*.md`, `docs/saas-maturity-log.md`, `docs/AUDIT-BRIEF.md` |
| CI | `.github/workflows/ci.yml`, `desktop.yml` |

## 8. Alur kerja tim (singkat)

1. Ketua tim memecah tugas → papan di `04-papan-tugas.md`.
2. GPT & Antigravity mengerjakan paket tugasnya (lihat 01 & 02) sesuai **aturan kerja** (03).
3. Hasil diserahkan dengan **Laporan Serah Terima** (templat di 03) → Ketua tim meninjau (keamanan, tes, integrasi) → menggabungkan & men-deploy.
4. Tidak ada hasil yang masuk `main` tanpa lolos gerbang mutu di 03.
