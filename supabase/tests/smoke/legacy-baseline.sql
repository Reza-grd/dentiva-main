-- Baseline SINTETIS untuk smoke test (bukan salinan produksi).
-- Meniru objek Supabase (auth, storage, cron, role) dan skema lama Dentiva yang
-- disentuh migration Console — termasuk policy migration 41 yang bocor lintas klinik.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

create schema auth;
create schema storage;
create schema extensions;
create schema cron;

create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  raw_app_meta_data jsonb default '{}', created_at timestamptz, updated_at timestamptz
);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as
$$ select coalesce(auth.jwt() ->> 'role', 'anon') $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, metadata jsonb);

create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
create function cron.schedule(n text, s text, c text) returns bigint language sql as
$$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(id bigint) returns boolean language sql as
$$ delete from cron.job where jobid = id returning true $$;

-- ─── legacy public schema ───────────────────────────────────────────────────
create table public.clinics (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, created_at timestamptz not null default now());
insert into public.clinics (id, name, slug) values ('d0000000-0000-0000-0000-000000000000', 'Dentiva Default Clinic', 'default');

create function public.get_user_clinic_id() returns uuid as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid, 'd0000000-0000-0000-0000-000000000000'::uuid);
$$ language sql stable security definer;

create table public.roles (id uuid primary key default gen_random_uuid(), name varchar(50) unique not null);
insert into public.roles (name) values ('Clinic Owner'), ('Manager'), ('Dentist');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) unique not null, full_name varchar(255) not null,
  role varchar(50) not null check (role in ('admin', 'dokter', 'resepsionis')),
  phone varchar(20), is_active boolean default true,
  clinic_id uuid not null references public.clinics(id), role_id uuid references public.roles(id),
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create function public.get_user_role() returns text language sql security definer as
$$ select role from public.users where id = auth.uid(); $$;

-- legacy has_permission: role-based, NO clinic check (like migration 40/41)
create function public.has_permission(p_permission_name text) returns boolean language sql security definer as
$$ select exists (select 1 from public.users where id = auth.uid()) $$;

create table public.patients (
  id uuid primary key default gen_random_uuid(), no_rm varchar(50) unique not null,
  nama_lengkap varchar(255) not null, clinic_id uuid not null references public.clinics(id),
  deleted_at timestamptz
);
create table public.visits (
  id uuid primary key default gen_random_uuid(), patient_id uuid references public.patients(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id), tanggal_kunjungan date not null default current_date, dokter_id uuid
);
create table public.clinic_settings (
  id uuid primary key default gen_random_uuid(), key text unique not null, value text,
  clinic_id uuid not null references public.clinics(id), updated_at timestamptz default now()
);
create table public.payments (id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id), amount numeric);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), timestamp timestamptz not null default now(),
  clinic_id uuid not null references public.clinics(id), user_id uuid references public.users(id),
  module text not null, action text not null, previous_value jsonb, new_value jsonb, risk_level text
);
create table public.notification_logs (id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id), status text not null, "timestamp" timestamptz not null default now());
create table public.satusehat_outbox (id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id), status text not null default 'pending', last_attempt_at timestamptz, updated_at timestamptz default now());

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(), name varchar(50) not null unique,
  price_monthly decimal(10,2) not null, price_yearly decimal(10,2) not null,
  max_users integer not null default 1, max_patients integer not null default 100,
  features jsonb default '{}'::jsonb, is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
insert into public.subscription_plans (name, price_monthly, price_yearly, max_users, max_patients, features) values
  ('Starter', 299000, 2990000, 3, 1000, '{"whatsapp_reminders": false}'),
  ('Pro', 599000, 5990000, 10, 5000, '{"whatsapp_reminders": true}');
