-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 5/7 — billing_tables
-- -----------------------------------------------------------------------------
-- * platform.invoices, platform.payments, penomoran invoice atomik.
-- * subscription_plans & clinic_subscriptions: tulis HANYA via service_role.
-- * clinic_subscriptions.billing_cycle (monthly/yearly) untuk perhitungan MRR.
-- * Fungsi transaksional:
--     platform.create_invoice(...)
--     platform.confirm_manual_payment(...)
--     platform.register_midtrans_order(...)   dipanggil midtrans-create-transaction
--     platform.settle_midtrans_order(...)     dipanggil midtrans-webhook (idempoten)
--     platform.mark_overdue_invoices()        dijalankan pg_cron tiap hari
-- * PERBAIKAN KEAMANAN: webhook lama memercayai custom_field1/2 (clinic_id, plan_id)
--   yang TIDAK tercakup signature Midtrans. Sekarang order dicatat saat checkout dan
--   webhook hanya memakai data yang tersimpan di server.
-- Semua nominal dalam Rupiah bulat (bigint).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Langganan: hanya service_role yang menulis
-- -----------------------------------------------------------------------------
alter table public.clinic_subscriptions
  add column if not exists billing_cycle text not null default 'monthly';

alter table public.clinic_subscriptions drop constraint if exists clinic_subscriptions_billing_cycle_check;
alter table public.clinic_subscriptions add constraint clinic_subscriptions_billing_cycle_check
  check (billing_cycle in ('monthly', 'yearly'));

drop policy if exists "Subscriptions_Admin_UPDATE" on public.clinic_subscriptions;
revoke insert, update, delete, truncate on public.clinic_subscriptions from anon, authenticated;
revoke insert, update, delete, truncate on public.subscription_plans from anon, authenticated;

-- Satu langganan berjalan per klinik (dipasang hanya jika data lama bersih).
do $$
begin
  if exists (
    select clinic_id from public.clinic_subscriptions
    where status in ('trialing', 'active', 'past_due')
    group by clinic_id having count(*) > 1
  ) then
    raise warning 'billing_tables: ada klinik dengan >1 langganan berjalan; unique index TIDAK dipasang. Bersihkan lalu buat migration baru.';
  else
    create unique index if not exists uq_clinic_subscriptions_current
      on public.clinic_subscriptions (clinic_id)
      where status in ('trialing', 'active', 'past_due');
  end if;
end $$;

-- Kuota pasien juga berlaku untuk klinik trial / menunggak (sebelumnya hanya 'active').
create or replace function public.check_max_patients_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max_patients int;
  v_current_count int;
begin
  select sp.max_patients
  into v_max_patients
  from public.clinic_subscriptions cs
  join public.subscription_plans sp on sp.id = cs.plan_id
  where cs.clinic_id = new.clinic_id
    and cs.status in ('trialing', 'active', 'past_due')
  order by cs.current_period_end desc
  limit 1;

  if v_max_patients is null then
    v_max_patients := 1000;
  end if;

  select count(*) into v_current_count
  from public.patients
  where clinic_id = new.clinic_id and deleted_at is null;

  if v_current_count >= v_max_patients then
    raise exception 'Batas jumlah pasien pada paket Anda telah tercapai (maksimal % pasien). Silakan upgrade paket langganan klinik Anda untuk menambah pasien baru.', v_max_patients;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Invoice
-- -----------------------------------------------------------------------------
create table if not exists platform.invoice_counters (
  year  int primary key,
  last  int not null default 0
);

create or replace function platform.next_invoice_number(p_at timestamptz default now())
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_year int := extract(year from (p_at at time zone 'Asia/Jakarta'))::int;
  v_next int;
begin
  insert into platform.invoice_counters as ic (year, last)
  values (v_year, 1)
  on conflict (year) do update set last = ic.last + 1
  returning last into v_next;

  return format('INV-%s-%s', v_year, lpad(v_next::text, 6, '0'));
end;
$$;

create table if not exists platform.invoices (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete restrict,
  number        text not null unique,
  period_start  date not null,
  period_end    date not null,
  amount_idr    bigint not null check (amount_idr > 0),
  tax_idr       bigint not null default 0 check (tax_idr >= 0),
  total_idr     bigint generated always as (amount_idr + tax_idr) stored,
  status        text not null default 'open' check (status in ('open', 'paid', 'overdue', 'void')),
  due_date      date not null,
  paid_at       timestamptz,
  notes         text,
  source        text not null default 'console' check (source in ('console', 'midtrans_checkout')),
  created_by    uuid references platform.operators (user_id) on delete set null,
  voided_at     timestamptz,
  void_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint invoices_period check (period_end >= period_start),
  constraint invoices_paid_consistency check ((status = 'paid') = (paid_at is not null)),
  constraint invoices_void_consistency check ((status = 'void') = (voided_at is not null))
);

