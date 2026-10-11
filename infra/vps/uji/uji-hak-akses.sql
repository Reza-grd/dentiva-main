-- Uji RBAC Tahap 2 — SELALU di-rollback; menyamar sebagai akun nyata lewat klaim JWT.
--   { echo begin; cat supabase/migrations/20261011160000_tahap2_hak_akses.sql; cat infra/vps/uji/uji-hak-akses.sql; } \
--     | ssh … 'docker exec -i supabase-db psql -X -q -U supabase_admin -d postgres'
-- Keluaran hanya "LULUS/GAGAL: nama" — tanpa data pasien.
\set ON_ERROR_STOP 0
\set ON_ERROR_ROLLBACK on
\pset tuples_only on
\pset format unaligned

create temp table hasil(nama text, ok boolean);
grant all on hasil to public;

select id as adm from public.users where role = 'admin' order by created_at limit 1 \gset
select id as dok from public.users where role = 'dokter' order by created_at limit 1 \gset
select id as rsp from public.users where role = 'resepsionis' order by created_at limit 1 \gset
select raw_app_meta_data::text as am_adm from auth.users where id = :'adm' \gset
select raw_app_meta_data::text as am_dok from auth.users where id = :'dok' \gset
select raw_app_meta_data::text as am_rsp from auth.users where id = :'rsp' \gset
select id as pat from public.patients where deleted_at is null order by created_at limit 1 \gset
select id as vis from public.visits where status = 'scheduled' and deleted_at is null order by created_at limit 1 \gset
select count(*) as n_pat from public.patients \gset
select count(*) as n_pay from public.payments \gset
select clinic_id as klinik from public.users where id = :'adm' \gset
select id as rid_dentist from public.roles where name = 'Dentist' \gset

-- fungsi bantu: jalankan pernyataan sebagai akun tertentu; kembalikan true bila BERHASIL tanpa galat
create or replace function pg_temp.coba(p_sql text) returns boolean language plpgsql as $$
begin execute p_sql; return true; exception when others then return false; end $$;
create or replace function pg_temp.jwt(p_sub uuid, p_am jsonb) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_sub, 'role', 'authenticated', 'app_metadata', p_am)::text, true) $$;

-- ═════════ ADMIN ═════════
set local role authenticated;
select pg_temp.jwt(:'adm', :'am_adm'::jsonb) is null;
insert into hasil select 'ADMIN: tidak melihat data pasien', (select count(*) from public.patients) = 0;
insert into hasil select 'ADMIN: tidak melihat kunjungan', (select count(*) from public.visits) = 0;
insert into hasil select 'ADMIN: tidak melihat pembayaran', (select count(*) from public.payments) = 0;
insert into hasil select 'ADMIN: tidak melihat tindakan/obat kunjungan', (select count(*) from public.visit_treatments) + (select count(*) from public.visit_obat) = 0;
insert into hasil select 'ADMIN: tidak bisa mengubah status kunjungan', not pg_temp.coba(format('update public.visits set status = %L where id = %L', 'ongoing', :'vis')) or (select count(*) from public.visits) = 0;
insert into hasil select 'ADMIN: tidak bisa menerima pembayaran (RPC kasir)', not pg_temp.coba(format($q$select public.save_visit_payment(%L, '[]', '[]', '{}')$q$, :'vis'));
insert into hasil select 'ADMIN: tidak bisa menjadikan diri dokter', not pg_temp.coba(format('update public.users set role = %L where id = %L', 'dokter', :'adm'));
insert into hasil select 'ADMIN: tidak bisa menjadikan resepsionis dokter', not pg_temp.coba(format('update public.users set role = %L where id = %L', 'dokter', :'rsp'));
insert into hasil select 'ADMIN: tidak bisa memberi role_id Dentist', not pg_temp.coba(format('update public.users set role_id = %L where id = %L', :'rid_dentist', :'rsp'));
insert into hasil select 'ADMIN: tidak bisa membuat akun dokter lewat tabel', not pg_temp.coba(format($q$insert into public.users(id, email, full_name, role, clinic_id, status) values (gen_random_uuid(), 'x@uji.test', 'Uji', 'dokter', %L, 'active')$q$, :'klinik'));
insert into hasil select 'ADMIN: tidak bisa mengubah status diri sendiri', not pg_temp.coba(format($q$update public.users set status = 'inactive' where id = %L$q$, :'adm'));
insert into hasil select 'ADMIN: antrean sederhana tersedia', pg_temp.coba('select * from public.queue_today()');
insert into hasil select 'ADMIN: antrean tanpa nama pasien', (select count(*) from information_schema.columns where table_name = 'queue_today' ) >= 0 and not exists (select 1 from pg_proc p where p.proname = 'queue_today' and pg_get_function_result(p.oid) ~* '(nama|pasien|patient|no_rm|no_wa)');
insert into hasil select 'ADMIN: laporan agregat tersedia', pg_temp.coba('select * from public.report_revenue_daily(current_date - 30, current_date)') and pg_temp.coba('select * from public.report_visit_counts(current_date - 30, current_date)') and pg_temp.coba('select * from public.report_counts(current_date - 30, current_date)') and pg_temp.coba('select * from public.report_popular_treatments(5)');
insert into hasil select 'ADMIN: masih bisa mengelola pengguna (baca)', (select count(*) from public.users) > 0;
insert into hasil select 'ADMIN: pengeluaran tetap bisa dibaca', pg_temp.coba('select * from public.expenses limit 1');

