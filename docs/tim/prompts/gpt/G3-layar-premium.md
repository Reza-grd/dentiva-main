# GPT · G3 — Spesifikasi redesign 10 layar utama

**Lampirkan:** `00`, `03`, `bundel/GPT-desain.md`, dan hasil `G2` (design-system.md + tokens.json) setelah tersedia.  **Simpan ke:** `docs/tim/hasil-gpt/G3/`.

```
PAKET G3 — SPESIFIKASI REDESIGN LAYAR (10 LAYAR + POLA GLOBAL)

KONTEKS
Gunakan sistem desain dari G2 (terlampir). Aplikasi dipakai oleh Admin/pemilik, Dokter, Resepsionis — sering di tengah kesibukan klinik; kecepatan & ketenangan penting.
Aturan produk: admin TIDAK melihat data klinis pasien (hanya agregat); kasir hanya resepsionis; tindakan klinis hanya dokter. Denti (maskot AI) hadir sebagai pendamping, bukan pengganggu.

LAYAR: (1) Login & verifikasi MFA, (2) Dashboard admin, (3) Asisten AI & kartu usulan agen, (4) Daftar & data pasien, (5) Rekam medis (dokter), (6) Jadwal,
(7) Pembayaran (kasir), (8) Biaya & Modal / Stok, (9) Layar Antrean TV, (10) Pengaturan & Keamanan (sesi perangkat, MFA, kunci layar).
POLA GLOBAL: command palette (Ctrl+K), pusat notifikasi, onboarding klinik baru (checklist 5 langkah), mode ringkas untuk data padat, status offline/sesi berakhir.

UNTUK SETIAP LAYAR tulis: 
 1. Tujuan & tugas utama tiap peran (≤ 5 tugas), metrik keberhasilan (mis. waktu menyelesaikan pembayaran).
 2. Hierarki informasi & tata letak: wireframe ASCII untuk desktop (1440) DAN ponsel (375); grid; area sticky.
 3. Komponen dari G2 yang dipakai (nama persis) + varian.
 4. State: memuat (skeleton), kosong, galat (dengan tindakan pemulihan), tanpa izin, offline, data banyak (ribuan baris).
 5. Mikro-interaksi & gerak (durasi/easing dari token), perilaku keyboard & fokus.
 6. TEKS BAHASA INDONESIA siap pakai: judul, label, placeholder, pesan galat/kosong/sukses, tooltip — nada hangat, ringkas, profesional.
 7. Aksesibilitas: urutan fokus, label ARIA, kontras, ukuran target ≥ 44 px di ponsel.
 8. Keamanan/privasi tampilan: data sensitif apa yang disamarkan/ditampilkan, kapan minta verifikasi ulang, perilaku layar saat idle.
 9. Dampak implementasi: tingkat usaha (S/M/L) dan risiko regresi.

KELUARAN ("### BERKAS: docs/tim/hasil-gpt/G3/<nama>"):
layar-login.md, layar-dashboard-admin.md, layar-asisten-ai.md, layar-pasien.md, layar-rekam-medis.md, layar-jadwal.md, layar-pembayaran.md, layar-biaya-stok.md,
layar-antrean-tv.md, layar-pengaturan-keamanan.md, pola-global.md, urutan-implementasi.md (prioritas berdasar dampak/biaya + ketergantungan antar-layar), serah-terima.md.

KRITERIA LULUS: semua bagian 1–9 ada di tiap layar; komponen yang disebut ada di G2; teks UI konsisten & tanpa klaim yang tak bisa dipenuhi produk.
Kirim 2 layar pertama (Login, Dashboard) untuk kuperiksa dahulu; setelah "lanjut", kerjakan sisanya.
```