create index if not exists idx_invoices_clinic on platform.invoices (clinic_id, created_at desc);
create index if not exists idx_invoices_status_due on platform.invoices (status, due_date);

drop trigger if exists trg_invoices_updated_at on platform.invoices;
create trigger trg_invoices_updated_at
  before update on platform.invoices
  for each row execute function platform.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Pembayaran
-- -----------------------------------------------------------------------------
create table if not exists platform.payments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid references platform.invoices (id) on delete restrict,
  clinic_id     uuid not null references public.clinics (id) on delete restrict,
  provider      text not null check (provider in ('midtrans', 'manual')),
  provider_ref  text,
  amount_idr    bigint not null check (amount_idr > 0),
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'refunded')),
  paid_at       timestamptz,
  confirmed_by  uuid references platform.operators (user_id) on delete set null,
  notes         text,
  metadata      jsonb not null default '{}'::jsonb,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint payments_confirmed_has_paid_at check (status <> 'confirmed' or paid_at is not null)
);

create unique index if not exists uq_payments_provider_ref
  on platform.payments (provider, provider_ref) where provider_ref is not null;
create index if not exists idx_payments_invoice on platform.payments (invoice_id);
create index if not exists idx_payments_clinic on platform.payments (clinic_id, created_at desc);

drop trigger if exists trg_payments_updated_at on platform.payments;
create trigger trg_payments_updated_at
  before update on platform.payments
  for each row execute function platform.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Fungsi transaksional
-- -----------------------------------------------------------------------------

create or replace function platform.create_invoice(
  p_clinic_id    uuid,
  p_period_start date,
  p_period_end   date,
  p_amount_idr   bigint,
  p_tax_idr      bigint,
  p_due_date     date,
  p_notes        text,
  p_operator_id  uuid,
  p_source       text default 'console'
)
returns platform.invoices
language plpgsql
set search_path = ''
as $$
declare
  v_inv platform.invoices;
begin
  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'Klinik % tidak ditemukan', p_clinic_id using errcode = 'no_data_found';
  end if;

  insert into platform.invoices (clinic_id, number, period_start, period_end, amount_idr, tax_idr,
                                 due_date, notes, created_by, source)
  values (p_clinic_id, platform.next_invoice_number(), p_period_start, p_period_end, p_amount_idr,
          coalesce(p_tax_idr, 0), p_due_date, p_notes, p_operator_id, coalesce(p_source, 'console'))
  returning * into v_inv;

  return v_inv;
end;
$$;

-- Konfirmasi transfer manual. Invoice menjadi 'paid' jika total pembayaran
-- terkonfirmasi >= total invoice. Mengunci baris invoice (FOR UPDATE) agar
-- dua konfirmasi bersamaan tidak saling menimpa.
create or replace function platform.confirm_manual_payment(
  p_invoice_id  uuid,
  p_amount_idr  bigint,
  p_paid_at     timestamptz,
  p_reference   text,
  p_notes       text,
  p_operator_id uuid
)
returns table (payment_id uuid, invoice_status text)
language plpgsql
set search_path = ''
as $$
declare
  v_inv platform.invoices;
  v_paid bigint;
  v_payment_id uuid;
begin
  select * into v_inv from platform.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice tidak ditemukan' using errcode = 'no_data_found';
  end if;
  if v_inv.status in ('paid', 'void') then
    raise exception 'Invoice % sudah berstatus %', v_inv.number, v_inv.status using errcode = 'check_violation';
  end if;

  insert into platform.payments (invoice_id, clinic_id, provider, provider_ref, amount_idr, status,
                                 paid_at, confirmed_by, notes)
  values (v_inv.id, v_inv.clinic_id, 'manual', p_reference, p_amount_idr, 'confirmed',
          p_paid_at, p_operator_id, p_notes)
  returning id into v_payment_id;

  select coalesce(sum(amount_idr), 0) into v_paid
  from platform.payments
  where invoice_id = v_inv.id and status = 'confirmed';

  if v_paid >= v_inv.total_idr then
    update platform.invoices set status = 'paid', paid_at = p_paid_at where id = v_inv.id;
    return query select v_payment_id, 'paid'::text;
  else
    return query select v_payment_id, v_inv.status;
  end if;
