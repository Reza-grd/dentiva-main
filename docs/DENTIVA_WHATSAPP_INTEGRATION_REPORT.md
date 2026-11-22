# Laporan Integrasi WhatsApp Cloud API Dentiva — 24 Oktober 2026

**Status keseluruhan: TECHNICALLY IMPLEMENTED — PRODUCTION ACTIVATION PENDING**

Kode ada di cabang `feat/wa-cloud-api` dan **belum di-deploy**. Satu-satunya perubahan di produksi hari ini adalah dua rahasia webhook yang diisi pemilik dan verifikasi webhook di Meta.

## 1. Ringkasan
- Webhook resmi Meta sudah aktif dan terverifikasi. Event uji Meta diterima dengan tanda tangan valid.
- Pada pengembangan sebelumnya, Dentiva sudah punya pengirim multi-penyedia, pengingat jadwal, log pengiriman yang aman dari dobel, dan webhook bertanda tangan. Jadi integrasi ini **melengkapi**, bukan membangun ulang.
- Yang ditambahkan:
  - jalur per jenis pesan;
  - pencatatan status terkirim/dibaca/gagal;
  - pemrosesan pesan masuk (BERHENTI dan balasan otomatis);
  - pemetaan kode galat Meta;
  - skrip pengaturan untuk pemilik.
- Pengiriman ke pasien **masih lewat sidecar** dan belum berubah sama sekali.

## 2. Audit awal
| Temuan | Status awal |
|---|---|
| `_shared/whatsapp.ts`: penyedia sidecar/meta/whapi, template pengingat | sudah ada |
| `whatsapp-webhook`: verifikasi challenge, HMAC `X-Hub-Signature-256`, `verify_jwt=false` | sudah ada, tapi **hanya menghitung event** |
| Pengingat H-1 hari/H-1 jam per klinik, WIB, `wa_consent`, fitur paket, klaim unik | sudah ada |
| Struk & edukasi (`send-visit-notifications`), pesan manual (`send-whatsapp`) | sudah ada |
| `WA_PROVIDER` berlaku global | **risiko**: beralih ke Meta akan menggagalkan struk & edukasi (teks bebas) |
| Status kirim/baca Meta, pesan masuk, opt-out lewat WhatsApp | belum ada |
| Prompt awal menyebut `<ref>.supabase.co`, nama rahasia lain, dan fungsi webhook baru | **dikoreksi**: Dentiva self-hosted di `api.dentiva.id`, fungsi yang ada dipakai ulang |

## 3. Berkas yang diubah
| Berkas | Tujuan |
|---|---|
| `supabase/functions/_shared/whatsapp.ts` | jalur per jenis (`WA_PROVIDER_<JENIS>`), syarat template Meta, peta kode galat Meta, sidik nomor (HMAC), versi API bawaan v26.0 |
| `supabase/functions/_shared/waWebhook.ts` (baru) | pengurai event, kata kunci BERHENTI, teks balasan otomatis |
| `supabase/functions/whatsapp-webhook/index.ts` | menyimpan status, mencatat pesan masuk, opt-out, balasan otomatis, retensi 90 hari |
| `send-appointment-reminders`, `send-visit-notifications`, `send-whatsapp` | mengirim jenis pesan, mencatat ID pesan penyedia dan sidik penerima |
| `supabase/migrations/20261024120000_whatsapp_cloud_api.sql` (baru) | lihat bagian 4 |
| `_shared/whatsapp.test.ts`, `_shared/waWebhook.test.ts` (baru), `tests/smoke/migrations.smoke.mjs` | uji |
| `infra/vps/bin/atur-whatsapp-meta.sh` (baru) | pengaturan Meta oleh pemilik, token diuji langsung ke Graph API |
| `docs/whatsapp-cloud-api.md` (baru), `infra/vps/README.md` | panduan, draf template, urutan aktivasi |

## 4. Perubahan database (migration `20261024120000`)
- `notification_logs` + `provider`, `provider_message_id` (indeks unik), `recipient_hash` (indeks), `delivery_status` (check), `delivery_updated_at`, `delivery_error`. Kolom `status` lama **tidak disentuh** karena mekanisme klaim anti-dobel bergantung padanya.
- Trigger `notification_logs_kolom_server`: dari browser, kolom Meta dikosongkan saat insert dan dipertahankan saat update.
- `wa_catat_status()`: status tidak pernah mundur. Hanya `service_role`.
- Tabel `whatsapp_inbound` tanpa isi pesan dan nomor:
  - `wamid` unik (anti-duplikat);
  - RLS: hanya admin klinik yang sama yang bisa membaca, tidak ada tulis dari browser.
- `wa_cabut_persetujuan()`: hanya `service_role`.

Status: **TESTED** di PGlite (smoke CI). **PENDING** penerapan ke produksi.

