# Menyiapkan layar antrean TV

**Untuk siapa:** admin, resepsionis/kasir.

Gunakan tautan khusus untuk TV. TV tidak memerlukan login staf dan menerima informasi antrean terbatas.

## Langkah

1. Buka **Layar Antrean** pada akun admin atau resepsionis. [^langkah-1]
2. Isi nama layar, misalnya “TV Ruang Tunggu”, lalu **Buat tautan**. Tunggu tautan baru tampil. [^langkah-2]
3. Pilih **Salin tautan**, lalu buka alamat tersebut di browser TV dan simpan sebagai bookmark. Tautan lengkap hanya ditampilkan sekali; jika salin otomatis gagal, salin manual dari kotak tautan. [^langkah-3]
4. Periksa layar TV: gunakan nomor antrean, inisial, dan nama dokter untuk membantu panggilan. Jika layar tidak memperbarui data, periksa koneksi dan konfirmasikan antrean kepada resepsionis. [^langkah-4]
5. Bila TV diganti atau tautan tersebar, buka **Tautan yang pernah dibuat → Cabut** pada tautan terkait. Konfirmasi pencabutan dan buat tautan baru bila diperlukan. [^langkah-5]

## Catatan keamanan

- Siapa pun yang memegang tautan dapat melihat layar antrean. Jangan memasukkannya ke grup publik, laporan, atau tangkapan layar.
- Jangan membuka dashboard staf di TV. Nomor antrean dan inisial tetap perlu ditampilkan secara terbatas untuk keperluan pelayanan.

## Artikel terkait

- [Melihat antrean dan memperbarui status layanan](layanan-dokter.md)
- [Menjaga privasi pasien dan meminta bantuan pemulihan](privasi-dan-backup.md)
- [FAQ dan pemecahan masalah sehari-hari](faq-pemecahan-masalah.md)

## Rujukan langkah untuk peninjau

Acuan kode: `df7f178c3ac8a9711f9a290e029fcfc5c14c9008`. Nomor baris merujuk snapshot ini. Catatan kaki adalah bukti editorial, bukan instruksi membuka berkas kode bagi staf.

[^langkah-1]: `apps/clinic/src/components/common/Sidebar.jsx:30`; `apps/clinic/src/components/queue/QueueDisplayPage.jsx:20`.
[^langkah-2]: `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:94`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:85`.
[^langkah-3]: `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:72`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:24`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:72`.
[^langkah-4]: `apps/clinic/src/components/queue/QueueDisplay.jsx:12`; `apps/clinic/src/components/queue/QueueDisplay.jsx:96`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:85`.
[^langkah-5]: `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:134`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:57`; `apps/clinic/src/components/settings/QueueDisplayLinks.jsx:63`.
