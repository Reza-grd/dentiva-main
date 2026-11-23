# SOP PEMISAHAN LINGKUNGAN DAN DATA
**PT DENTIVA TEKNOLOGI NUSANTARA**
Nomor: SOP-[ISI]/DTN/XI/2026 · Versi 1.0 · Berlaku: [TANGGAL] · Pemilik: PIC Keamanan Informasi

---

## 1. Tujuan
Mencegah data pasien asli dipakai di luar produksi, mencegah uji atau pengembangan mengubah data produksi, dan memisahkan kredensial setiap lingkungan.

## 2. Lingkungan
| Lingkungan | Fungsi | Data | Alamat / sumber |
|---|---|---|---|
| **Produksi** | Layanan untuk klinik pelanggan | Data asli | app.dentiva.id, console.dentiva.id, api.dentiva.id (server Jakarta) — dideploy dari cabang `main` |
| **Pratinjau / staging** | Uji fitur sebelum rilis | **Data fiktif saja** | Vercel Preview (`dentiva-main-*-preview.vercel.app`) dan basis data uji / gladi |
| **Pengembangan lokal** | Pengembangan & uji otomatis | Data fiktif / seed | localhost, PGlite (`npm run db:smoke`), mock |
| **Sandbox pihak ketiga** | Uji integrasi | Data uji penyedia | SATUSEHAT staging (`api-satusehat-stg.dto.kemkes.go.id`), Midtrans Sandbox |

## 3. Aturan
1. **Tidak ada data pasien asli di luar produksi.** Pengembangan, demo, video, pelatihan, dan uji memakai data fiktif. Bila salinan diperlukan untuk analisis masalah, data harus dianonimkan terlebih dahulu dan disetujui DPO.
2. **Kredensial berbeda per lingkungan.** Kunci service role, kunci Midtrans, client SATUSEHAT, dan token WhatsApp produksi hanya disimpan di secret store server produksi. Kredensial produksi tidak dipakai di lokal maupun pratinjau.
3. **Pengaman produksi SATUSEHAT.** Pengiriman ke SATUSEHAT produksi terkunci di kode sampai uji sandbox lulus dan secret `SATUSEHAT_PRODUCTION_APPROVED=true` disetel oleh PIC Keamanan (`_shared/satusehatConfig.ts`).
4. **Jalur rilis.** Perubahan masuk melalui cabang kerja → CI (uji, lint, audit dependensi, pemindaian rahasia) → digabung ke `main` → deploy produksi. Tidak ada penyuntingan langsung di server produksi, kecuali tindakan darurat yang dicatat.
5. **Migrasi basis data** diuji di PGlite/basis data uji sebelum diterapkan ke produksi dengan `infra/vps/terapkan-migrasi.sh`. Backup terbaru harus ada sebelum migrasi.
6. **Uji keamanan aktif** (pentest, fuzzing, brute force) hanya terhadap lingkungan uji, kecuali dengan izin tertulis Direktur Utama dan jadwal yang disepakati.
7. **Akses server produksi** hanya melalui SSH dengan kunci pribadi milik personel berwenang, dan tercatat.
8. **Cadangan** produksi terenkripsi (age). Pemulihan untuk uji dilakukan ke basis data atau VPS uji, bukan ke produksi. Hasil uji dihapus setelah selesai.
9. **CORS dan origin** di gateway API dibatasi pada domain Dentiva dan pratinjau resmi (`infra/vps/batasi-cors.sh`).

## 4. Pemeriksaan
| Kegiatan | Frekuensi | Penanggung jawab | Bukti |
|---|---|---|---|
| Pemindaian rahasia di repositori (gitleaks) | Setiap push (CI) | Otomatis | Log CI |
| Tinjauan daftar secret per lingkungan | Per kuartal | PIC Keamanan | Catatan tinjauan |
| Pemeriksaan tidak ada data asli di seed/fixture/media | Per rilis besar | Pengembang | Checklist rilis |
| Uji pemulihan ke lingkungan uji | Bulanan → per kuartal | PIC Keamanan | `backup-dr.md` §4 |

## 5. Pelanggaran
Penggunaan data asli di luar produksi atau kredensial produksi di lingkungan lain diperlakukan sebagai insiden keamanan. Ikuti prosedur respons insiden: hapus salinan, rotasi kredensial, lalu catat.

---

| Disusun | Disetujui |
|---|---|
| &nbsp;<br>&nbsp;<br>[NAMA]<br>PIC Keamanan Informasi | &nbsp;<br>&nbsp;<br>[NAMA]<br>Direktur Utama |