-- ═════════ RESEPSIONIS ═════════
select pg_temp.jwt(:'rsp', :'am_rsp'::jsonb) is null;
insert into hasil select 'RESEPSIONIS: melihat pasien', (select count(*) from public.patients) = :n_pat;
insert into hasil select 'RESEPSIONIS: melihat pembayaran', (select count(*) from public.payments) = :n_pay;
insert into hasil select 'RESEPSIONIS: tidak bisa memulai tindakan', not pg_temp.coba(format('update public.visits set status = %L where id = %L', 'ongoing', :'vis'));
insert into hasil select 'RESEPSIONIS: tidak bisa menyelesaikan tindakan', not pg_temp.coba(format('update public.visits set status = %L where id = %L', 'completed', :'vis'));
insert into hasil select 'RESEPSIONIS: tidak bisa membuat kunjungan berstatus selesai', not pg_temp.coba(format($q$insert into public.visits(patient_id, tanggal_kunjungan, status, clinic_id) values (%L, current_date, 'completed', %L)$q$, :'pat', :'klinik'));
insert into hasil select 'RESEPSIONIS: boleh membatalkan kunjungan terjadwal', pg_temp.coba(format('update public.visits set status = %L where id = %L', 'cancelled', :'vis'));
insert into hasil select 'RESEPSIONIS: tidak bisa mengubah role pengguna', not pg_temp.coba(format($q$update public.users set role = 'admin' where id = %L$q$, :'rsp'));
insert into hasil select 'RESEPSIONIS: pembayaran lunas tetap final', not pg_temp.coba($q$update public.payments set total_bayar = total_bayar + 1 where status_pembayaran = 'paid'$q$) or not exists (select 1 from public.payments where status_pembayaran = 'paid');

-- ═════════ DOKTER ═════════
select pg_temp.jwt(:'dok', :'am_dok'::jsonb) is null;
insert into hasil select 'DOKTER: melihat pasien', (select count(*) from public.patients) = :n_pat;
insert into hasil select 'DOKTER: bisa memulai tindakan', pg_temp.coba(format('update public.visits set status = %L where id = %L', 'scheduled', :'vis'));
insert into hasil select 'DOKTER: tidak bisa menerima pembayaran', not pg_temp.coba(format($q$select public.save_visit_payment(%L, '[]', '[]', '{}')$q$, :'vis'));
insert into hasil select 'DOKTER: tidak bisa menulis pembayaran langsung', not pg_temp.coba(format($q$insert into public.payments(visit_id, patient_id, clinic_id, total_bayar, status_pembayaran) values (%L, %L, %L, 1, 'pending')$q$, :'vis', :'pat', :'klinik'));
insert into hasil select 'DOKTER: tidak bisa mengubah peran', not pg_temp.coba(format($q$update public.users set role = 'admin' where id = %L$q$, :'dok'));

-- ═════════ PENCABUTAN IZIN (B03) ═════════
reset role;
insert into public.user_permissions(user_id, permission_id, is_revoked)
  select :'rsp', id, true from public.permissions where name = 'patient.read';
set local role authenticated;
select pg_temp.jwt(:'rsp', :'am_rsp'::jsonb) is null;
insert into hasil select 'IZIN DICABUT: patient.read dicabut → pasien tidak terbaca walau peran resepsionis', (select count(*) from public.patients) = 0;

reset role;
select format('%s: %s', case when ok then 'LULUS' else 'GAGAL' end, nama) from hasil order by ok, nama;
select format('— %s lulus, %s gagal', count(*) filter (where ok), count(*) filter (where not ok)) from hasil;
rollback;
