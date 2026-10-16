# GPT · G4 — Paket dokumen keamanan & kepatuhan

**Lampirkan:** `00`, `03`, `bundel/GPT-keamanan.md` (ringkasan skema & kebijakan RLS, daftar migrasi, header keamanan Vercel, README infra, hasil audit sebelumnya).  **Simpan ke:** `docs/tim/hasil-gpt/G4/`.

```
PAKET G4 — KEAMANAN & KEPATUHAN KELAS ENTERPRISE (DRAF)

KONTEKS
Dentiva menyimpan data kesehatan (data pribadi spesifik) pasien klinik gigi di Indonesia. Server: satu VPS Biznet (Jakarta/Indonesia) menjalankan Supabase self-host (Postgres 17 + RLS),
gateway Envoy/Caddy, edge functions, sidecar WhatsApp; frontend di Vercel; AI via Gemini/Claude (hanya data agregat, tanpa identitas pasien); pembayaran langganan Midtrans; SATUSEHAT (Kemenkes).
Keadaan nyata ada di 00 §3–4 dan bundel — JANGAN mengklaim kontrol yang tidak tercantum di sana; kontrol yang belum ada ditulis sebagai "rencana".
SEMUA DOKUMEN berlabel "DRAF — perlu ditinjau advokat/DPO/auditor". DILARANG mengklaim sertifikasi (ISO 27001, SOC 2, dll.) yang belum dimiliki.

TUGASMU (urut)
1) model-ancaman.md — STRIDE per komponen (klien web/desktop, gateway, Auth, PostgREST/RPC, Postgres, Storage, edge functions, sidecar WA, CI/CD, AI), diagram aliran data (teks/mermaid),
   peta risiko (kemungkinan × dampak), kolom: mitigasi yang SUDAH ada (sebut fiturnya) · celah · rekomendasi.
2) kepatuhan-uu-pdp.md — pemetaan UU 27/2022 (dasar pemrosesan, persetujuan, hak subjek data & cara memenuhinya di produk, DPO, DPIA, pemberitahuan insiden 3×24 jam, transfer data, retensi);
   kepatuhan-rme-satusehat.md — Permenkes 24/2022 (RME: keamanan, kerahasiaan, retensi, akses) & SATUSEHAT; tiap butir: status (Ada/Sebagian/Belum) + bukti/rencana.
3) iso27001-pemetaan.md — Annex A (93 kontrol, ringkas per tema) & ISO 27799: status + bukti + tindakan.
4) kebijakan/*.md — kontrol akses & peran; kriptografi & manajemen kunci/rahasia; kata sandi & MFA; manajemen perubahan; pengembangan aman; logging & pemantauan; manajemen kerentanan; retensi & penghapusan data;
   pengelolaan vendor/subprosesor (Supabase self-host, Biznet, Vercel, Google/Anthropic, Whapi, Midtrans, Sentry). Tiap kebijakan: tujuan, ruang lingkup, aturan, peran, pengecualian, tinjau tahunan.
5) respons-insiden.md — peran, tingkat keparahan, alur (deteksi→pembatasan→pemberantasan→pemulihan→pasca-insiden), templat komunikasi ke klinik/pasien/Komdigi, daftar periksa 72 jam.
6) dr-backup.md — target RPO/RTO yang REALISTIS untuk VPS tunggal saat ini dan target setelah peningkatan (offsite backup terenkripsi, uji pemulihan berkala, replika), prosedur pemulihan langkah demi langkah (kerangka; detail teknis diisi Ketua).
7) rencana-pentest.md — ruang lingkup, aturan keterlibatan, daftar uji (OWASP ASVS 4/API Security Top 10/uji isolasi multi-tenant/uji RLS/uji agen AI & prompt injection), kriteria laporan, perbaikan & uji ulang.
8) whitepaper-keamanan.md (untuk calon klien premium; jujur, dapat diaudit, bahasa non-teknis + lampiran teknis) & kuesioner-vendor.md (jawaban gaya SIG-Lite; hanya fakta).
9) hukum/syarat-layanan.md, hukum/kebijakan-privasi.md, hukum/dpa.md, hukum/sla.md — DRAF dengan penanda [ISI/TINJAU] di bagian yang butuh keputusan bisnis/hukum.
10) peta-jalan-90-hari.md — daftar kekurangan prioritas (MFA, backup offsite, uji pemulihan, WAF/rate limit, SBOM/CodeQL/gitleaks, pemantauan & peringatan, SMTP, penandatanganan desktop, pentest)
    dengan perkiraan usaha (S/M/L), ketergantungan, dan bukti keberhasilan. Ketua yang menetapkan prioritas akhir.

KELUARAN: berkas-berkas di atas ("### BERKAS: docs/tim/hasil-gpt/G4/<nama>") + serah-terima.md.
KRITERIA LULUS: tiap klaim keamanan merujuk fitur nyata di lampiran atau berlabel "rencana"; nol klaim sertifikasi palsu; tiap dokumen punya pemilik, versi, tanggal, periode tinjau; hukum berlabel DRAF.
Kerjakan berurutan; setelah tiap 2 butir tunggu "lanjut".
```