create table public.clinic_subscriptions (
  id uuid primary key default gen_random_uuid(), clinic_id uuid not null references public.clinics(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status varchar(20) default 'active' check (status in ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz not null default now(), current_period_end timestamptz not null,
  cancel_at_period_end boolean default false, created_at timestamptz default now(), updated_at timestamptz default now()
);

-- 18 tables without clinic_id
create table public.treatments (id uuid primary key default gen_random_uuid(), kode_treatment varchar(50) unique not null, nama text);
create table public.master_bahan (id uuid primary key default gen_random_uuid(), kode_bahan varchar(50) unique not null);
create table public.overhead_costs (id uuid primary key default gen_random_uuid(), nama text);
create table public.overhead_monthly_target (id uuid primary key default gen_random_uuid(), periode text, total numeric, unique (periode));
create table public.soap_templates (id uuid primary key default gen_random_uuid(), created_by uuid, nama text);
create table public.tier_weights (tier text primary key check (tier in ('ringan', 'sedang', 'berat')), bobot numeric, updated_by uuid references public.users(id));
insert into public.tier_weights (tier, bobot) values ('ringan', 1), ('sedang', 2), ('berat', 3);
create table public.treatment_education (id uuid primary key default gen_random_uuid(), treatment_id uuid not null references public.treatments(id) on delete cascade unique, body text);
create table public.material_batches (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.master_bahan(id));
create table public.material_purchases (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.master_bahan(id));
create table public.stok_movements (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.master_bahan(id));
create table public.stok_opname (id uuid primary key default gen_random_uuid(), material_id uuid not null references public.master_bahan(id));
create table public.treatment_materials (id uuid primary key default gen_random_uuid(), treatment_id uuid not null references public.treatments(id), material_id uuid not null references public.master_bahan(id), unique (treatment_id, material_id));
create table public.visit_treatments (id uuid primary key default gen_random_uuid(), visit_id uuid references public.visits(id) on delete cascade, treatment_id uuid references public.treatments(id));
create table public.visit_treatment_material_overrides (id uuid primary key default gen_random_uuid(), visit_treatment_id uuid not null references public.visit_treatments(id), material_id uuid not null references public.master_bahan(id));
create table public.treatment_cost_snapshot (id uuid primary key default gen_random_uuid(), visit_treatment_id uuid not null unique references public.visit_treatments(id));
create table public.informed_consents (id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id), visit_id uuid references public.visits(id));
create table public.reminder_logs (id uuid primary key default gen_random_uuid(), visit_id uuid references public.visits(id));
create table public.satusehat_consents (id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patients(id));

-- legacy audit trigger (migration 38)
create or replace function public.dynamic_audit_trigger() returns trigger as $$
declare v_user_id uuid; v_clinic_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null and tg_op in ('INSERT', 'UPDATE') then
    v_clinic_id := (to_jsonb(new) ->> 'clinic_id')::uuid;
  end if;
  insert into public.audit_logs (user_id, clinic_id, module, action, new_value)
  values (v_user_id, v_clinic_id, upper(tg_table_name), tg_op, to_jsonb(new));
  return new;
end; $$ language plpgsql security definer;
create trigger audit_users_trigger after insert or update or delete on public.users for each row execute function public.dynamic_audit_trigger();

-- legacy RLS
alter table public.users enable row level security;
create policy users_view_own on public.users for select using (auth.uid() = id and clinic_id = public.get_user_clinic_id());
create policy users_admin_all on public.users for all using (public.get_user_role() = 'admin' and clinic_id = public.get_user_clinic_id());

alter table public.patients enable row level security;
create policy "Staff can view patients" on public.patients for select using (public.get_user_role() in ('admin', 'resepsionis', 'dokter') and deleted_at is null and clinic_id = public.get_user_clinic_id());
-- migration 41 (the leak):
create policy patient_read_policy on public.patients for select using (has_permission('patient.read'));
create policy patient_insert_policy on public.patients for insert with check (has_permission('patient.create'));

alter table public.visits enable row level security;
create policy appointment_read_policy on public.visits for select using (has_permission('appointment.read'));

alter table public.clinic_settings enable row level security;
create policy settings_rw on public.clinic_settings for all using (public.get_user_role() is not null) with check (public.get_user_role() is not null);

alter table public.payments enable row level security;
create policy finance_read_policy on public.payments for select using (has_permission('finance.read'));

alter table public.audit_logs enable row level security;
create policy audit_read_policy on public.audit_logs for select using (has_permission('dashboard.read'));

alter table public.notification_logs enable row level security;
create policy "Staff read logs" on public.notification_logs for select using (public.get_user_role() in ('dokter', 'resepsionis', 'admin'));

alter table public.satusehat_outbox enable row level security;
create policy "Outbox_Clinic_Isolation" on public.satusehat_outbox for all using (clinic_id = public.get_user_clinic_id() and public.get_user_role() in ('admin', 'dokter'));

alter table public.subscription_plans enable row level security;
create policy "Plans_Public_SELECT" on public.subscription_plans for select using (auth.role() = 'authenticated');
alter table public.clinic_subscriptions enable row level security;
create policy "Subscriptions_Clinic_SELECT" on public.clinic_subscriptions for select using (clinic_id = public.get_user_clinic_id() and public.get_user_role() in ('admin', 'dokter', 'resepsionis'));
create policy "Subscriptions_Admin_UPDATE" on public.clinic_subscriptions for update using (clinic_id = public.get_user_clinic_id() and public.get_user_role() = 'admin');

-- Supabase default grants
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- ─── tambahan untuk migration security_followups ───────────────────────────
-- policy lama yang membolehkan user mengubah barisnya sendiri tanpa batas kolom
create policy users_update_own on public.users for update using (auth.uid() = id and clinic_id = public.get_user_clinic_id());

-- nomor RM global lama
create sequence public.seq_no_rm start 1;
create function public.generate_no_rm() returns trigger as $$
begin
  if new.no_rm is null or new.no_rm = '' then
    new.no_rm := 'RM-' || lpad(nextval('public.seq_no_rm')::text, 6, '0');
  end if;
  return new;
end; $$ language plpgsql;
create trigger trigger_generate_no_rm before insert on public.patients for each row execute function public.generate_no_rm();

-- storage lama: cukup "authenticated"
alter table storage.objects enable row level security;
create policy legacy_clinical_rw on storage.objects for all to authenticated
  using (bucket_id in ('radiologi', 'klinik', 'patient-photos', 'avatars'))
  with check (bucket_id in ('radiologi', 'klinik', 'patient-photos', 'avatars'));
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

-- ─── disamakan dengan PRODUKSI (hasil inspeksi 29 Sep 2026) ────────────────
alter table public.audit_logs add column user_role text,
  add column patient_id uuid references public.patients(id) on delete cascade,
  add column visit_id uuid references public.visits(id) on delete cascade;

-- versi produksi: TIDAK mengisi clinic_id (NOT NULL) → semua tulis gagal
create or replace function public.process_audit_log() returns trigger language plpgsql security definer as $$
declare v_old jsonb; v_new jsonb; v_patient_id uuid; v_visit_id uuid;
begin
  if tg_op = 'UPDATE' then v_old := to_jsonb(old); v_new := to_jsonb(new);
  elsif tg_op = 'INSERT' then v_new := to_jsonb(new);
  else v_old := to_jsonb(old); end if;
  if tg_table_name = 'patients' then v_patient_id := coalesce(new.id, old.id); end if;
  insert into public.audit_logs (user_id, user_role, patient_id, visit_id, module, action, previous_value, new_value, risk_level)
  values (auth.uid(), coalesce(public.get_user_role(), 'system'), v_patient_id, v_visit_id, tg_table_name, tg_op, v_old, v_new, 'LOW');
  return coalesce(new, old);
end; $$;
create trigger trg_audit_patients after insert or update or delete on public.patients for each row execute function public.process_audit_log();
create trigger trg_audit_visits after insert or update or delete on public.visits for each row execute function public.process_audit_log();
create trigger trg_audit_users after insert or update or delete on public.users for each row execute function public.process_audit_log();
create trigger trg_audit_payments after insert or update or delete on public.payments for each row execute function public.process_audit_log();

-- policy produksi: semua user login bisa membaca semua baris users
create policy "Authenticated can view users" on public.users for select using (true);

-- tabel lama di produksi tanpa clinic_id
create table public.patient_visits (id uuid primary key default gen_random_uuid(), patient_id uuid references public.patients(id), visit_date date, chief_complaint text);

-- bucket produksi: semuanya publik
create table storage.buckets (id text primary key, name text, public boolean default false);
insert into storage.buckets (id, name, public) values
  ('patient-photos', 'patient-photos', true), ('radiologi', 'radiologi', true),
  ('klinik', 'klinik', true), ('avatars', 'avatars', true);
grant all on all tables in schema public to anon, authenticated, service_role;
-- Data lama dibuat sebelum bug ini muncul → trigger diaktifkan setelah seeding (lihat smoke script).
alter table public.patients disable trigger trg_audit_patients;
alter table public.visits disable trigger trg_audit_visits;
alter table public.users disable trigger trg_audit_users;
alter table public.payments disable trigger trg_audit_payments;

-- view produksi (tanpa security_invoker = berjalan sebagai pemilik, melewati RLS) + grant anon
create view public.v_patient_summary as
  select p.id, p.no_rm, p.nama_lengkap, p.clinic_id, (select count(*) from public.visits v where v.patient_id = p.id) as total_visits
  from public.patients p where p.deleted_at is null;
grant select on public.v_patient_summary to anon, authenticated, service_role;
