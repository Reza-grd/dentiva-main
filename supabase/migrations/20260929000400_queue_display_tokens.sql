-- =============================================================================
-- Layar antrean TV tanpa login & tanpa data pribadi (prinsip minimisasi UU PDP)
-- -----------------------------------------------------------------------------
-- Sebelumnya /queue-display membaca tabel visits + patients langsung dari
-- browser TV lalu mendekripsi NAMA LENGKAP pasien di perangkat TV. Agar RLS
-- mengizinkan, TV harus login dengan akun staf penuh (akses rekam medis).
--
-- Sekarang:
--   * Admin klinik membuat "tautan layar antrean" (token acak 32 byte). Hanya
--     hash SHA-256 yang disimpan; token asli ditampilkan sekali.
--   * TV membuka /antrean/<token> TANPA login. RPC get_queue_display() yang
--     berjalan di server hanya mengembalikan: nama klinik, nomor urut, inisial
--     pasien, nama dokter, jam, dan status. Nama/no RM/kontak tidak pernah
--     keluar dari database.
--   * Tautan bisa dicabut kapan saja; klinik yang tidak aktif → layar kosong.
-- =============================================================================

create table if not exists public.queue_display_links (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id) on delete cascade,
  label        text not null default 'Layar ruang tunggu' check (length(label) between 1 and 60),
  token_hash   text not null unique,
  token_hint   text not null,                    -- 4 karakter terakhir, untuk dikenali admin
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists queue_display_links_clinic_idx on public.queue_display_links (clinic_id);

alter table public.queue_display_links enable row level security;

-- Hanya admin klinik yang melihat daftar tautan kliniknya. Tulis hanya lewat RPC.
drop policy if exists queue_display_links_admin_select on public.queue_display_links;
create policy queue_display_links_admin_select on public.queue_display_links
  for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id())
         and (select public.get_user_role()) = 'admin');

drop policy if exists tenant_isolation on public.queue_display_links;
create policy tenant_isolation on public.queue_display_links
  as restrictive for all to public
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));

revoke all on public.queue_display_links from anon, public;
revoke insert, update, delete, truncate on public.queue_display_links from authenticated;
grant select on public.queue_display_links to authenticated;
grant all on public.queue_display_links to service_role;

-- -----------------------------------------------------------------------------
-- Buat tautan (admin). Mengembalikan token asli SEKALI.
-- -----------------------------------------------------------------------------
create or replace function public.create_queue_display_link(p_label text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_token  text;
  v_id     uuid;
begin
  if v_clinic is null or public.get_user_role() is distinct from 'admin' then
    raise exception 'Hanya admin klinik yang dapat membuat tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;

  if (select count(*) from public.queue_display_links where clinic_id = v_clinic and revoked_at is null) >= 10 then
    raise exception 'Maksimal 10 tautan aktif. Cabut tautan lama terlebih dahulu.' using errcode = 'check_violation';
  end if;

  -- base64url tanpa padding, 43 karakter
  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');

  insert into public.queue_display_links (clinic_id, label, token_hash, token_hint, created_by)
  values (v_clinic, coalesce(nullif(trim(p_label), ''), 'Layar ruang tunggu'),
          encode(extensions.digest(v_token, 'sha256'), 'hex'), right(v_token, 4), auth.uid())
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$$;

create or replace function public.revoke_queue_display_link(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() is distinct from 'admin' then
    raise exception 'Hanya admin klinik yang dapat mencabut tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;

  update public.queue_display_links
  set revoked_at = coalesce(revoked_at, now())
  where id = p_id and clinic_id = public.get_user_clinic_id();

  if not found then
    raise exception 'Tautan tidak ditemukan' using errcode = 'no_data_found';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Data layar antrean untuk TV (anon). Hanya data minimal.
-- -----------------------------------------------------------------------------
create or replace function public.queue_initials(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(
      (select string_agg(upper(left(w, 1)) || '.', ' ' order by ord)
       from (select w, ord
             from regexp_split_to_table(trim(regexp_replace(coalesce(p_name, ''), '[^[:alpha:][:space:]]', '', 'g')), '\s+')
                  with ordinality as t(w, ord)
             where w <> ''
             order by ord
             limit 2) s),
      ''),
    '-');
$$;

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

  select c.name into v_name
  from public.clinics c
  where c.id = v_link.clinic_id and c.status in ('trial', 'active');

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  -- Catat "terakhir terlihat" paling sering tiap 5 menit (hindari tulis tiap 10 detik).
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

revoke all on function public.create_queue_display_link(text) from public, anon;
revoke all on function public.revoke_queue_display_link(uuid) from public, anon;
revoke all on function public.get_queue_display(text) from public;
revoke all on function public.queue_initials(text) from public, anon, authenticated;
grant execute on function public.create_queue_display_link(text) to authenticated;
grant execute on function public.revoke_queue_display_link(uuid) to authenticated;
grant execute on function public.get_queue_display(text) to anon, authenticated;
