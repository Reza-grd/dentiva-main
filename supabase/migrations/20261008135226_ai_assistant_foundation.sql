-- =============================================================================
-- Asisten AI Dentiva — fondasi (Minggu 1)
-- -----------------------------------------------------------------------------
-- * Fungsi data keuangan untuk AI: HANYA BACA, hanya admin, hanya klinik
--   pemanggil, hanya angka agregat (tanpa nama/NIK/rekam medis pasien).
--   Rumus pendapatan sama dengan laporan yang ada: payments status 'paid',
--   tanggal menurut Asia/Jakarta.
-- * ai_usage: catatan setiap pemakaian (token, biaya) untuk kuota & audit.
-- * Fitur paket `ai_assistant` (Pro, Enterprise) + saklar & persetujuan per klinik.
-- =============================================================================

-- ---------- pencatatan pemakaian ----------
create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  feature       text not null default 'finance_chat',
  model         text not null,
  question      text,
  tools_used    text[] not null default '{}',
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd      numeric(10,5) not null default 0,
  status        text not null default 'ok' check (status in ('ok', 'error', 'refused')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_ai_usage_clinic_created on public.ai_usage (clinic_id, created_at desc);
create index if not exists idx_ai_usage_user on public.ai_usage (user_id);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_admin_read on public.ai_usage;
create policy ai_usage_admin_read on public.ai_usage for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id()) and (select public.get_user_role()) = 'admin');
-- tulis hanya lewat edge function (service_role)
revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- ---------- fitur paket ----------
do $$
begin
  if to_regclass('public.subscription_plans') is not null then
    update public.subscription_plans
       set features = coalesce(features, '{}'::jsonb) || jsonb_build_object('ai_assistant', name in ('Pro', 'Enterprise'))
     where name in ('Starter', 'Pro', 'Enterprise');
  end if;
end $$;

-- ---------- helper ----------
create or replace function public.ai_require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.get_user_clinic_id();
begin
  if public.get_user_role() is distinct from 'admin' or v_clinic is null then
    raise exception 'Asisten AI hanya untuk admin klinik' using errcode = 'insufficient_privilege';
  end if;
  return v_clinic;
end;
$$;

create or replace function public.ai_check_range(p_from date, p_to date)
returns void
language plpgsql
immutable
set search_path = 'public', 'extensions'
as $$
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Periode tidak valid' using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > 400 then
    raise exception 'Periode maksimal 400 hari' using errcode = 'invalid_parameter_value';
  end if;
end;
$$;

-- ---------- 1. ringkasan pendapatan ----------
create or replace function public.ai_revenue_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_clinic uuid := public.ai_require_admin();
  v_len int;
  v_prev_from date; v_prev_to date;
  r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  v_len := p_to - p_from;
  v_prev_to := p_from - 1;
  v_prev_from := v_prev_to - v_len;

  with p as (
    select (tanggal_pembayaran at time zone 'Asia/Jakarta')::date d, total_bayar, coalesce(diskon, 0) diskon, metode_pembayaran
    from public.payments
    where clinic_id = v_clinic and status_pembayaran = 'paid'
      and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_prev_from and p_to
  ), cur as (select * from p where d between p_from and p_to),
     prev as (select * from p where d between v_prev_from and v_prev_to)
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to, 'jumlah_hari', v_len + 1),
    'total_pendapatan', coalesce((select sum(total_bayar) from cur), 0),
    'jumlah_transaksi', (select count(*) from cur),
    'rata_rata_transaksi', coalesce(round((select avg(total_bayar) from cur)), 0),
    'total_diskon', coalesce((select sum(diskon) from cur), 0),
    'per_metode', coalesce((select jsonb_agg(jsonb_build_object('metode', metode_pembayaran, 'total', t, 'transaksi', n) order by t desc)
                             from (select metode_pembayaran, sum(total_bayar) t, count(*) n from cur group by 1) m), '[]'),
    'per_hari', case when v_len <= 62 then coalesce((select jsonb_agg(jsonb_build_object('tanggal', d, 'total', t, 'transaksi', n) order by d)
                             from (select d, sum(total_bayar) t, count(*) n from cur group by 1) h), '[]') end,
    'per_bulan', case when v_len > 62 then coalesce((select jsonb_agg(jsonb_build_object('bulan', to_char(b, 'YYYY-MM'), 'total', t, 'transaksi', n) order by b)
                             from (select date_trunc('month', d) b, sum(total_bayar) t, count(*) n from cur group by 1) mm), '[]') end,
    'periode_sebelumnya', jsonb_build_object('dari', v_prev_from, 'sampai', v_prev_to,
        'total_pendapatan', coalesce((select sum(total_bayar) from prev), 0),
        'jumlah_transaksi', (select count(*) from prev))
  ) into r;
  return r;
