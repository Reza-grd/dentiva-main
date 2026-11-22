# Pembayaran langganan dengan Midtrans Snap

Keputusan pemilik (15 Nov 2026): **bayar = klinik langsung aktif**, semua metode pembayaran yang aktif di
akun Midtrans dibuka. Pendaftaran tanpa bayar tetap menunggu persetujuan operator.

Sumber: panduan resmi Midtrans — [Snap integration guide](https://docs.midtrans.com/docs/snap-snap-integration-guide),
[HTTP notification](https://docs.midtrans.com/docs/https-notification-webhooks),
[Snap advanced feature](https://docs.midtrans.com/docs/snap-advanced-feature),
[Testing on sandbox](https://docs.midtrans.com/docs/testing-payment-on-sandbox).

## Alur pembeli

1. Di dentiva.id klik paket → aplikasi `/daftar?paket=pro&siklus=yearly` (pilihan paket diingat).
2. Isi akun (email + kata sandi) → verifikasi email → isi data klinik. Klinik dibuat berstatus `pending`.
3. Layar **Aktifkan klinik Anda**: langkah 1-2-3, pilih paket & siklus, ringkasan, tombol **Bayar**.
4. Popup **Midtrans Snap** (VA bank, QRIS, e-wallet, kartu kredit 3DS). Batas bayar 24 jam.
5. `/langganan/status?order_id=…` menunggu konfirmasi resmi dari webhook → **klinik aktif** → masuk Dentiva.

Klinik yang sudah aktif membayar/memperpanjang dari menu **Paket** (`/pricing`) dengan popup yang sama.

Mengapa akun dulu baru bayar: invoice & langganan wajib terikat ke klinik yang jelas, webhook hanya
memercayai order yang dicatat server untuk klinik itu, email pembeli sudah terverifikasi (bukti transaksi
& pemulihan akun), dan pembeli tidak kehilangan uang bila pendaftaran gagal setelah membayar.

## Keamanan (sudah diterapkan)

- Nominal dihitung database dari katalog paket (`billing_register_midtrans_order`), bukan dari browser.
- Server Key hanya di server (`functions.env`); aplikasi hanya memegang Client Key (publik).
- Webhook: cek `signature_key` = SHA512(order_id + status_code + gross_amount + ServerKey), lalu status
  diambil ulang dari Midtrans `GET /v2/{order_id}/status` sebelum diproses. Idempoten; balas 500 saat gagal
  agar Midtrans mengirim ulang. Lunas = `settlement` atau `capture` + `fraud_status=accept`.
- Hasil popup (onSuccess dsb.) hanya petunjuk tampilan; status resmi dibaca dari `get_checkout_status`.

## Menyalakan SANDBOX (pemilik)

1. Daftar akun di <https://dashboard.midtrans.com>, pilih lingkungan **Sandbox**.
2. **Settings → Access Keys**: salin *Client Key* dan *Server Key* sandbox (Server Key jangan dikirim ke chat).
3. **Settings → Configuration → Payment Notification URL**:
   `https://api.dentiva.id/functions/v1/midtrans-webhook` → Update.
4. **Settings → Snap Preference → System Settings**: Finish/Unfinish/Error URL =
   `https://<alamat-aplikasi>/langganan/status` (opsional; transaksi sudah mengirim `callbacks.finish`).
5. Server (VPS): jalankan `isi-rahasia-functions.sh`, isi `MIDTRANS_SERVER_KEY` (sandbox) dan
   `MIDTRANS_ENVIRONMENT=sandbox`; pastikan `CLINIC_APP_URL` benar. Terapkan migrasi
   `20261115190000_checkout_midtrans.sql` dan pasang ulang fungsi `midtrans-create-transaction`.
6. Vercel (proyek aplikasi klinik), **hanya lingkungan Preview** dulu:
   `VITE_BILLING_MODE=midtrans`, `VITE_MIDTRANS_CLIENT_KEY=<client key sandbox>`, `VITE_MIDTRANS_ENV=sandbox`.
7. Uji di URL Preview dengan akun klinik uji:
   - Kartu: `4811 1111 1111 1114`, CVV `123`, OTP `112233`, kedaluwarsa bulan/tahun mana saja di masa depan.
   - VA: bayar di simulator <https://simulator.sandbox.midtrans.com> (BCA/BNI/Open API sesuai bank).
   - QRIS/GoPay: tempel URL gambar QR di <https://simulator.sandbox.midtrans.com/v2/qris/index>.
   - Gagal: `4911 1111 1111 1113` (ditolak) → status "tidak berhasil", klinik tetap pending.
   - Jangan pernah membayar transaksi sandbox dengan uang sungguhan.

Catatan: database sandbox & produksi sama (VPS). Pembayaran sandbox yang lunas benar-benar mengaktifkan
klinik uji — pakai akun klinik uji, lalu tutup klinik uji itu dari Console setelah selesai.

## Beralih ke PRODUKSI (nanti)

1. Lengkapi profil & aktivasi akun produksi di Dashboard Midtrans (data badan usaha, rekening pencairan).
2. Ambil Client Key & Server Key **produksi**; set Notification URL produksi (alamat sama seperti di atas).
3. VPS: `MIDTRANS_SERVER_KEY` produksi, `MIDTRANS_ENVIRONMENT=production`.
4. Vercel **Production**: `VITE_BILLING_MODE=midtrans`, `VITE_MIDTRANS_CLIENT_KEY` produksi,
   `VITE_MIDTRANS_ENV=production` → redeploy. Label "MODE UJI (SANDBOX)" hilang otomatis.
5. Ganti tombol paket di dentiva.id dari `#demo` ke `https://<aplikasi>/daftar?paket=starter|pro`.
6. Uji satu transaksi nominal kecil sungguhan, lalu refund dari Dashboard bila perlu.

## Belum termasuk

- Perpanjangan otomatis (debit berulang): Midtrans hanya mendukung kartu kredit/GoPay tersimpan untuk
  langganan berulang. Saat ini klinik memperpanjang manual dari menu Paket; pengingat jatuh tempo menyusul.
