-- =============================================================================
-- Penguatan keamanan (audit 15 Nov 2026)
-- -----------------------------------------------------------------------------
-- 1. MFA (TOTP) untuk akun klinik ditegakkan DI DATABASE: bila pengguna punya faktor MFA
--    terverifikasi, sesi tanpa verifikasi kedua (aal1) tidak dikenali sebagai anggota klinik
--    → semua RLS tenant menolak. Password yang bocor saja tidak cukup untuk membuka data.
-- 2. Daftar perangkat (sesi) milik sendiri + keluar dari perangkat lain.
-- 3. Kebijakan baca public.users dirapikan (hapus klausa "true"; tetap terbatas satu klinik).
-- 4. Bucket avatars dibatasi gambar ≤ 2 MB.
-- =============================================================================

-- 1. MFA ----------------------------------------------------------------------
-- plpgsql (bukan sql) agar tidak divalidasi saat dibuat di lingkungan uji tanpa tabel auth.mfa_factors.
create or replace function public.mfa_terpenuhi()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then return true; end if; -- service role / proses server
  if coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then return true; end if;
  return not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
end;
$$;
revoke all on function public.mfa_terpenuhi() from public, anon;
grant execute on function public.mfa_terpenuhi() to authenticated, service_role;

create or replace function public.get_user_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.clinics c
  join public.users u on u.clinic_id = c.id
  where c.id = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid
    and u.id = auth.uid()
    and c.status in ('trial', 'active')
    and u.status in ('invited', 'active')
    and public.mfa_terpenuhi();
$$;

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.status in ('invited', 'active')
    and public.mfa_terpenuhi();
$$;

create or replace function platform.klinik_manajer_saat_ini()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.clinic_id
  from public.users u
  join public.clinics c on c.id = u.clinic_id
  where u.id = auth.uid()
    and u.role = 'admin'
    and u.status in ('invited', 'active')
    and c.id = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid
    and c.status <> 'closed'
    and public.mfa_terpenuhi();
$$;

-- Kode tautan WhatsApp hanya dari sesi yang sudah memenuhi MFA (tautan WA dipercaya setara sesi penuh).
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
  if v_uid is null or not public.mfa_terpenuhi() or not exists (
    select 1 from public.users u join public.clinics c on c.id = u.clinic_id
    where u.id = v_uid and u.status = 'active' and c.status <> 'closed'
  ) then
    raise exception 'Akun tidak aktif' using errcode = 'insufficient_privilege';
  end if;

  select dibuat_pada into v_lama from public.wa_kode_tautan where user_id = v_uid;
  if v_lama is not null and v_lama > now() - interval '30 seconds' then
    raise exception 'Tunggu sebentar sebelum membuat kode baru' using errcode = 'check_violation';
  end if;

  v_kode := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public.wa_kode_tautan (user_id, kode_hash, kedaluwarsa, dibuat_pada)
  values (v_uid, encode(sha256(convert_to(v_kode, 'UTF8')), 'hex'), now() + interval '10 minutes', now())
  on conflict (user_id) do update
    set kode_hash = excluded.kode_hash, kedaluwarsa = excluded.kedaluwarsa, dibuat_pada = excluded.dibuat_pada;

  return jsonb_build_object('kode', v_kode, 'kedaluwarsa', now() + interval '10 minutes');
end;
$$;

-- 2. Perangkat / sesi milik sendiri ---------------------------------------------
create or replace function public.sesi_saya()
returns table (id uuid, dibuat timestamptz, terakhir_aktif timestamptz, perangkat text, ip_tersamar text, aal text, sesi_ini boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.mfa_terpenuhi() then
    raise exception 'Tidak diizinkan' using errcode = 'insufficient_privilege';
  end if;
  return query
    select s.id, s.created_at, coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at),
           left(coalesce(s.user_agent, ''), 300),
           -- IP disamarkan: hanya dua oktet pertama (IPv4) / tiga blok pertama (IPv6)
           case when s.ip is null then null
                when family(s.ip) = 4 then split_part(host(s.ip), '.', 1) || '.' || split_part(host(s.ip), '.', 2) || '.x.x'
                else array_to_string((string_to_array(host(s.ip), ':'))[1:3], ':') || ':…' end,
           s.aal::text,
           s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
    from auth.sessions s
    where s.user_id = auth.uid()
    order by 3 desc nulls last
    limit 20;
end;
$$;

create or replace function public.keluar_perangkat_lain()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_n int;
begin
  if auth.uid() is null or not public.mfa_terpenuhi() then
    raise exception 'Tidak diizinkan' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.sessions s
  where s.user_id = auth.uid() and s.id::text <> coalesce(auth.jwt() ->> 'session_id', '');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.sesi_saya() from public, anon;
revoke all on function public.keluar_perangkat_lain() from public, anon;
grant execute on function public.sesi_saya() to authenticated;
grant execute on function public.keluar_perangkat_lain() to authenticated;

-- 3. Kebijakan baca users: tanpa "OR true" (tenant_isolation RESTRICTIVE tetap berlaku) -------
drop policy if exists "Authenticated can view users" on public.users;
drop policy if exists rls_select_public on public.users;
create policy rls_select_public on public.users
  for select
  using (id = (select auth.uid()) or clinic_id = (select public.get_user_clinic_id()));

-- 4. Avatar: hanya gambar, maks. 2 MB --------------------------------------------
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';
