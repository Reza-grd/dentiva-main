-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 4/7 — tenant_guard
-- -----------------------------------------------------------------------------
-- 1. public.get_user_clinic_id() ditulis ulang:
--      * TIDAK ADA lagi fallback ke klinik default.
--      * Mengembalikan clinic_id hanya jika klinik berstatus trial/active DAN
--        user berstatus invited/active DAN klaim JWT cocok dengan public.users.
--      * Selain itu NULL → semua policy `clinic_id = get_user_clinic_id()` gagal.
--    Artinya: suspend klinik atau user dari Console = akses data langsung terputus.
--
-- 2. public.get_user_role() mengembalikan NULL untuk user yang tidak aktif.
--
-- 3. Policy RESTRICTIVE `tenant_isolation` di setiap tabel ber-clinic_id.
--    Ini memperbaiki celah nyata: policy dari migration 41 (patients, visits,
--    payments, medical_record_versions, audit_logs) hanya memeriksa
--    has_permission() TANPA clinic_id; karena policy permissive digabung OR,
--    staf klinik A bisa membaca data klinik B. Policy restrictive digabung AND
--    dengan semua policy lain, sehingga isolasi berlaku apa pun isi policy lama.
--
-- 4. Semua pemanggilan get_user_clinic_id(), get_user_role(), has_permission()
--    di policy yang ada dibungkus `(select ...)` agar dihitung sekali per query
--    (initPlan), bukan sekali per baris.
--
-- 5. public.clinics diberi RLS: user hanya bisa membaca kliniknya sendiri.
--
-- 6. Perbaikan public.dynamic_audit_trigger(): clinic_id selalu terisi.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_user_clinic_id()
-- -----------------------------------------------------------------------------
create or replace function public.get_user_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.clinics c
  join public.users u on u.clinic_id = c.id
  where c.id = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid
    and u.id = auth.uid()
    and c.status in ('trial', 'active')
    and u.status in ('invited', 'active');
$$;

comment on function public.get_user_clinic_id() is
  'Klinik milik user yang sedang login, atau NULL jika klinik/user tidak aktif. Dipakai semua policy RLS. Tulis sebagai (select public.get_user_clinic_id()) di policy.';

revoke all on function public.get_user_clinic_id() from public;
-- anon tetap boleh memanggil (hasilnya selalu NULL) agar evaluasi policy untuk anon
-- menghasilkan "tidak ada baris", bukan error "permission denied for function".
grant execute on function public.get_user_clinic_id() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. get_user_role()
-- -----------------------------------------------------------------------------
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.status in ('invited', 'active');
$$;

revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_role() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. public.clinics — hanya klinik sendiri, tanpa tulis dari klien
-- -----------------------------------------------------------------------------
alter table public.clinics enable row level security;

drop policy if exists clinics_select_own on public.clinics;
create policy clinics_select_own on public.clinics
  for select
  to authenticated
  using (id = (select public.get_user_clinic_id()));

revoke insert, update, delete, truncate on public.clinics from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Policy restrictive tenant_isolation untuk semua tabel ber-clinic_id
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'clinic_id' and not a.attisdropped
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
    order by c.relname
  loop
    if not t.rls_enabled then
      -- Tabel ini sebelumnya TERBUKA untuk semua user login. Pertahankan
      -- fungsinya, tapi batasi ke klinik sendiri.
      raise notice 'tenant_guard: RLS belum aktif di public.% — diaktifkan dengan policy per klinik', t.table_name;
      execute format('alter table public.%I enable row level security', t.table_name);
      execute format('drop policy if exists tenant_default_access on public.%I', t.table_name);
      execute format(
        'create policy tenant_default_access on public.%I
           for all to authenticated
           using (clinic_id = (select public.get_user_clinic_id()))
           with check (clinic_id = (select public.get_user_clinic_id()))',
        t.table_name);
    end if;

    execute format('drop policy if exists tenant_isolation on public.%I', t.table_name);
    execute format(
      'create policy tenant_isolation on public.%I
         as restrictive
         for all
         to public
         using (clinic_id = (select public.get_user_clinic_id()))
         with check (clinic_id = (select public.get_user_clinic_id()))',
      t.table_name);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Bungkus pemanggilan fungsi di semua policy public.* dengan (select ...)
