-- Invoice & edukasi WhatsApp dikirim dari server (send-visit-notifications), sekali per kunjungan.
-- Klaim unik: hanya satu baris 'sending'/'sent' per (kunjungan, jenis) → tidak pernah terkirim dobel
-- walau dipanggil bersamaan (tombol simpan + cron jaring pengaman).
create unique index if not exists notification_logs_satu_aktif_per_kunjungan
  on public.notification_logs (visit_id, message_type)
  where visit_id is not null
    and message_type in ('receipt', 'education')
    and status in ('sending', 'sent');

-- Pencarian jaring pengaman (pembayaran lunas terbaru) & log per kunjungan.
create index if not exists payments_lunas_terbaru on public.payments (tanggal_pembayaran)
  where status_pembayaran = 'paid';
create index if not exists notification_logs_kunjungan_jenis on public.notification_logs (visit_id, message_type, status);
