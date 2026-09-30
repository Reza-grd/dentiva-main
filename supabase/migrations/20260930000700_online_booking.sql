-- =============================================================================
-- Booking online pasien (halaman publik /booking/<slug-klinik>)
-- -----------------------------------------------------------------------------
-- * Aktif per klinik lewat clinic_settings.online_booking_enabled = 'true'.
-- * get_booking_page(slug)  — anon: nama klinik, dokter aktif & jadwal praktik.
-- * submit_booking_request  — anon: validasi slot sesuai jadwal & kapasitas,
--   batas spam (per nomor & per klinik), nama/nomor/keluhan DIENKRIPSI di server.
-- * Staf membaca & memproses di aplikasi (RLS per klinik); tidak ada INSERT
--   langsung dari klien.
-- =============================================================================

create table if not exists public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics(id) on delete cascade,
  dokter_id      uuid references public.users(id) on delete set null,
  requested_date date not null,
  requested_time time not null,
  patient_name   text not null,          -- PGP:… (encrypt_field)
  patient_phone  text not null,          -- PGP:…
  phone_hash     text not null,          -- sha256 nomor ternormalisasi (batas spam)
  complaint      text,                   -- PGP:…
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  reference_code text not null unique,
  handled_by     uuid references public.users(id) on delete set null,
  handled_at     timestamptz,
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists booking_requests_clinic_status_idx on public.booking_requests (clinic_id, status, created_at desc);
create index if not exists idx_booking_requests_dokter_id on public.booking_requests (dokter_id);
create index if not exists idx_booking_requests_handled_by on public.booking_requests (handled_by);

alter table public.booking_requests enable row level security;

drop policy if exists rls_select_booking on public.booking_requests;
create policy rls_select_booking on public.booking_requests
  for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id()));

drop policy if exists rls_update_booking on public.booking_requests;
create policy rls_update_booking on public.booking_requests
  for update to authenticated
  using (clinic_id = (select public.get_user_clinic_id())
         and (select public.get_user_role()) in ('admin', 'resepsionis'))
  with check (clinic_id = (select public.get_user_clinic_id()));

drop policy if exists tenant_isolation on public.booking_requests;
create policy tenant_isolation on public.booking_requests
  as restrictive for all to public
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));

revoke all on public.booking_requests from anon, public;
revoke insert, delete, truncate on public.booking_requests from authenticated;
grant select, update on public.booking_requests to authenticated;
grant all on public.booking_requests to service_role;

