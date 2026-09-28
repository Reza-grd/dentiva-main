-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 2/6 — clinic_user_status
-- -----------------------------------------------------------------------------
-- * public.clinics: status siklus hidup + profil kontak + stempel waktu.
-- * public.users:  status (invited/active/suspended/deactivated), last_login_at, invited_by.
--   Kolom is_active dipertahankan selama transisi dan DISINKRONKAN dua arah
--   oleh trigger; hapus setelah semua kode memakai `status`.
-- * Klaim JWT app_metadata.clinic_id disinkronkan dari public.users.clinic_id,
--   karena mulai migration 3 tidak ada lagi fallback ke klinik default.
-- * RPC untuk aplikasi klinik: get_my_account_status(), record_login().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. public.clinics
-- -----------------------------------------------------------------------------
alter table public.clinics
  add column if not exists status           text,
  add column if not exists owner_user_id    uuid references auth.users (id) on delete set null,
  add column if not exists phone            text,
  add column if not exists email            text,
  add column if not exists address          text,
  add column if not exists city             text,
  add column if not exists province         text,
  add column if not exists trial_ends_at    timestamptz,
  add column if not exists activated_at     timestamptz,
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists closed_at        timestamptz,
  add column if not exists updated_at       timestamptz not null default now();

-- Semua klinik yang sudah ada sebelum Console dianggap aktif.
update public.clinics
set status = 'active',
    activated_at = coalesce(activated_at, created_at)
where status is null;

alter table public.clinics alter column status set default 'pending';
alter table public.clinics alter column status set not null;

alter table public.clinics drop constraint if exists clinics_status_check;
alter table public.clinics add constraint clinics_status_check
  check (status in ('pending', 'trial', 'active', 'suspended', 'closed'));

alter table public.clinics drop constraint if exists clinics_suspended_reason_check;
alter table public.clinics add constraint clinics_suspended_reason_check
  check (status <> 'suspended' or suspended_reason is not null);

alter table public.clinics drop constraint if exists clinics_trial_end_check;
alter table public.clinics add constraint clinics_trial_end_check
  check (status <> 'trial' or trial_ends_at is not null);

create index if not exists idx_clinics_status on public.clinics (status);
create index if not exists idx_clinics_trial_ends on public.clinics (trial_ends_at) where status = 'trial';

create or replace function public.clinics_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'active' and old.status <> 'active' then
      new.activated_at := coalesce(new.activated_at, now());
    end if;
    if new.status = 'suspended' then
      new.suspended_at := now();
    elsif old.status = 'suspended' then
      new.suspended_at := null;
      new.suspended_reason := null;
    end if;
    if new.status = 'closed' then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clinics_touch on public.clinics;
create trigger trg_clinics_touch
  before update on public.clinics
  for each row execute function public.clinics_touch();

-- -----------------------------------------------------------------------------
-- 2. public.users
-- -----------------------------------------------------------------------------
alter table public.users
  add column if not exists status        text,
  add column if not exists last_login_at timestamptz,
  add column if not exists invited_by    uuid references auth.users (id) on delete set null;

update public.users
set status = case when is_active is false then 'deactivated' else 'active' end
where status is null;

alter table public.users alter column status set default 'active';
alter table public.users alter column status set not null;

alter table public.users drop constraint if exists users_status_check;
alter table public.users add constraint users_status_check
  check (status in ('invited', 'active', 'suspended', 'deactivated'));

create index if not exists idx_users_clinic_status on public.users (clinic_id, status);

-- Sinkronisasi dua arah is_active <-> status selama masa transisi.
--   * Kode lama yang hanya mengubah is_active → status ikut berubah.
--   * Kode baru yang mengubah status → is_active ikut berubah.
create or replace function public.users_sync_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case when new.is_active is false then 'deactivated' else 'active' end;
    end if;
  elsif new.status is distinct from old.status then
    null; -- status adalah sumber kebenaran
  elsif new.is_active is distinct from old.is_active then
    new.status := case when new.is_active then 'active' else 'deactivated' end;
  end if;

  new.is_active := new.status in ('invited', 'active');
  return new;
end;
$$;

drop trigger if exists trg_users_sync_status on public.users;
create trigger trg_users_sync_status
  before insert or update on public.users
  for each row execute function public.users_sync_status();

-- -----------------------------------------------------------------------------
-- 3. Klaim JWT app_metadata.clinic_id selalu mengikuti public.users.clinic_id.
--    Token baru (refresh) membawa klaim terbaru; token lama kedaluwarsa ≤ 1 jam.
-- -----------------------------------------------------------------------------
create or replace function public.users_sync_clinic_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.clinic_id is distinct from old.clinic_id then
    update auth.users au
    set raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb)
                            || jsonb_build_object('clinic_id', new.clinic_id::text)
    where au.id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.users_sync_clinic_claim() from public, anon, authenticated;

drop trigger if exists trg_users_sync_clinic_claim on public.users;
create trigger trg_users_sync_clinic_claim
  after insert or update of clinic_id on public.users
  for each row execute function public.users_sync_clinic_claim();

-- Backfill: perbaiki klaim yang hilang atau tidak cocok untuk semua user klinik.
update auth.users au
set raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb)
                        || jsonb_build_object('clinic_id', u.clinic_id::text)
from public.users u
where u.id = au.id
  and (au.raw_app_meta_data ->> 'clinic_id') is distinct from u.clinic_id::text;

-- -----------------------------------------------------------------------------
-- 4. RPC untuk aplikasi klinik
-- -----------------------------------------------------------------------------

-- Status akun & klinik pemanggil. SECURITY DEFINER karena user klinik yang
-- ditangguhkan tidak lagi bisa membaca public.users / public.clinics lewat RLS,
-- tetapi aplikasi tetap perlu tahu ALASANNYA untuk menampilkan pesan yang jelas.
create or replace function public.get_my_account_status()
returns table (
  user_id          uuid,
  user_status      text,
  role             text,
  clinic_id        uuid,
  clinic_name      text,
  clinic_status    text,
  suspended_reason text,
  trial_ends_at    timestamptz,
  has_access       boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.status,
    u.role,
    c.id,
    c.name,
    c.status,
    case when c.status = 'suspended' then c.suspended_reason end,
    c.trial_ends_at,
    (u.status in ('invited', 'active') and c.status in ('trial', 'active')) as has_access
  from public.users u
  join public.clinics c on c.id = u.clinic_id
  where u.id = auth.uid();
$$;

revoke all on function public.get_my_account_status() from public, anon;
grant execute on function public.get_my_account_status() to authenticated;

-- Dipanggil aplikasi klinik tepat setelah login berhasil.
-- Mencatat last_login_at dan mengubah 'invited' → 'active' pada login pertama.
create or replace function public.record_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set last_login_at = now(),
      status = case when status = 'invited' then 'active' else status end
  where id = auth.uid()
    and status in ('invited', 'active');
end;
$$;

revoke all on function public.record_login() from public, anon;
grant execute on function public.record_login() to authenticated;
