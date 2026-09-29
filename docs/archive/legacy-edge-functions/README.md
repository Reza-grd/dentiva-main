# Edge Function lama yang dihapus dari produksi (30 Sep 2026)

Kedua fungsi ini hanya ada di proyek Supabase (tidak pernah ada di repo) dan dihapus atas
persetujuan pemilik karena **tidak memeriksa autentikasi sama sekali** (`verify_jwt = false`,
tanpa cek kunci):

| Fungsi | Versi terakhir | Masalah |
|---|---|---|
| `send-wa-reminder` | v19 | Siapa pun bisa memicu pengingat WhatsApp ke semua pasien terjadwal di semua klinik. Membaca `fonnte_token` dari `clinic_settings` semua klinik sekaligus. |
| `send-wa-payment` | v18 | Siapa pun yang tahu `payment_id` bisa memicu pesan & **respons mengembalikan nomor WA pasien**. Tanpa isolasi klinik. |

Keduanya juga tidak mendekripsi `nama_lengkap` / `no_wa` (kini terenkripsi `PGP:…`).

Pengganti yang ada di repo: `supabase/functions/send-appointment-reminders` (pengingat H-1,
service role saja) dan `supabase/functions/send-whatsapp` (pesan manual/pembayaran, login wajib).

Saat dihapus: tidak ada kode aplikasi, cron, maupun panggilan dalam 24 jam terakhir.
Kode sumbernya tidak disimpan di repo (fungsinya digantikan versi di atas). Bila fitur serupa
dibutuhkan lagi, bangun ulang di atas `send-whatsapp` — **jangan pernah tanpa autentikasi**.
