-- =============================================================================
-- Cron pengingat WhatsApp (H-1 hari & H-1 jam)
-- -----------------------------------------------------------------------------
-- Edge Function send-appointment-reminders sudah ada tetapi tidak pernah
-- dijadwalkan → tidak ada pengingat yang terkirim. Dijalankan tiap 15 menit;
-- fungsi sendiri membatasi H-1 hari ke 08.00–20.00 WIB dan mencegah duplikat
-- lewat notification_logs. Kunci diambil dari Vault (sama dengan cron SATUSEHAT).
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_cron/pg_net tidak tersedia — cron pengingat dilewati';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'send-appointment-reminders') then
    perform cron.unschedule('send-appointment-reminders');
  end if;

  perform cron.schedule(
    'send-appointment-reminders',
    '*/15 * * * *',
    $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
               || '/functions/v1/send-appointment-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000)
      where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url')
        and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key');
    $cmd$
  );
end $$;
