-- Isolasi antar-klinik, klinik suspended, user nonaktif, klaim JWT hilang/palsu.
begin;
\ir helpers/fixtures.psql
select plan(16);

-- ─── Klinik A melihat datanya sendiri saja ──────────────────────────────────
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000a');

select is((select public.get_user_clinic_id()), 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'get_user_clinic_id() = klinik A untuk admin A');
select is((select count(*)::int from public.patients where no_rm like 'TEST-%'), 0,
  'admin A tidak melihat data pasien sama sekali (pemisahan kewenangan)');
select is((select count(*)::int from public.patients where clinic_id = 'bbbbbbbb-0000-4000-8000-000000000002'), 0,
  'admin A tidak melihat pasien klinik B walau difilter eksplisit');
select is((select array_agg(value) from public.clinic_settings where key = 'test_marker'), array['A']::text[],
  'clinic_settings hanya milik klinik A');
select is((select count(*)::int from public.clinics), 1,
  'admin A hanya melihat baris kliniknya sendiri di public.clinics');

select throws_ok(
  $$ insert into public.clinic_settings (clinic_id, key, value)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'injected', 'x') $$,
  '42501', null,
  'admin A tidak bisa menulis data ke klinik B');

select lives_ok(
  $$ insert into public.clinic_settings (key, value) values ('auto_fill_test', 'x') $$,
  'insert tanpa clinic_id diisi otomatis dengan klinik A');
select is((select clinic_id from public.clinic_settings where key = 'auto_fill_test'),
  'aaaaaaaa-0000-4000-8000-000000000001'::uuid,
  'clinic_id otomatis = klinik A');
select pg_temp.logout();

-- Resepsionis klinik A (peran yang memegang data pasien) hanya melihat pasien kliniknya sendiri
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000e');
select is((select count(*)::int from public.patients where no_rm like 'TEST-%'), 2,
  'resepsionis A hanya melihat 2 pasien klinik A');
select is((select count(*)::int from public.patients where clinic_id = 'bbbbbbbb-0000-4000-8000-000000000002'), 0,
  'resepsionis A tidak melihat pasien klinik B walau difilter eksplisit');
select pg_temp.logout();

-- ─── Klinik suspended tidak bisa membaca datanya sendiri ────────────────────
select pg_temp.login_as('c0000000-0000-4000-8000-00000000000c');
select is((select public.get_user_clinic_id()), null::uuid,
  'get_user_clinic_id() NULL untuk klinik suspended');
select is((select count(*)::int from public.patients), 0,
  'klinik suspended tidak melihat pasiennya sendiri');
select is((select has_access from public.get_my_account_status()), false,
  'get_my_account_status() melaporkan has_access = false');
select pg_temp.logout();

-- ─── User nonaktif di klinik aktif ──────────────────────────────────────────
update public.users set status = 'suspended' where id = 'a0000000-0000-4000-8000-00000000000d';
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000d');
select is((select count(*)::int from public.patients), 0,
  'user suspended tidak melihat data walau kliniknya aktif');
select pg_temp.logout();

-- ─── Klaim JWT palsu: clinic_id klinik B milik user klinik A ────────────────
update auth.users
set raw_app_meta_data = jsonb_build_object('clinic_id', 'bbbbbbbb-0000-4000-8000-000000000002')
where id = 'a0000000-0000-4000-8000-00000000000e';
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000e');
select is((select count(*)::int from public.patients), 0,
  'klaim clinic_id yang tidak cocok dengan public.users ditolak');
select pg_temp.logout();

-- ─── Tanpa klaim sama sekali (fallback default sudah dihapus) ───────────────
update auth.users set raw_app_meta_data = '{}' where id = 'b0000000-0000-4000-8000-00000000000e';
select pg_temp.login_as('b0000000-0000-4000-8000-00000000000e');
select is((select count(*)::int from public.patients), 0,
  'tanpa klaim clinic_id tidak ada fallback ke klinik default');
select pg_temp.logout();

select * from finish();
rollback;