end;
$$;

-- ---------- 2. kinerja tindakan (pendapatan, HPP, margin) ----------
create or replace function public.ai_treatment_performance(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  with paid_visits as (
    select distinct p.visit_id
    from public.payments p
    where p.clinic_id = v_clinic and p.status_pembayaran = 'paid' and p.visit_id is not null
      and (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date between p_from and p_to
  ), rows as (
    select t.nama_treatment, t.kategori, t.harga_dasar, vt.quantity, vt.subtotal, s.total_modal, s.margin
    from paid_visits pv
    join public.visit_treatments vt on vt.visit_id = pv.visit_id
    join public.treatments t on t.id = vt.treatment_id and t.clinic_id = v_clinic
    left join public.treatment_cost_snapshot s on s.visit_treatment_id = vt.id
  ), agg as (
    select nama_treatment, kategori, max(harga_dasar) harga_master,
           sum(coalesce(quantity, 1)) jumlah, sum(subtotal) pendapatan,
           count(total_modal) baris_dengan_hpp, count(*) baris,
           sum(total_modal) total_hpp, sum(margin) total_margin
    from rows group by 1, 2
  )
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'catatan', 'HPP/margin hanya tersedia untuk tindakan yang sudah dihitung biayanya (snapshot saat kunjungan selesai).',
    'tindakan', coalesce((select jsonb_agg(jsonb_build_object(
        'nama', nama_treatment, 'kategori', kategori, 'harga_master', harga_master,
        'jumlah', jumlah, 'pendapatan', pendapatan,
        'hpp_tersedia', baris_dengan_hpp = baris and baris > 0,
        'total_hpp', total_hpp, 'total_margin', total_margin,
        'margin_persen', case when baris_dengan_hpp = baris and pendapatan > 0 then round(total_margin / pendapatan * 100, 1) end
      ) order by pendapatan desc) from (select * from agg order by pendapatan desc limit 40) a), '[]')
  ) into r;
  return r;
end;
$$;

-- ---------- 3. pengeluaran & laba ----------
create or replace function public.ai_expense_summary(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); v_rev numeric; v_exp numeric; r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  select coalesce(sum(total_bayar), 0) into v_rev from public.payments
   where clinic_id = v_clinic and status_pembayaran = 'paid'
     and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between p_from and p_to;
  select coalesce(sum(jumlah), 0) into v_exp from public.expenses
   where clinic_id = v_clinic and tanggal_expense between p_from and p_to;
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'total_pendapatan', v_rev,
    'total_pengeluaran', v_exp,
    'selisih_pendapatan_minus_pengeluaran', v_rev - v_exp,
    'per_kategori', coalesce((select jsonb_agg(jsonb_build_object('kategori', kategori, 'total', t, 'jumlah_catatan', n) order by t desc)
        from (select coalesce(kategori, 'Lainnya') kategori, sum(jumlah) t, count(*) n from public.expenses
              where clinic_id = v_clinic and tanggal_expense between p_from and p_to group by 1) k), '[]'),
    'overhead_bulanan_aktif', coalesce((select jsonb_agg(jsonb_build_object('nama', nama_biaya, 'kategori', kategori, 'per_bulan', jumlah_bulanan) order by jumlah_bulanan desc)
        from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true)), '[]'),
    'total_overhead_bulanan', coalesce((select sum(jumlah_bulanan) from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true)), 0)
  ) into r;
  return r;
end;
$$;

-- ---------- 4. kinerja per dokter ----------
create or replace function public.ai_doctor_performance(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  with v as (
    select v.id, v.dokter_id, v.status
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.tanggal_kunjungan between p_from and p_to
  ), pay as (
    select p.visit_id, sum(p.total_bayar) total
    from public.payments p
    where p.clinic_id = v_clinic and p.status_pembayaran = 'paid' and p.visit_id in (select id from v)
    group by 1
  )
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'dokter', coalesce(jsonb_agg(jsonb_build_object(
        'nama', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'kunjungan', x.kunjungan, 'selesai', x.selesai, 'batal', x.batal, 'pendapatan', x.pendapatan
      ) order by x.pendapatan desc), '[]')
  ) into r
  from (
    select v.dokter_id, count(*) kunjungan,
           count(*) filter (where v.status = 'completed') selesai,
           count(*) filter (where v.status = 'cancelled') batal,
           coalesce(sum(pay.total), 0) pendapatan
    from v left join pay on pay.visit_id = v.id
    group by v.dokter_id
  ) x
  left join public.users u on u.id = x.dokter_id;
  return r;
end;
$$;

