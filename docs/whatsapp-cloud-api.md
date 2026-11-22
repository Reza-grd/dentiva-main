# WhatsApp Cloud API (Meta) — panduan operasional

Dentiva mengirim WhatsApp lewat satu pintu (`supabase/functions/_shared/whatsapp.ts`). Ada dua jalur:
- **sidecar**: WhatsApp Web di VPS, tidak resmi. Jalur ini yang aktif sekarang.
- **meta**: WhatsApp Cloud API resmi.

Jalur dipilih **per jenis pesan**, jadi perpindahan ke Meta bisa bertahap.

| Jenis pesan | Variabel | Jalur awal yang disarankan | Syarat lewat Meta |
|---|---|---|---|
| Pengingat jadwal (H-1 hari, H-1 jam) | `WA_PROVIDER_REMINDER` | `meta` setelah template disetujui | template `META_WA_TEMPLATE_PENGINGAT` berstatus **Approved** |
| Struk pembayaran | `WA_PROVIDER_RECEIPT` | `sidecar` | belum didukung (perlu template struk), dan kode menolaknya |
| Edukasi pasca-tindakan | `WA_PROVIDER_EDUCATION` | `sidecar` | belum didukung, dan kode menolaknya |
| Pesan manual staf | `WA_PROVIDER_MANUAL` | ikut `WA_PROVIDER` | hanya berhasil di dalam jendela 24 jam sejak pasien terakhir membalas |

Kalau variabel per jenis kosong, yang dipakai adalah `WA_PROVIDER`. Kalau itu juga kosong, urutannya sidecar → meta → whapi.

## Alamat dan rahasia

| Nama | Isi | Diatur dengan |
|---|---|---|
| Callback URL webhook | `https://api.dentiva.id/functions/v1/whatsapp-webhook` | Meta → WhatsApp → Configuration |
| `WHATSAPP_VERIFY_TOKEN` | token acak buatan pemilik, sama dengan kolom *Verify token* di Meta | `isi-rahasia-functions.sh` |
| `WHATSAPP_APP_SECRET` | App Settings → Basic → App secret (32 karakter) | `isi-rahasia-functions.sh` |
| `META_WA_TOKEN` | token **System User** permanen. Jangan pakai token sementara dari dashboard | `atur-whatsapp-meta.sh` (diuji langsung ke Meta) |
| `META_WA_PHONE_NUMBER_ID` | Phone number ID pengirim | `atur-whatsapp-meta.sh` |
| `META_WA_TEMPLATE_PENGINGAT`, `META_WA_TEMPLATE_LANG` | nama template yang Approved, dan bahasanya (`id`) | `atur-whatsapp-meta.sh` |
| `WA_BALAS_OTOMATIS` | `true` = pesan pasien ke nomor Meta dibalas otomatis dengan kontak klinik | `atur-whatsapp-meta.sh` |
| `WA_HASH_KEY` | opsional, kunci sidik nomor. Bawaannya service role key | `isi-rahasia-functions.sh` (secret tambahan) |

Semua rahasia hanya disimpan di `/opt/dentiva/supabase/functions.env` (izin 600). Rahasia tidak boleh masuk Git, frontend, log, atau chat.

## Yang dikerjakan webhook
- **Status pesan** (`sent`, `delivered`, `read`, `failed`):
  - disimpan ke `notification_logs.delivery_status`, `delivery_updated_at`, dan `delivery_error` lewat `wa_catat_status`;
  - status tidak pernah mundur;
  - kiriman ulang dari Meta aman.
- **Pesan masuk**: dicatat di `whatsapp_inbound` hanya berupa ID pesan, klinik, pasien, sidik nomor, jenis, dan tindakan. **Isi pesan dan nomornya tidak disimpan.**
  - Pengirim dikenali dari pesan terakhir yang Dentiva kirim ke nomor itu (60 hari).
  - Balasan **BERHENTI / STOP / UNSUBSCRIBE** mencabut `wa_consent` semua pasien yang pernah dikirimi pesan ke nomor itu.
  - Kalau `WA_BALAS_OTOMATIS=true`, pengirim dibalas dengan nama dan telepon klinik, paling banyak sekali per 24 jam. Balasan ini gratis karena berada di jendela layanan pelanggan.
  - Retensi: data pesan masuk dihapus setelah 90 hari.