end;
$$;

-- Dipanggil midtrans-create-transaction SEBELUM memanggil Snap API.
-- Mencatat invoice + pembayaran pending; nominal dihitung di server dari katalog paket.
create or replace function platform.register_midtrans_order(
  p_order_id      text,
  p_clinic_id     uuid,
  p_plan_id       uuid,
  p_billing_cycle text
)
returns table (invoice_id uuid, payment_id uuid, amount_idr bigint, plan_name text)
language plpgsql
set search_path = ''
as $$
declare
  v_plan public.subscription_plans;
  v_amount bigint;
  v_inv platform.invoices;
  v_payment_id uuid;
  v_start date := (now() at time zone 'Asia/Jakarta')::date;
  v_end date;
begin
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'billing_cycle tidak valid' using errcode = 'check_violation';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id and coalesce(is_active, true);
  if not found then
    raise exception 'Paket tidak ditemukan atau tidak aktif' using errcode = 'no_data_found';
  end if;

  v_amount := round(case when p_billing_cycle = 'yearly' then v_plan.price_yearly else v_plan.price_monthly end)::bigint;
  v_end := (case when p_billing_cycle = 'yearly' then v_start + interval '1 year' else v_start + interval '1 month' end)::date - 1;

  v_inv := platform.create_invoice(p_clinic_id, v_start, v_end, v_amount, 0, v_start,
                                   format('Langganan %s (%s)', v_plan.name, p_billing_cycle),
                                   null, 'midtrans_checkout');

  insert into platform.payments (invoice_id, clinic_id, provider, provider_ref, amount_idr, status, metadata)
  values (v_inv.id, p_clinic_id, 'midtrans', p_order_id, v_amount, 'pending',
          jsonb_build_object('plan_id', p_plan_id, 'billing_cycle', p_billing_cycle))
  returning id into v_payment_id;

  return query select v_inv.id, v_payment_id, v_amount, v_plan.name::text;
end;
$$;

