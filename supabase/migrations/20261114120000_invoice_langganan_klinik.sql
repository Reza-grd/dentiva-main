-- =============================================================================
-- Invoice langganan untuk klinik (pembelian paket via transfer manual)
-- -----------------------------------------------------------------------------
-- * platform.invoices: + plan_id, billing_cycle; sumber baru 'clinic_request'.
-- * public.billing_minta_invoice(plan, siklus): manajer klinik memilih paket →
--   invoice 'open' dibuat di server (nominal dari katalog paket, bukan dari klien).
--   Permintaan berulang untuk paket & siklus yang sama memakai invoice yang sama;
--   permintaan paket lain membatalkan (void) permintaan lama yang belum dibayar.
-- * public.billing_invoice_klinik(): daftar invoice klinik sendiri + data penagihan.
-- Hanya manajer klinik (role admin) yang bisa memanggil. Status klinik trial/active/
-- past_due tetap boleh (klinik yang menunggak justru perlu invoice).
-- =============================================================================

alter table platform.invoices
  add column if not exists plan_id uuid references public.subscription_plans (id) on delete set null,
  add column if not exists billing_cycle text;

alter table platform.invoices drop constraint if exists invoices_billing_cycle_check;
alter table platform.invoices add constraint invoices_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('monthly', 'yearly'));

alter table platform.invoices drop constraint if exists invoices_source_check;
alter table platform.invoices add constraint invoices_source_check
  check (source in ('console', 'midtrans_checkout', 'clinic_request'));

-- Klinik milik manajer yang sedang login (tanpa syarat status klinik aktif).
create or replace function platform.klinik_manajer_saat_ini()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.clinic_id
  from public.users u
  join public.clinics c on c.id = u.clinic_id
  where u.id = auth.uid()
    and u.role = 'admin'
    and u.status in ('invited', 'active')
    and c.id = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid
    and c.status <> 'closed';
$$;

revoke all on function platform.klinik_manajer_saat_ini() from public, anon, authenticated;

-- Bentuk JSON satu invoice untuk aplikasi klinik (tanpa kolom internal operator).
create or replace function platform.invoice_json(p_inv platform.invoices)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_inv.id,
    'number', p_inv.number,
    'status', p_inv.status,
    'issued_at', p_inv.created_at,
    'due_date', p_inv.due_date,
    'paid_at', p_inv.paid_at,
    'period_start', p_inv.period_start,
    'period_end', p_inv.period_end,
    'amount_idr', p_inv.amount_idr,
    'tax_idr', p_inv.tax_idr,
    'total_idr', p_inv.total_idr,
    'description', coalesce(p_inv.notes, 'Langganan Dentiva'),
    'plan_name', (select sp.name from public.subscription_plans sp where sp.id = p_inv.plan_id),
    'billing_cycle', p_inv.billing_cycle
  );
$$;

revoke all on function platform.invoice_json(platform.invoices) from public, anon, authenticated;

create or replace function platform.klinik_tagihan_json(p_clinic_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', c.name, 'address', c.address, 'city', c.city, 'province', c.province,
    'email', c.email, 'phone', c.phone
  )
  from public.clinics c where c.id = p_clinic_id;
$$;

revoke all on function platform.klinik_tagihan_json(uuid) from public, anon, authenticated;

create or replace function public.billing_minta_invoice(p_plan_id uuid, p_billing_cycle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid := platform.klinik_manajer_saat_ini();
  v_plan public.subscription_plans;
  v_amount bigint;
  v_inv platform.invoices;
  v_start date := (now() at time zone 'Asia/Jakarta')::date;
  v_end date;
  v_siklus text;
begin
  if v_clinic is null then
    raise exception 'Hanya manajer klinik yang dapat membuat invoice langganan' using errcode = 'insufficient_privilege';
  end if;
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Siklus tagihan tidak valid' using errcode = 'check_violation';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id and coalesce(is_active, true);
  if not found then
    raise exception 'Paket tidak ditemukan atau tidak aktif' using errcode = 'no_data_found';
  end if;

  v_amount := round(case when p_billing_cycle = 'yearly' then v_plan.price_yearly else v_plan.price_monthly end)::bigint;
  if coalesce(v_amount, 0) <= 0 then
    raise exception 'Paket % tidak berbayar', v_plan.name using errcode = 'check_violation';
  end if;

  -- Kunci per klinik agar dua klik bersamaan tidak membuat dua invoice.
  perform pg_advisory_xact_lock(hashtext('billing_minta_invoice:' || v_clinic::text));

  -- Pakai ulang permintaan yang masih terbuka untuk paket & siklus yang sama.
  select * into v_inv from platform.invoices
  where clinic_id = v_clinic and source = 'clinic_request' and status in ('open', 'overdue')
    and plan_id = p_plan_id and billing_cycle = p_billing_cycle and amount_idr = v_amount
  order by created_at desc limit 1;

  if not found then
    -- Batas wajar: 10 permintaan invoice per klinik per hari.
    if (select count(*) from platform.invoices
        where clinic_id = v_clinic and source = 'clinic_request' and created_at > now() - interval '1 day') >= 10 then
      raise exception 'Terlalu banyak permintaan invoice hari ini. Coba lagi besok atau hubungi tim Dentiva.' using errcode = 'check_violation';
    end if;

    -- Permintaan paket lain yang belum dibayar diganti oleh permintaan baru.
    update platform.invoices
    set status = 'void', voided_at = now(), void_reason = 'Diganti permintaan paket lain oleh klinik'
    where clinic_id = v_clinic and source = 'clinic_request' and status in ('open', 'overdue')
      and not exists (select 1 from platform.payments p where p.invoice_id = platform.invoices.id and p.status = 'confirmed');

    v_end := (case when p_billing_cycle = 'yearly' then v_start + interval '1 year' else v_start + interval '1 month' end)::date - 1;
    v_siklus := case when p_billing_cycle = 'yearly' then 'tahunan' else 'bulanan' end;
    v_inv := platform.create_invoice(v_clinic, v_start, v_end, v_amount, 0, v_start + 3,
                                     format('Langganan Dentiva paket %s (%s)', v_plan.name, v_siklus),
                                     null, 'clinic_request');
    update platform.invoices set plan_id = p_plan_id, billing_cycle = p_billing_cycle
    where id = v_inv.id returning * into v_inv;
  end if;

  return jsonb_build_object('invoice', platform.invoice_json(v_inv), 'bill_to', platform.klinik_tagihan_json(v_clinic));
end;
$$;

create or replace function public.billing_invoice_klinik()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic uuid := platform.klinik_manajer_saat_ini();
begin
  if v_clinic is null then
    raise exception 'Hanya manajer klinik yang dapat melihat invoice langganan' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'bill_to', platform.klinik_tagihan_json(v_clinic),
    'invoices', coalesce((
      select jsonb_agg(platform.invoice_json(i) order by i.created_at desc)
      from (select * from platform.invoices
            where clinic_id = v_clinic and status <> 'void'
            order by created_at desc limit 36) i
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.billing_minta_invoice(uuid, text) from public, anon;
revoke all on function public.billing_invoice_klinik() from public, anon;
grant execute on function public.billing_minta_invoice(uuid, text) to authenticated;
grant execute on function public.billing_invoice_klinik() to authenticated;

comment on function public.billing_minta_invoice(uuid, text) is
  'Manajer klinik meminta invoice langganan (transfer manual). Nominal dari katalog paket; satu permintaan terbuka per klinik.';
comment on function public.billing_invoice_klinik() is
  'Daftar invoice langganan klinik sendiri (tanpa yang dibatalkan) beserta data penagihan klinik.';
