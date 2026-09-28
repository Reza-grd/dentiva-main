-- provision_clinic, penomoran invoice, konfirmasi manual, webhook Midtrans idempoten.
begin;
\ir helpers/fixtures.psql
select plan(15);

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, created_at, updated_at) values
  ('d0000000-0000-4000-8000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-baru@test.local', '{}', now(), now());

-- ─── provision_clinic ───────────────────────────────────────────────────────
select lives_ok($$
  select platform.provision_clinic(
    'd0000000-0000-4000-8000-0000000000d1', 'owner-baru@test.local', 'Owner Baru', '0811',
    'Klinik Baru', 'klinik-baru-test', '021', 'klinik@test.local', 'Jl. Tes', 'Bandung', 'Jawa Barat',
    (select id from public.subscription_plans order by price_monthly limit 1), 14,
    '0e000000-0000-4000-8000-0000000000e0')
$$, 'provision_clinic berhasil');

select is((select status from public.clinics where slug = 'klinik-baru-test'), 'trial', 'klinik baru berstatus trial');
select ok((select trial_ends_at > now() + interval '13 days' from public.clinics where slug = 'klinik-baru-test'),
  'trial_ends_at ≈ 14 hari');
select is((select cs.status from public.clinic_subscriptions cs join public.clinics c on c.id = cs.clinic_id
           where c.slug = 'klinik-baru-test'), 'trialing', 'langganan trialing dibuat');
select is((select status from public.users where id = 'd0000000-0000-4000-8000-0000000000d1'), 'invited',
  'pemilik berstatus invited');
select is((select raw_app_meta_data ->> 'clinic_id' from auth.users where id = 'd0000000-0000-4000-8000-0000000000d1'),
          (select id::text from public.clinics where slug = 'klinik-baru-test'),
  'klaim app_metadata.clinic_id terisi otomatis');

select throws_ok($$
  select platform.provision_clinic(
    'a0000000-0000-4000-8000-00000000000a', 'x@test.local', 'X', null,
    'Duplikat', 'klinik-baru-test', null, null, null, null, null,
    (select id from public.subscription_plans limit 1), 14, null)
$$, '23505', null, 'slug duplikat ditolak');

-- ─── Penomoran invoice ──────────────────────────────────────────────────────
create temp table _nums (n text) on commit drop;
insert into _nums select platform.next_invoice_number();
insert into _nums select platform.next_invoice_number();
select ok(
  (select bool_and(n ~ '^INV-\d{4}-\d{6}$') and count(distinct n) = 2 from _nums),
  'nomor invoice berformat INV-YYYY-NNNNNN dan unik');

-- ─── Konfirmasi manual ──────────────────────────────────────────────────────
create temp table _inv on commit drop as
select * from platform.create_invoice('aaaaaaaa-0000-4000-8000-000000000001', current_date, current_date + 29,
                                      500000, 55000, current_date + 7, 'tes', null);

select is((select total_idr from _inv), 555000::bigint, 'total = nominal + pajak');

select is((select invoice_status from platform.confirm_manual_payment(
            (select id from _inv), 300000, now(), 'TRF-1', null, '0e000000-0000-4000-8000-0000000000e0')),
          'open', 'pembayaran sebagian: invoice tetap open');
select is((select invoice_status from platform.confirm_manual_payment(
            (select id from _inv), 255000, now(), 'TRF-2', null, '0e000000-0000-4000-8000-0000000000e0')),
          'paid', 'pelunasan: invoice paid');
select throws_ok($$ select * from platform.confirm_manual_payment(
            (select id from _inv), 1, now(), 'TRF-3', null, null) $$,
          '23514', null, 'tidak bisa bayar invoice yang sudah lunas');

-- ─── Midtrans ───────────────────────────────────────────────────────────────
select lives_ok($$ select * from platform.register_midtrans_order(
  'ORDER-TEST-1', 'bbbbbbbb-0000-4000-8000-000000000002',
  (select id from public.subscription_plans order by price_monthly limit 1), 'monthly') $$,
  'order Midtrans tercatat');

select is(platform.settle_midtrans_order('ORDER-TEST-1', 'success',
            (select amount_idr from platform.payments where provider_ref = 'ORDER-TEST-1'), '{}'),
          'confirmed', 'settlement mengonfirmasi pembayaran');
select is(platform.settle_midtrans_order('ORDER-TEST-1', 'success',
            (select amount_idr from platform.payments where provider_ref = 'ORDER-TEST-1'), '{}'),
          'already_confirmed', 'notifikasi berulang idempoten');

select * from finish();
rollback;
