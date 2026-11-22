-- =============================================================================
-- Batas percobaan login bertingkat per akun + catatan kejadian keamanan (rencana keamanan A1 + B8, 22 Nov 2026)
-- -----------------------------------------------------------------------------
-- Dipanggil GoTrue (server login) lewat hook Postgres:
--   GOTRUE_HOOK_PASSWORD_VERIFICATION_ATTEMPT_URI = pg-functions://postgres/public/hook_password_verification_attempt
--   GOTRUE_HOOK_MFA_VERIFICATION_ATTEMPT_URI      = pg-functions://postgres/public/hook_mfa_verification_attempt
-- Masukan GoTrue: { "user_id": uuid, "valid": bool, "metadata": { "ip_address": text, ... } (+ factor_id untuk MFA) }
-- Keluaran: { "decision": "continue" } atau { "decision": "reject", "message": text }.
--
-- Jeda bertingkat (gagal berturut-turut, dihitung ulang bila 24 jam tanpa kegagalan):
--   5 → 1 menit · 10 → 5 menit · 15 → 30 menit · 20+ → 24 jam.
-- Selama terkunci SEMUA percobaan ditolak dengan pesan yang sama (password benar pun) agar tidak membocorkan
-- apakah password tebakan benar. Berhasil masuk → hitungan direset. Ganti password (mis. lewat "Lupa password")
-- → kunci password dibuka.
-- Per IP: batas bawaan GoTrue (GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For) — longgar karena satu klinik = satu IP.
-- =============================================================================

create schema if not exists keamanan;
revoke all on schema keamanan from public;

create table if not exists keamanan.percobaan_login (
  user_id uuid not null,
  jenis text not null check (jenis in ('password', 'mfa')),
  gagal int not null default 0,
  gagal_terakhir timestamptz,
  kunci_sampai timestamptz,
  primary key (user_id, jenis)
);

create table if not exists keamanan.kejadian (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  jenis text not null,          -- login_gagal · akun_terkunci · ditolak_terkunci · mfa_gagal · mfa_terkunci · mfa_ditolak_terkunci · kunci_dibuka
  user_id uuid,
  ip text,
  rincian jsonb not null default '{}'
);
create index if not exists kejadian_waktu_idx on keamanan.kejadian (waktu desc);
create index if not exists kejadian_jenis_waktu_idx on keamanan.kejadian (jenis, waktu desc);

alter table keamanan.percobaan_login enable row level security;
alter table keamanan.kejadian enable row level security;
revoke all on keamanan.percobaan_login, keamanan.kejadian from public;

-- Durasi kunci untuk jumlah kegagalan berturut-turut n (null = belum dikunci).
create or replace function keamanan.durasi_kunci(n int)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case
    when n >= 20 then interval '24 hours'
    when n >= 15 then interval '30 minutes'
    when n >= 10 then interval '5 minutes'
    when n >= 5 then interval '1 minute'
  end;
$$;

