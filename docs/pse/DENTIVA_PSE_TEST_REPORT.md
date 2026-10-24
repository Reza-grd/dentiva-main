# Laporan Uji Internal Sistem Elektronik Dentiva

Ini **laporan uji internal** oleh tim pengembang, **bukan** sertifikat atau hasil uji kelaikan formal dari pemerintah atau lembaga terakreditasi. Kebutuhan uji kelaikan formal untuk PSE Lingkup Privat **PERLU KONFIRMASI ke Komdigi**.

Tanggal: 24–25 Oktober 2026 · Kode: commit `2d642e1` (cabang `feat/wa-cloud-api`).

| # | Area | Metode | Lingkungan | Hasil | Bukti | Kekurangan |
|---|---|---|---|---|---|---|
| 1 | Fungsional aplikasi klinik: pasien, kunjungan, rekam medis, odontogram, jadwal, kasir, stok, AI, izin | Vitest (unit dan komponen) | lokal | **550/550 lulus** (24 berkas) | `npm test` | Tidak ada uji E2E browser terhadap produksi |
| 2 | Console dan API admin platform | Vitest | lokal | 9 + 10 + 26 lulus | `npm test` | — |
| 3 | Edge Functions (WhatsApp, AI, Midtrans, SATUSEHAT Modul Gigi) | Deno test | lokal | **90/90 lulus** | `deno test` seperti CI | — |
| 4 | Tipe dan kompilasi fungsi server | `deno check` | lokal | 15/15 ok | `scripts/check-edge-functions.sh` | — |
| 5 | Kualitas kode | ESLint, TypeScript | lokal | bersih | `npm run lint`, `npm run typecheck` | — |
| 6 | Build produksi | Vite build | lokal | klinik dan console ok | `npm run build` | — |
| 7 | Keamanan database: RLS, isolasi klinik, hak fungsi, anti-pemalsuan status WA, kunci KFA | migrasi penuh di PGlite plus skenario login per peran | lokal (Postgres WASM) | **175/175 lulus** | `npm run db:smoke` | Baseline sintetis, bukan salinan produksi; pgTAP penuh belum dijalankan di staging |
| 8 | Akses tanpa login dan tanpa hak | webhook: token salah/tanpa tanda tangan; fungsi bertanda JWT | produksi (non-destruktif) | 403/401 sesuai harapan | log uji 24 Okt | Uji penetrasi menyeluruh belum dilakukan |
| 9 | Kerentanan dependensi | `npm audit --omit=dev` | lokal | critical/high produksi diperbaiki; tersisa alat pengembangan | lihat audit keamanan | Upgrade besar vite/quill terjadwal |
| 10 | Transport dan header | `curl`, `openssl` dari luar | produksi | TLS 1.3, HSTS, CSP | profil teknis §3 | — |
| 11 | Keandalan: antrean dan retry | kode outbox SATUSEHAT, klaim anti-dobel WhatsApp, cron | produksi (cron 18.50 dan 19.00 WIB = HTTP 200 setelah deploy) | berjalan | `net._http_response` | Pemantauan tanpa peringatan aktif |
| 12 | Backup | pemeriksaan berkas dan log | produksi | harian terenkripsi, 14 hari, terakhir 24 Okt 01.30 | `/opt/dentiva/backup` | Tidak ada salinan di luar server; tidak ada uji pulih rutin |
| 13 | Pemulihan | gladi pemulihan dari nol | VPS (gladi migrasi) | lolos 11 Okt 2026 | `docs/backup-dr.md` | Belum diulang dari backup harian |
| 14 | Kinerja | pengamatan sumber daya (load, memori, disk) | produksi | load 0,35, memori 42%, disk 36% | audit 24 Okt | **Belum ada uji beban**. Postgres belum disetel |
