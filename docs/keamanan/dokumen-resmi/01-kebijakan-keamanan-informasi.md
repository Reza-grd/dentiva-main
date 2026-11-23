# KEBIJAKAN KEAMANAN INFORMASI

**PT DENTIVA TEKNOLOGI NUSANTARA**
Nomor: [ISI]/KKI/DTN/XI/2026 · Versi 1.0 · Berlaku sejak: [TANGGAL PENGESAHAN]
Klasifikasi: Internal · Pemilik dokumen: Direktur Utama · Pelaksana: PIC Keamanan Informasi

---

## 1. Tujuan
Kebijakan ini menetapkan komitmen dan aturan pokok PT Dentiva Teknologi Nusantara ("Dentiva") untuk melindungi kerahasiaan, keutuhan, dan ketersediaan informasi yang dikelola layanan Dentiva — terutama rekam medis elektronik (RME) dan data pribadi pasien milik klinik pelanggan — sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, Permenkes No. 24 Tahun 2022 tentang Rekam Medis, ketentuan PSE Lingkup Privat, dan persyaratan keamanan SATUSEHAT Kementerian Kesehatan.

## 2. Ruang lingkup
1. Sistem: aplikasi klinik (app.dentiva.id), aplikasi desktop, Dentiva Console (console.dentiva.id), API & basis data (api.dentiva.id, server di Jakarta), fungsi edge, integrasi SATUSEHAT, Midtrans, WhatsApp, dan layanan AI.
2. Informasi: data pasien & RME, data klinik dan staf, data keuangan/langganan, kode sumber, kunci & rahasia, cadangan (backup), log.
3. Orang: direksi, karyawan, kontraktor, dan pihak ketiga yang mengakses sistem Dentiva.

## 3. Prinsip
1. **Kebutuhan minimum** — akses hanya sebatas tugas (least privilege) dan dipisahkan per klinik (`clinic_id`, RLS basis data).
2. **Data di Indonesia** — data pasien, RME, dan cadangannya disimpan di wilayah Indonesia.
3. **Aman sejak rancangan** — keamanan dipertimbangkan sejak desain, kode, uji, hingga operasi.
4. **Pertahanan berlapis** — enkripsi transport (TLS) dan cadangan (age), autentikasi kuat, pembatasan, pemantauan, dan log audit.
5. **Akuntabilitas** — setiap akses dan perubahan penting tercatat dan dapat ditelusuri.

## 4. Peran dan tanggung jawab
| Peran | Tanggung jawab |
|---|---|
| Direktur Utama | Mengesahkan kebijakan, menyediakan sumber daya, menerima risiko residual |
| PIC Keamanan Informasi | Menjalankan kebijakan, mengelola kerentanan & insiden, meninjau akses, melapor ke direksi |
| Pejabat Pelindungan Data Pribadi (DPO) | Mengawasi kepatuhan UU PDP, menangani permintaan subjek data, menjadi narahubung otoritas |
| Pengembang/operator | Mematuhi SOP pengembangan aman, perubahan, dan pemisahan lingkungan |
| Klinik pelanggan | Selaku pengendali RME: mengatur hak staf kliniknya dan menjaga kredensial |

## 5. Kebijakan turunan
Kebijakan ini dijabarkan dalam dokumen berikut, yang mengikat sebagai bagian dari kebijakan ini setelah disahkan:

| Area | Dokumen |
|---|---|
| Pelindungan data pribadi | 02-kebijakan-pelindungan-data-pribadi.md |
| Kontrol akses & peran | kebijakan/kontrol-akses.md |
| Kata sandi & MFA | kebijakan/kata-sandi-mfa.md |
| Kriptografi & pengelolaan rahasia | kebijakan/kriptografi-rahasia.md |
| Logging & pemantauan | kebijakan/logging-pemantauan.md |
| Manajemen kerentanan | kebijakan/kerentanan.md |
| Manajemen perubahan | kebijakan/manajemen-perubahan.md |
| Pengembangan aman | kebijakan/pengembangan-aman.md |
| Retensi & penghapusan | kebijakan/retensi-penghapusan.md |
| Vendor & subprosesor | kebijakan/vendor-subprosesor.md |
| Pemisahan lingkungan & data | 05-sop-pemisahan-lingkungan-data.md |
| Respons insiden | respons-insiden.md |
| Backup & pemulihan bencana | ../backup-dr.md, 06-laporan-uji-dr-2026-10-11.md |

(Draf kebijakan turunan berada di `docs/tim/hasil-gpt/G4/`; dipindahkan ke folder ini saat disahkan.)

## 6. Aturan pokok
1. **Akses** — akun bersifat pribadi; dilarang berbagi akun. Hak ditinjau minimal tiap kuartal dan dicabut paling lambat 1 hari kerja setelah peran berakhir.
2. **Autentikasi** — kata sandi diperiksa terhadap daftar bocor (HIBP); login dikunci bertingkat setelah percobaan gagal; MFA wajib untuk operator Console dan akses server.
3. **Rahasia** — kunci API, kunci service role, dan kata sandi tidak boleh ditulis di kode, chat, atau dokumen; disimpan di secret store server/CI dan dirotasi bila diduga bocor.
4. **Perubahan** — setiap perubahan kode melalui repositori Git dan CI (uji otomatis, audit dependensi, pemindaian rahasia) sebelum masuk produksi.
5. **Kerentanan** — temuan Kritis diperbaiki ≤ 7 hari, Tinggi ≤ 30 hari, Sedang ≤ 90 hari. Uji penetrasi independen minimal sekali setahun.
6. **Log** — log audit aplikasi dan log transaksi API SATUSEHAT disimpan minimal 1 tahun, tanpa memuat isi rekam medis, NIK, atau token.
7. **Cadangan** — backup harian terenkripsi; uji pemulihan berkala dan dicatat.
8. **Insiden** — insiden yang melibatkan data pribadi dilaporkan ke DPO segera; pemberitahuan tertulis ke subjek data dan lembaga paling lambat 3 × 24 jam sesuai Pasal 46 UU PDP.
9. **Pihak ketiga** — vendor yang memproses data wajib terikat perjanjian kerahasiaan/pemrosesan data dan dinilai keamanannya.
10. **Kesadaran** — setiap personel menandatangani NDA dan mengikuti pembekalan keamanan saat bergabung dan setiap tahun.

## 7. Pelanggaran
Pelanggaran kebijakan dapat dikenai sanksi sesuai peraturan perusahaan dan/atau perjanjian, tanpa mengurangi tanggung jawab hukum.

## 8. Peninjauan
Kebijakan ditinjau minimal sekali setahun, serta setelah insiden besar atau perubahan material pada sistem maupun peraturan.

## Riwayat versi
| Versi | Tanggal | Perubahan | Disetujui |
|---|---|---|---|
| 1.0 | [TANGGAL] | Penerbitan pertama | Direktur Utama |

---

Ditetapkan di Banda Aceh, [TANGGAL]

**PT DENTIVA TEKNOLOGI NUSANTARA**

&nbsp;

&nbsp;

[NAMA DIREKTUR UTAMA]
Direktur Utama
