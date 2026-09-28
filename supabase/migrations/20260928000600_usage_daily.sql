-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 6/7 — usage_daily
-- -----------------------------------------------------------------------------
-- * platform.usage_daily: satu baris per klinik per hari, HANYA angka agregat
--   (tanpa data pasien — sesuai UU PDP & Permenkes 24/2022).
-- * platform.collect_usage_daily(date): mengisi/menimpa snapshot tanggal tsb.
-- * pg_cron tiap 00:15 WIB mengumpulkan data untuk hari sebelumnya.
-- * platform.clinic_overview: view ringkasan per klinik untuk daftar Console.
-- * platform.dashboard_summary(): semua angka dashboard dalam satu panggilan.
--
-- Definisi metrik:
--   patients_total   pasien tidak terhapus (deleted_at is null) saat snapshot
--   visits_count     kunjungan dengan tanggal_kunjungan = tanggal snapshot
--   active_users     user klinik yang login dalam 30 hari terakhir (MAU)
--   storage_bytes    total ukuran objek storage yang path-nya diawali <clinic_id>/
--   wa_sent          notifikasi WhatsApp berstatus 'sent' pada tanggal tsb
--   satusehat_errors item outbox SATUSEHAT yang gagal (failed_*) pada tanggal tsb
-- =============================================================================

create table if not exists platform.usage_daily (
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  date              date not null,
  patients_total    int not null default 0,
  visits_count      int not null default 0,
  active_users      int not null default 0,
  storage_bytes     bigint not null default 0,
  wa_sent           int not null default 0,
  satusehat_errors  int not null default 0,
  collected_at      timestamptz not null default now(),
  primary key (clinic_id, date)
);

create index if not exists idx_usage_daily_date on platform.usage_daily (date desc);

alter table platform.usage_daily enable row level security;
revoke all on platform.usage_daily from public, anon, authenticated;
grant select, insert, update, delete on platform.usage_daily to service_role;

-- -----------------------------------------------------------------------------
-- Pengumpul. Kolom tanggal notification_logs berbeda antar versi skema
-- ('timestamp' / 'created_at' / 'sent_at'), jadi dideteksi saat runtime.
-- -----------------------------------------------------------------------------
create or replace function platform.collect_usage_daily(p_date date default ((now() at time zone 'Asia/Jakarta')::date - 1))
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
  v_wa_col text;
  v_has_outbox boolean := to_regclass('public.satusehat_outbox') is not null;
  v_has_wa boolean := to_regclass('public.notification_logs') is not null;
  v_has_storage boolean := to_regclass('storage.objects') is not null;
  v_day_start timestamptz := (p_date::timestamp at time zone 'Asia/Jakarta');
  v_day_end   timestamptz := ((p_date + 1)::timestamp at time zone 'Asia/Jakarta');
