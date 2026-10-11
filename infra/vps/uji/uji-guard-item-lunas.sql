-- Uji L01: baris obat/tindakan kunjungan LUNAS tidak boleh dipindah ke kunjungan lain, diubah, atau dihapus.
-- Selalu di-rollback. Jalankan setelah migrasi 20261012090000.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned
select id as dok from public.users where role = 'dokter' order by created_at limit 1 \gset
select raw_app_meta_data::text as am from auth.users where id = :'dok' \gset
select clinic_id as klinik from public.users where id = :'dok' \gset
select patient_id as pat from public.visits where deleted_at is null and clinic_id = :'klinik' limit 1 \gset
begin;
insert into public.visits(patient_id, tanggal_kunjungan, status, clinic_id) values (:'pat', current_date, 'scheduled', :'klinik') returning id as va \gset
insert into public.visits(patient_id, tanggal_kunjungan, status, clinic_id) values (:'pat', current_date, 'scheduled', :'klinik') returning id as vb \gset
insert into public.visit_obat(clinic_id, visit_id, nama_obat, qty, harga_satuan) values (:'klinik', :'va', 'Uji', 1, 1000) returning id as obat \gset
insert into public.payments(clinic_id, visit_id, patient_id, total_bayar, status_pembayaran, metode_pembayaran) values (:'klinik', :'va', :'pat', 1000, 'paid', 'cash');
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'dok', 'role', 'authenticated', 'app_metadata', :'am'::jsonb)::text, true) is null;
create or replace function pg_temp.coba(p text) returns text language plpgsql as $$
begin execute p; return 'LOLOS (celah!)'; exception when others then return 'ditolak: ' || sqlerrm; end $$;
select 'ubah qty obat kunjungan lunas: ' || pg_temp.coba(format('update public.visit_obat set qty = 5 where id = %L', :'obat'));
select 'PINDAH obat kunjungan lunas ke kunjungan lain: ' || pg_temp.coba(format('update public.visit_obat set visit_id = %L where id = %L', :'vb', :'obat'));
select 'hapus obat kunjungan lunas: ' || pg_temp.coba(format('delete from public.visit_obat where id = %L', :'obat'));
select 'tambah obat ke kunjungan lunas: ' || pg_temp.coba(format('insert into public.visit_obat(clinic_id, visit_id, nama_obat, qty, harga_satuan) values (%L, %L, ''X'', 1, 1)', :'klinik', :'va'));
reset role;
rollback;