create or replace function keamanan.pesan_kunci(sampai timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select 'Terlalu banyak percobaan masuk. Coba lagi dalam ' ||
    case
      when sampai - now() > interval '90 minutes' then ceil(extract(epoch from sampai - now()) / 3600)::int || ' jam'
      else greatest(1, ceil(extract(epoch from sampai - now()) / 60))::int || ' menit'
    end || '.';
$$;

-- Inti bersama: catat hasil percobaan dan putuskan.
create or replace function keamanan.catat_percobaan(p_user uuid, p_jenis text, p_valid boolean, p_ip text, p_rincian jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r keamanan.percobaan_login;
  n int;
  sampai timestamptz;
  awalan text := case when p_jenis = 'mfa' then 'mfa_' else '' end;
begin
  if p_user is null then
    return jsonb_build_object('decision', 'continue');
  end if;

  select * into r from keamanan.percobaan_login where user_id = p_user and jenis = p_jenis for update;

  -- Sedang terkunci: tolak apa pun hasilnya (pesan sama untuk password benar/salah).
  if r.kunci_sampai is not null and r.kunci_sampai > now() then
    insert into keamanan.kejadian (jenis, user_id, ip, rincian)
      values (awalan || 'ditolak_terkunci', p_user, p_ip, p_rincian || jsonb_build_object('valid', p_valid, 'gagal', r.gagal));
    return jsonb_build_object('decision', 'reject', 'message', keamanan.pesan_kunci(r.kunci_sampai));
  end if;

  if p_valid then
    if r.user_id is not null then
      delete from keamanan.percobaan_login where user_id = p_user and jenis = p_jenis;
    end if;
    return jsonb_build_object('decision', 'continue');
  end if;

  -- Gagal: hitungan berlanjut, kecuali kegagalan terakhir > 24 jam lalu.
  n := case when r.user_id is null or r.gagal_terakhir < now() - interval '24 hours' then 1 else r.gagal + 1 end;
  sampai := now() + keamanan.durasi_kunci(n);
  insert into keamanan.percobaan_login as t (user_id, jenis, gagal, gagal_terakhir, kunci_sampai)
    values (p_user, p_jenis, n, now(), sampai)
    on conflict (user_id, jenis) do update set gagal = excluded.gagal, gagal_terakhir = excluded.gagal_terakhir, kunci_sampai = excluded.kunci_sampai;

  insert into keamanan.kejadian (jenis, user_id, ip, rincian)
    values (case when p_jenis = 'mfa' then 'mfa_gagal' else 'login_gagal' end, p_user, p_ip, p_rincian || jsonb_build_object('gagal', n));
  if sampai is not null then
    insert into keamanan.kejadian (jenis, user_id, ip, rincian)
      values (awalan || case when p_jenis = 'mfa' then 'terkunci' else 'akun_terkunci' end, p_user, p_ip,
              p_rincian || jsonb_build_object('gagal', n, 'menit', ceil(extract(epoch from sampai - now()) / 60)::int));
  end if;
  -- Kegagalan ini sendiri tetap dijawab "email atau password salah" oleh GoTrue; kunci berlaku mulai percobaan berikutnya.
  return jsonb_build_object('decision', 'continue');
end;
$$;

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return keamanan.catat_percobaan(
    nullif(event ->> 'user_id', '')::uuid, 'password',
    coalesce((event ->> 'valid')::boolean, false),
    event -> 'metadata' ->> 'ip_address');
end;
$$;

create or replace function public.hook_mfa_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return keamanan.catat_percobaan(
    nullif(event ->> 'user_id', '')::uuid, 'mfa',
    coalesce((event ->> 'valid')::boolean, false),
    event -> 'metadata' ->> 'ip_address',
    jsonb_strip_nulls(jsonb_build_object('factor_id', event ->> 'factor_id', 'factor_type', event ->> 'factor_type')));
end;
$$;

-- Ganti password (termasuk lewat "Lupa password") membuka kunci password akun itu.
create or replace function keamanan.buka_kunci_saat_ganti_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    if exists (select 1 from keamanan.percobaan_login where user_id = new.id and jenis = 'password') then
      delete from keamanan.percobaan_login where user_id = new.id and jenis = 'password';
      insert into keamanan.kejadian (jenis, user_id, rincian) values ('kunci_dibuka', new.id, '{"sebab":"ganti_password"}');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists buka_kunci_saat_ganti_password on auth.users;
create trigger buka_kunci_saat_ganti_password
  after update of encrypted_password on auth.users
  for each row execute function keamanan.buka_kunci_saat_ganti_password();

-- Hak akses: hanya server login (supabase_auth_admin) yang boleh memanggil hook; tidak lewat API publik.
revoke all on function keamanan.catat_percobaan(uuid, text, boolean, text, jsonb) from public;
revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
revoke all on function public.hook_mfa_verification_attempt(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
    grant execute on function public.hook_mfa_verification_attempt(jsonb) to supabase_auth_admin;
  end if;
end $$;

-- Ringkasan untuk pemantau server (pantau.sh) — angka saja, tanpa identitas.
create or replace function keamanan.ringkasan(p_menit int default 10)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'login_gagal', count(*) filter (where jenis = 'login_gagal'),
    'ip_login_gagal', count(distinct ip) filter (where jenis = 'login_gagal'),
    'mfa_gagal', count(*) filter (where jenis = 'mfa_gagal'),
    'akun_terkunci', count(distinct user_id) filter (where jenis in ('akun_terkunci', 'mfa_terkunci')),
    'akun_terkunci_lama', count(distinct user_id) filter (where jenis in ('akun_terkunci', 'mfa_terkunci') and (rincian ->> 'menit')::int >= 30)
  )
  from keamanan.kejadian
  where waktu > now() - make_interval(mins => p_menit);
$$;
revoke all on function keamanan.ringkasan(int) from public;

-- Simpan catatan 90 hari (B8).
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cron' and p.proname = 'schedule') then
    perform cron.schedule('hapus-kejadian-keamanan-lama', '20 17 * * *',
      $cmd$ delete from keamanan.kejadian where waktu < now() - interval '90 days' $cmd$);
  end if;
end $$;
