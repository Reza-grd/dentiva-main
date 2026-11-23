# SBOM Dentiva (Software Bill of Materials)

Bukti untuk **SATUSEHAT Security Self-Assessment poin 12** (inventaris library pihak ketiga + patching berkala)
dan OWASP Top 10:2025 **A03 Software Supply Chain Failures**.

| Berkas | Isi |
|---|---|
| [`dentiva-sbom.cdx.json`](dentiva-sbom.cdx.json) | SBOM **CycloneDX 1.6** seluruh dependensi **produksi** monorepo (aplikasi klinik, Console, paket bersama) — 465 komponen, dibuat 24 Nov 2026 |
| Tabel di bawah | Dependensi **fungsi edge** (Deno, Supabase Edge Functions) yang diimpor lewat URL/`npm:`/`jsr:` dan tidak tercakup SBOM npm |

## Membuat ulang

```bash
npm run sbom          # menulis ulang dentiva-sbom.cdx.json dari package-lock.json
```

Jalankan setiap kali `package-lock.json` berubah besar (mis. setelah PR Dependabot digabung) dan sebelum asesmen/pentest.

## Dependensi fungsi edge (Deno)

| Paket | Versi | Dipakai di |
|---|---|---|
| `@supabase/supabase-js` (esm.sh) | 2.39.8 | 18 fungsi edge (klien database) |
| `@supabase/supabase-js` (npm) | 2.57.4 | `console-api` |
| `zod` (npm) | ^4.1.12 | `console-api` |
| `postgres` (npm) | 3.4.5 | `console-api` |
| `@anthropic-ai/sdk` (npm) | ^0.110.0 | `ai-assistant` (Eira) |
| Deno std `http/server`, `crypto` | 0.168.0 | server HTTP & kriptografi fungsi lama |
| Deno std `assert` / `@std/assert` | 0.168.0 · 0.224.0 · jsr 1.x | hanya uji (tidak ikut produksi) |

Catatan patching: `supabase-js` 2.39.8 via esm.sh di fungsi edge lebih lama daripada versi di aplikasi web (2.110.x);
dijadwalkan diseragamkan saat pemeliharaan fungsi edge berikutnya.

## Proses patching (berjalan otomatis)

1. **Dependabot** (`.github/dependabot.yml`) membuka PR pembaruan npm setiap Senin 06.00 WIB dan GitHub Actions setiap bulan.
2. **CI** (`.github/workflows/ci.yml`, job *Keamanan*) gagal bila ada kerentanan **tinggi/kritis** pada dependensi produksi
   (`npm audit --omit=dev --audit-level=high`) dan memindai rahasia di setiap commit (gitleaks).
3. Semua GitHub Actions dikunci ke **commit SHA** (bukan tag yang bisa dipindah).

## Status `npm audit` (24 Nov 2026)

Tinggi/kritis: **0**. Sisa temuan dan alasan diterima:

| Paket | Tingkat | Alasan diterima |
|---|---|---|
| `glob` 11.1.0, `minimatch` 10.2.6 (di dalam `workbox-build` ← `vite-plugin-pwa`) | Sedang | Hanya berjalan saat **build** untuk membuat daftar berkas PWA; pola glob berasal dari konfigurasi kita sendiri, tidak dari pengguna. Tidak ada versi `workbox-build` yang memakai glob baru; override ke glob 14 merusak build PWA. Ditinjau ulang saat workbox merilis versi baru. |
| `quill` 2.0.3 (← `react-quill-new`) | Rendah | XSS lewat fitur ekspor HTML. Belum ada versi perbaikan. Editor hanya dipakai dokter di kolom keluhan (format dibatasi: tebal, miring, garis bawah, coret, daftar) dan HTML-nya **tidak pernah dirender mentah** (`dangerouslySetInnerHTML`) di aplikasi. Ditinjau ulang saat quill merilis perbaikan. |

Perbaikan 24 Nov 2026: `vite` 5 → 7.3.8 (menutup 1 temuan tinggi + 1 sedang `esbuild`), `@vitejs/plugin-react` 4 → 5.2,
Storybook 8 → 9.1 (versi 8 menahan vite 5).
