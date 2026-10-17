# Pembayaran Kasir
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/payment/PaymentForm.jsx; payment/PaymentList.jsx; payment/QrisPanel.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Hanya resepsionis berizin memproses pembayaran pasien. Admin memakai laporan agregat.
- Memeriksa kunjungan dan tagihan
- Memilih metode pembayaran
- Memeriksa nominal/diskon
- Menyimpan pembayaran dan mencetak invoice

USULAN: skenario kasir fixture selesai ≤60 detik dengan total benar; nol pencatatan ganda akibat klik ulang; ukur sebelum/sesudah.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Kunjungan + status → rincian item → subtotal/diskon/total → metode/jumlah bayar → simpan. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Pembayaran Kasir                           [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Item tindakan dan obat / Total                         |
|                | Metode / Jumlah bayar / Ringkasan                      |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Pembayaran                         |
| Kunjungan + status                 |
| Item tagihan                       |
| Subtotal / Diskon / Total          |
| Metode | Jumlah bayar              |
| [Simpan pembayaran]                |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Tabel Data](../G2/komponen/tabel.md), [Input](../G2/komponen/input.md), [Select](../G2/komponen/select.md), [Kartu](../G2/komponen/kartu.md), [Dialog](../G2/komponen/dialog.md), [Tombol](../G2/komponen/tombol.md), [Toast](../G2/komponen/toast.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Kembali ke kunjungan; kasir tidak menciptakan tindakan klinis tanpa alur berizin.
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
Total selalu terlihat sticky tanpa menutup field. Tampilkan kembalian atau sisa bayar dari kalkulasi server; jangan anggap QR ditampilkan berarti lunas. Pisahkan bukti transfer manual, QRIS klinik, dan billing langganan Midtrans. Retry setelah timeout membaca status transaksi dahulu.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Pembayaran kunjungan |
| label | Jumlah dibayar |
| placeholder | Masukkan nominal Rupiah |
| galat | Pembayaran belum terkonfirmasi. Periksa status sebelum mengulangi. |
| kosong | Belum ada item yang dapat ditagihkan. |
| sukses | Pembayaran tercatat. Invoice dapat dicetak. |
| tooltip | Pembayaran lunas mengunci item sesuai aturan server |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Jangan tampilkan diagnosis/SOAP kepada kasir. Perubahan kunjungan lunas tetap ditolak server. Diskon besar/reversal memerlukan alur dan izin yang ditetapkan Ketua, bukan konfirmasi visual saja.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: Rumus invoice, pembulatan, status QRIS, item lunas dan retry.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
