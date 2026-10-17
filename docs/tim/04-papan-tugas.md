# 04 · Papan Tugas Tim (dikelola Ketua Tim)

_Diperbarui: 17 Okt 2026 (01.30 WIB)._ Status: ⬜ belum · 🟦 berjalan · 🟩 selesai · ⏸ menunggu · 🟥 terblokir.

## Tugas tersimpan dari sesi sebelumnya (jangan hilang)

| # | Tugas | Status | Catatan |
|---|---|---|---|
| T1 | **Pasang kunci Claude** di server (Sonnet 5.5 chat/agen, Haiku 5.5 catatan dashboard) | ⏸ menunggu pemilik | Kode & harga model sudah ter-deploy (`pricing.ts`). Pemilik: beli kredit di platform.claude.com → buat API key (batas pengeluaran) → `ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/isi-rahasia-functions.sh` (isi `ANTHROPIC_API_KEY`). Lalu Ketua menjalankan eval 45 skenario dengan `--provider anthropic` & uji Haiku untuk catatan |
| T2 | Kuota Gemini gratis (20/hari) membatasi Asisten AI sampai T1 selesai | ⏸ | Alternatif sementara: aktifkan penagihan Gemini (`GEMINI_PAID=true`) |
| T3 | Reboot VPS untuk kernel baru | ⏸ menunggu persetujuan pemilik | Jadwalkan di luar jam praktik |
| T4 | **SMTP/email bermerek** (verifikasi & reset sandi) | ⏸ **mendesak** — menunggu pemilik memilih penyedia | SMTP server masih *palsu* → pendaftaran klinik mandiri & reset sandi via email tidak bisa tuntas. Template GPT sudah diterima (lihat `serah-terima/T3-email-templates.md`) |
| T5 | Backup offsite + uji pemulihan | ⏸ menunggu penyimpanan luar (pemilik) | Skrip `salin-backup-offsite.sh` + `pantau.sh` sudah terpasang di server; lihat `docs/backup-dr.md` §3 |
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
| **L1** | **MFA TOTP di server** (GoTrue MFA), kebijakan sandi, pembatasan laju login di gateway, audit login | 🟦 sebagian: ✔ MFA TOTP aktif (17 Okt), ✔ sandi min. 8 huruf+angka, ✔ tolak sandi bocor (HIBP). Sisa: pemaksaan `aal2` untuk admin/dokter di database setelah UI MFA (A5) siap; pembatasan laju login di Envoy; audit login |
| **L2** | **Backup & DR**: backup offsite terenkripsi, uji pemulihan terjadwal, target RPO/RTO terukur, (opsional) WAL/PITR | 🟦 sebagian: ✔ runbook `docs/backup-dr.md`, ✔ skrip offsite teruji (stub) & terpasang; menunggu T5. Sisa: gladi pemulihan bulanan, WAL |
| **L3** | **SMTP/email bermerek**, template email (verifikasi/reset/undangan) | ⬜ |
| **L4** | **Hardening VPS**: ufw/fail2ban, SSH, pembaruan otomatis, reboot kernel, pemantauan & peringatan (uptime/disk/error), log terpusat | 🟦 sebagian: audit 17 Okt — ✔ ufw (22/80/443), ✔ fail2ban, ✔ SSH hanya kunci & root off, ✔ unattended-upgrades, ✔ port internal hanya 127.0.0.1; ✔ `pantau.sh` aktif tiap 5 menit (peringatan WA menunggu `pantau.env`). Sisa: reboot kernel (T3), log terpusat |
| **L5** | **Audit log tak-dapat-diubah** (rantai hash) + ekspor; tinjauan enkripsi bidang & rotasi kunci | 🟦 sebagian: ✔ rantai hash SHA-256 per klinik + blokir ubah/hapus/truncate untuk semua peran + `audit_verify_chain()` (admin) — **live 17 Okt, 104 baris terverifikasi**; ✔ purge pasien tak lagi menghapus jejak. Sisa: UI "Verifikasi integritas log" + ekspor (A3/Antigravity), jangkar eksternal mingguan (kepala rantai ke email/WA pemilik), tinjauan rotasi kunci enkripsi |
| **L6** | Pasang usulan CI dari A4/A5 (E2E, CodeQL, gitleaks, SBOM, Dependabot) setelah ditinjau | ⬜ |
| **L7** | Rilis AI Claude (T1) + evaluasi + penyetelan; perluas skenario dari G6 | ⏸ |
| **L8** | Tinjau & integrasi semua hasil GPT/Antigravity; deploy produksi; pembaruan dokumen | berjalan |
| **L9** | Penandatanganan kode desktop (bersama pemilik: sertifikat) & kunci updater | ⏸ |
| **L10** | Uji penetrasi independen (pilih vendor bersama pemilik) memakai rencana G4 | ⬜ |

## Log pengawasan anggota (Ketua)

