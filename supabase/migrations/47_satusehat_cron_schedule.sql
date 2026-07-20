-- 47. SatuSehat Outbox Processor Cron Schedule (Option A)

-- Enable extensions for pg_cron and pg_net if available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old job if exists to avoid duplicate schedules
SELECT cron.unschedule('process-satusehat-outbox') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-satusehat-outbox'
);

-- Schedule process-satusehat-outbox to run every 5 minutes
SELECT cron.schedule(
  'process-satusehat-outbox',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ggwratzhpukgsiduqely.supabase.co/functions/v1/satusehat-outbox-processor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
