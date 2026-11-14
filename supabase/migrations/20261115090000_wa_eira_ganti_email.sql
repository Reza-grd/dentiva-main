-- =============================================================================
-- Eira lewat WhatsApp (satu nomor Dentiva untuk semua klinik) + pendukung ganti email
-- -----------------------------------------------------------------------------
-- Pengenalan pengirim: nomor WA DITAUTKAN ke akun lewat kode sekali pakai.
--   1. Pengguna (sudah login di aplikasi) membuat kode: public.wa_buat_kode_tautan() → 6 digit, 10 menit.
--   2. Ia mengirim "DENTIVA 123456" ke nomor WA Dentiva; webhook (service role) memanggil
--      public.wa_tautkan(kode, sidik_nomor, nomor_tersamar).
--   3. Pesan berikutnya dari nomor itu dikenali lewat public.wa_akun_pengirim(sidik_nomor):
--      klinik, nama, peran — hanya akun aktif di klinik yang tidak ditutup.
-- Nomor WA tidak disimpan utuh: hanya sidik HMAC (sama dengan whatsapp_inbound) + versi tersamar untuk tampilan.
-- Kode disimpan sebagai hash SHA-256; maks. 5 kali salah per nomor per jam.
-- =============================================================================

-- Tautan nomor WA ↔ akun klinik
create table if not exists public.wa_tautan_akun (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  sender_hash     text not null,
  nomor_tersamar  text not null,
  dibuat_pada     timestamptz not null default now(),
  terakhir_dipakai timestamptz,
  unique (sender_hash, user_id)
);
create index if not exists wa_tautan_akun_pengirim on public.wa_tautan_akun (sender_hash);
create index if not exists wa_tautan_akun_user on public.wa_tautan_akun (user_id);

alter table public.wa_tautan_akun enable row level security;
revoke all on public.wa_tautan_akun from anon, authenticated;
grant select, delete on public.wa_tautan_akun to authenticated;
grant all on public.wa_tautan_akun to service_role;

drop policy if exists "wa_tautan_milik_sendiri_lihat" on public.wa_tautan_akun;
create policy "wa_tautan_milik_sendiri_lihat" on public.wa_tautan_akun
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "wa_tautan_milik_sendiri_hapus" on public.wa_tautan_akun;
create policy "wa_tautan_milik_sendiri_hapus" on public.wa_tautan_akun
  for delete to authenticated using (user_id = (select auth.uid()));

-- Kode tautan sekali pakai (hash saja)
create table if not exists public.wa_kode_tautan (
  user_id     uuid primary key references public.users (id) on delete cascade,
  kode_hash   text not null,
  kedaluwarsa timestamptz not null,
  dibuat_pada timestamptz not null default now()
);
alter table public.wa_kode_tautan enable row level security;
revoke all on public.wa_kode_tautan from anon, authenticated;
grant all on public.wa_kode_tautan to service_role;

-- Percobaan kode yang salah per nomor (pembatas tebakan)
create table if not exists public.wa_percobaan_tautan (
  sender_hash text not null,
  pada        timestamptz not null default now()
);
create index if not exists wa_percobaan_tautan_idx on public.wa_percobaan_tautan (sender_hash, pada desc);
alter table public.wa_percobaan_tautan enable row level security;
revoke all on public.wa_percobaan_tautan from anon, authenticated;
grant all on public.wa_percobaan_tautan to service_role;

-- Sesi percakapan Eira per nomor: akun terpilih (bila satu nomor tertaut ke beberapa klinik),
-- riwayat singkat, dan usulan Eira Agen yang menunggu "YA". Hanya service role.
create table if not exists public.wa_sesi_eira (
  sender_hash     text primary key,
  user_id         uuid references public.users (id) on delete set null,
  riwayat         jsonb not null default '[]'::jsonb,
  usulan_menunggu jsonb not null default '[]'::jsonb,
  diperbarui      timestamptz not null default now()
);
alter table public.wa_sesi_eira enable row level security;
revoke all on public.wa_sesi_eira from anon, authenticated;
grant all on public.wa_sesi_eira to service_role;

-- Tindakan baru di catatan pesan masuk
alter table public.whatsapp_inbound drop constraint if exists whatsapp_inbound_action_check;
alter table public.whatsapp_inbound add constraint whatsapp_inbound_action_check
  check (action in ('none', 'auto_reply', 'opt_out', 'tautan', 'eira'));

-- 1. Pengguna membuat kode (aplikasi, sudah login)
create or replace function public.wa_buat_kode_tautan()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_kode text;
  v_lama timestamptz;
