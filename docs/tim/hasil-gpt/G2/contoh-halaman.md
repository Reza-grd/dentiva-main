# Contoh Dashboard Admin
Status: wireframe usulan; gunakan agregat tanpa identitas pasien.

```text
Desktop 1440
+----------------+--------------------------------------------------+
| Dentiva        | Dashboard             [Periode] [Cari Ctrl+K] [N] |
| Navigasi 240   | Pendapatan lunas | Pengeluaran | Margin            |
|                | Bagan pendapatan                    | Catatan Denti|
|                | Ringkasan bahan / tindakan prioritas               |
+----------------+--------------------------------------------------+

Ponsel 375
+---------------------------------+
| Dashboard             [Cari] [N] |
| [Periode laporan]               |
| Pendapatan lunas                |
| Pengeluaran      Margin         |
| Bagan + tautan tabel            |
| Catatan Denti + usulan          |
| Navigasi bawah per peran        |
+---------------------------------+
```

Padding space.s6/s4, gap s4, kartu radius.lg. Komponen: Kartu KPI, Bagan Keuangan,
Avatar Denti, Kartu Usulan Agen, Date Picker, Command Palette, Pusat Notifikasi.
Judul “Kondisi klinik hari ini”; pendapatan “Pembayaran berstatus lunas”.
Galat kartu berdiri sendiri; jangan menjadikan seluruh halaman kosong bila satu
bagian gagal. Pending data memakai Skeleton, tanpa data memakai Empty State.
Setujui hanya muncul pada usulan pending yang dibuat admin itu; tidak ada aksi
pembayaran/pasien di dashboard admin. Seluruh fitur baru diberi label RENCANA
dalam tiket implementasi, bukan dipresentasikan seolah sudah tersedia.
