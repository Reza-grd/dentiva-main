-- Requires current schema and real pgcrypto. All synthetic rows and changes roll back.
begin;
set local statement_timeout='60s';
create or replace function pg_temp.assert_ok(condition boolean,label text) returns void language plpgsql as $$
begin if condition is distinct from true then raise exception 'Audit regression failed: %',label; end if; end $$;
create or replace function pg_temp.expect_error(statement text,expected_state text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then if sqlstate=expected_state then return; end if; raise; end;
  raise exception 'Expected SQLSTATE %, operation succeeded: %',expected_state,statement;
end $$;
create or replace function pg_temp.login_as(uid uuid,cid uuid) returns void language plpgsql as $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated','app_metadata',jsonb_build_object('clinic_id',cid))::text,true);
 perform set_config('request.jwt.claim.sub',uid::text,true);
 execute 'set local role authenticated';
end $$;
insert into public.clinics(id,name,slug,status) values
 ('eeaaaaaa-0000-4000-8000-000000000001','Audit fixture A','audit-fixture-a','active'),
 ('eebbbbbb-0000-4000-8000-000000000002','Audit fixture B','audit-fixture-b','active');
insert into auth.users(id,email,raw_app_meta_data) values
 ('ee000000-0000-4000-8000-00000000000a','audit-admin@example.test','{}'),
 ('ee000000-0000-4000-8000-00000000000d','audit-doctor@example.test','{}');
insert into public.users(id,email,full_name,role,clinic_id,status) values
 ('ee000000-0000-4000-8000-00000000000a','audit-admin@example.test','Synthetic Admin','admin','eeaaaaaa-0000-4000-8000-000000000001','active'),
 ('ee000000-0000-4000-8000-00000000000d','audit-doctor@example.test','Synthetic Doctor','dokter','eeaaaaaa-0000-4000-8000-000000000001','active');
insert into public.patients(id,no_rm,nama_lengkap,clinic_id) values
 ('ee100000-0000-4000-8000-000000000001','AUDIT-1',private.encrypt_envelope('Synthetic patient A','eeaaaaaa-0000-4000-8000-000000000001',false),'eeaaaaaa-0000-4000-8000-000000000001'),
 ('ee100000-0000-4000-8000-000000000002','AUDIT-2','Synthetic patient B','eebbbbbb-0000-4000-8000-000000000002');
insert into public.visits(id,patient_id,clinic_id,dokter_id,status,diagnosa,kode_icd10) values
 ('ee200000-0000-4000-8000-000000000001','ee100000-0000-4000-8000-000000000001','eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000d','ongoing','Synthetic clinical diagnosis','K02');
select pg_temp.login_as('ee000000-0000-4000-8000-00000000000d','eeaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert_ok((select public.decrypt_field(diagnosa)='Synthetic clinical diagnosis' and public.decrypt_field(kode_icd10)='K02' from public.visits where id='ee200000-0000-4000-8000-000000000001'),'doctor decrypts real pgcrypto envelope');
update public.visits set is_locked=true where id='ee200000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$update public.visits set diagnosa='Changed' where id='ee200000-0000-4000-8000-000000000001'$q$,'42501');
reset role;
-- Privileged SQL exercises the trigger even when role policies deny DELETE first.
select pg_temp.expect_error($q$delete from public.visits where id='ee200000-0000-4000-8000-000000000001'$q$,'42501');
select pg_temp.login_as('ee000000-0000-4000-8000-00000000000d','eeaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect_error($q$update public.visits set tanggal_kunjungan=current_date+1 where id='ee200000-0000-4000-8000-000000000001'$q$,'42501');
select pg_temp.expect_error($q$update public.visits set is_locked=false where id='ee200000-0000-4000-8000-000000000001'$q$,'22023');
update public.visits set is_locked=false,lock_change_reason='Synthetic correction' where id='ee200000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claims','',true),set_config('request.jwt.claim.sub','',true);
create temp table audit_cipher as select private.encrypt_envelope('Synthetic clinical diagnosis','eeaaaaaa-0000-4000-8000-000000000001',true) medical,
 private.encrypt_envelope('Synthetic other tenant','eebbbbbb-0000-4000-8000-000000000002',false) foreign_cipher;
grant select on audit_cipher to authenticated;
insert into storage.objects(bucket_id,name) values('radiologi','eeaaaaaa-0000-4000-8000-000000000001/audit/xray.png');
select pg_temp.login_as('ee000000-0000-4000-8000-00000000000a','eeaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert_ok((select public.decrypt_field(medical)='[Terbatas: hanya dokter]' from audit_cipher),'admin cannot decrypt clinical data');
select pg_temp.expect_error($q$select public.decrypt_field(replace(medical,'PGPM:','PGP:')) from audit_cipher$q$,'22023');
select pg_temp.expect_error($q$select public.decrypt_field(foreign_cipher) from audit_cipher$q$,'42501');
select pg_temp.expect_error($q$insert into public.visits(patient_id,clinic_id,status) values('ee100000-0000-4000-8000-000000000002','eeaaaaaa-0000-4000-8000-000000000001','ongoing')$q$,'42501');
select pg_temp.expect_error($q$update public.visits set patient_id='ee100000-0000-4000-8000-000000000002' where id='ee200000-0000-4000-8000-000000000001'$q$,'42501');
select pg_temp.assert_ok((select count(*)=0 from storage.objects where name='eeaaaaaa-0000-4000-8000-000000000001/audit/xray.png'),'admin cannot access radiology');
reset role;
select set_config('request.jwt.claims','',true),set_config('request.jwt.claim.sub','',true);
insert into public.treatments(id,clinic_id,kode_treatment,nama_treatment,harga_dasar,tier) values
 ('ee300000-0000-4000-8000-000000000001','eeaaaaaa-0000-4000-8000-000000000001','AUDIT-T','Synthetic treatment',100,'ringan');
insert into public.master_bahan(id,clinic_id,kode_bahan,nama_bahan,satuan_dasar,harga_rata2,stok_saat_ini) values
 ('ee400000-0000-4000-8000-000000000001','eeaaaaaa-0000-4000-8000-000000000001','AUDIT-M','Synthetic material','unit',5,100);
insert into public.tier_weights(clinic_id,tier,label,bobot) values('eeaaaaaa-0000-4000-8000-000000000001','ringan','Synthetic A',2),('eebbbbbb-0000-4000-8000-000000000002','ringan','Synthetic B',999);
insert into public.overhead_monthly_target(clinic_id,periode,total_overhead_bulanan,total_bobot_estimasi) values
 ('eeaaaaaa-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Asia/Jakarta')::date,100,10),
 ('eebbbbbb-0000-4000-8000-000000000002',date_trunc('month',now() at time zone 'Asia/Jakarta')::date,99900,1);
insert into public.treatment_materials(clinic_id,treatment_id,material_id,qty_rata2,wajib) values('eeaaaaaa-0000-4000-8000-000000000001','ee300000-0000-4000-8000-000000000001','ee400000-0000-4000-8000-000000000001',2,true);
select pg_temp.login_as('ee000000-0000-4000-8000-00000000000a','eeaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect_error($q$select public.save_visit_payment('ee200000-0000-4000-8000-000000000001','[{"treatment_id":"ee300000-0000-4000-8000-000000000001","quantity":2,"harga_satuan":100}]','[]','{"status_pembayaran":"paid","metode_pembayaran":"cash","jumlah_bayar":0}')$q$,'22023');
select pg_temp.assert_ok((select count(*)=0 from public.visit_treatments where visit_id='ee200000-0000-4000-8000-000000000001'),'failed payment rolls back details');
select public.save_visit_payment('ee200000-0000-4000-8000-000000000001','[{"treatment_id":"ee300000-0000-4000-8000-000000000001","quantity":2,"harga_satuan":100}]','[{"obat_id":"ee400000-0000-4000-8000-000000000001","qty":1,"harga_satuan":10}]','{"status_pembayaran":"partial","metode_pembayaran":"cash","jumlah_bayar":50}') is not null as partial_ok;
select public.save_visit_payment('ee200000-0000-4000-8000-000000000001','[{"treatment_id":"ee300000-0000-4000-8000-000000000001","quantity":2,"harga_satuan":100}]','[{"obat_id":"ee400000-0000-4000-8000-000000000001","qty":1,"harga_satuan":10}]','{"status_pembayaran":"paid","metode_pembayaran":"cash","jumlah_bayar":210}') is not null as paid_ok;
select pg_temp.assert_ok((select status='completed' from public.visits where id='ee200000-0000-4000-8000-000000000001'),'payment atomically completes visit');
select pg_temp.assert_ok((select count(*)=1 from public.visit_treatments where visit_id='ee200000-0000-4000-8000-000000000001'),'preserves treatment IDs');
select pg_temp.expect_error($q$select public.replace_visit_treatments('ee200000-0000-4000-8000-000000000001','[]')$q$,'42501');
reset role;
select set_config('request.jwt.claims','',true),set_config('request.jwt.claim.sub','',true);
select pg_temp.assert_ok((select stok_saat_ini=96 from public.master_bahan where id='ee400000-0000-4000-8000-000000000001'),'quantity consumes BOM twice');
select pg_temp.assert_ok((select overhead_allocated=40 and harga_jual_saat_itu=200 from public.treatment_cost_snapshot where visit_treatment_id=(select id from public.visit_treatments where visit_id='ee200000-0000-4000-8000-000000000001')),'costing uses own tenant and quantity');
select public.fn_proses_stok_dan_snapshot_visit_treatment(id) from public.visit_treatments where visit_id='ee200000-0000-4000-8000-000000000001';
select pg_temp.assert_ok((select stok_saat_ini=96 from public.master_bahan where id='ee400000-0000-4000-8000-000000000001'),'snapshot processing is idempotent');
-- AI cache provenance and reservation at the quota boundary.
insert into public.ai_usage(id,clinic_id,user_id,feature,model,question,question_norm,answer,status) values
 ('ee500000-0000-4000-8000-000000000001','eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','finance_chat','synthetic-model','Bagaimana pendapatan bulan ini?','bagaimana pendapatan bulan ini','Synthetic numeric answer','cached');
select pg_temp.login_as('ee000000-0000-4000-8000-00000000000a','eeaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert_ok(public.ai_answer_feedback('ee500000-0000-4000-8000-000000000001',true,null)->>'kind'='data','numeric answer is not classified as static guide');
-- Check effective ACL directly. The local Supabase Postgres image crashes when
-- this denied EXECUTE is caught inside a dynamic PL/pgSQL exception handler.
select pg_temp.assert_ok(not has_function_privilege('authenticated','public.ai_reserve_usage(uuid,uuid,text,text)','execute')
 and not has_function_privilege('anon','public.ai_reserve_usage(uuid,uuid,text,text)','execute')
 and has_function_privilege('service_role','public.ai_reserve_usage(uuid,uuid,text,text)','execute'),'reservation RPC is service-only');
reset role;
select set_config('request.jwt.claims','',true),set_config('request.jwt.claim.sub','',true);
insert into public.clinic_settings(clinic_id,key,value) values('eeaaaaaa-0000-4000-8000-000000000001','ai_assistant_enabled','true');
insert into public.clinic_subscriptions(clinic_id,plan_id,status,current_period_end)
 select 'eeaaaaaa-0000-4000-8000-000000000001',id,'active',now()+interval '1 month' from public.subscription_plans where name='Pro';
insert into public.ai_usage(clinic_id,user_id,feature,model,status,created_at)
 select 'eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','finance_chat','synthetic','ok',now()-interval '2 minutes' from generate_series(1,299);
select pg_temp.assert_ok(public.ai_reserve_usage('eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','finance_chat','synthetic') is not null,'last quota slot reserved before provider call');
select pg_temp.expect_error($q$select public.ai_reserve_usage('eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','finance_chat','synthetic')$q$,'54000');
select public.ai_reserve_usage('eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','daily_brief','synthetic') is not null as brief_reserved;
select pg_temp.expect_error($q$select public.ai_reserve_usage('eeaaaaaa-0000-4000-8000-000000000001','ee000000-0000-4000-8000-00000000000a','daily_brief','synthetic')$q$,'54000');
select 'audit-regression-ok' as result;
rollback;
