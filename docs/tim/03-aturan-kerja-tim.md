# 03 · Aturan Kerja Tim (wajib untuk GPT & Antigravity)

## 1. Kepemilikan area (agar tidak bentrok)

| Area | Pemilik | GPT | Antigravity |
|---|---|---|---|
| `supabase/migrations/**`, `supabase/functions/**`, `supabase/tests/**` | **Ketua** | ✗ (hanya memberi rekomendasi tertulis) | ✗ (boleh mengusulkan lewat laporan; tidak mengubah) |
| `infra/vps/**`, server produksi, rahasia, `.env*`, secrets GitHub/Vercel | **Ketua** | ✗ | ✗ (boleh menulis *draf* skrip di `docs/tim/usulan-infra/`) |
| `.github/workflows/**` | **Ketua** | ✗ | usulan berkas baru di `docs/tim/usulan-ci/` — Ketua yang memasang |
| `apps/clinic/src/components/mascot/**` | Antigravity (A1) | menyerahkan SVG/spesifikasi (G1) | ✓ implementasi |
| `apps/clinic/src/styles/**`, `packages/ui/**` | Antigravity (A2) | menyerahkan token/spesifikasi (G2) | ✓ |
| `apps/clinic/src/components/**` (layar), `apps/console/**` | Antigravity (A3) | menyerahkan spesifikasi layar (G3) | ✓ |
| `apps/clinic/src/components/ai/**` (logika agen) | **Ketua** | ✗ | hanya gaya visual (CSS/kartu), bukan logika/layanan |
| `apps/desktop/**` | Antigravity (A6) | ✗ | ✓ (tanpa rahasia penandatanganan) |
| `docs/tim/hasil-gpt/**` | GPT (via pengguna) | ✓ | baca saja |
| `docs/**` lain | Ketua | boleh mengusulkan | boleh mengusulkan |

**Dilarang untuk semua anggota:** menyentuh produksi, `git push` ke `main`/`console`, mengubah/menampilkan rahasia, menonaktifkan RLS/CSP/pemeriksaan peran,
menambah ketergantungan baru tanpa mencantumkan alasan & lisensinya, mengirim data pasien nyata ke layanan mana pun.

## 2. Cabang & commit

- GPT tidak ber-commit (pengguna menyimpan hasilnya). Antigravity memakai cabang `antigravity/<kode>-<topik>` (mis. `antigravity/A1-denti-hd`), **satu cabang per paket tugas**, dibuat dari `console` terbaru.
- Pesan commit Bahasa Indonesia, gaya `feat(ui): …`, `fix(mascot): …`, `test(e2e): …`, `chore(ci): …`. Satu tujuan per commit.
- Jangan *force-push*, jangan menggabungkan cabang sendiri. Ketua yang meninjau dan menggabungkan.

## 3. Gerbang mutu (Definition of Done)

Sebuah paket tugas selesai hanya bila **semua** berikut benar dan dibuktikan di Laporan Serah Terima:

1. `npm run lint` dan `npm run typecheck` bersih; `npm test` (clinic, shared, console) hijau; `npm run build:clinic` berhasil.
2. Tes baru untuk perilaku baru (unit/komponen/E2E sesuai paket). Tidak menurunkan cakupan; tidak menghapus tes tanpa alasan tertulis.
3. **Bukti visual** untuk perubahan tampilan: tangkapan layar terang & gelap, desktop & ponsel (375 px), DPR 1× dan 2×; untuk gerak: rekaman singkat/GIF atau deskripsi frame.
4. **Aksesibilitas:** pemeriksaan axe tanpa pelanggaran kritis; navigasi keyboard; fokus terlihat; `prefers-reduced-motion` dihormati.
5. **Keamanan:** tidak ada rahasia di diff; tidak ada `dangerouslySetInnerHTML` baru tanpa DOMPurify; tidak ada `eval`/`new Function`; CSP tetap berlaku
   (tanpa `unsafe-inline` skrip baru); tidak ada panggilan jaringan baru ke domain di luar daftar CSP tanpa persetujuan Ketua.
6. **Performa:** tidak menambah bundel awal > 20 KB gzip tanpa persetujuan; animasi memakai `transform`/`opacity`; tidak ada layout thrash.
7. Dokumentasi singkat diperbarui bila perilaku/struktur berubah.

## 4. Laporan Serah Terima (templat — salin ke `docs/tim/serah-terima/<kode>.md`)

```markdown
# Serah Terima <kode> — <judul>
- Pembuat: GPT | Antigravity · Tanggal: YYYY-MM-DD · Cabang/berkas: …
## Ringkasan (≤ 5 kalimat)
## Yang berubah / diserahkan (daftar berkas)
## Cara memverifikasi (perintah + langkah klik)
## Bukti (tangkapan layar / hasil tes / tautan berkas)
## Keputusan desain & alasan
## Risiko, batasan, dan hal yang belum selesai
## Pertanyaan untuk Ketua
## Daftar centang gerbang mutu (1–7) — centang yang terpenuhi + catatan
```

## 5. Cara menyerahkan hasil

- **GPT:** simpan keluaran ke `docs/tim/hasil-gpt/<kode>/` (nama berkas persis seperti diminta), lampirkan Laporan Serah Terima, kabari Ketua.
- **Antigravity:** commit ke cabang `antigravity/<kode>-…`, `git push origin <cabang>`, simpan laporan, kabari Ketua. Ketua menjalankan tinjauan: diff keamanan, tes penuh, uji visual, lalu menggabungkan & men-deploy.

## 6. Etika & kualitas kerja

- **Jujur tentang ketidakpastian:** tandai asumsi; jangan mengarang fakta hukum, angka, atau klaim sertifikasi (mis. "kami berstandar ISO 27001" hanya boleh bila benar).
  Dokumen hukum/kepatuhan selalu diberi label **"DRAF — perlu ditinjau advokat/DPO"**.
- **Jangan menambah fitur di luar paket**; temuan di luar lingkup dicatat di bagian "Temuan lain" laporan.
- **Konflik/ketidaksesuaian dengan dokumen ini:** hentikan, tanyakan Ketua; jangan menebak.
- **Rahasia:** bila Anda menemukan kunci/token di berkas atau keluaran, jangan salin; laporkan lokasinya saja.

## 7. Eskalasi

Segera hentikan kerja dan beri tahu Ketua bila: menemukan kerentanan serius, data pasien nyata di berkas uji, perubahan yang memerlukan migrasi/izin/produksi,
atau bila tugas mensyaratkan pelanggaran aturan di atas.
