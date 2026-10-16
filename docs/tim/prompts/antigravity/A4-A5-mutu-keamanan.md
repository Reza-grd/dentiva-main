# Antigravity · A4 + A5 — Mutu otomatis & hardening sisi aplikasi

**Cabang:** `antigravity/A4-mutu-otomatis`, `antigravity/A5-hardening`  **Usulan CI/infra:** `docs/tim/usulan-ci/`, `docs/tim/usulan-infra/` (Ketua yang memasang).

```
MISI A4 — MUTU OTOMATIS: E2E, VISUAL, AKSESIBILITAS, PERFORMA
1) Pasang Playwright di apps/clinic (devDependency, konfigurasi terpisah dari vitest). Fixture: pengguna & klinik SINTETIS (admin, dokter, resepsionis) — backend dimock/di-stub di lapisan jaringan; JANGAN memakai server produksi atau data nyata.
2) Alur kritis: login (+MFA bila bendera aktif), daftar pasien, buat jadwal, kasir/pembayaran, layar antrean, Asisten AI (respons AI & kartu usulan di-mock: setujui/tolak/batalkan), pengaturan.
3) Regresi visual (terang/gelap × 375/1440) pada halaman utama; axe-core per halaman (nol pelanggaran serious/critical); Lighthouse CI dengan anggaran (Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95).
4) Tulis docs/tim/usulan-ci/e2e.yml (workflow GitHub Actions) — jangan menaruh di .github/workflows (Ketua yang memasang).
LULUS: suite < 10 menit lokal, stabil 5× berturut-turut tanpa flaky, laporan HTML tersimpan, dokumentasi cara menjalankan.

MISI A5 — HARDENING APLIKASI & RANTAI PASOK
1) UI MFA TOTP (di balik bendera fitur VITE_FEATURE_MFA): daftar (QR + kode manual), verifikasi saat login, kode pemulihan, nonaktifkan — memakai API Supabase Auth MFA (supabase.auth.mfa.*). Konfigurasi server dikerjakan Ketua.
   Manajemen sesi: daftar perangkat aktif & keluar dari semua perangkat; auto-kunci layar setelah tidak aktif (default 10 menit, bisa diatur) untuk area data klinis, dengan pembersihan data sensitif dari memori/DOM yang wajar.
2) Pengerasan frontend: audit SEMUA dangerouslySetInnerHTML (wajib DOMPurify), sanitasi ekspor PDF/HTML/CSV (formula injection), penanganan token/sesi (hindari penyimpanan tak perlu di localStorage), anti-clickjacking,
   tinjau CSP di apps/*/vercel.json & usulkan pengetatan (mis. Trusted Types, tanpa unsafe-inline) lengkap dampak — sebagai USULAN di docs/tim/usulan-ci/csp.md, jangan langsung mengubah vercel.json.
   Tulis tes XSS/injeksi (payload klasik di nama pasien/catatan/nama bahan) yang membuktikan output ter-escape.
3) Rantai pasok (berkas USULAN di docs/tim/usulan-ci/): dependabot.yml, codeql.yml, gitleaks.yml (+ .gitleaks.toml), npm-audit gate, SBOM CycloneDX, pemeriksaan lisensi.
4) Laporan temuan terurut keparahan (CWE/OWASP) dengan bukti & perbaikan; perbaikan di area kodemu langsung bertes.
LULUS: MFA UI bertes (komponen + E2E), tes XSS hijau, semua usulan CI valid YAML & bisa dijalankan lokal, tidak ada rahasia di diff.
```