| Tanggal | Anggota | Pemeriksaan | Hasil |
|---|---|---|---|
| 17 Okt 01.20 | GPT | Cabang remote `gpt/email-templates` (hasil T3 lama, 11 Okt) | ✔ Ditinjau & digabung (lihat `serah-terima/T3-email-templates.md`). Tidak ada commit GPT baru di luar itu |
| 17 Okt 01.20 | GPT | `docs/tim/hasil-gpt/` | Kosong — paket G1–G6 belum diserahkan |
| 17 Okt 01.20 | Antigravity | Cabang `antigravity/*`, `docs/tim/serah-terima/` | Belum ada cabang/serah terima — paket A1–A7 belum dimulai |
| 17 Okt 01.30 | Antigravity | Folder kerja & cabang | ⚠ **Insiden:** Antigravity bekerja di folder utama dan memindahkan cabang aktif ke `antigravity/A1-denti-hd`; satu commit Ketua (`6292ecf`) tak sengaja masuk cabang itu (sudah disalin ke `console` sebagai `71d3fed`). **Tindakan:** aturan *worktree sendiri* ditambahkan (03 §2, aturan misi); Ketua kini memakai worktree `D:\dentiva\dentiva-ketua`. **Perbaikan untuk Antigravity:** pindah ke worktree sendiri & buang commit nyasar — lihat catatan di bawah tabel |
| 17 Okt 02.00 | Antigravity | A1 berjalan (diff belum di-commit, dibaca read-only) | ✔ Arah benar: `resolveDentiLod()` (mini ≤72, standar ≤160, hero), `data-lod`, `shapeRendering="geometricPrecision"`, ukuran piksel dibulatkan, folder bukti `serah-terima/A1/sebelum/`. Menunggu `dentiSvg.js` per-LOD, tes, bukti sesudah. Catatan: masih memakai folder utama (belum pindah worktree) |
| 17 Okt | GPT | G1 serahan parsial 1 (art-direction.md + serah-terima.md; tanpa aset) | 🟦 Arah DITERIMA dengan syarat. Kontras diukur Ketua: enamel vs putih hanya 1,05 (kontur wajib kontinu di tema terang); kontur vs latar gelap 1,38 (tepi luar harus terang). 58 px = LEBAR. GPT diminta menerima bundel sumber, lalu kritik berbasis sumber → lod-aturan → palet.json → catatan-rig → ekspresi → 18 SVG. Rinci: `serah-terima/G1-tinjauan.md` |
| 17 Okt | Antigravity | A1 diserahkan (cabang `antigravity/A1-denti-hd`) | ✔ DITERIMA & digabung ke `console` (cherry-pick 4 commit; commit lama 6292ecf di cabang itu tidak ikut karena sudah ada). Gerbang Ketua: build, lint, typecheck, 545 tes (24 berkas) hijau; visual 58 px @1×/2×/3× jauh lebih tajam (kontur tegas, tanpa halo). Tindak lanjut A1b (minor): (1) partikel orbit kini diam+berdenyut, gerak mengitari hilang (SMIL dibuang) → kembalikan via offset-path/rotasi grup; (2) pegas lompat/celebrate hilang karena semua scale() dibuang → ganti rotasi anggota+overshoot kecil; (3) bandingkan glow visor/mata hero dengan versi lama (semua filter dibuang termasuk hero); (4) kontras tepi mini #7a9ec9 vs putih ≈2,7:1 (<3:1) → gelapkan sedikit. Belum deploy ke main |
| — | Pemilik | T1 (kunci Claude), T4 (SMTP), T5 (storage offsite) | Menunggu tindakan pemilik |

> **Instruksi perbaikan untuk Antigravity (sekali):** (1) di folder utama pastikan tak ada perubahan tak ter-commit milik Anda (`git status`); jika ada, `git add -A && git commit -m "wip(A1): …"` dulu.
> (2) `git switch --detach origin/console` di folder utama (melepas cabang A1 dari folder itu). (3) `git worktree add D:/dentiva/antigravity-A1 antigravity/A1-denti-hd` lalu `cd` ke sana.
> (4) Buang commit nyasar Ketua: bila belum ada commit Anda di atasnya `git reset --hard 0ed757a`; bila sudah ada: `git rebase --onto 0ed757a 6292ecf antigravity/A1-denti-hd`. Selanjutnya bekerja hanya di worktree itu.

## Urutan yang disarankan (gelombang)

1. **Gelombang 1 (paralel, mulai sekarang):** G1, G2, G4 (GPT) · A1, A4 (Antigravity) · L1, L2, L4 (Ketua) · T1 (pemilik).
2. **Gelombang 2:** G3, G5 (GPT) · A2, A5 (Antigravity) · L3, L5, L6.
3. **Gelombang 3:** A3 (layar, bertahap) · A6, A7 · G6 (kapan saja) · L7, L9, L10.

## Catatan keputusan
- Antigravity & GPT **tidak** menyentuh produksi/`main`/rahasia (lihat 03). Semua deploy lewat Ketua.
- Posisi produk: premium & aman — jika ada konflik antara estetika dan keamanan, keamanan menang.
