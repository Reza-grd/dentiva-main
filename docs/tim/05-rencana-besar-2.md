# 05 · Rencana Besar 2 — "Dentiva Siap Jual" (19 Okt 2026 – 15 Jan 2027)

_Disusun Ketua Tim (Claude), 17 Okt 2026. Menggantikan urutan gelombang di `04-papan-tugas.md` mulai 19 Okt; papan tugas tetap tempat status & log harian._

## 1. Posisi sekarang (17 Okt 2026, sudah live di produksi)

| Bidang | Yang sudah ada | Yang belum |
|---|---|---|
| **Eira (asisten AI)** | Nama baru Eira (dulu Denti), maskot biru HD 3 LOD, hemat CPU (hero 0,32%); Eira Agen: 15 alat baca + 18 alat usulan, usulan→setujui→jalankan→batalkan; 195 skenario uji (45 + 150 G6) lulus selftest | Model produksi masih **Gemini gratis 20 permintaan/hari**; Sonnet/Haiku belum dievaluasi (menunggu kunci); belum ada uji dengan klinik nyata |
| **Keamanan** | MFA TOTP aktif di server, kebijakan sandi + tolak sandi bocor, audit log berantai hash (tak dapat diubah), RLS ketat, ufw/fail2ban/SSH kunci, pantau.sh, backup lokal harian | **Backup offsite**, **SMTP asli**, UI MFA & pemaksaan MFA untuk admin/dokter, pembatasan laju login di gateway, pemantauan dari luar server, uji penetrasi |
| **Mutu** | CI unit/DB/agen hijau; E2E Playwright 33 tes + axe + Lighthouse di CI; alat ukur CPU Eira | Baseline visual Linux; tes bebas-jam (A4c); CodeQL/gitleaks/SBOM/Dependabot |
| **Desain** | Spesifikasi G2 (25 komponen) & G3 (10 layar) dari GPT; aksen aplikasi masih **ungu** | Sistem desain di kode (A2), layar premium (A3) — **menunggu keputusan warna aksen** |
| **Produk & dokumen** | Draf keamanan/kepatuhan (G4), usulan harga (G5), Pusat Bantuan 26 artikel siap terbit (G7b) | Harga & SLA disahkan, dokumen hukum final, Pusat Bantuan tampil di aplikasi, desktop bertanda tangan |

## 2. Tujuan 90 hari — empat pilar

1. **Dipercaya** — data klinik aman & pulih: backup offsite teruji, MFA wajib untuk admin/dokter, email resmi, pemantauan luar, uji penetrasi independen lulus tanpa temuan kritis/tinggi terbuka.
2. **Eira kelas produksi** — Claude Sonnet 5.5 (obrolan/agen) + Haiku 5.5 (catatan dashboard) live; evaluasi ≥ 90% lulus pada model produksi; uji merah (red-team) lulus; uji coba di 1–3 klinik nyata.
3. **Terasa premium** — sistem desain di kode, 10 layar utama dipoles, Pusat Bantuan di aplikasi, desktop bertanda tangan, Core Web Vitals hijau.
4. **Siap dijual** — paket & harga disahkan dan tertagih (Midtrans), dokumen hukum final, situs & naskah demo, onboarding klinik baru < 1 hari.

## 3. Tiga gelombang

| Gelombang | Tanggal | Fokus | Gerbang keluar (wajib terpenuhi) |
|---|---|---|---|
| **W1 · Fondasi tak-terlihat** | 19 – 31 Okt | Keputusan pemilik, SMTP, offsite, kunci Claude, CI hijau, UI MFA | Email reset sandi berfungsi · backup offsite tersalin & dipulihkan sekali · Eira memakai Claude · CI 100% hijau · UI MFA di balik bendera fitur |
| **W2 · Premium & Eira** | 2 – 28 Nov | Sistem desain, 4 layar prioritas, Pusat Bantuan di aplikasi, evaluasi & red-team Eira, MFA wajib | Token baru di kode tanpa regresi · Login/MFA, Dashboard, Asisten AI, Kasir dipoles · Eira ≥ 90% di eval Claude · MFA wajib admin/dokter |
| **W3 · Siap jual** | 30 Nov – 19 Des | Layar sisanya, desktop bertanda tangan, performa, pentest, harga & hukum final, peluncuran | Pentest tanpa temuan kritis/tinggi terbuka · installer bertanda tangan · LCP < 2 s · harga tertagih · uji coba klinik dimulai |
| *Stabilisasi* | 20 Des – 15 Jan | Perbaikan dari uji coba klinik, dokumentasi, rilis 2.0 | Tidak ada bug kritis 14 hari berturut-turut |