- Hanya admin klinik yang bisa melihat `whatsapp_inbound` miliknya (RLS). Staf tidak bisa memalsukan ID pesan atau status Meta (trigger `notification_logs_kolom_server`).

## Draf template (kategori **Utility**, bahasa Indonesia `id`)
Template **harus menyebut klinik pengirim**, karena Dentiva bukan klinik yang melayani pasien. Contoh nilai dalam kurung siku dipakai saat mengajukan template ke Meta.

**1. `pengingat_jadwal`**: sudah dipakai kode. Urutan parameter tidak boleh diubah.
> Halo {{1}}, Anda memiliki jadwal kunjungan pada {{2}} pukul {{3}} dengan {{4}} di {{5}}. Mohon hadir tepat waktu. Hubungi {{6}} jika perlu menjadwal ulang.

Contoh nilai: [Budi] [Senin, 27 Oktober 2026] [09:00 WIB] [drg. Ani] [Klinik Gigi Sehat] [0211234567]

Draf berikut **belum dipakai kode**. Ajukan sekarang supaya status persetujuannya sudah ada saat fiturnya dibuat.

**2. `konfirmasi_jadwal`**
> Halo {{1}}, jadwal kunjungan Anda di {{2}} telah dikonfirmasi untuk {{3}} pukul {{4}}. Hubungi {{5}} jika ada perubahan.

**3. `perubahan_jadwal`**
> Halo {{1}}, jadwal kunjungan Anda di {{2}} telah diubah menjadi {{3}} pukul {{4}}. Hubungi {{5}} bila waktu tersebut tidak sesuai.

**4. `pembatalan_jadwal`**
> Halo {{1}}, jadwal kunjungan Anda di {{2}} pada {{3}} pukul {{4}} telah dibatalkan. Hubungi {{5}} untuk membuat jadwal baru.

**5. `struk_pembayaran`**
> Halo {{1}}, terima kasih telah berkunjung ke {{2}}. Pembayaran sebesar {{3}} untuk invoice {{4}} telah kami terima.

Template **tidak boleh memuat diagnosis atau rincian rekam medis**. Status template (Approved, Pending, Rejected) harus dicek langsung di WhatsApp Manager. Status di dokumen ini tidak bisa dipakai sebagai acuan.

## Urutan aktivasi
1. ✅ Webhook terverifikasi dan field `messages` dilanggan (24 Okt 2026).
2. Verifikasi bisnis Meta selesai. Statusnya *In review* per 24 Okt 2026.
3. Tambahkan metode pembayaran di WhatsApp Manager.
4. Nomor pengirim Indonesia terdaftar. +62 823-9610-0960 harus dihapus dulu dari aplikasi WhatsApp di HP. Nomor +1 dari Meta hanya untuk uji.
5. Buat System User → beri aset WhatsApp → buat token dengan izin `whatsapp_business_messaging` dan `whatsapp_business_management`.
6. Ajukan template `pengingat_jadwal` (Utility, `id`), lalu tunggu sampai **Approved**.
7. Lengkapi App Settings → Basic (Privacy policy URL, data deletion, ikon, kategori), lalu **Publish** app. Tanpa publish, Meta hanya mengirim event uji dari dashboard.
8. Jalankan `atur-whatsapp-meta.sh`: isi Phone number ID, token, dan nama template, lalu `WA_PROVIDER_REMINDER=meta`.
9. Uji ke nomor staf yang sudah setuju, bukan nomor pasien. Pastikan status `delivered`/`read` muncul di `notification_logs`.

Untuk kembali ke jalur lama kapan saja, jalankan `atur-whatsapp-meta.sh` dan isi `WA_PROVIDER_REMINDER=sidecar`.
