-- Jadwal pg_cron Dentiva — 6 jadwal salinan persis Supabase Cloud (11 Okt 2026) + jaring pengaman notifikasi.
-- HANYA dijalankan saat pindah resmi (buat-jadwal-cron.sh), setelah jadwal di Cloud dimatikan,
-- supaya pengingat WhatsApp / kiriman SATUSEHAT tidak terkirim dobel.
-- Idempoten: jadwal dengan nama yang sama diganti.
-- Waktu cron dalam UTC (17:00 UTC = 00:00 WIB, 05:00 UTC = 12:00 WIB).

select cron.unschedule(jobname) from cron.job
 where jobname in ('ai-brief-midnight', 'ai-brief-noon', 'platform-collect-usage-daily',
                   'platform-mark-overdue-invoices', 'process-satusehat-outbox', 'send-appointment-reminders',
                   'send-visit-notifications');

select cron.schedule('ai-brief-midnight', '0 17 * * *', $cmd$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
             || '/functions/v1/ai-assistant',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
      body := '{"mode":"cron_briefs"}'::jsonb,
      timeout_milliseconds := 60000)
    where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key');
$cmd$);

select cron.schedule('ai-brief-noon', '0 5 * * *', $cmd$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
             || '/functions/v1/ai-assistant',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
      body := '{"mode":"cron_briefs"}'::jsonb,
      timeout_milliseconds := 60000)
    where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key');
$cmd$);

select cron.schedule('platform-collect-usage-daily', '15 17 * * *', $cmd$ select platform.collect_usage_daily(); $cmd$);

select cron.schedule('platform-mark-overdue-invoices', '5 17 * * *', $cmd$ select platform.mark_overdue_invoices(); $cmd$);

select cron.schedule('process-satusehat-outbox', '*/5 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
               || '/functions/v1/satusehat-outbox-processor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')
        ),
        body := '{}'::jsonb
      )
      where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key')
        and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url');
$cmd$);

select cron.schedule('send-appointment-reminders', '*/15 * * * *', $cmd$
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
$cmd$);

-- Jaring pengaman invoice & edukasi WhatsApp (ditambahkan 11 Okt 2026, bukan dari Cloud):
-- kunjungan lunas yang invoice/edukasinya belum terkirim (mis. browser kasir tertutup, WA sempat putus).
select cron.schedule('send-visit-notifications', '*/5 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
               || '/functions/v1/send-visit-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
        body := '{"sweep":true}'::jsonb,
        timeout_milliseconds := 120000)
      where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url')
        and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key');
$cmd$);

select jobname, schedule, active from cron.job order by jobname;
