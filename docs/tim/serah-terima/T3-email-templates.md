# Serah Terima T3 — Template email akun (hasil GPT, cabang `gpt/email-templates`, 11 Okt 2026)

**Peninjau:** Ketua Tim · **Tanggal tinjauan:** 17 Okt 2026 · **Keputusan:** ✅ DITERIMA & digabung ke `console` (cherry-pick `a6ac9b4` → `0ed757a`). **Belum dipasang ke server** (butuh SMTP).

## Hasil tinjauan
| Aspek | Temuan |
|---|---|
| Keamanan | Tidak ada gambar/font/skrip/pelacak eksternal; `ConfirmationURL` dipakai utuh (tidak dirangkai ulang); tidak ada rahasia. ✔ |
| Kualitas | HTML tabel + CSS inline, lebar 600 px, responsif, wrapper Outlook, Bahasa Indonesia jelas, tombol + tautan cadangan, peringatan "abaikan bila bukan Anda". ✔ |
| Kontrak GoTrue | Variabel yang dipakai: `.ConfirmationURL .Email .SiteURL .Token` (sesuai dokumen Supabase). ✔ |
| Catatan | (1) Blok `{{ if .Token }}` menawarkan kode yang **tidak didukung UI** (tidak ada input OTP) → hapus sebelum dipasang (README GPT sudah menyebutnya). (2) Perlu uji bahwa GoTrue v2.196 meng-*escape* `{{ .Email }}` sebagai HTML (kemungkinan memakai `text/template`; risiko rendah karena email tervalidasi, tetapi uji dengan `<b>` pada email uji). (3) Nuansa premium: tambahkan logo/warna merek final setelah sistem desain G2 selesai (hanya CSS inline, tanpa gambar eksternal). |

## Syarat pemasangan (L3)
1. SMTP asli (pemilik memilih penyedia; mis. Brevo/Mailgun/SES/Resend) + SPF/DKIM/DMARC untuk `dentiva.id`; pengirim `Dentiva <no-reply@dentiva.id>`; **matikan pelacakan klik/buka**.
2. Pasang template lewat `GOTRUE_MAILER_TEMPLATES_*` (berkas di volume) di `docker-compose.dentiva.yml`, subjek via `GOTRUE_MAILER_SUBJECTS_*`.
3. Uji 5 alur dengan akun uji nonklinik; periksa tautan tidak dikonsumsi pemindai email.

**Dampak saat ini:** SMTP server masih *palsu* (`supabase-mail`), sedangkan `mailer_autoconfirm=false` dan pendaftaran publik terbuka → **pendaftaran klinik mandiri & reset sandi lewat email tidak bisa tuntas** sampai SMTP dipasang. Ini yang membuat T4/L3 mendesak.
