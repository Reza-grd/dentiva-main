-- Pengganti minimal objek bawaan Supabase (role, auth, storage, cron, vault) agar skema produksi
-- (baseline + migrasi) bisa dijalankan di PGlite tanpa Docker. BUKAN salinan produksi.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator nologin;
grant anon, authenticated, service_role to postgres;
create schema if not exists extensions;
create schema auth;
create schema storage;
create schema cron;
create schema vault;
create schema net;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text,
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}',
  created_at timestamptz default now(), updated_at timestamptz default now(),
  email_confirmed_at timestamptz, last_sign_in_at timestamptz, encrypted_password text
);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as
$$ select coalesce(auth.jwt() ->> 'role', 'anon') $$;
grant usage on schema auth, extensions to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_agg(x, '/')::text[] from (select 1) t, regexp_split_to_table(name, '/') x $$;
create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
create table cron.job_run_details (runid serial primary key, jobid int, status text, start_time timestamptz default now());
create function cron.schedule(n text, s text, c text) returns bigint language sql as
$$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ select true $$;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text, secret text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(s text, n text default null, d text default null) returns uuid language sql as
$$ insert into vault.secrets (name, secret) values (n, s) returning id $$;
create function net.http_post(url text, body jsonb default '{}', headers jsonb default '{}', params jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;
create publication supabase_realtime;
