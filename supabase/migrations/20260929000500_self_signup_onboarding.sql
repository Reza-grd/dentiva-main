-- =============================================================================
-- Pendaftaran klinik mandiri (menunggu persetujuan) + status onboarding
-- -----------------------------------------------------------------------------
-- Alur:
--   1. Calon klinik membuka /daftar di aplikasi klinik → supabase.auth.signUp()
--      (Supabase mengirim email verifikasi; rate limit bawaan Auth berlaku).
--   2. Setelah email terverifikasi & login, aplikasi memanggil
--      public.register_clinic(). Klinik dibuat berstatus 'pending': RLS
--      (get_user_clinic_id) belum memberi akses data apa pun.
--   3. Operator Dentiva menyetujui dari Console (clinics.approve → trial) atau
--      menolak (clinics.close).
--
-- Juga: get_onboarding_status() untuk daftar langkah awal klinik baru, dan
-- layar antrean memakai nama klinik dari Pengaturan (clinic_settings).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. register_clinic()
-- -----------------------------------------------------------------------------
create or replace function public.register_clinic(
  p_clinic_name  text,
  p_clinic_phone text,
  p_city         text,
  p_province     text,
  p_owner_name   text,
  p_owner_phone  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_base      text;
  v_slug      text;
  v_plan      uuid;
  v_clinic    uuid;
  v_name      text := trim(coalesce(p_clinic_name, ''));
  v_owner     text := trim(coalesce(p_owner_name, ''));
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu' using errcode = 'insufficient_privilege';
  end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then
    raise exception 'Verifikasi email Anda terlebih dahulu (cek kotak masuk / spam)' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'Akun ini sudah terhubung ke sebuah klinik' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from platform.operators where user_id = v_uid) then
    raise exception 'Akun operator Dentiva tidak bisa mendaftarkan klinik' using errcode = 'check_violation';
  end if;

  if length(v_name) not between 3 and 100 then
    raise exception 'Nama klinik harus 3–100 karakter' using errcode = 'check_violation';
  end if;
  if length(v_owner) not between 3 and 100 then
    raise exception 'Nama pemilik harus 3–100 karakter' using errcode = 'check_violation';
  end if;
  if coalesce(p_clinic_phone, '') !~ '^[0-9+() -]{8,20}$' or coalesce(p_owner_phone, '') !~ '^[0-9+() -]{8,20}$' then
    raise exception 'Nomor telepon tidak valid' using errcode = 'check_violation';
  end if;

  -- Rem darurat terhadap pendaftaran massal (di luar rate limit Auth).
  if (select count(*) from public.clinics where status = 'pending' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Terlalu banyak pendaftaran saat ini. Coba lagi dalam satu jam.' using errcode = 'too_many_connections';
  end if;

  v_base := left(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')), 40);
  if v_base = '' then
    v_base := 'klinik';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.clinics where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
  end loop;

  -- Paket awal = paket aktif termurah; operator bisa mengubahnya saat menyetujui.
  select id into v_plan from public.subscription_plans
  where coalesce(is_active, true)
  order by price_monthly asc nulls last
  limit 1;
  if v_plan is null then
    raise exception 'Belum ada paket langganan aktif' using errcode = 'no_data_found';
  end if;

  v_clinic := platform.provision_clinic(
    v_uid, v_email, v_owner, trim(p_owner_phone),
    v_name, v_slug, trim(p_clinic_phone), v_email, null,
    nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_province, '')), ''),
    v_plan, 14, null
  );

  -- provision_clinic membuat klinik 'trial'; pendaftaran mandiri menunggu persetujuan.
  update public.clinics set status = 'pending', trial_ends_at = null where id = v_clinic;

  return v_clinic;
end;
$$;

revoke all on function public.register_clinic(text, text, text, text, text, text) from public, anon;
grant execute on function public.register_clinic(text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Status onboarding (SECURITY INVOKER → RLS membatasi ke klinik sendiri)
-- -----------------------------------------------------------------------------
create or replace function public.get_onboarding_status()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return jsonb_build_object(
    'profile',
      exists (select 1 from public.clinic_settings where key = 'clinic_address' and length(trim(value)) > 0)
      and exists (select 1 from public.clinic_settings where key = 'clinic_phone' and length(trim(value)) > 0),
    'treatments', exists (select 1 from public.treatments where coalesce(is_active, true)),
    'doctors',    exists (select 1 from public.users where role = 'dokter' and status in ('invited', 'active')),
    'schedules',  exists (select 1 from public.doctor_schedules where coalesce(is_active, true)),
    'staff',      exists (select 1 from public.users where role = 'resepsionis' and status in ('invited', 'active')),
    'satusehat',  exists (select 1 from public.satusehat_organizations where satusehat_organization_id is not null),
    'dismissed',  exists (select 1 from public.clinic_settings where key = 'onboarding_dismissed' and value = 'true')
  );
end;
$$;

revoke all on function public.get_onboarding_status() from public, anon;
grant execute on function public.get_onboarding_status() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Layar antrean: nama klinik dari Pengaturan (yang tampil di aplikasi)
-- -----------------------------------------------------------------------------
create or replace function public.get_queue_display(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link  public.queue_display_links%rowtype;
  v_name  text;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_rows  jsonb;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 64 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select l.* into v_link
  from public.queue_display_links l
  where l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found or v_link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select coalesce(nullif(trim(s.value), ''), c.name) into v_name
  from public.clinics c
  left join public.clinic_settings s on s.clinic_id = c.id and s.key = 'clinic_name'
  where c.id = v_link.clinic_id and c.status in ('trial', 'active');

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_link.last_seen_at is null or v_link.last_seen_at < now() - interval '5 minutes' then
    update public.queue_display_links set last_seen_at = now() where id = v_link.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'no',       q.no,
           'initials', q.initials,
           'doctor',   q.doctor,
           'time',     q.jam,
           'status',   q.status
         ) order by q.no), '[]'::jsonb)
  into v_rows
  from (
    select row_number() over (order by v.created_at, v.id) as no,
           public.queue_initials(public.decrypt_field(p.nama_lengkap::text)) as initials,
           u.full_name as doctor,
           to_char(v.jam_kunjungan, 'HH24:MI') as jam,
           case
             when v.status = 'ongoing' then 'ongoing'
             when v.status = 'completed' then 'completed'
             when v.status is null or v.status = 'scheduled' then 'waiting'
             else 'other'
           end as status
    from public.visits v
    left join public.patients p on p.id = v.patient_id
    left join public.users u on u.id = v.dokter_id
    where v.clinic_id = v_link.clinic_id
      and v.tanggal_kunjungan = v_today
      and v.deleted_at is null
  ) q;

  return jsonb_build_object('ok', true, 'clinic_name', v_name, 'date', v_today, 'visits', v_rows);
end;
$$;

revoke all on function public.get_queue_display(text) from public;
grant execute on function public.get_queue_display(text) to anon, authenticated;
