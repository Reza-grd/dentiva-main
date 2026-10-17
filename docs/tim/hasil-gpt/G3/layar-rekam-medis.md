# Rekam Medis Dokter
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/medical-record/MedicalRecordForm.jsx; medical-record/odontogram/Odontogram.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Dokter yang berizin menangani tindakan klinis. Admin dan resepsionis tidak diberi isi klinis.
- Memastikan identitas pasien/kunjungan
- Mengisi SOAP dan odontogram
- Memeriksa resep/consent
- Menyelesaikan dan mengunci kunjungan

USULAN: uji dokter menyelesaikan SOAP tanpa kehilangan input; nol edit tersimpan pada kunjungan terkunci; semua gigi dapat diakses keyboard.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Identitas minimum + status kunci → alergi → SOAP/odontogram → resep/consent → simpan/selesai. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Rekam Medis Dokter                         [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | SOAP / Odontogram / Diagnosis                          |
|                | Riwayat berizin / Consent / Status kunci               |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Rekam medis [Terkunci?]            |
| Identitas + alergi                 |
| [SOAP] [Odontogram]                |
| S / O / A / P                      |
| Resep dan consent                  |
| [Simpan] [Selesaikan]              |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Tab](../G2/komponen/tab.md), [Input](../G2/komponen/input.md), [Dialog](../G2/komponen/dialog.md), [Tombol](../G2/komponen/tombol.md), [Badge](../G2/komponen/badge.md), [Banner Offline dan Sesi](../G2/komponen/banner-sesi.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Tidak menyalin isi kunjungan lama otomatis; template memerlukan peninjauan dokter.
- Galat: pesan di bagian terkait, tombol Coba lagi; input/pilihan tetap bila aman.
- Tanpa izin: “Akses halaman ini tidak tersedia untuk peran Anda.” Tidak memuat data dulu;
  kembali ke halaman peran. Server/RLS tetap otoritatif.
- Offline: Banner Offline dan Sesi, hentikan mutasi; bila status submit tidak pasti,
  baca ulang hasil sebelum mengulangi. Tidak menyimpan data medis ke penyimpanan umum.
- Data banyak: pagination server dan filter; jangan mengambil ribuan record sekaligus.
  Form/login/TV tidak memerlukan pagination; batasi daftar notifikasi/riwayat terkait.

## 5. Interaksi, keyboard dan fokus
motion.fast/normal dari G2 untuk respons/peralihan, motion.reduced=0 saat reduced
motion. Urutan fokus mengikuti hierarki DOM, aksi utama sesudah data yang diperiksa.
Dialog mengembalikan fokus ke pemicu; submit gagal fokus ringkasan galat; pemuatan
latar tidak merebut fokus. Tooltip muncul saat fokus dan dapat ditutup Escape.
Sumber frontend MedicalRecordForm:46 masih mencantumkan admin pada canAccess, sedangkan kebijakan proyek/DB melarang isi klinis untuk admin. Ini ketidaksesuaian affordance yang perlu diselaraskan Antigravity/Ketua; jangan memperluas izin database. Navigasi odontogram harus punya daftar gigi alternatif keyboard; mikrofon/dikte meminta izin perangkat jelas.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Rekam medis |
| label | Keluhan utama |
| placeholder | Tuliskan keluhan sesuai pemeriksaan |
| galat | Catatan belum tersimpan. Periksa koneksi sebelum meninggalkan halaman. |
| kosong | Belum ada catatan pada kunjungan ini. |
| sukses | Catatan tersimpan. |
| tooltip | Kunjungan selesai mengikuti aturan penguncian server |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Auto-lock dan reautentikasi sebelum membuka data klinis adalah RENCANA; tidak menghapus draft server. Hindari localStorage data medis; pulihkan draft hanya dengan sesi/izin sah. Setelah kunjungan terkunci, edit mengikuti mekanisme koreksi resmi, bukan membuka paksa.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: Penguncian/lunas, draft, enkripsi, odontogram, consent.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
