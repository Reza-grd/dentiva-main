-- Catatan Asisten AI diperbarui terjadwal pukul 00.00 dan 12.00 WIB (bukan saat login),
-- sehingga Dashboard langsung menampilkan catatan tersimpan. Pembaruan manual tetap ada.
--   ai_service_clinics()          : klinik aktif yang paketnya memuat AI dan admin mengaktifkannya.
--   ai_service_snapshots(clinic)  : snapshot admin & resepsionis untuk satu klinik, dihitung atas
--                                   nama admin klinik itu (fungsi ai_* memeriksa peran dari JWT).
-- Keduanya hanya untuk service_role (dipanggil Edge Function ai-assistant mode cron_briefs).

create or replace function public.ai_service_clinics()
returns table (clinic_id uuid)
language sql stable security definer set search_path = 'public', 'extensions' as $$
  select c.id
  from public.clinics c
  where c.status in ('trial', 'active')
    and exists (select 1 from public.clinic_settings cs
                where cs.clinic_id = c.id and cs.key = 'ai_assistant_enabled' and cs.value = 'true')
    and exists (select 1 from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
                where s.clinic_id = c.id and s.status in ('active', 'trialing')
                  and coalesce((p.features ->> 'ai_assistant')::boolean, false))
    and exists (select 1 from public.users u where u.clinic_id = c.id and u.role = 'admin' and u.status = 'active');
$$;

create or replace function public.ai_service_snapshots(p_clinic uuid)
returns jsonb language plpgsql volatile security definer set search_path = 'public', 'extensions' as $$
declare
  v_admin uuid;
  v_old text := current_setting('request.jwt.claims', true);
  r jsonb;
begin
  select u.id into v_admin from public.users u
   where u.clinic_id = p_clinic and u.role = 'admin' and u.status = 'active'
   order by u.created_at limit 1;
  if v_admin is null then return null; end if;

  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin, 'role', 'authenticated',
    'app_metadata', jsonb_build_object('clinic_id', p_clinic))::text, true);
  r := jsonb_build_object(
    'admin_user', v_admin,
    'snapshot', public.ai_snapshot(),
    'staff_snapshot', public.ai_staff_snapshot());
  perform set_config('request.jwt.claims', coalesce(v_old, ''), true);
  return r;
end $$;

revoke all on function public.ai_service_clinics() from public, anon, authenticated;
revoke all on function public.ai_service_snapshots(uuid) from public, anon, authenticated;
grant execute on function public.ai_service_clinics() to service_role;
grant execute on function public.ai_service_snapshots(uuid) to service_role;

-- Jadwal: 17.00 UTC = 00.00 WIB, 05.00 UTC = 12.00 WIB
do $$
declare v_cmd text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_cron/pg_net tidak tersedia — jadwal catatan AI dilewati';
    return;
  end if;
  v_cmd := $cmd$
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
  $cmd$;
  if exists (select 1 from cron.job where jobname = 'ai-brief-midnight') then perform cron.unschedule('ai-brief-midnight'); end if;
  if exists (select 1 from cron.job where jobname = 'ai-brief-noon') then perform cron.unschedule('ai-brief-noon'); end if;
  perform cron.schedule('ai-brief-midnight', '0 17 * * *', v_cmd);
  perform cron.schedule('ai-brief-noon', '0 5 * * *', v_cmd);
end $$;
