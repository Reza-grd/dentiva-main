-- Uji: kasir (resepsionis) melunasi kunjungan SELESAI tanpa tindakan tercatat; dan tidak bisa mengganti daftar milik dokter.
-- Selalu di-rollback. Jalankan setelah migrasi 20261011170000.
\set ON_ERROR_STOP 0
\pset tuples_only on
\pset format unaligned
-- PENGAMAN: skrip ini mengubah data (peran, status kunjungan, izin) untuk disimulasikan lalu di-ROLLBACK.
-- Tanpa transaksi, perubahannya TERCATAT PERMANEN — jangan pernah dijalankan tanpa `begin;` di bawah ini.
begin;
select id as rsp from public.users where role = 'resepsionis' order by created_at limit 1 \gset
select id as dok from public.users where role = 'dokter' order by created_at limit 1 \gset
select raw_app_meta_data::text as am_dok from auth.users where id = :'dok' \gset
select raw_app_meta_data::text as am from auth.users where id = :'rsp' \gset
select clinic_id as klinik from public.users where id = :'rsp' \gset
select id as tid, harga_dasar as harga from public.treatments where clinic_id = :'klinik' order by created_at limit 1 \gset
select patient_id as pat from public.visits where deleted_at is null limit 1 \gset
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'dok', 'role', 'authenticated', 'app_metadata', :'am_dok'::jsonb)::text, true) is null;
insert into public.visits(patient_id, tanggal_kunjungan, status, clinic_id) values (:'pat', current_date, 'completed', :'klinik') returning id as v_kosong \gset
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'rsp', 'role', 'authenticated', 'app_metadata', :'am'::jsonb)::text, true) is null;
create or replace function pg_temp.bayar(p_v uuid, p_t jsonb) returns text language plpgsql as $$
begin perform public.save_visit_payment(p_v, p_t, '[]', '{"metode_pembayaran":"cash","status_pembayaran":"paid","jumlah_bayar":500000}'); return 'berhasil';
exception when others then return 'ditolak: ' || sqlerrm; end $$;
select 'kunjungan selesai TANPA tindakan → kasir melengkapi & lunas: ' || pg_temp.bayar(:'v_kosong', format('[{"treatment_id":"%s","quantity":1,"harga_satuan":500000}]', :'tid')::jsonb);
select 'status kunjungan tetap selesai (tidak diubah pembayaran): ' || (select status from public.visits where id = :'v_kosong');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'dok', 'role', 'authenticated', 'app_metadata', :'am_dok'::jsonb)::text, true) is null;
insert into public.visits(patient_id, tanggal_kunjungan, status, clinic_id) values (:'pat', current_date, 'scheduled', :'klinik') returning id as v_dokter \gset
insert into public.visit_treatments(clinic_id, visit_id, treatment_id, quantity, harga_satuan, subtotal) values (:'klinik', :'v_dokter', :'tid', 1, 100000, 100000);
update public.visits set status = 'completed' where id = :'v_dokter';
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'rsp', 'role', 'authenticated', 'app_metadata', :'am'::jsonb)::text, true) is null;
select 'kunjungan selesai DENGAN tindakan dokter → kasir mengganti harga: ' || pg_temp.bayar(:'v_dokter', format('[{"treatment_id":"%s","quantity":1,"harga_satuan":1}]', :'tid')::jsonb);
reset role;
rollback;
