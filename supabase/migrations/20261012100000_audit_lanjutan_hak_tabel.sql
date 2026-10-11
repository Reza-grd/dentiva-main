-- Audit menyeluruh 12 Okt 2026 — pengerasan hak akses tabel (defense in depth; RLS tetap berlaku).
-- Temuan: role `anon` memegang INSERT/UPDATE/DELETE/TRUNCATE pada ±55 tabel public (bawaan Supabase) dan `authenticated` memegang
-- TRUNCATE/TRIGGER/REFERENCES. TRUNCATE tidak tunduk pada RLS; satu-satunya penghalang adalah PostgREST yang tidak membukanya.
-- Halaman publik (booking, layar antrean) memakai RPC SECURITY DEFINER, bukan tabel, sehingga anon tidak membutuhkan hak tabel.
-- Diuji: anon sudah tidak dapat membaca baris apa pun dari tabel public; perubahan ini hanya mengubah error-nya menjadi "permission denied".
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, trigger, references, maintain on all tables in schema public from authenticated;

-- Objek baru yang dibuat pemilik `postgres` tidak lagi otomatis terbuka bagi anon / berhak TRUNCATE.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke truncate, trigger, references, maintain on tables from authenticated;
do $$
begin
  execute 'alter default privileges for role supabase_admin in schema public revoke all on tables from anon';
  execute 'alter default privileges for role supabase_admin in schema public revoke all on sequences from anon';
  execute 'alter default privileges for role supabase_admin in schema public revoke truncate, trigger, references, maintain on tables from authenticated';
exception when insufficient_privilege or undefined_object then
  raise notice 'default privileges supabase_admin dilewati (hak tidak cukup atau role tidak ada)';
end $$;

-- Indeks untuk kunci asing yang belum terindeks (kinerja hapus/gabung; tabel kecil, aman).
create index if not exists ai_feedback_usage_id_idx on public.ai_feedback (usage_id);
create index if not exists ai_feedback_user_id_idx on public.ai_feedback (user_id);
create index if not exists ai_insights_generated_by_idx on public.ai_insights (generated_by);
create index if not exists ai_knowledge_source_usage_id_idx on public.ai_knowledge (source_usage_id);
create index if not exists ai_knowledge_verified_by_idx on public.ai_knowledge (verified_by);
create index if not exists recall_contacts_contacted_by_idx on public.recall_contacts (contacted_by);
create index if not exists recall_contacts_patient_id_idx on public.recall_contacts (patient_id);
