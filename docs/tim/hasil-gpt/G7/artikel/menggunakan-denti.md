# Menggunakan Denti dan memahami batasnya

**Untuk siapa:** admin, dokter, resepsionis/kasir.

Denti Pemandu membantu navigasi dan penjelasan untuk semua peran. Asisten AI dan Denti Agen untuk data operasional tersedia bagi admin sesuai akses dan paket yang aktif.

## Langkah

1. Untuk panduan aplikasi, pilih **Buka Denti, pemandu Dentiva**, lalu ketik pertanyaan seperti “buka jadwal” atau “apa itu HPP?”. Pilih tombol **Kirim**. [^langkah-1]
2. Sebagai admin, buka **Asisten AI** untuk pertanyaan bisnis atau usulan tindakan. Jika layar persetujuan penggunaan tampil, baca informasi pemrosesan data dan aktifkan hanya bila Anda berwenang serta setuju. [^langkah-2]
3. Periksa pemakaian kuota, lalu tulis pertanyaan operasional yang jelas dan pilih **Kirim**. Contoh sintetis: “Bahan apa yang perlu dipesan ulang?”. Enter mengirim; Shift+Enter membuat baris baru. [^langkah-3]
4. Jika memindai nota dari Asisten AI, pilih ikon **Pindai nota agar Denti mencatatnya** dan unggah foto nota pembelian yang sesuai. Periksa hasil serta kartu usulan; foto terbaca belum berarti pengeluaran atau stok sudah dicatat. [^langkah-4]
5. Tinjau jawaban dan kartu usulan. Agen dapat membantu bahan, stok, pengeluaran, overhead, resep bahan, dan tarif; untuk pembayaran pasien, rekam medis, data pasien, pengguna, atau pengaturan, gunakan menu resmi dengan akun berwenang. [^langkah-5]

## Catatan keamanan

- Jangan mengetik identitas, nomor kontak, atau rekam medis pasien ke chat, termasuk pada nama file dan foto nota. Teks yang Anda masukkan sendiri tetap dapat memuat informasi sensitif.
- Jawaban AI dapat keliru. Cocokkan nominal, satuan, dan sumber transaksi sebelum menyetujui; jawaban percakapan bukan bukti pencatatan.
- Jika kuota habis atau AI sibuk, gunakan menu operasional yang tersedia; jangan mengirim permintaan berulang tanpa memeriksa hasil sebelumnya.

## Catatan penggunaan

Batas kemampuan tindakan mengacu pula pada docs/denti-agen.md bagian Kemampuan; bukan daftar fitur baru G3. Denti Pemandu memakai panduan lokal dan tidak memberikan akses agen kepada dokter/resepsionis.

## Artikel terkait

- [Menyetujui, menolak, dan membatalkan usulan Denti](usulan-denti.md)
- [Mencatat pengeluaran dan memeriksa nota](mencatat-pengeluaran.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/ai/DentiGuideWidget.jsx:210`; `apps/clinic/src/components/ai/DentiGuideWidget.jsx:203`; `apps/clinic/src/components/ai/DentiGuideWidget.jsx:205`.
[^langkah-2]: `apps/clinic/src/components/common/Sidebar.jsx:34`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:551`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:553`.
[^langkah-3]: `apps/clinic/src/components/ai/AiAssistantPage.jsx:482`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:717`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:732`.
[^langkah-4]: `apps/clinic/src/components/ai/AiAssistantPage.jsx:722`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:321`; `apps/clinic/src/components/ai/AgentActions.jsx:66`.
[^langkah-5]: `apps/clinic/src/components/ai/AgentActions.jsx:65`; `apps/clinic/src/components/ai/AiAssistantPage.jsx:740`; `apps/clinic/src/components/ai/DentiGuideWidget.jsx:19`.
