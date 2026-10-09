-- Asisten AI: ringkasan data siap pakai + laporan AI tersimpan untuk Dashboard.
--   ai_snapshot()  : satu panggilan berisi angka agregat terpenting (tanpa data pasien),
--                    disisipkan ke awal percakapan agar pertanyaan umum dijawab tanpa
--                    bolak-balik memanggil alat.
--   ai_insights    : laporan singkat buatan AI per klinik (cache, diperbarui berkala).
--   ai_status()    : kuota hanya menghitung pemakaian yang diminta pengguna
--                    (laporan otomatis Dashboard tidak mengurangi kuota).

create or replace function public.ai_snapshot()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare
  v_clinic uuid := public.ai_require_admin();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_month date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_tindakan jsonb;
begin
  v_tindakan := public.ai_treatment_performance(v_today - 89, v_today);
  return jsonb_build_object(
    'dihitung_pada', to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') || ' WIB',
    'hari_ini', public.ai_today_summary(),
    'pendapatan_bulan_ini', public.ai_revenue_summary(v_month, v_today),
    'pengeluaran_bulan_ini', public.ai_expense_summary(v_month, v_today) - 'overhead_bulanan_aktif',
    'tindakan_90_hari_top10', jsonb_build_object(
      'periode', v_tindakan -> 'periode',
      'tindakan', coalesce((select jsonb_agg(e) from (
        select e from jsonb_array_elements(v_tindakan -> 'tindakan') e limit 10) t), '[]')),
    'stok', public.ai_stock_alerts(),
    'belum_dibayar_30_hari', public.ai_unbilled_visits(30),
    'recall_6_bulan', public.ai_recall_stats(6)
  );
end $$;

revoke all on function public.ai_snapshot() from public, anon;
grant execute on function public.ai_snapshot() to authenticated, service_role;

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null default 'daily_brief' check (kind in ('daily_brief')),
  content jsonb not null,
  model text,
  generated_by uuid references public.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  unique (clinic_id, kind)
);
alter table public.ai_insights enable row level security;
drop policy if exists tenant_isolation on public.ai_insights;
create policy tenant_isolation on public.ai_insights as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id())) with check (clinic_id = (select public.get_user_clinic_id()));
drop policy if exists ai_insights_admin_select on public.ai_insights;
create policy ai_insights_admin_select on public.ai_insights for select to authenticated
  using ((select public.get_user_role()) = 'admin');
revoke insert, update, delete on public.ai_insights from anon, authenticated;
grant select on public.ai_insights to authenticated;

create or replace function public.ai_status()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
   where clinic_id = v_clinic and status = 'ok' and feature <> 'daily_brief'
     and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  return jsonb_build_object(
    'paket', v_plan,
    'tersedia_di_paket', coalesce(v_feature, false),
    'aktif', coalesce(v_enabled, false),
    'kuota_bulanan', case v_plan when 'Enterprise' then 1000 when 'Pro' then 300 else 0 end,
    'terpakai_bulan_ini', v_used
  );
end $$;
