-- Skema platform: tidak terbaca anon/authenticated, audit append-only, owner terakhir terlindungi.
begin;
\ir helpers/fixtures.psql
select plan(9);

-- anon
set local role anon;
select throws_ok($$ select * from platform.operators $$, '42501', null,
  'anon tidak bisa membaca platform.operators');
select throws_ok($$ select * from platform.audit_logs $$, '42501', null,
  'anon tidak bisa membaca platform.audit_logs');
reset role;

-- authenticated (user klinik yang sah)
select pg_temp.login_as('a0000000-0000-4000-8000-00000000000a');
select throws_ok($$ select * from platform.invoices $$, '42501', null,
  'user klinik tidak bisa membaca platform.invoices');
select throws_ok($$ select * from platform.usage_daily $$, '42501', null,
  'user klinik tidak bisa membaca platform.usage_daily');
select throws_ok($$ select platform.dashboard_summary() $$, '42501', null,
  'user klinik tidak bisa memanggil fungsi platform');
select throws_ok($$ select * from public.billing_settle_midtrans_order('x', 'success', 1, '{}') $$, '42501', null,
  'user klinik tidak bisa memanggil wrapper billing');
select pg_temp.logout();

-- audit append-only (bahkan untuk postgres)
insert into platform.audit_logs (operator_id, action, target_type, target_id)
values ('0e000000-0000-4000-8000-0000000000e0', 'clinics.suspend', 'clinic', 'x');

select throws_ok($$ update platform.audit_logs set reason = 'ubah' $$, '42501', null,
  'UPDATE audit_logs diblokir');
select throws_ok($$ delete from platform.audit_logs $$, '42501', null,
  'DELETE audit_logs diblokir');

-- owner terakhir tidak bisa dinonaktifkan
select throws_ok(
  $$ update platform.operators set is_active = false where user_id = '0e000000-0000-4000-8000-0000000000e0' $$,
  '23514', null,
  'owner aktif terakhir tidak bisa dinonaktifkan');

select * from finish();
rollback;
