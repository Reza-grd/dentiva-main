-- Uji perilaku migrasi 20261011130000_audit_keamanan_tahap1 — SELALU di-rollback.
-- Dijalankan (laptop):
--   { echo begin; cat supabase/migrations/20261011130000_audit_keamanan_tahap1.sql; cat infra/vps/uji/uji-audit-tahap1.sql; } \
--     | ssh … 'docker exec -i supabase-db psql -X -q -U supabase_admin -d postgres'
-- Menyamar sebagai akun nyata lewat klaim JWT (sub + app_metadata asli) di dalam transaksi.
-- Keluaran hanya benar/salah — tidak menampilkan data pasien.
\set ON_ERROR_STOP 0
\set ON_ERROR_ROLLBACK on
\pset tuples_only on
\pset format unaligned
-- PENGAMAN: skrip ini mengubah data (peran, status kunjungan, izin) untuk disimulasikan lalu di-ROLLBACK.
-- Tanpa transaksi, perubahannya TERCATAT PERMANEN — jangan pernah dijalankan tanpa `begin;` di bawah ini.
begin;

select id as resep from public.users where role = 'resepsionis' order by created_at limit 1 \gset
select id as adm from public.users where role = 'admin' order by created_at limit 1 \gset
select raw_app_meta_data::text as am_resep from auth.users where id = :'resep' \gset
select raw_app_meta_data::text as am_adm from auth.users where id = :'adm' \gset
select id as pay from public.payments where status_pembayaran = 'paid' order by created_at limit 1 \gset
select id as pat from public.patients order by created_at limit 1 \gset
select count(*) as cnt_pay_before from public.payments \gset

-- ── sebagai resepsionis ──
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'resep', 'role', 'authenticated', 'app_metadata', :'am_resep'::jsonb)::text, true) is null;
select 'SIMULASI resepsionis: klinik terbaca=' || (public.get_user_clinic_id() is not null)::text
    || ', pembayaran lunas terlihat=' || exists (select 1 from public.payments where id = :'pay')::text;

insert into public.audit_logs(user_id, user_role, module, action, new_value)
values (:'adm', 'dokter', 'UJI_AUDIT', 'UJI', '{"password":"rahasia123","full_name":"X","nested":{"api_key":"k","ok":1}}');

update public.payments set keterangan_tambahan = 'uji ubah lunas' where id = :'pay';
update public.payments set wa_sent = not coalesce(wa_sent, false) where id = :'pay' returning 'B05 wa_sent tetap boleh (baris ter-update): true';

insert into public.visits(patient_id, tanggal_kunjungan, status, keluhan, catatan_dokter)
values (:'pat', current_date, 'scheduled', 'UJI-AUDIT-B09', 'CATATAN-PALSU');

-- ── sebagai admin ──
select set_config('request.jwt.claims', json_build_object('sub', :'adm', 'role', 'authenticated', 'app_metadata', :'am_adm'::jsonb)::text, true) is null;
select 'SIMULASI admin: pembayaran lunas terlihat=' || exists (select 1 from public.payments where id = :'pay')::text;
delete from public.payments where id = :'pay';

reset role;

-- ── hasil ──
select 'B04 password disamarkan: ' || coalesce((select (new_value->>'password' = '[disamarkan]' and new_value->'nested'->>'api_key' = '[disamarkan]' and new_value->'nested'->>'ok' = '1')::text
  from public.audit_logs where module = 'UJI_AUDIT'), 'insert gagal');
select 'B07 aktor = pemanggil asli: ' || coalesce((select (user_id = :'resep' and user_role = 'resepsionis')::text
  from public.audit_logs where module = 'UJI_AUDIT'), 'insert gagal');
select 'B05 ubah lunas ditolak: ' || (keterangan_tambahan is distinct from 'uji ubah lunas')::text from public.payments where id = :'pay';
select 'B05 hapus lunas ditolak: ' || ((select count(*) from public.payments) = :cnt_pay_before)::text;
select 'B09 catatan_dokter non-dokter dikosongkan: ' || coalesce((select (catatan_dokter is null)::text from public.visits
  where keluhan = 'UJI-AUDIT-B09' order by created_at desc limit 1), 'insert gagal');
select 'A4 visits di publikasi realtime: ' || exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'visits')::text;

rollback;