-- Dipanggil midtrans-webhook setelah signature valid. Idempoten: notifikasi
-- berulang untuk order yang sudah 'confirmed' tidak mengubah apa pun.
-- p_outcome: 'success' | 'pending' | 'failed'
create or replace function platform.settle_midtrans_order(
  p_order_id     text,
  p_outcome      text,
  p_gross_amount bigint,
  p_raw          jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_pay platform.payments;
  v_plan_id uuid;
  v_cycle text;
  v_sub public.clinic_subscriptions;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_pay from platform.payments
  where provider = 'midtrans' and provider_ref = p_order_id
  for update;

  if not found then
    return 'unknown_order';
  end if;

  if v_pay.status = 'confirmed' then
    return 'already_confirmed';
  end if;

  if p_outcome = 'pending' then
    update platform.payments set raw = p_raw where id = v_pay.id;
    return 'pending';
  end if;

  if p_outcome = 'failed' then
    update platform.payments set status = 'failed', raw = p_raw where id = v_pay.id;
    -- Checkout yang batal/kedaluwarsa TIDAK mengubah status langganan yang berjalan.
    update platform.invoices set status = 'void', voided_at = now(), void_reason = 'Checkout Midtrans gagal/kedaluwarsa'
    where id = v_pay.invoice_id and status = 'open' and source = 'midtrans_checkout';
    return 'failed';
  end if;

  if p_outcome <> 'success' then
    raise exception 'outcome tidak dikenal: %', p_outcome;
  end if;

  if p_gross_amount <> v_pay.amount_idr then
    update platform.payments set raw = p_raw, notes = 'Nominal tidak cocok; perlu tinjauan manual' where id = v_pay.id;
    return 'amount_mismatch';
  end if;

  update platform.payments set status = 'confirmed', paid_at = now(), raw = p_raw where id = v_pay.id;
  update platform.invoices set status = 'paid', paid_at = now()
  where id = v_pay.invoice_id and status in ('open', 'overdue');

  v_plan_id := (v_pay.metadata ->> 'plan_id')::uuid;
  v_cycle := coalesce(v_pay.metadata ->> 'billing_cycle', 'monthly');

  select * into v_sub from public.clinic_subscriptions
  where clinic_id = v_pay.clinic_id and status in ('trialing', 'active', 'past_due')
  order by current_period_end desc
  limit 1
  for update;

  -- Perpanjang dari akhir periode berjalan jika masih aktif, jika tidak dari sekarang.
  v_start := greatest(now(), coalesce(case when v_sub.status = 'active' then v_sub.current_period_end end, now()));
  v_end := v_start + case when v_cycle = 'yearly' then interval '1 year' else interval '1 month' end;

  if v_sub.id is not null then
    update public.clinic_subscriptions
    set plan_id = v_plan_id,
        status = 'active',
        billing_cycle = v_cycle,
        current_period_start = v_start,
        current_period_end = v_end,
        cancel_at_period_end = false,
        updated_at = now()
    where id = v_sub.id;
  else
    insert into public.clinic_subscriptions (clinic_id, plan_id, status, billing_cycle,
                                             current_period_start, current_period_end, cancel_at_period_end)
    values (v_pay.clinic_id, v_plan_id, 'active', v_cycle, v_start, v_end, false);
  end if;

  -- Klinik trial yang membayar otomatis menjadi aktif.
  update public.clinics set status = 'active' where id = v_pay.clinic_id and status = 'trial';

  return 'confirmed';
end;
$$;

create or replace function platform.mark_overdue_invoices()
returns int
language sql
set search_path = ''
as $$
  with updated as (
    update platform.invoices
    set status = 'overdue'
    where status = 'open'
      and due_date < (now() at time zone 'Asia/Jakarta')::date
    returning 1
  )
  select count(*)::int from updated;
$$;

-- -----------------------------------------------------------------------------
-- 5. Hak akses (default privileges dari migration 1 sudah memberi service_role;
--    ditegaskan ulang di sini untuk objek baru) + RLS tanpa policy.
-- -----------------------------------------------------------------------------
alter table platform.invoice_counters enable row level security;
alter table platform.invoices         enable row level security;
alter table platform.payments         enable row level security;

revoke all on platform.invoice_counters, platform.invoices, platform.payments from public, anon, authenticated;
grant select, insert, update on platform.invoice_counters, platform.invoices, platform.payments to service_role;
-- Invoice & pembayaran tidak pernah dihapus (void / refunded sebagai gantinya).
revoke delete, truncate on platform.invoices, platform.payments from service_role;

revoke all on function platform.next_invoice_number(timestamptz) from public, anon, authenticated;
revoke all on function platform.create_invoice(uuid, date, date, bigint, bigint, date, text, uuid, text) from public, anon, authenticated;
revoke all on function platform.confirm_manual_payment(uuid, bigint, timestamptz, text, text, uuid) from public, anon, authenticated;
revoke all on function platform.register_midtrans_order(text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function platform.settle_midtrans_order(text, text, bigint, jsonb) from public, anon, authenticated;
revoke all on function platform.mark_overdue_invoices() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Pintu RPC untuk Edge Function Midtrans.
--    Skema platform tidak di-expose ke PostgREST, jadi fungsi Midtrans (yang memakai
--    supabase-js + service role) memanggil wrapper di public ini. EXECUTE hanya untuk
--    service_role; anon/authenticated tidak bisa memanggilnya.
-- -----------------------------------------------------------------------------
create or replace function public.billing_register_midtrans_order(
  p_order_id      text,
  p_clinic_id     uuid,
  p_plan_id       uuid,
  p_billing_cycle text
)
returns table (invoice_id uuid, payment_id uuid, amount_idr bigint, plan_name text)
language sql
security definer
set search_path = ''
as $$
  select * from platform.register_midtrans_order(p_order_id, p_clinic_id, p_plan_id, p_billing_cycle);
$$;

create or replace function public.billing_settle_midtrans_order(
  p_order_id     text,
  p_outcome      text,
  p_gross_amount bigint,
  p_raw          jsonb
)
returns text
language sql
security definer
set search_path = ''
as $$
  select platform.settle_midtrans_order(p_order_id, p_outcome, p_gross_amount, p_raw);
$$;

revoke all on function public.billing_register_midtrans_order(text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.billing_settle_midtrans_order(text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.billing_register_midtrans_order(text, uuid, uuid, text) to service_role;
grant execute on function public.billing_settle_midtrans_order(text, text, bigint, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- 7. Jadwal harian: tandai invoice jatuh tempo (00:05 WIB = 17:05 UTC)
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'platform-mark-overdue-invoices';
select cron.schedule(
  'platform-mark-overdue-invoices',
  '5 17 * * *',
  $$ select platform.mark_overdue_invoices(); $$
);
