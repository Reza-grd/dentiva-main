-- Guard kolom sensitif users, storage per klinik, nomor RM per klinik.
begin;
\ir helpers/fixtures.psql
select plan(9);

-- ─── Eskalasi role ──────────────────────────────────────────────────────────
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000d');  -- dokter A
select throws_ok(
  $$ update public.users set role = 'admin' where id = 'a0000000-0000-4000-8000-00000000000d' $$,
  '42501', null, 'dokter tidak bisa menjadikan dirinya admin');
select lives_ok(
  $$ update public.users set full_name = 'drg. Dokter A' where id = 'a0000000-0000-4000-8000-00000000000d' $$,
  'dokter tetap bisa mengubah nama sendiri');
select pg_temp.logout();

select pg_temp.login_as('a0000000-0000-4000-8000-00000000000a');  -- admin A
select throws_ok(
  $$ update public.users set status = 'suspended' where id = 'a0000000-0000-4000-8000-00000000000d' $$,
  '42501', null, 'admin klinik tidak bisa memakai status suspended');
select lives_ok(
  $$ update public.users set status = 'deactivated' where id = 'a0000000-0000-4000-8000-00000000000d' $$,
  'admin klinik bisa menonaktifkan staf');
select pg_temp.logout();

-- ─── Storage ────────────────────────────────────────────────────────────────
insert into storage.objects (bucket_id, name) values
  ('radiologi', 'aaaaaaaa-0000-4000-8000-000000000001/p/xray.png'),
  ('radiologi', 'bbbbbbbb-0000-4000-8000-000000000002/p/xray.png');

select pg_temp.login_as('a0000000-0000-4000-8000-00000000000a');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'radiologi' and name like 'bbbbbbbb%'), 0,
  'klinik A tidak melihat radiologi klinik B');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'radiologi' and name like 'aaaaaaaa%'), 1,
  'klinik A melihat radiologinya sendiri');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('radiologi', 'bbbbbbbb-0000-4000-8000-000000000002/p/x.png') $$,
  '42501', null, 'tidak bisa mengunggah ke folder klinik B');
select pg_temp.logout();

-- ─── Nomor RM per klinik ────────────────────────────────────────────────────
select pg_temp.login_as('b0000000-0000-4000-8000-00000000000b');
insert into public.patients (nama_lengkap) values ('Pasien RM B');
select matches(
  (select no_rm from public.patients where nama_lengkap = 'Pasien RM B'),
  '^RM-\d{6}$', 'no_rm dibuat otomatis per klinik');
select pg_temp.logout();

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.patients'::regclass
          and contype = 'u' and pg_get_constraintdef(oid) ilike '%clinic_id%no_rm%'),
  'UNIQUE (clinic_id, no_rm)');

select * from finish();
rollback;