-- ---------- 5. peringatan stok ----------
create or replace function public.ai_stock_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); v_today date := (now() at time zone 'Asia/Jakarta')::date; r jsonb;
begin
  select jsonb_build_object(
    'tanggal', v_today,
    'stok_menipis', coalesce((select jsonb_agg(jsonb_build_object('bahan', nama_bahan, 'stok', stok_saat_ini, 'minimum', stok_minimum, 'satuan', satuan_dasar) order by stok_saat_ini)
        from public.master_bahan where clinic_id = v_clinic and coalesce(is_active, true) and stok_minimum is not null and stok_saat_ini <= stok_minimum), '[]'),
    'kadaluarsa_60_hari', coalesce((select jsonb_agg(jsonb_build_object('bahan', m.nama_bahan, 'batch', b.no_batch, 'sisa', b.qty_sisa, 'kadaluarsa', b.tanggal_kadaluarsa,
                                   'sudah_lewat', b.tanggal_kadaluarsa < v_today) order by b.tanggal_kadaluarsa)
        from public.material_batches b join public.master_bahan m on m.id = b.material_id
        where b.clinic_id = v_clinic and coalesce(b.qty_sisa, 0) > 0 and b.tanggal_kadaluarsa is not null
          and b.tanggal_kadaluarsa <= v_today + 60), '[]')
  ) into r;
  return r;
end;
$$;

-- ---------- 6. kunjungan selesai belum dibayar ----------
create or replace function public.ai_unbilled_visits(p_days integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); v_days int := least(greatest(coalesce(p_days, 60), 1), 365); r jsonb;
begin
  with u as (
    select v.id, v.tanggal_kunjungan,
           coalesce((select sum(vt.subtotal) from public.visit_treatments vt where vt.visit_id = v.id), 0) est
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed'
      and v.tanggal_kunjungan >= (now() at time zone 'Asia/Jakarta')::date - v_days
      and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')
  )
  select jsonb_build_object(
    'rentang_hari', v_days,
    'jumlah_kunjungan', (select count(*) from u),
    'perkiraan_nilai', coalesce((select sum(est) from u), 0),
    'per_tanggal', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal_kunjungan, 'kunjungan', n, 'perkiraan', t) order by tanggal_kunjungan desc)
        from (select tanggal_kunjungan, count(*) n, sum(est) t from u group by 1 order by 1 desc limit 31) d), '[]')
  ) into r;
  return r;
end;
$$;

-- ---------- 7. statistik operasional ----------
create or replace function public.ai_visit_stats(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'kunjungan_per_status', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.visits
        where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan between p_from and p_to group by 1) s), '{}'),
    'pasien_baru', (select count(*) from public.patients where clinic_id = v_clinic and deleted_at is null
                     and (created_at at time zone 'Asia/Jakarta')::date between p_from and p_to),
    'booking_online', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.booking_requests
        where clinic_id = v_clinic and (created_at at time zone 'Asia/Jakarta')::date between p_from and p_to group by 1) b), '{}')
  ) into r;
  return r;
end;
$$;

-- ---------- status & saklar ----------
create or replace function public.ai_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_clinic uuid := public.ai_require_admin();
  v_plan text; v_feature boolean; v_enabled boolean; v_used int;
begin
  select p.name, coalesce((p.features ->> 'ai_assistant')::boolean, false)
    into v_plan, v_feature
    from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.clinic_id = v_clinic and s.status in ('active', 'trialing')
   order by s.created_at desc limit 1;
  select value = 'true' into v_enabled from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  select count(*) into v_used from public.ai_usage
   where clinic_id = v_clinic and status = 'ok'
     and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  return jsonb_build_object(
    'paket', v_plan,
    'tersedia_di_paket', coalesce(v_feature, false),
    'aktif', coalesce(v_enabled, false),
    'kuota_bulanan', case v_plan when 'Enterprise' then 1000 when 'Pro' then 300 else 0 end,
    'terpakai_bulan_ini', v_used
  );
end;
$$;

create or replace function public.ai_set_enabled(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare v_clinic uuid := public.ai_require_admin();
begin
  update public.clinic_settings set value = case when p_enabled then 'true' else 'false' end, updated_at = now()
   where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  if not found then
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic, 'ai_assistant_enabled', case when p_enabled then 'true' else 'false' end);
  end if;
  if p_enabled then
    delete from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_consent';
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic, 'ai_assistant_consent', jsonb_build_object('oleh', auth.uid(), 'pada', now())::text);
  end if;
  return public.ai_status();
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'ai_require_admin()', 'ai_revenue_summary(date,date)', 'ai_treatment_performance(date,date)',
    'ai_expense_summary(date,date)', 'ai_doctor_performance(date,date)', 'ai_stock_alerts()',
    'ai_unbilled_visits(integer)', 'ai_visit_stats(date,date)', 'ai_status()', 'ai_set_enabled(boolean)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
