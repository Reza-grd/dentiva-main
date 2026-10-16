# 04 · Papan Tugas Tim (dikelola Ketua Tim)

_Diperbarui: 17 Okt 2026._ Status: ⬜ belum · 🟦 berjalan · 🟩 selesai · ⏸ menunggu · 🟥 terblokir.

## Tugas tersimpan dari sesi sebelumnya (jangan hilang)

| # | Tugas | Status | Catatan |
|---|---|---|---|
| T1 | **Pasang kunci Claude** di server (Sonnet 5.5 chat/agen, Haiku 5.5 catatan dashboard) | ⏸ menunggu pemilik | Kode & harga model sudah ter-deploy (`pricing.ts`). Pemilik: beli kredit di platform.claude.com → buat API key (batas pengeluaran) → `ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/isi-rahasia-functions.sh` (isi `ANTHROPIC_API_KEY`). Lalu Ketua menjalankan eval 45 skenario dengan `--provider anthropic` & uji Haiku untuk catatan |
| T2 | Kuota Gemini gratis (20/hari) membatasi Asisten AI sampai T1 selesai | ⏸ | Alternatif sementara: aktifkan penagihan Gemini (`GEMINI_PAID=true`) |
| T3 | Reboot VPS untuk kernel baru | ⏸ menunggu persetujuan pemilik | Jadwalkan di luar jam praktik |
| T4 | SMTP/email bermerek (verifikasi & reset sandi) | ⬜ | Butuh akun penyedia email (pemilik) — lihat L3 |
| T5 | Backup offsite + uji pemulihan | ⬜ | Butuh penyimpanan luar (pemilik) — lihat L2 |
| T6 | Keputusan 3 pembayaran lunas Mei (jumlah_bayar 0) & laporan agregat/izin (L04) | ⏸ keputusan pemilik | Dari audit 12 Okt |
| T7 | Evaluasi tampilan produksi Denti Agen dengan pengguna nyata | ⬜ | Setelah T1 |

## Paket tim

| Kode | Paket | Pemilik | Status | Bergantung | Hasil |
|---|---|---|---|---|---|
| **G1** | Art direction & aset Denti HD | GPT | ⬜ | — | `hasil-gpt/G1/` |
| **G2** | Sistem desain premium | GPT | ⬜ | — | `hasil-gpt/G2/` |
| **G3** | Spesifikasi 10 layar | GPT | ⬜ | G2 | `hasil-gpt/G3/` |
| **G4** | Dokumen keamanan & kepatuhan | GPT | ⬜ | — | `hasil-gpt/G4/` |
| **G5** | Produk, paket & harga | GPT | ⬜ | G4 (whitepaper) | `hasil-gpt/G5/` |
| **G6** | Skenario uji agen & mikrocopy | GPT | ⬜ | — | `hasil-gpt/G6/` |
| **A1** | Denti HD (render) | Antigravity | ⬜ | G1 (opsional di awal) | `serah-terima/A1.md` |
| **A2** | Fondasi sistem desain | Antigravity | ⬜ | G2 | cabang A2 |
| **A3** | Layar premium (bertahap) | Antigravity | ⬜ | G3, A2 | cabang A3-* |
| **A4** | Mutu otomatis (E2E/visual/axe) | Antigravity | ⬜ | — | `usulan-ci/e2e.yml` |
| **A5** | Hardening aplikasi & rantai pasok | Antigravity | ⬜ | L1 (MFA server) | `usulan-ci/*`, cabang A5 |
| **A6** | Desktop premium & penandatanganan | Antigravity | ⬜ | pemilik (sertifikat) | cabang A6 |
| **A7** | Performa & pengalaman | Antigravity | ⬜ | — | cabang A7 |

## Tugas Ketua Tim (Claude)

| Kode | Tugas | Status |
|---|---|---|
| **L1** | **MFA TOTP di server** (GoTrue MFA), kebijakan sandi, pembatasan laju login di gateway, audit login | ⬜ |
| **L2** | **Backup & DR**: backup offsite terenkripsi, uji pemulihan terjadwal, target RPO/RTO terukur, (opsional) WAL/PITR | ⬜ |
| **L3** | **SMTP/email bermerek**, template email (verifikasi/reset/undangan) | ⬜ |
| **L4** | **Hardening VPS**: ufw/fail2ban, SSH, pembaruan otomatis, reboot kernel, pemantauan & peringatan (uptime/disk/error), log terpusat | ⬜ |
| **L5** | **Audit log tak-dapat-diubah** (rantai hash) + ekspor; tinjauan enkripsi bidang & rotasi kunci | ⬜ |
| **L6** | Pasang usulan CI dari A4/A5 (E2E, CodeQL, gitleaks, SBOM, Dependabot) setelah ditinjau | ⬜ |
| **L7** | Rilis AI Claude (T1) + evaluasi + penyetelan; perluas skenario dari G6 | ⏸ |
| **L8** | Tinjau & integrasi semua hasil GPT/Antigravity; deploy produksi; pembaruan dokumen | berjalan |
| **L9** | Penandatanganan kode desktop (bersama pemilik: sertifikat) & kunci updater | ⏸ |
| **L10** | Uji penetrasi independen (pilih vendor bersama pemilik) memakai rencana G4 | ⬜ |

## Urutan yang disarankan (gelombang)

1. **Gelombang 1 (paralel, mulai sekarang):** G1, G2, G4 (GPT) · A1, A4 (Antigravity) · L1, L2, L4 (Ketua) · T1 (pemilik).
2. **Gelombang 2:** G3, G5 (GPT) · A2, A5 (Antigravity) · L3, L5, L6.
3. **Gelombang 3:** A3 (layar, bertahap) · A6, A7 · G6 (kapan saja) · L7, L9, L10.

## Catatan keputusan
- Antigravity & GPT **tidak** menyentuh produksi/`main`/rahasia (lihat 03). Semua deploy lewat Ketua.
- Posisi produk: premium & aman — jika ada konflik antara estetika dan keamanan, keamanan menang.