begin
  if v_uid is null or not exists (
    select 1 from public.users u join public.clinics c on c.id = u.clinic_id
    where u.id = v_uid and u.status = 'active' and c.status <> 'closed'
  ) then
    raise exception 'Akun tidak aktif' using errcode = 'insufficient_privilege';
  end if;

  select dibuat_pada into v_lama from public.wa_kode_tautan where user_id = v_uid;
  if v_lama is not null and v_lama > now() - interval '30 seconds' then
    raise exception 'Tunggu sebentar sebelum membuat kode baru' using errcode = 'check_violation';
  end if;

  -- Acak kriptografis dari gen_random_uuid() (bukan random()).
  v_kode := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public.wa_kode_tautan (user_id, kode_hash, kedaluwarsa, dibuat_pada)
  values (v_uid, encode(sha256(convert_to(v_kode, 'UTF8')), 'hex'), now() + interval '10 minutes', now())
  on conflict (user_id) do update
    set kode_hash = excluded.kode_hash, kedaluwarsa = excluded.kedaluwarsa, dibuat_pada = excluded.dibuat_pada;

  return jsonb_build_object('kode', v_kode, 'kedaluwarsa', now() + interval '10 minutes');
end;
$$;

-- 2. Webhook menautkan nomor dengan kode (service role)
create or replace function public.wa_tautkan(p_kode text, p_sender_hash text, p_nomor_tersamar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kode public.wa_kode_tautan;
  v_user record;
begin
  if (select count(*) from public.wa_percobaan_tautan
      where sender_hash = p_sender_hash and pada > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'alasan', 'terlalu_banyak');
  end if;

  select * into v_kode from public.wa_kode_tautan
  where kode_hash = encode(sha256(convert_to(coalesce(p_kode, ''), 'UTF8')), 'hex') and kedaluwarsa > now()
  for update;
  if not found then
    insert into public.wa_percobaan_tautan (sender_hash) values (p_sender_hash);
    return jsonb_build_object('ok', false, 'alasan', 'kode_salah');
  end if;

  select u.id, u.full_name, u.role, u.clinic_id, c.name as klinik into v_user
  from public.users u join public.clinics c on c.id = u.clinic_id
  where u.id = v_kode.user_id and u.status = 'active' and c.status <> 'closed';
  delete from public.wa_kode_tautan where user_id = v_kode.user_id; -- kode sekali pakai
  if v_user.id is null then
    return jsonb_build_object('ok', false, 'alasan', 'akun_tidak_aktif');
  end if;

  insert into public.wa_tautan_akun (user_id, clinic_id, sender_hash, nomor_tersamar)
  values (v_user.id, v_user.clinic_id, p_sender_hash, left(p_nomor_tersamar, 40))
  on conflict (sender_hash, user_id) do update set nomor_tersamar = excluded.nomor_tersamar, dibuat_pada = now();

  -- Nomor yang baru ditautkan langsung memakai akun ini.
  insert into public.wa_sesi_eira (sender_hash, user_id) values (p_sender_hash, v_user.id)
  on conflict (sender_hash) do update set user_id = excluded.user_id, riwayat = '[]'::jsonb, usulan_menunggu = '[]'::jsonb, diperbarui = now();

  return jsonb_build_object('ok', true, 'nama', v_user.full_name, 'peran', v_user.role, 'klinik', v_user.klinik);
end;
$$;

-- 3. Akun yang tertaut ke nomor pengirim (service role)
create or replace function public.wa_akun_pengirim(p_sender_hash text)
returns table (user_id uuid, clinic_id uuid, nama text, peran text, klinik text, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.clinic_id, u.full_name::text, u.role::text, c.name::text, u.email::text
  from public.wa_tautan_akun t
  join public.users u on u.id = t.user_id
  join public.clinics c on c.id = u.clinic_id
  where t.sender_hash = p_sender_hash
    and u.status = 'active' and c.status <> 'closed'
    and t.clinic_id = u.clinic_id
  order by t.dibuat_pada;
$$;

-- 4. Pendukung ganti email (service role): apakah email sudah dipakai akun lain / operator?
create or replace function public.akun_email_terpakai(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users where lower(email) = lower(trim(p_email)));
$$;

create or replace function public.akun_adalah_operator(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from platform.operators where user_id = p_user);
$$;

revoke all on function public.wa_buat_kode_tautan() from public, anon;
grant execute on function public.wa_buat_kode_tautan() to authenticated;
revoke all on function public.wa_tautkan(text, text, text) from public, anon, authenticated;
revoke all on function public.wa_akun_pengirim(text) from public, anon, authenticated;
revoke all on function public.akun_email_terpakai(text) from public, anon, authenticated;
revoke all on function public.akun_adalah_operator(uuid) from public, anon, authenticated;
grant execute on function public.wa_tautkan(text, text, text) to service_role;
grant execute on function public.wa_akun_pengirim(text) to service_role;
grant execute on function public.akun_email_terpakai(text) to service_role;
grant execute on function public.akun_adalah_operator(uuid) to service_role;