-- -----------------------------------------------------------------------------
-- Halaman publik
-- -----------------------------------------------------------------------------
create or replace function public.get_booking_page(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic record;
  v_name text;
  v_doctors jsonb;
begin
  select c.id, c.name, c.phone, c.address, c.city into v_clinic
  from public.clinics c
  where c.slug = lower(trim(p_slug)) and c.status in ('trial', 'active');
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if not exists (select 1 from public.clinic_settings
                 where clinic_id = v_clinic.id and key = 'online_booking_enabled' and value = 'true') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select coalesce(nullif(trim(value), ''), v_clinic.name) into v_name
  from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_name';

  select coalesce(jsonb_agg(d order by d->>'name'), '[]'::jsonb) into v_doctors
  from (
    select jsonb_build_object(
      'id', u.id,
      'name', trim(concat_ws(' ', nullif(trim(u.gelar_depan), ''), u.full_name))
              || coalesce(', ' || nullif(trim(u.gelar_belakang), ''), ''),
      'schedules', (select coalesce(jsonb_agg(jsonb_build_object(
                       'hari', s.hari, 'mulai', to_char(s.jam_mulai, 'HH24:MI'), 'selesai', to_char(s.jam_selesai, 'HH24:MI'))
                       order by s.hari, s.jam_mulai), '[]'::jsonb)
                    from public.doctor_schedules s
                    where s.dokter_id = u.id and s.clinic_id = v_clinic.id and coalesce(s.is_active, true))
    ) as d
    from public.users u
    where u.clinic_id = v_clinic.id and u.role = 'dokter' and u.status in ('invited', 'active')
  ) x
  where jsonb_array_length(d->'schedules') > 0;

  return jsonb_build_object(
    'ok', true,
    'clinic', jsonb_build_object(
      'name', coalesce(v_name, v_clinic.name),
      'phone', (select value from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_phone'),
      'address', coalesce((select nullif(value, '') from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_address'), v_clinic.address),
      'city', v_clinic.city),
    'doctors', v_doctors,
    'today', (now() at time zone 'Asia/Jakarta')::date);
end;
$$;

create or replace function public.submit_booking_request(
  p_slug      text,
  p_dokter_id uuid,
  p_date      date,
  p_time      text,
  p_name      text,
  p_phone     text,
  p_complaint text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_time time;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_hash text;
  v_sched record;
  v_ref text;
begin
  select c.id into v_clinic from public.clinics c
  where c.slug = lower(trim(p_slug)) and c.status in ('trial', 'active');
  if v_clinic is null or not exists (select 1 from public.clinic_settings
       where clinic_id = v_clinic and key = 'online_booking_enabled' and value = 'true') then
    raise exception 'Booking online tidak tersedia untuk klinik ini' using errcode = 'no_data_found';
  end if;

  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then
    raise exception 'Nama wajib diisi (2–100 karakter)' using errcode = 'check_violation';
  end if;
  if v_phone !~ '^(0|62)8[0-9]{7,12}$' then
    raise exception 'Nomor WhatsApp tidak valid' using errcode = 'check_violation';
  end if;
  if length(coalesce(p_complaint, '')) > 500 then
    raise exception 'Keluhan maksimal 500 karakter' using errcode = 'check_violation';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 60 then
    raise exception 'Tanggal harus antara hari ini dan 60 hari ke depan' using errcode = 'check_violation';
  end if;
  begin
    v_time := p_time::time;
  exception when others then
    raise exception 'Jam tidak valid' using errcode = 'check_violation';
  end;
  if p_date = v_today and v_time <= (now() at time zone 'Asia/Jakarta')::time then
    raise exception 'Jam sudah lewat' using errcode = 'check_violation';
  end if;

  select s.* into v_sched
  from public.doctor_schedules s
  join public.users u on u.id = s.dokter_id
  where s.dokter_id = p_dokter_id and s.clinic_id = v_clinic and coalesce(s.is_active, true)
    and u.role = 'dokter' and u.status in ('invited', 'active')
    and s.hari = extract(dow from p_date)::int
    and v_time >= s.jam_mulai and v_time < s.jam_selesai
  limit 1;
  if not found then
    raise exception 'Dokter tidak praktik pada tanggal & jam tersebut' using errcode = 'check_violation';
  end if;

  if v_sched.kapasitas_pasien_per_hari is not null and (
       (select count(*) from public.booking_requests
        where clinic_id = v_clinic and dokter_id = p_dokter_id and requested_date = p_date and status in ('pending', 'confirmed'))
     + (select count(*) from public.visits
        where clinic_id = v_clinic and dokter_id = p_dokter_id and tanggal_kunjungan = p_date and deleted_at is null)
     ) >= v_sched.kapasitas_pasien_per_hari then
    raise exception 'Kuota dokter pada tanggal tersebut sudah penuh' using errcode = 'check_violation';
  end if;

  -- Batas spam
  v_phone := regexp_replace(v_phone, '^62', '0');
  v_hash := encode(extensions.digest(v_clinic::text || ':' || v_phone, 'sha256'), 'hex');
  if (select count(*) from public.booking_requests
      where clinic_id = v_clinic and phone_hash = v_hash and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Terlalu banyak permintaan dari nomor ini. Hubungi klinik langsung.' using errcode = 'too_many_connections';
  end if;
  if (select count(*) from public.booking_requests
      where clinic_id = v_clinic and created_at > now() - interval '24 hours') >= 150 then
    raise exception 'Booking online sedang penuh. Hubungi klinik langsung.' using errcode = 'too_many_connections';
  end if;

  v_ref := 'BK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.booking_requests (clinic_id, dokter_id, requested_date, requested_time,
    patient_name, patient_phone, phone_hash, complaint, reference_code)
  values (v_clinic, p_dokter_id, p_date, v_time,
    public.encrypt_field(trim(p_name)), public.encrypt_field(v_phone), v_hash,
    public.encrypt_field(nullif(trim(coalesce(p_complaint, '')), '')), v_ref);

  return jsonb_build_object('ok', true, 'reference', v_ref);
end;
$$;

revoke all on function public.get_booking_page(text) from public;
revoke all on function public.submit_booking_request(text, uuid, date, text, text, text, text) from public;
grant execute on function public.get_booking_page(text) to anon, authenticated;
grant execute on function public.submit_booking_request(text, uuid, date, text, text, text, text) to anon, authenticated;
