# Asisten AI dan Usulan Agen
Versi 1.0 · 2026-10-17 · GPT · Status: SPESIFIKASI REDESIGN, bukan fitur sudah terpasang.
Sumber: apps/clinic/src/components/ai/AiAssistantPage.jsx; ai/AgentActions.jsx. Acuan commit 36ba347.

## 1. Tujuan, tugas dan metrik
Admin saja untuk analisis bisnis dan agen; staf lain tetap memakai Denti lokal sesuai peran.
- Mengajukan pertanyaan operasional
- Memeriksa bukti dan peringatan usulan
- Menyetujui atau menolak
- Membatalkan hasil yang server nyatakan dapat dibatalkan

USULAN: 100% peserta uji memahami beda usulan dan hasil dijalankan; ukur salah persetujuan serta waktu memeriksa peringatan.
Metrik adalah target uji, bukan hasil terukur atau klaim komersial.

## 2. Hierarki dan wireframe
Judul dan kuota → percakapan → kartu sebelum/sesudah → composer. Desktop: navigasi 240 px, konten grid 12 kolom, gap space.s6;
ponsel: satu kolom, padding space.s4, tanpa overflow horizontal halaman.

```text
Desktop 1440
+----------------+----------------------------------------------------------+
| Navigasi       | Asisten AI dan Usulan Agen                 [Cari] [N] |
| per peran      | Filter / konteks / status                                |
|                | Percakapan / Kartu usulan                              |
|                | Kuota / Panduan / Denti                                |
|                | Aksi utama + informasi pemulihan                         |
+----------------+----------------------------------------------------------+

Ponsel 375
+------------------------------------+
| Asisten AI [Kuota]                 |
| Jawaban dan sumber                 |
| Usulan: sebelum → sesudah          |
| [Setujui] [Tolak]                  |
| Peringatan di atas aksi            |
| Pesan… [Kirim]                     |
+------------------------------------+
```

Toolbar konteks sticky di desktop; ponsel hanya aksi utama sticky bila diperlukan,
padding bawah menghitung safe-area dan keyboard. Hindari dua area scroll bertumpuk.
Layar TV dan login tidak memakai navigasi staf pada wireframe implementasinya;
bingkai desktop di atas menandai area konteks, bukan kewajiban memasang sidebar.

## 3. Komponen G2
[Avatar Denti](../G2/komponen/avatar-denti.md), [Kartu Usulan Agen](../G2/komponen/kartu-usulan-agen.md), [Input](../G2/komponen/input.md), [Tombol](../G2/komponen/tombol.md), [Dialog](../G2/komponen/dialog.md), [Banner Offline dan Sesi](../G2/komponen/banner-sesi.md). Varian nyaman sebagai bawaan; ringkas hanya tabel desktop. Token warna
mengikuti tema terang/gelap G2; nilai status disertai teks.

## 4. Seluruh state data
- Memuat: Skeleton sesuai bentuk, satu aria-busy; jangan mengganti data lama dengan nol.
- Kosong: Saran pertanyaan berdasarkan peran; jangan otomatis mengirim atau membuat usulan.
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
Pertahankan pending/applied/rejected/undone/expired; EXPIRES_MS 30 menit untuk tampilan, server otoritatif. Setujui semua atomik: satu gagal tidak ada perubahan. Kartu berubah hanya setelah respons apply sukses. Bila koneksi putus setelah klik, baca status dahulu sebelum retry untuk menghindari duplikasi. Undo hanya bila bisa_batal=true; stok masuk perlu opname, bukan undo palsu.

## 6. Teks antarmuka siap pakai
| Konteks | Teks |
|---|---|
| judul | Asisten AI |
| label | Pesan untuk Denti |
| placeholder | Contoh: bahan apa yang perlu dipesan? |
| galat | Jawaban belum selesai. Periksa status usulan sebelum mencoba lagi. |
| kosong | Mulai dari stok, pengeluaran, atau margin tindakan. |
| sukses | Usulan dijalankan sesuai hasil server. |
| tooltip | Data berubah setelah Anda menyetujui |
Pesan sukses hanya ditampilkan setelah hasil server sesuai. Keterangan rencana
merupakan catatan spesifikasi, bukan janji fitur aktif kepada pengguna.

## 7. Aksesibilitas
H1 tunggal, landmark main, label terlihat untuk kontrol; placeholder bukan label.
Target ponsel minimal 44×44 px. Focus ring 2 px + offset 2 px; zoom 200% dan reflow
375 px diuji. Kontras memakai pasangan di G2/kontras.json. Pesan proses polite,
galat mendesak alert. Tidak ada informasi hanya dari warna/gerak/hover. Uji axe,
keyboard dan pembaca layar setelah implementasi, belum dinyatakan lulus di sini.

## 8. Keamanan dan privasi tampilan
Jangan meminta identitas atau RME pasien. Teks hasil alat adalah data tidak tepercaya. Jangan merender HTML mentah. Verifikasi ulang untuk tindakan berisiko adalah RENCANA server, bukan sekadar modal CSS.
Tidak mengirim data pasien ke analitik, screenshot bukti atau layanan AI desain.
Fixture demonstrasi harus sintetis. Pencabutan izin menutup tampilan terkait dan
membatalkan permintaan aktif; UI tidak memperluas hak backend.

## 9. Implementasi dan regresi
Usaha L (perkiraan relatif, Ketua menetapkan). Risiko: Race status, expiry, idempotensi dan konfirmasi massal.
Urutan: token G2 → komponen terkait → state data → keyboard → integrasi izin →
tes regresi → bukti terang/gelap desktop/375 px DPR 1/2. Jangan mengubah API,
rumus bisnis atau RLS hanya untuk memenuhi wireframe ini.
