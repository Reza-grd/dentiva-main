-- =============================================================================
-- Kasir: metode pembayaran QRIS (QRIS statis milik klinik)
-- -----------------------------------------------------------------------------
-- Klinik mengunggah gambar QRIS dari bank/e-wallet mereka sendiri (Pengaturan →
-- Pembayaran & QRIS; disimpan privat di bucket `klinik/<clinic_id>/qris/`).
-- Kasir menampilkannya ke pasien; staf menyimpan pembayaran setelah dana masuk.
-- Dana langsung ke rekening klinik — Dentiva tidak memegang uang pasien.
-- =============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'payments' and column_name = 'metode_pembayaran') then
    return;
  end if;
  alter table public.payments drop constraint if exists payments_metode_pembayaran_check;
  alter table public.payments add constraint payments_metode_pembayaran_check
    check (metode_pembayaran::text = any (array['cash', 'transfer', 'debit', 'credit', 'insurance', 'qris']));
end $$;
