-- =============================================================================
-- Penguatan berdasarkan Supabase Security Advisor proyek produksi (29 Sep 2026)
-- -----------------------------------------------------------------------------
-- 1. [ERROR] View SECURITY DEFINER: v_patient_summary, v_daily_revenue,
--    v_monthly_revenue, v_popular_treatments berjalan dengan hak pembuatnya
--    (melewati RLS) DAN bisa dibaca role anon → ringkasan pasien & pendapatan
--    SEMUA klinik terbaca tanpa login memakai anon key publik.
--    Perbaikan: security_invoker = true (RLS pemanggil berlaku) + cabut akses anon.
-- 2. [WARN] Fungsi SECURITY DEFINER bisa dipanggil anon lewat /rest/v1/rpc.
--    Cabut EXECUTE dari anon/public; fungsi trigger juga dicabut dari authenticated
--    (trigger tetap berjalan — hak EXECUTE hanya dicek saat CREATE TRIGGER).
--    Pengecualian untuk anon: fungsi yang dievaluasi di dalam policy RLS.
-- 3. [WARN] Function search_path mutable: kunci search_path = public, extensions
--    (sama dengan default Supabase, sehingga perilaku tidak berubah).
-- Catatan: "Leaked password protection" diaktifkan dari Dashboard → Auth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. View
-- -----------------------------------------------------------------------------
do $$
declare
  v text;
begin
  foreach v in array array['v_patient_summary', 'v_daily_revenue', 'v_monthly_revenue', 'v_popular_treatments'] loop
    if to_regclass('public.' || v) is null then
      continue;
    end if;
    execute format('alter view public.%I set (security_invoker = true)', v);
    execute format('revoke all on public.%I from anon, public', v);
    execute format('grant select on public.%I to authenticated, service_role', v);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Hak EXECUTE fungsi SECURITY DEFINER di public
-- -----------------------------------------------------------------------------
do $$
declare
  f record;
  -- Dievaluasi di dalam policy RLS (juga untuk anon): harus tetap bisa dieksekusi,
  -- jika tidak kueri anon berakhir "permission denied" alih-alih "0 baris".
  policy_helpers text[] := array['get_user_clinic_id', 'get_user_role', 'has_permission', 'storage_object_in_my_clinic'];
begin
  for f in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args,
           p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    if f.proname = any (policy_helpers) then
      continue;
    end if;

    execute format('revoke execute on function public.%I(%s) from public, anon', f.proname, f.args);

    if f.is_trigger then
      execute format('revoke execute on function public.%I(%s) from authenticated', f.proname, f.args);
    end if;
  end loop;
end $$;

-- rls_auto_enable adalah event trigger (bukan RPC) — tidak perlu bisa dipanggil siapa pun.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. search_path tetap untuk fungsi yang belum menetapkannya
-- -----------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c like 'search_path=%'
      )
      -- fungsi milik ekstensi dikelola ekstensinya
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %I.%I(%s) set search_path = public, extensions',
                   f.nspname, f.proname, f.args);
  end loop;
end $$;