## 4. Pembagian tugas

### 4.1 Pemilik (keputusan & akses — jalur kritis, tanpa ini tim tertahan)

| Kode | Tugas | Batas | Membuka |
|---|---|---|---|
| **P1** | Kunci API Claude (platform.claude.com; batas pengeluaran) — pasang lewat `isi-rahasia-functions.sh` bersama Ketua | 21 Okt | K3 (Eira Claude), G11 |
| **P2** | Pilih penyedia email (SMTP bermerek, mis. layanan transaksional dengan domain dentiva.id) + akses DNS untuk SPF/DKIM/DMARC | 21 Okt | K2, Pusat Bantuan tanpa "fitur disiapkan" |
| **P3** | Penyimpanan offsite backup (object storage S3-kompatibel di luar VPS, sebaiknya region Indonesia) | 24 Okt | K1 |
| **P4** | **Warna aksen aplikasi**: tetap ungu, atau biru selaras Eira & logo navy | 21 Okt | A2, A3 |
| **P5** | Izin jendela reboot VPS (di luar jam praktik) | 24 Okt | K4 |
| **P6** | Data hukum: nama entitas, alamat, kontak privasi/DPO, penanggung jawab insiden | 31 Okt | G10 |
| **P7** | Sahkan paket & harga (usulan G5: Rp 1,49 / 2,99 / 6,49 / 14,9 juta per bulan) + kuota AI | 7 Nov | K8, G9 |
| **P8** | Sertifikat penandatanganan kode Windows (OV/EV atau Azure Trusted Signing) + akun Apple Developer bila perlu macOS | 14 Nov | A6, K9 |
| **P9** | Pilih vendor uji penetrasi independen + anggaran | 21 Nov | K10 |
| **P10** | 1–3 klinik uji coba (bersedia memberi masukan) | 28 Nov | uji coba W3 |
| **P11** | Keputusan 3 pembayaran lunas Mei (`jumlah_bayar` 0) | 31 Okt | data laporan |

### 4.2 Ketua Tim — Claude (arsitektur, database, server, AI, integrasi, deploy)

| Kode | Tugas | Gel. | Bergantung |
|---|---|---|---|
| **K1** | Backup offsite terenkripsi + jadwal 02.45 + **gladi pemulihan** terukur (RPO/RTO nyata) + gladi bulanan | W1 | P3 |
| **K2** | SMTP bermerek + pasang 5 template email + SPF/DKIM/DMARC; reset sandi & undangan staf tuntas | W1 | P2 |
| **K3** | Eira ke Claude: Sonnet 5.5 agen/obrolan, Haiku 5.5 catatan; evaluasi 195 skenario pada model asli; penyetelan prompt; batas biaya per klinik | W1–W2 | P1 |
| **K4** | Pengerasan server sisa: pembatasan laju login di gateway, audit login, reboot kernel, **pemantauan dari luar server** (uptime + peringatan), log terpusat | W1–W2 | P5 |
| **K5** | **MFA wajib** (`aal2`) untuk admin/dokter di database setelah UI A5 siap; rotasi kunci; jangkar mingguan rantai audit | W2 | A5 |
| **K6** | CI lengkap: baseline visual Linux, CodeQL, gitleaks, SBOM, Dependabot (dari usulan A5) — CI 100% hijau | W1–W2 | A4c, A5 |
| **K7** | Eira Agen lanjutan: alat baru yang paling diminta klinik (mis. jadwal & pengingat, ringkasan bulanan), red-team dari G11 jadi tes permanen | W2–W3 | G11 |
| **K8** | Paket & penagihan: sinkronkan `subscription_plans` dengan harga disahkan, kuota per paket, uji Midtrans end-to-end | W3 | P7 |
| **K9** | Rilis desktop bertanda tangan + kunci updater | W3 | P8, A6 |
| **K10** | Koordinasi uji penetrasi (rencana dari G4) + perbaikan temuan | W3 | P9 |
| **K11** | Integrasi & deploy: tinjau setiap paket (gerbang 03 §3 + ukur sendiri), **satu deploy per gelombang kecil**, papan tugas | terus | — |