begin
  if v_has_wa then
    select column_name into v_wa_col
    from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_logs'
      and column_name in ('timestamp', 'created_at', 'sent_at')
    order by array_position(array['timestamp', 'created_at', 'sent_at'], column_name::text)
    limit 1;
  end if;

  create temp table if not exists _usage_wa (clinic_id uuid primary key, n int) on commit drop;
  truncate _usage_wa;
  if v_has_wa and v_wa_col is not null then
    execute format(
      'insert into _usage_wa (clinic_id, n)
       select clinic_id, count(*)::int from public.notification_logs
       where status = ''sent'' and %I >= $1 and %I < $2
       group by clinic_id', v_wa_col, v_wa_col)
    using v_day_start, v_day_end;
  end if;

  create temp table if not exists _usage_ss (clinic_id uuid primary key, n int) on commit drop;
  truncate _usage_ss;
  if v_has_outbox then
    insert into _usage_ss (clinic_id, n)
    select clinic_id, count(*)::int
    from public.satusehat_outbox
    where status like 'failed%'
      and coalesce(last_attempt_at, updated_at) >= v_day_start
      and coalesce(last_attempt_at, updated_at) < v_day_end
    group by clinic_id;
  end if;

  create temp table if not exists _usage_storage (clinic_id uuid primary key, bytes bigint) on commit drop;
  truncate _usage_storage;
  if v_has_storage then
    insert into _usage_storage (clinic_id, bytes)
    select c.id, coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    from public.clinics c
    join storage.objects o on split_part(o.name, '/', 1) = c.id::text
    group by c.id;
  end if;

  insert into platform.usage_daily as ud
    (clinic_id, date, patients_total, visits_count, active_users, storage_bytes, wa_sent, satusehat_errors, collected_at)
  select
    c.id,
    p_date,
    (select count(*) from public.patients p where p.clinic_id = c.id and p.deleted_at is null)::int,
    (select count(*) from public.visits v where v.clinic_id = c.id and v.tanggal_kunjungan = p_date)::int,
    (select count(*) from public.users u
       where u.clinic_id = c.id and u.last_login_at >= v_day_end - interval '30 days' and u.last_login_at < v_day_end)::int,
    coalesce((select s.bytes from _usage_storage s where s.clinic_id = c.id), 0),
    coalesce((select w.n from _usage_wa w where w.clinic_id = c.id), 0),
    coalesce((select e.n from _usage_ss e where e.clinic_id = c.id), 0),
    now()
  from public.clinics c
  where c.status <> 'closed'
  on conflict (clinic_id, date) do update set
    patients_total   = excluded.patients_total,
    visits_count     = excluded.visits_count,
    active_users     = excluded.active_users,
    storage_bytes    = excluded.storage_bytes,
    wa_sent          = excluded.wa_sent,
    satusehat_errors = excluded.satusehat_errors,
    collected_at     = excluded.collected_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

revoke all on function platform.collect_usage_daily(date) from public, anon, authenticated;
grant execute on function platform.collect_usage_daily(date) to service_role;

-- -----------------------------------------------------------------------------
-- Ringkasan per klinik (dipakai clinics.list & usage.overview)
-- -----------------------------------------------------------------------------
create or replace view platform.clinic_overview
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.slug,
  c.status,
  c.city,
  c.province,
  c.phone,
  c.email,
  c.created_at,
  c.trial_ends_at,
  c.activated_at,
  c.suspended_at,
  s.id              as subscription_id,
  s.status          as subscription_status,
  s.billing_cycle,
  s.current_period_end,
  p.id              as plan_id,
  p.name            as plan_name,
  p.price_monthly,
  p.price_yearly,
  p.max_users,
  p.max_patients,
  coalesce(uc.users_count, 0)  as users_count,
  uc.last_login_at             as last_activity_at,
  coalesce(u.patients_total, 0) as patients_total,
  u.date                        as usage_date,
  u.visits_count,
  u.active_users,
  u.storage_bytes,
  u.wa_sent,
  u.satusehat_errors
from public.clinics c
left join lateral (
  select cs.* from public.clinic_subscriptions cs
  where cs.clinic_id = c.id
  order by (cs.status in ('trialing', 'active', 'past_due')) desc, cs.current_period_end desc
  limit 1
) s on true
left join public.subscription_plans p on p.id = s.plan_id
left join lateral (
  select count(*) filter (where us.status in ('invited', 'active'))::int as users_count,
         max(us.last_login_at) as last_login_at
  from public.users us where us.clinic_id = c.id
) uc on true
left join lateral (
  select ud.* from platform.usage_daily ud
  where ud.clinic_id = c.id
  order by ud.date desc
  limit 1
) u on true;

revoke all on platform.clinic_overview from public, anon, authenticated;
grant select on platform.clinic_overview to service_role;

-- -----------------------------------------------------------------------------
-- Dashboard dalam satu panggilan
-- -----------------------------------------------------------------------------
create or replace function platform.dashboard_summary(p_churn_days int default 14)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with
  by_status as (
    select jsonb_object_agg(s.status, coalesce(cnt.n, 0)) as j
    from unnest(array['pending', 'trial', 'active', 'suspended', 'closed']) as s(status)
    left join (select status, count(*)::int as n from public.clinics group by status) cnt using (status)
  ),
  mrr as (
    select
      coalesce(sum(case when cs.billing_cycle = 'yearly' then p.price_yearly / 12.0 else p.price_monthly end), 0)::bigint as mrr,
      count(*)::int as n
    from public.clinic_subscriptions cs
    join public.subscription_plans p on p.id = cs.plan_id
    join public.clinics c on c.id = cs.clinic_id
    where cs.status = 'active' and c.status = 'active'
  ),
  due as (
    select count(*)::int as n, coalesce(sum(total_idr), 0)::bigint as amt
    from platform.invoices where status = 'open'
  ),
  overdue as (
    select count(*)::int as n, coalesce(sum(total_idr), 0)::bigint as amt
    from platform.invoices where status = 'overdue'
  ),
  trials as (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'trial_ends_at', trial_ends_at)
                              order by trial_ends_at), '[]'::jsonb) as j
    from (
      select id, name, trial_ends_at from public.clinics
      where status = 'trial' and trial_ends_at < now() + interval '7 days'
      order by trial_ends_at limit 10
    ) t
  ),
  churn as (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_activity_at', last_activity_at)
                              order by last_activity_at nulls first), '[]'::jsonb) as j
    from (
      select o.id, o.name, o.last_activity_at
      from platform.clinic_overview o
      where o.status in ('trial', 'active')
        and (o.last_activity_at is null or o.last_activity_at < now() - make_interval(days => p_churn_days))
        and o.created_at < now() - make_interval(days => p_churn_days)
      order by o.last_activity_at nulls first
      limit 10
    ) x
  )
  select jsonb_build_object(
    'clinicsByStatus', (select j from by_status),
    'newClinicsThisMonth', (
      select count(*)::int from public.clinics
      where created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
    ),
    'mrrIdr', (select mrr from mrr),
    'activeSubscriptions', (select n from mrr),
    'invoicesDue', jsonb_build_object('count', (select n from due), 'amountIdr', (select amt from due)),
    'invoicesOverdue', jsonb_build_object('count', (select n from overdue), 'amountIdr', (select amt from overdue)),
    'trialsEndingSoon', (select j from trials),
    'churnRisk', (select j from churn),
    'generatedAt', now()
  );
$$;

revoke all on function platform.dashboard_summary(int) from public, anon, authenticated;
grant execute on function platform.dashboard_summary(int) to service_role;

-- -----------------------------------------------------------------------------
-- Jadwal: 00:15 WIB (17:15 UTC) → kumpulkan data kemarin
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'platform-collect-usage-daily';
select cron.schedule(
  'platform-collect-usage-daily',
  '15 17 * * *',
  $$ select platform.collect_usage_daily(); $$
);

-- Isi awal agar grafik Console tidak kosong di hari pertama.
select platform.collect_usage_daily((now() at time zone 'Asia/Jakarta')::date - 1);