-- -----------------------------------------------------------------------------
create or replace function platform.wrap_policy_expr(expr text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  out_expr text := expr;
begin
  if out_expr is null then
    return null;
  end if;

  if out_expr !~* 'select\s+(public\.)?get_user_clinic_id\(\)' then
    out_expr := regexp_replace(out_expr, '(public\.)?get_user_clinic_id\(\)',
                               '( SELECT public.get_user_clinic_id() AS get_user_clinic_id)', 'g');
  end if;

  if out_expr !~* 'select\s+(public\.)?get_user_role\(\)' then
    out_expr := regexp_replace(out_expr, '(public\.)?get_user_role\(\)',
                               '( SELECT public.get_user_role() AS get_user_role)', 'g');
  end if;

  if out_expr !~* 'select\s+(public\.)?has_permission\(' then
    out_expr := regexp_replace(out_expr, '(public\.)?has_permission\(('')[^'']*''(::(text|character varying))?)\)',
                               '( SELECT public.has_permission(\2) AS has_permission)', 'g');
  end if;

  return out_expr;
end;
$$;

do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and policyname not in ('tenant_isolation', 'tenant_default_access', 'clinics_select_own')
      and (
        coalesce(qual, '') ~ '(get_user_clinic_id|get_user_role|has_permission)\('
        or coalesce(with_check, '') ~ '(get_user_clinic_id|get_user_role|has_permission)\('
      )
  loop
    new_qual  := platform.wrap_policy_expr(p.qual);
    new_check := platform.wrap_policy_expr(p.with_check);

    if new_qual is not distinct from p.qual and new_check is not distinct from p.with_check then
      continue;
    end if;

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;

    begin
      execute stmt;
    exception when others then
      -- Jangan gagalkan seluruh migration karena satu policy; laporkan untuk ditinjau.
      raise warning 'tenant_guard: gagal membungkus policy %.% (%): %',
        p.tablename, p.policyname, sqlstate, sqlerrm;
    end;
  end loop;
end $$;

revoke all on function platform.wrap_policy_expr(text) from service_role;

-- -----------------------------------------------------------------------------
-- 6. dynamic_audit_trigger(): clinic_id selalu terisi, aman untuk tabel tanpa is_active
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.dynamic_audit_trigger()') is null then
    raise notice 'tenant_guard: public.dynamic_audit_trigger() tidak ada, dilewati';
    return;
  end if;

  execute $fn$
    create or replace function public.dynamic_audit_trigger()
    returns trigger
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
      v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
      v_action text;
      v_risk_level text := 'LOW';
      v_clinic_id uuid;
    begin
      if tg_op = 'INSERT' then
        v_action := 'CREATE';
      elsif tg_op = 'UPDATE' then
        if (v_new ->> 'is_active') = 'false' and (v_old ->> 'is_active') = 'true' then
          v_action := 'SOFT_DELETE';
          v_risk_level := 'HIGH';
        else
          v_action := 'UPDATE';
        end if;
      else
        v_action := 'HARD_DELETE';
        v_risk_level := 'CRITICAL';
      end if;

      v_clinic_id := coalesce(
        nullif(v_new ->> 'clinic_id', '')::uuid,
        nullif(v_old ->> 'clinic_id', '')::uuid,
        public.get_user_clinic_id()
      );

      if v_clinic_id is null then
        -- Tidak bisa ditautkan ke klinik mana pun; jangan gagalkan transaksi utama.
        return coalesce(new, old);
      end if;

      insert into public.audit_logs (user_id, clinic_id, module, action, previous_value, new_value, risk_level)
      values (
        auth.uid(),
        v_clinic_id,
        upper(tg_table_name),
        v_action,
        case when tg_op in ('UPDATE', 'DELETE') then v_old end,
        case when tg_op in ('INSERT', 'UPDATE') then v_new end,
        v_risk_level
      );

      return coalesce(new, old);
    end;
    $body$;
  $fn$;
end $$;
