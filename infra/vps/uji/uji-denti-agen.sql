-- Uji asap Denti Agen di database produksi — SEMUA di dalam transaksi lalu ROLLBACK (tidak ada data yang tersimpan).
--   ssh dentiva@VPS "docker exec -i supabase-db psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -v admin=<uuid admin> -v klinik=<uuid klinik>" < infra/vps/uji/uji-denti-agen.sql
-- PENTING: berkas ini HARUS tetap diawali `begin;` dan diakhiri `rollback;` (lihat peringatan di infra/vps/README.md).
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'admin', 'role', 'authenticated', 'app_metadata', json_build_object('clinic_id', :'klinik'))::text, true);
select set_config('request.jwt.claim.sub', :'admin', true);
set local role authenticated;

\echo == usulan pengeluaran
select (public.ai_agent_propose('pengeluaran_catat', '{"kategori":"Utilitas","deskripsi":"UJI AGEN (rollback)","jumlah":1234,"tanggal":"2026-10-14"}'::jsonb)) ->> 'ok' as usulan_ok;
select count(*) as menunggu from public.ai_actions where status = 'pending';
\echo == alat baca
select (public.ai_cari_bahan('', true, 3)) -> 'jumlah' as jumlah_bahan;
select jsonb_array_length((public.ai_saran_pemesanan(30, 14)) -> 'bahan') as perlu_dipesan;
select (public.ai_daftar_overhead()) -> 'total_aktif_per_bulan' as total_overhead;
\echo == setujui (dalam transaksi uji)
select (public.ai_agent_apply(array(select id from public.ai_actions where status = 'pending'))) ->> 'dijalankan' as dijalankan;
select count(*) as baris_uji from public.expenses where deskripsi = 'UJI AGEN (rollback)';
rollback;
\echo == setelah rollback (harus 0)
select count(*) as sisa_baris_uji from public.expenses where deskripsi = 'UJI AGEN (rollback)';
select count(*) as sisa_usulan from public.ai_actions;
