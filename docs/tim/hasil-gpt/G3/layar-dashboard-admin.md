# Dashboard Admin
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/dashboard/AdminDashboard.jsx; dashboard/AiBriefCard.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Admin melihat agregat bisnis; dokter/resepsionis memakai dashboard perannya sendiri.
- Memilih periode
- Menilai pendapatan lunas dan biaya
- Membaca prioritas Denti
- Membuka rincian agregat

USULAN: admin mengidentifikasi prioritas utama dalam ≤30 detik pada uji tugas; bandingkan baseline, jangan dipakai sebagai klaim pemasaran.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Judul dan periode → KPI → tren → prioritas operasional → ringkasan bahan. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Dashboard Admin                            [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | KPI / Tren pendapatan / Tabel alternatif               |
|                | Catatan Denti / Prioritas                              |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Dashboard                          |
| [Periode]                          |
| Pendapatan lunas                   |
| Pengeluaran | Margin               |
| Tren + lihat tabel                 |
| Prioritas Denti                    |
| [Buka Asisten AI]                  |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Kartu KPI](../G2/komponen/kartu-kpi.md), [Bagan Keuangan](../G2/komponen/bagan-keuangan.md), [Date Picker](../G2/komponen/date-picker.md), [Avatar Denti](../G2/komponen/avatar-denti.md), [Kartu](../G2/komponen/kartu.md), [Skeleton](../G2/komponen/skeleton.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Pertahankan kartu dengan tanda — dan penjelasan; nol hanya jika query berhasil dan nilainya nol.
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
Tampilkan rentang pembanding lengkap. Catatan Denti gagal tidak boleh menutupi laporan. Angka tabular, format Rupiah, definisi margin konsisten dengan laporan. Jangan menambahkan nama pasien pada drill-down admin.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Kondisi klinik hari ini |
| label | Periode laporan |
| placeholder | Pilih periode |
| galat | Ringkasan belum dapat dimuat. Coba lagi. |
| kosong | Belum ada transaksi untuk periode ini. |
| sukses | Ringkasan diperbarui. |
| tooltip | Pendapatan dari pembayaran berstatus lunas |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Agregat saja: nama/NIK/telepon/diagnosis pasien tidak masuk payload dashboard admin. Redesign tidak membuka izin tabel pasien.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha M (perkiraan relatif, Ketua menetapkan). Risiko: Kesamaan rumus agregat dan periode Asia/Jakarta.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
