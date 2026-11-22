-- =============================================================================
-- Checkout langganan Midtrans: bayar = klinik langsung aktif (keputusan pemilik 15 Nov 2026)
-- -----------------------------------------------------------------------------
-- Alur: Beli paket → daftar akun & data klinik (status 'pending') → verifikasi email →
-- halaman checkout → Midtrans Snap → webhook terverifikasi → klinik 'active'.
-- Pendaftaran tanpa bayar tetap menunggu persetujuan operator seperti sebelumnya.
--
-- 1. billing_settle_midtrans_order(): pembayaran terkonfirmasi juga mengaktifkan
--    klinik 'pending' (selain 'trial' yang sudah ditangani platform.settle_midtrans_order).
-- 2. get_checkout_plans(): daftar paket aktif untuk halaman checkout — bisa dibaca
--    admin klinik 'pending' yang belum punya akses data (RLS).
-- 3. get_checkout_status(order_id): status order milik klinik pemanggil, untuk halaman
--    "Menunggu pembayaran" (polling setelah popup Snap ditutup).
-- =============================================================================

create or replace function public.billing_settle_midtrans_order(
  p_order_id     text,
  p_outcome      text,
  p_gross_amount bigint,
  p_raw          jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text;
  v_clinic uuid;
begin
  v_result := platform.settle_midtrans_order(p_order_id, p_outcome, p_gross_amount, p_raw);
  if v_result = 'confirmed' then
    select clinic_id into v_clinic from platform.payments
    where provider = 'midtrans' and provider_ref = p_order_id;
    update public.clinics
    set status = 'active', trial_ends_at = null, activated_at = coalesce(activated_at, now())
    where id = v_clinic and status = 'pending';
  end if;
  return v_result;
end;
$$;
revoke all on function public.billing_settle_midtrans_order(text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.billing_settle_midtrans_order(text, text, bigint, jsonb) to service_role;

create or replace function public.get_checkout_plans()
returns table (id uuid, name text, price_monthly numeric, price_yearly numeric,
               max_users integer, max_patients integer, features jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name::text, p.price_monthly, p.price_yearly, p.max_users, p.max_patients, p.features
  from public.subscription_plans p
  where coalesce(p.is_active, true)
    and exists (select 1 from public.users u where u.id = auth.uid())
  order by p.price_monthly asc nulls last;
$$;
revoke all on function public.get_checkout_plans() from public, anon;
grant execute on function public.get_checkout_plans() to authenticated;

create or replace function public.get_checkout_status(p_order_id text)
returns table (status text, amount_idr bigint, paid_at timestamptz, invoice_number text, clinic_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.status::text, p.amount_idr, p.paid_at, i.number::text, c.status::text
  from platform.payments p
  join platform.invoices i on i.id = p.invoice_id
  join public.clinics c on c.id = p.clinic_id
  join public.users u on u.clinic_id = p.clinic_id and u.id = auth.uid() and u.role = 'admin'
  where p.provider = 'midtrans' and p.provider_ref = p_order_id;
$$;
revoke all on function public.get_checkout_status(text) from public, anon;
grant execute on function public.get_checkout_status(text) to authenticated;