## 5. Deployment Supabase
| Item | Status |
|---|---|
| `whatsapp-webhook` versi lama di `https://api.dentiva.id/functions/v1/whatsapp-webhook` | **TESTED** di produksi: token salah 403, tanda tangan salah 401, event uji Meta diterima |
| Kode baru (fungsi + migration) | **PENDING**: perlu persetujuan pemilik. Urutan wajib: **migration dulu, baru fungsi**. Kalau terbalik, pencatatan log gagal karena kolom belum ada |

## 6. Integrasi Meta
| Item | Status |
|---|---|
| App ID 2567459477050313, Callback URL & verify token | **COMPLETED** (Meta menampilkan centang hijau) |
| Langganan field `messages` (v26.0) | **COMPLETED** |
| Event uji `messages` dari dashboard → server | **TESTED** (`diterima: 1 pesan`, tanda tangan valid) |
| WABA ID (1454841946751009?) | **PENDING EXTERNAL ACTION**: perlu dipastikan di WhatsApp Manager |
| Nomor +62 823-9610-0960 (Unverified) | **BLOCKED**: masih terdaftar di aplikasi WhatsApp lain, OTP dibatasi |
| Nomor +1 711-659-4698 (Registered) | hanya untuk uji, tidak disarankan untuk pasien Indonesia |
| Publikasi app | **PENDING EXTERNAL ACTION**: tanpa publish hanya event uji yang dikirim |

Nomor sidecar yang aktif (6285…95) **berbeda** dari kedua nomor Meta, jadi pendaftaran nomor Meta tidak memutus pengiriman yang berjalan.

## 7. Tinjauan keamanan
- Token dari tangkapan layar dianggap bocor dan tidak dipakai di mana pun. Token produksi harus berupa System User, diisi lewat `atur-whatsapp-meta.sh`, dan tidak pernah tampil.
- App Secret 32 karakter dan verify token disimpan hanya di `functions.env` (600). Tidak ada rahasia di repo, frontend, atau log.
- Tanda tangan HMAC diperiksa dengan perbandingan waktu-konstan. Event tanpa tanda tangan valid tidak diproses.
- Data minimal sesuai UU PDP: tidak ada isi pesan atau nomor di DB maupun log. Penerima dikenali lewat sidik HMAC.
- Pesan masuk hanya bisa dibaca admin klinik terkait. Status Meta tidak bisa dipalsukan dari browser.

## 8. Hasil uji
| Uji | Hasil |
|---|---|
| Deno unit (CI): seluruh `_shared`, `ai-assistant`, `midtrans-webhook` | **81 lulus, 0 gagal**, termasuk 24 uji WhatsApp (12 di antaranya baru) |
| Type-check 15 edge function | **semua ok** |
| Smoke migration (PGlite) | **174 lulus, 0 gagal**, termasuk 14 uji WhatsApp |
| Webhook lokal via HTTP | token benar 200 / salah 403; tanda tangan valid 200; salah, tanpa tanda tangan, atau isi diubah semua 401; JSON rusak 400; objek lain 400; kiriman ulang 200 |
| Skrip `atur-whatsapp-meta.sh` (uji kering) | token palsu **ditolak Meta** dan tidak disimpan; pengingat tanpa token/template dipaksa kembali ke sidecar |
| Kirim pesan nyata lewat Meta | **NOT TESTED**: belum ada token System User, billing, dan template |
| Pemrosesan pesan masuk ke DB nyata | **NOT TESTED** di produksi: menunggu deploy dan publikasi app |

## 9. Hambatan eksternal
1. Verifikasi bisnis Meta (*In review*).
2. Metode pembayaran WhatsApp Business Platform.
3. Nomor pengirim Indonesia (hapus akun WhatsApp di HP untuk +62 823-9610-0960).
4. System User dan token permanen.
5. Template `pengingat_jadwal` Approved.
6. Lengkapi App Settings → Basic, lalu Publish.

## 10. Langkah berikutnya (berurutan)
1. **Pemilik**: setujui deploy. Saya terapkan migration, lalu fungsi, dan pastikan pengingat/struk tetap terkirim lewat sidecar.
2. **Pemilik**: urus hambatan eksternal 1–6 (lihat `docs/whatsapp-cloud-api.md`).
3. Jalankan `atur-whatsapp-meta.sh` dan isi `WA_PROVIDER_REMINDER=meta`. Uji ke nomor staf, lalu periksa `delivery_status`.
4. Setelah stabil, nyalakan `WA_BALAS_OTOMATIS=true`.
5. **NOT IMPLEMENTED** (fase berikutnya):
   - notifikasi konfirmasi, perubahan, dan pembatalan jadwal (template sudah didrafkan);
   - tampilan status kirim/baca di aplikasi klinik;
   - kotak masuk per klinik;
   - template struk agar struk bisa pindah ke Meta.
