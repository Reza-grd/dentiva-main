# Menyetujui, menolak, dan membatalkan usulan Denti

**Untuk siapa:** admin.

Usulan belum mengubah data bisnis. Hanya admin pembuat yang berwenang dapat menjalankannya; server memeriksa kembali kondisi data saat persetujuan.

## Langkah

1. Buka **Asisten AI** dan minta pekerjaan operasional yang jelas. Tunggu kartu **Usulan tindakan Denti**; kalimat “sudah dicatat” tanpa kartu/hasil bukan bukti data berubah. [^langkah-1]
2. Baca judul, rincian, risiko, dan seluruh peringatan pada kartu. Cocokkan bahan, nominal, satuan, tanggal, serta nota. Jika ada yang keliru, pilih **Tolak**, tunggu status **Ditolak**, lalu minta usulan yang diperbaiki. [^langkah-2]
3. Jika benar, pilih **Setujui** sekali dan tunggu status **Dijalankan**. Bila ada beberapa kartu, periksa semuanya sebelum memilih **Setujui semua**; persetujuan massal satu paket, sehingga satu kegagalan membatalkan seluruh paket tersebut. [^langkah-3]
4. Gunakan **Lihat di Pengeluaran**, **Lihat di Master Treatment**, atau **Lihat di Biaya & Modal**, sesuai jenis kartu, untuk memeriksa hasil tercatat. [^langkah-4]
5. Untuk hasil yang masih dapat dibatalkan, pilih **Batalkan** pada kartu Dijalankan dan tunggu **Dibatalkan**. Tombol ini hanya muncul jika server menyatakan tindakan mendukung pembatalan; periksa hasil akhirnya melalui menu terkait. [^langkah-5]
6. Jika kartu **Kedaluwarsa**, minta usulan baru setelah membaca data terbaru. Jika persetujuan/pembatalan gagal atau koneksi terputus, baca pesan galat dan periksa hasil di menu terkait sebelum mengirim permintaan lagi. [^langkah-6]

## Catatan keamanan

- Tolak menghentikan usulan yang belum dijalankan; Batalkan mencoba memulihkan hasil tindakan yang sudah dijalankan dan didukung server. Keduanya berbeda.
- Stok masuk tidak dapat dibatalkan otomatis. Tinjau Kartu Stok dan gunakan opname beralasan untuk koreksi, bukan membuat transaksi kebalikan sembarang.
- Usulan berlaku 30 menit menurut aturan agen; perubahan data atau izin dapat membuat usulan ditolak lebih awal. Jangan memakai akun orang lain untuk menyetujui.

## Artikel terkait

- [Menggunakan Denti dan memahami batasnya](menggunakan-denti.md)
- [Memeriksa kartu stok dan mencatat opname](opname-dan-kartu-stok.md)
- [Mencatat pengeluaran dan memeriksa nota](mencatat-pengeluaran.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:34`; `apps/clinic/src/components/ai/AgentActions.jsx:65`.
[^langkah-2]: `apps/clinic/src/components/ai/AgentActions.jsx:84`; `apps/clinic/src/components/ai/AgentActions.jsx:87`; `apps/clinic/src/components/ai/AgentActions.jsx:97`; `apps/clinic/src/components/ai/AgentActions.jsx:80`.
[^langkah-3]: `apps/clinic/src/components/ai/AgentActions.jsx:94`; `apps/clinic/src/components/ai/AgentActions.jsx:79`; `apps/clinic/src/components/ai/AgentActions.jsx:120`; `apps/clinic/src/components/ai/AgentActions.jsx:125`.
[^langkah-4]: `apps/clinic/src/components/ai/AgentActions.jsx:104`; `apps/clinic/src/components/ai/AgentActions.jsx:21`; `apps/clinic/src/components/ai/AgentActions.jsx:22`; `apps/clinic/src/components/ai/AgentActions.jsx:23`.
[^langkah-5]: `apps/clinic/src/components/ai/AgentActions.jsx:105`; `apps/clinic/src/components/ai/AgentActions.jsx:106`; `apps/clinic/src/components/ai/AgentActions.jsx:81`.
[^langkah-6]: `apps/clinic/src/components/ai/AgentActions.jsx:82`; `apps/clinic/src/components/ai/AgentActions.jsx:112`; `apps/clinic/src/components/ai/AgentActions.jsx:90`.
