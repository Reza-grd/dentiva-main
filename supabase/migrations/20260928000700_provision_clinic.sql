-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 7/7 — provision_clinic
-- -----------------------------------------------------------------------------
-- platform.provision_clinic(): membuat klinik, langganan trial, profil pemilik
-- (admin klinik), dan pengaturan awal dalam SATU transaksi.
--
-- Akun Auth pemilik dibuat lebih dulu oleh console-api lewat Admin API
-- (inviteUserByEmail). Jika fungsi ini gagal, console-api menghapus akun Auth itu
-- lagi sehingga tidak ada akun yatim.
--
-- Juga: platform.revoke_user_sessions() untuk mencabut sesi saat user
-- ditangguhkan / dinonaktifkan dari Console.
-- =============================================================================

create or replace function platform.provision_clinic(
  p_owner_user_id uuid,
  p_owner_email   text,
  p_owner_name    text,
  p_owner_phone   text,
  p_name          text,
  p_slug          text,
  p_phone         text,
  p_email         text,
  p_address       text,
  p_city          text,
  p_province      text,
  p_plan_id       uuid,
  p_trial_days    int,
  p_operator_id   uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_owner_role_id uuid;
  v_legacy uuid;
  v_cols text;
  v_trial_end timestamptz;
  v_status text;
begin
  if p_trial_days is null or p_trial_days < 0 or p_trial_days > 90 then
    raise exception 'trial_days harus 0–90' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.clinics where slug = p_slug) then
    raise exception 'Slug "%" sudah dipakai klinik lain', p_slug using errcode = 'unique_violation';
  end if;

  if not exists (select 1 from public.subscription_plans where id = p_plan_id and coalesce(is_active, true)) then
    raise exception 'Paket tidak ditemukan atau tidak aktif' using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.users where id = p_owner_user_id) then
    raise exception 'Akun pemilik sudah terdaftar di klinik lain' using errcode = 'unique_violation';
  end if;

  if exists (select 1 from platform.operators where user_id = p_owner_user_id) then
    raise exception 'Akun pemilik adalah operator Dentiva; gunakan email lain' using errcode = 'check_violation';
  end if;

  v_trial_end := case when p_trial_days > 0 then now() + make_interval(days => p_trial_days) end;
  v_status := case when p_trial_days > 0 then 'trial' else 'active' end;

  -- 1. Klinik
  insert into public.clinics (name, slug, status, owner_user_id, phone, email, address, city, province,
                              trial_ends_at, activated_at)
  values (p_name, p_slug, v_status, p_owner_user_id, nullif(p_phone, ''), nullif(p_email, ''),
          nullif(p_address, ''), nullif(p_city, ''), nullif(p_province, ''),
          v_trial_end, case when v_status = 'active' then now() end)
  returning id into v_clinic_id;

  -- 2. Langganan
  insert into public.clinic_subscriptions (clinic_id, plan_id, status, billing_cycle,
                                           current_period_start, current_period_end, cancel_at_period_end)
  values (v_clinic_id, p_plan_id,
          case when v_status = 'trial' then 'trialing' else 'active' end,
          'monthly',
          now(),
          coalesce(v_trial_end, now() + interval '1 month'),
          false);

  -- 3. Profil pemilik = admin klinik (status 'invited' sampai login pertama).
  --    Trigger users_sync_clinic_claim mengisi app_metadata.clinic_id di auth.users.
  if to_regclass('public.roles') is not null then
    select id into v_owner_role_id from public.roles where name = 'Clinic Owner';
  end if;

  insert into public.users (id, email, full_name, role, phone, clinic_id, status, invited_by, role_id)
  values (p_owner_user_id, lower(p_owner_email), p_owner_name, 'admin', nullif(p_owner_phone, ''),
          v_clinic_id, 'invited', p_operator_id, v_owner_role_id);

  -- 4. Pengaturan awal klinik
  if to_regclass('public.clinic_settings') is not null then
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic_id, 'clinic_name', p_name),
           (v_clinic_id, 'clinic_phone', coalesce(p_phone, ''))
    on conflict do nothing;
  end if;

  -- 5. Bobot tier costing: salin nilai bawaan dari klinik warisan (jika ada)
  v_legacy := platform.legacy_clinic_id();
  if to_regclass('public.tier_weights') is not null and v_legacy is not null and v_legacy <> v_clinic_id then
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'tier_weights'
      and column_name not in ('clinic_id', 'updated_by', 'updated_at', 'created_at');

    if v_cols is not null then
      execute format(
        'insert into public.tier_weights (clinic_id, %s) select $1, %s from public.tier_weights where clinic_id = $2 on conflict do nothing',
        v_cols, v_cols)
      using v_clinic_id, v_legacy;
    end if;
  end if;

  return v_clinic_id;
end;
$$;

revoke all on function platform.provision_clinic(uuid, text, text, text, text, text, text, text, text, text, text, uuid, int, uuid)
  from public, anon, authenticated;
grant execute on function platform.provision_clinic(uuid, text, text, text, text, text, text, text, text, text, text, uuid, int, uuid)
  to service_role;

-- -----------------------------------------------------------------------------
-- Cabut semua sesi (refresh token) user. Access token yang masih berlaku
-- (≤ 1 jam) tetap tidak bisa membaca data karena get_user_clinic_id() memeriksa
-- status user secara langsung.
-- -----------------------------------------------------------------------------
create or replace function platform.revoke_user_sessions(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function platform.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function platform.revoke_user_sessions(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- Satu entri audit dari dalam database (dipakai console-api lewat RPC agar
-- insert audit memakai fungsi yang sama dengan validasi format action).
-- -----------------------------------------------------------------------------
create or replace function platform.write_audit(
  p_operator_id uuid,
  p_action      text,
  p_target_type text,
  p_target_id   text,
  p_clinic_id   uuid,
  p_reason      text,
  p_before      jsonb,
  p_after       jsonb,
  p_ip          text,
  p_user_agent  text,
  p_request_id  text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_ip inet;
begin
  begin
    v_ip := nullif(split_part(coalesce(p_ip, ''), ',', 1), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into platform.audit_logs (operator_id, action, target_type, target_id, clinic_id, reason,
                                   before, after, ip, user_agent, request_id)
  values (p_operator_id, p_action, p_target_type, p_target_id, p_clinic_id, p_reason,
          p_before, p_after, v_ip, left(p_user_agent, 300), p_request_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function platform.write_audit(uuid, text, text, text, uuid, text, jsonb, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function platform.write_audit(uuid, text, text, text, uuid, text, jsonb, jsonb, text, text, text)
  to service_role;