### 4.3 Antigravity (implementasi, UI, mutu otomatis)

Urutan wajib (satu paket = satu cabang & worktree sendiri dari `origin/console` terbaru):

| Kode | Paket | Gel. | Isi singkat | Lulus bila |
|---|---|---|---|---|
| **A4c** | Tes bebas-jam *(berjalan)* | W1 | Bekukan jam di tes visual/E2E; perbarui baseline; rebase ke console (nama Eira) | Playwright 33/33 dua kali pada jam berbeda |
| **A5** | **Keamanan aplikasi** | W1 | UI MFA (daftar/verifikasi/kode pemulihan) di balik bendera fitur, sesi perangkat & keluar dari semua perangkat, kunci layar otomatis, DOMPurify/CSP/Permissions-Policy, galat login daftar-izin, usulan CodeQL/gitleaks/SBOM/Dependabot | Lihat 02 §A5; tes E2E MFA; usulan CI siap pasang |
| **A8** *(baru)* | **Pusat Bantuan di aplikasi** | W2 | Rute `/bantuan` (+ pencarian) yang merender 26 artikel G7b (Markdown → HTML aman), tautan kontekstual "Bantuan" per halaman, Eira bisa menyarankan artikel; status sementara dari `status-layanan.md` | Semua 26 artikel tampil, pencarian bekerja, axe 0 serius, tanpa XSS (DOMPurify) |
| **A2** | Sistem desain di kode | W2 | Token warna (sesuai keputusan P4), tipografi self-host, skala jarak/radius/elevasi/gerak, 25 komponen dasar | Tanpa warna hardcode baru, AA, regresi visual hanya yang disengaja |
| **A3-1…4** | Layar prioritas | W2 | Login/MFA → Dashboard admin → Asisten AI (gaya saja) → Kasir/Pembayaran; + command palette Ctrl+K | Gerbang 03 §3 per layar |
| **A3-5…10** | Layar sisanya | W3 | Pasien, Jadwal, Rekam medis, Biaya & stok, Antrean TV, Pengaturan & keamanan; pusat notifikasi; mode ringkas | Gerbang 03 §3 per layar |
| **A7** | Performa | W3 | Code-splitting, fon/gambar, error boundary + Sentry, Core Web Vitals | LCP < 2,0 s · INP < 200 ms · CLS < 0,05 (angka sebelum/sesudah) |
| **A6** | Desktop premium | W3 | Installer & ikon HD, banner offline, UX pembaruan, cetak nota thermal, workflow tanda tangan (usulan) | Build uji CI berhasil, tanpa rahasia di repo |

### 4.4 GPT (desain, merek, dokumen, uji)

| Kode | Paket | Gel. | Isi singkat | Bergantung |
|---|---|---|---|---|
| **G8** *(baru)* | **Persona & suara Eira** | W1 | Panduan karakter Eira (nilai, nada, batas — bukan tenaga medis), 40 contoh jawaban baik/buruk, pembaruan `mikrocopy.md/json` G6 & dokumen G1–G5 dari "Denti" ke "Eira" (tanpa mengubah kode), daftar kata yang dihindari | — |
| **G9** | Materi peluncuran | W3 | Copy situs (Beranda/Keamanan/Harga/Eira/Unduh), naskah demo 15 menit, deck penjualan 10 slide, FAQ penjualan — memakai harga disahkan | P7 |
| **G10** | Dokumen hukum final | W2–W3 | Syarat Layanan, Kebijakan Privasi, DPA, SLA dengan data entitas asli (tetap berlabel tinjau advokat) | P6 |
| **G11** | **Red-team Eira** | W2 | ±80 skenario serangan: injeksi prompt (termasuk lewat nota/teks tempel), kebocoran antar-klinik, rekayasa sosial "hapus semua", angka/tanggal menyesatkan, bahasa gaul/salah ketik; format `scenarios.mjs` + uji mandiri & negatif lulus | P1 (eval model asli oleh Ketua) |
| **G12** | Materi pelatihan klinik | W3 | Panduan onboarding 1 hari, checklist go-live, naskah video singkat per peran (5 × 2 menit), lembar ringkas cetak | A8, A3 |

