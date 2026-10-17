# Register Sumber dan Batas Pembuktian

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Cara membaca status
Ada = bukti spesifik dalam kode/dokumen; bukan verifikasi produksi saat ini.
Sebagian = kontrol atau proses belum lengkap. Belum = belum ada bukti yang cukup,
bukan kepastian bahwa kontrol tidak pernah dilakukan. Acuan kode: commit 36ba347.
Papan Ketua 17 Okt lebih baru daripada 00; laporan runtime tetap perlu dikonfirmasi.

## Bukti internal
| ID | Bukti | Hal yang dapat disimpulkan | Batas |
|---|---|---|---|
| E01 | supabase/migrations/20260928000400_tenant_guard.sql:91–128 | policy tenant restrictive | perlu regresi dua klinik |
| E02 | supabase/migrations/20261011160000_tahap2_hak_akses.sql:290–320 | admin dilarang data pasien; kasir resepsionis | frontend belum selalu seragam |
| E03 | infra/vps/docker-compose.dentiva.yml:21–29; docs/tim/04-papan-tugas.md L1 | konfigurasi TOTP, min8+huruf/angka, HIBP; Ketua melaporkan aktif | AAL2 klinik masih sebagian; HIBP gagal-terbuka |
| E04 | supabase/migrations/20261017090000_audit_log_tambah_saja_berantai.sql:18–117 | SHA-256 per klinik, trigger tambah-saja, audit_verify_chain | superuser dapat menonaktifkan/rekomputasi; jangkar eksternal belum ada |
| E05 | infra/vps/bin/backup-harian.sh:1–75; docs/backup-dr.md §1–5 | snapshot konsisten, age, auth.mfa_factors, manifest, retensi lokal14 hari | offsite belum aktif; bukan bukti restore terbaru |
| E06 | infra/vps/bin/salin-backup-offsite.sh; docs/backup-dr.md §3 | skrip tersedia | belum tujuan/jadwal; verifikasi ukuran bukan bukti isi seluruh objek |
| E07 | infra/vps/bin/pantau.sh:1–75; papan L4 | pemeriksaan kesehatan/disk/backup/sertifikat | kanal WA menunggu konfigurasi; bukan pemantauan eksternal independen |
| E08 | infra/vps/README.md §Kondisi server; Caddyfile; docker-compose.dentiva.yml:1–18 | SSH keys, ufw/fail2ban menurut laporan; bind localhost | belum scan ulang runtime |
| E09 | apps/clinic/vercel.json:8–41 | CSP/HSTS/Permissions-Policy sumber | header runtime perlu diperiksa; ada style unsafe-inline, tidak sama dengan script unsafe-inline |
| E10 | docs/denti-agen.md §Prinsip; supabase/functions/ai-assistant/agent.ts:264–297 | model hanya usul; apply admin, expiry dan pemeriksaan ulang | pertahanan injeksi bukan jaminan sempurna |
| E11 | docs/tim/serah-terima/T3-email-templates.md | template email ditinjau | SMTP belum operasional |
| E12 | apps/console/src/lib/auth.tsx:67–85 | UI assurance AAL2 Console | jangan digeneralisasi ke semua jalur clinic |

## Sumber resmi diperiksa 17 Oktober 2026
- [UU PDP 27/2022, naskah resmi](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf).
- [Permenkes 24/2022, naskah resmi](https://peraturan.bpk.go.id/Home/Download/301563/Permenkes%20Nomor%2024%20Tahun%202022.pdf).
- [SATUSEHAT interoperabilitas](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/integrations/).
- [ISO/IEC 27001:2022 katalog](https://www.iso.org/standard/27001).
- [ISO 27799:2025 katalog](https://www.iso.org/standard/84647.html).
- [OWASP ASVS](https://owasp.org/projects/asvs?tab=main), versi stabil yang ditampilkan 5.0.0.
- [OWASP API Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x04-release-notes/).

Naskah lengkap ISO berlisensi tidak tersedia untuk pemeriksaan ini. Pemetaan ID
adalah register kerja awal, bukan Statement of Applicability final. Katalog
mengonfirmasi ISO 27799:2025; jangan memakai 2016 sebagai edisi terbaru tanpa tinjauan.
Implementasi hukum lanjutan, kanal regulator yang berlaku, kewajiban PSE dan
ketentuan sektoral terbaru harus ditinjau advokat sebelum publikasi/kontrak.
