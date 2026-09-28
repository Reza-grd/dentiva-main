-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 1/6 — platform_schema
-- -----------------------------------------------------------------------------
-- Skema `platform` untuk data milik Dentiva (bukan milik klinik):
--   platform.operators      siapa yang boleh masuk Console
--   platform.audit_logs     jejak semua aksi operator (append-only)
--   platform.clinic_notes   catatan internal tim per klinik
--   platform.announcements  pengumuman yang tampil di aplikasi klinik
--
-- Keamanan:
--   * anon & authenticated TIDAK punya hak apa pun di skema ini.
--   * Hanya service_role (dipakai Edge Function console-api) yang bisa membaca/menulis.
--   * JANGAN tambahkan `platform` ke "Exposed schemas" di Supabase Dashboard → API.
--   * Aplikasi klinik membaca pengumuman hanya lewat fungsi
--     public.get_active_announcements() (dibuat di migration clinic_user_status).
-- =============================================================================

create schema if not exists platform;

revoke all on schema platform from public, anon, authenticated;
grant usage on schema platform to service_role;

-- -----------------------------------------------------------------------------
-- updated_at helper (lokal di skema platform; tidak bergantung pada public.*)
-- -----------------------------------------------------------------------------
create or replace function platform.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- operators
-- -----------------------------------------------------------------------------
create table if not exists platform.operators (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null check (length(trim(full_name)) between 2 and 120),
  role           text not null check (role in ('owner', 'support', 'finance')),
  is_active      boolean not null default true,
  last_login_at  timestamptz,
  invited_by     uuid references platform.operators (user_id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table platform.operators is
  'Operator Dentiva Console. Terpisah dari public.users: operator tidak boleh punya clinic_id.';

drop trigger if exists trg_operators_updated_at on platform.operators;
create trigger trg_operators_updated_at
  before update on platform.operators
  for each row execute function platform.touch_updated_at();

-- Seorang operator tidak boleh sekaligus user klinik (satu akun, satu dunia).
create or replace function platform.guard_operator_not_clinic_user()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.users u where u.id = new.user_id) then
    raise exception 'User % sudah terdaftar sebagai user klinik; operator harus memakai akun terpisah', new.user_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_operators_not_clinic_user on platform.operators;
create trigger trg_operators_not_clinic_user
  before insert or update of user_id on platform.operators
  for each row execute function platform.guard_operator_not_clinic_user();

-- Selalu harus ada minimal satu owner aktif (mencegah Console terkunci).
create or replace function platform.guard_last_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner' and old.is_active)
     or (tg_op = 'UPDATE' and old.role = 'owner' and old.is_active
         and (new.role <> 'owner' or not new.is_active)) then
    if not exists (
      select 1 from platform.operators o
      where o.role = 'owner' and o.is_active and o.user_id <> old.user_id
    ) then
      raise exception 'Tidak bisa menonaktifkan atau menurunkan owner terakhir'
        using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_operators_last_owner on platform.operators;
create trigger trg_operators_last_owner
  before update or delete on platform.operators
  for each row execute function platform.guard_last_owner();

-- -----------------------------------------------------------------------------
-- audit_logs (append-only)
-- -----------------------------------------------------------------------------
create table if not exists platform.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  operator_id  uuid references platform.operators (user_id) on delete set null,
  action       text not null check (action ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$'),
  target_type  text not null,
  target_id    text,
  clinic_id    uuid references public.clinics (id) on delete set null,
  reason       text,
  before       jsonb,
  after        jsonb,
  ip           inet,
  user_agent   text,
  request_id   text,
  created_at   timestamptz not null default now()
);

comment on table platform.audit_logs is
  'Log semua aksi tulis operator Console. Hanya INSERT; UPDATE/DELETE/TRUNCATE diblokir trigger.';

create index if not exists idx_platform_audit_created   on platform.audit_logs (created_at desc);
create index if not exists idx_platform_audit_operator  on platform.audit_logs (operator_id, created_at desc);
create index if not exists idx_platform_audit_clinic    on platform.audit_logs (clinic_id, created_at desc);
create index if not exists idx_platform_audit_action    on platform.audit_logs (action, created_at desc);

create or replace function platform.block_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'platform.audit_logs bersifat append-only (% diblokir)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists trg_audit_no_update on platform.audit_logs;
create trigger trg_audit_no_update
  before update or delete on platform.audit_logs
  for each row execute function platform.block_audit_mutation();

drop trigger if exists trg_audit_no_truncate on platform.audit_logs;
create trigger trg_audit_no_truncate
  before truncate on platform.audit_logs
  for each statement execute function platform.block_audit_mutation();

-- -----------------------------------------------------------------------------
-- clinic_notes
-- -----------------------------------------------------------------------------
create table if not exists platform.clinic_notes (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  operator_id  uuid references platform.operators (user_id) on delete set null,
  body         text not null check (length(trim(body)) between 2 and 4000),
  created_at   timestamptz not null default now()
);

create index if not exists idx_clinic_notes_clinic on platform.clinic_notes (clinic_id, created_at desc);

-- -----------------------------------------------------------------------------
-- announcements
-- -----------------------------------------------------------------------------
create table if not exists platform.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) between 3 and 120),
  body        text not null check (length(trim(body)) between 3 and 2000),
  severity    text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  audience    text not null default 'all' check (audience in ('all', 'trial', 'active', 'admins')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  created_by  uuid references platform.operators (user_id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint announcements_window check (ends_at is null or ends_at > starts_at)
);

create index if not exists idx_announcements_window on platform.announcements (starts_at, ends_at);

drop trigger if exists trg_announcements_updated_at on platform.announcements;
create trigger trg_announcements_updated_at
  before update on platform.announcements
  for each row execute function platform.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Hak akses: tabel platform hanya untuk service_role.
-- RLS tetap diaktifkan (tanpa policy) sebagai pertahanan berlapis: jika suatu
-- saat skema ini tidak sengaja di-expose, anon/authenticated tetap tidak melihat apa-apa.
-- -----------------------------------------------------------------------------
alter table platform.operators     enable row level security;
alter table platform.audit_logs    enable row level security;
alter table platform.clinic_notes  enable row level security;
alter table platform.announcements enable row level security;

revoke all on all tables    in schema platform from public, anon, authenticated;
revoke all on all sequences in schema platform from public, anon, authenticated;
revoke all on all functions in schema platform from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema platform to service_role;
grant usage, select on all sequences in schema platform to service_role;
grant execute on all functions in schema platform to service_role;

-- Objek yang dibuat di masa depan oleh postgres di skema ini ikut aturan yang sama.
alter default privileges in schema platform revoke all on tables    from public, anon, authenticated;
alter default privileges in schema platform revoke all on sequences from public, anon, authenticated;
alter default privileges in schema platform revoke all on functions from public, anon, authenticated;
alter default privileges in schema platform grant select, insert, update, delete on tables to service_role;
alter default privileges in schema platform grant usage, select on sequences to service_role;
alter default privileges in schema platform grant execute on functions to service_role;

-- service_role tetap tidak boleh mengubah/menghapus audit (trigger di atas juga memblokir).
revoke update, delete, truncate on platform.audit_logs from service_role;

-- Jalur baca pengumuman untuk aplikasi klinik (public.get_active_announcements)
-- ada di migration clinic_user_status karena memakai kolom clinics.status.