## 5. Jalur kritis & ketergantungan

```
P2 ─► K2 (email) ───────────────► Pusat Bantuan tanpa "disiapkan"
P3 ─► K1 (offsite + gladi) ─────► klaim RPO/RTO di G9/G10
P1 ─► K3 (Eira Claude) ─► G11 red-team ─► K7 ─► uji coba klinik (P10)
A4c ─► K6 (CI hijau)
A5 (UI MFA) ─► K5 (MFA wajib)
P4 (warna) ─► A2 ─► A3-1…10 ─► A7
P7 (harga) ─► K8 (penagihan) + G9 (copy)
P8 (sertifikat) ─► A6 ─► K9 (desktop bertanda tangan)
P9 (vendor) ─► K10 (pentest) — setelah A5 & K4
```
Tanpa **P1–P4** minggu depan, W1 tidak bisa ditutup. Semua pekerjaan lain tetap berjalan paralel.

## 6. Ukuran keberhasilan

| Ukuran | Sekarang | Target 15 Jan |
|---|---|---|
| CI (unit, DB, agen, E2E, Lighthouse) | E2E merah (baseline/jam) | 100% hijau di setiap push |
| Eira — lulus evaluasi pada model produksi | 84% (Gemini flash-lite) | ≥ 90% Sonnet 5.5; red-team 100% aman |
| Backup | lokal saja, belum gladi | offsite harian + gladi bulanan terdokumentasi (RPO ≤ 24 jam, RTO ≤ 6 jam) |
| MFA admin/dokter | tersedia di server, tidak wajib | 100% wajib |
| Aksesibilitas | axe 0 serius (6 halaman) | axe 0 serius di 10 layar utama |
| Performa | Lighthouse ≥ 90 (login/daftar) | LCP < 2,0 s, INP < 200 ms di 10 layar |
| CPU Eira saat diam | 0,32% (hero) | tetap ≤ 1% (dijaga tes) |
| Uji penetrasi | belum | tanpa temuan kritis/tinggi terbuka |
| Onboarding klinik baru | belum diukur | < 1 hari kerja, dengan materi G12 |

## 7. Aturan tambahan (pelajaran 17 Okt)

1. **Worktree sendiri, cabang dari `origin/console` terbaru.** Sebelum serah terima, gabungkan `console` terbaru ke cabang Anda dan jalankan ulang gerbang.
2. **Jangan pernah** membuat junction `node_modules` antar-worktree (insiden 17 Okt: folder utama terhapus).
3. **Tes tidak boleh bergantung pada jam, tanggal, jaringan luar, atau sisa build** (`dist-e2e`, jam dibekukan, pemblokir host non-localhost).
4. **Klaim performa wajib memakai alat Ketua** (`docs/tim/alat/ukur-cpu-denti.mjs`) dan menyertakan keluaran mentah; batas dari Ketua, bukan dibuat sendiri.
5. **Bukti visual harus tangkapan aplikasi nyata**; halaman tiruan diberi label "TIRUAN".
6. **Keputusan merek milik pemilik.** Eira = nama resmi; warna Eira biru; jangan mengusulkan ulang teal tanpa diminta.
7. Deploy hanya lewat Ketua, sekali per paket gabungan (batas laju Vercel).

## 8. Minggu ini (19 – 24 Okt) — langkah pertama

- **Pemilik:** P1, P2, P4 (paling lambat Rabu 21 Okt), P3 & P5 (Sabtu 24 Okt).
- **Antigravity:** selesaikan A4c → mulai A5 (prompt: `prompts/antigravity/A4-A5-mutu-keamanan.md` bagian A5 + catatan galat login dari papan tugas).
- **GPT:** G8 Persona & suara Eira (`prompts/gpt/G8-persona-eira.md`).
- **Ketua:** pasang baseline Linux setelah A4c, siapkan K2/K1 begitu P2/P3 ada, K3 begitu P1 ada; tinjau A4c/A5/G8.
