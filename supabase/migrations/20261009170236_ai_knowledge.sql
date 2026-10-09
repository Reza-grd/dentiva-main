-- Basis pengetahuan Asisten AI: jawaban yang dinilai "tepat" oleh admin disimpan dan dipakai ulang.
--   ai_usage     : + answer, question_norm, data_fingerprint; status 'cached' (jawaban dari basis
--                  pengetahuan — tidak memanggil AI, tidak mengurangi kuota).
--   ai_knowledge : jawaban terverifikasi per klinik. kind 'panduan' (cara pakai, dipakai ulang kapan
--                  saja) atau 'data' (angka; dipakai ulang persis hanya bila sidik data sama).
--   ai_feedback  : riwayat penilaian 👍/👎.
--   ai_answer_feedback() : simpan penilaian; 👍 → masuk/menimpa basis pengetahuan,
--                  👎 pada jawaban dari basis pengetahuan → entri itu dihapus agar tidak dipakai lagi.
--   ai_knowledge_match() : pertanyaan mirip (trigram) untuk acuan AI.

do $$ begin
  create extension if not exists pg_trgm with schema extensions;
exception when others then raise notice 'pg_trgm tidak tersedia: %', sqlerrm;
end $$;

alter table public.ai_usage
  add column if not exists answer text,
  add column if not exists question_norm text,
  add column if not exists data_fingerprint text;
alter table public.ai_usage drop constraint if exists ai_usage_status_check;
alter table public.ai_usage add constraint ai_usage_status_check check (status in ('ok', 'error', 'refused', 'cached'));

create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  question text not null,
  question_norm text not null,
  answer text not null,
  kind text not null default 'data' check (kind in ('panduan', 'data')),
  tools_used text[] not null default '{}',
  data_fingerprint text,
  source_usage_id uuid references public.ai_usage(id) on delete set null,
  verified_by uuid references public.users(id) on delete set null,
  hit_count int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, question_norm)
);
do $$ begin
  create index if not exists ai_knowledge_norm_trgm on public.ai_knowledge using gin (question_norm extensions.gin_trgm_ops);
exception when others then raise notice 'indeks trigram dilewati: %', sqlerrm;
end $$;
alter table public.ai_knowledge enable row level security;
drop policy if exists tenant_isolation on public.ai_knowledge;
create policy tenant_isolation on public.ai_knowledge as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id())) with check (clinic_id = (select public.get_user_clinic_id()));
drop policy if exists ai_knowledge_admin_select on public.ai_knowledge;
create policy ai_knowledge_admin_select on public.ai_knowledge for select to authenticated
  using ((select public.get_user_role()) = 'admin');
drop policy if exists ai_knowledge_admin_delete on public.ai_knowledge;
create policy ai_knowledge_admin_delete on public.ai_knowledge for delete to authenticated
  using ((select public.get_user_role()) = 'admin');
revoke insert, update on public.ai_knowledge from anon, authenticated;
grant select, delete on public.ai_knowledge to authenticated;

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  usage_id uuid references public.ai_usage(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  correct boolean not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ai_feedback_clinic_idx on public.ai_feedback (clinic_id, created_at desc);
alter table public.ai_feedback enable row level security;
drop policy if exists tenant_isolation on public.ai_feedback;
create policy tenant_isolation on public.ai_feedback as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id())) with check (clinic_id = (select public.get_user_clinic_id()));
drop policy if exists ai_feedback_admin_select on public.ai_feedback;
create policy ai_feedback_admin_select on public.ai_feedback for select to authenticated
  using ((select public.get_user_role()) = 'admin');
revoke insert, update, delete on public.ai_feedback from anon, authenticated;
grant select on public.ai_feedback to authenticated;

create or replace function public.ai_answer_feedback(p_usage_id uuid, p_correct boolean, p_note text default null)
returns jsonb language plpgsql volatile security definer set search_path = 'public', 'extensions' as $$
declare
  v_clinic uuid := public.ai_require_admin();
  u public.ai_usage%rowtype;
  v_kind text;
begin
  select * into u from public.ai_usage where id = p_usage_id and clinic_id = v_clinic;
  if not found or u.feature <> 'finance_chat' or u.answer is null or u.question_norm is null then
    raise exception 'Jawaban tidak ditemukan' using errcode = 'P0002';
  end if;
  if u.status not in ('ok', 'cached') then
    raise exception 'Jawaban ini tidak dapat dinilai' using errcode = '22023';
  end if;

  insert into public.ai_feedback (clinic_id, usage_id, user_id, correct, note)
  values (v_clinic, u.id, auth.uid(), p_correct, nullif(left(trim(coalesce(p_note, '')), 500), ''));

  if p_correct then
    v_kind := case
      when cardinality(u.tools_used) = 0
       and u.question_norm ~ '(cara|bagaimana|gimana|apa itu|apa fungsi|dimana|di mana|menu|fitur|langkah|aktifkan|mengaktifkan|membuat|buat|mengatur|atur|mengubah|ubah|menambah|tambah|cetak|unduh|download|install|instal|login|daftar|hapus|pengaturan)'
      then 'panduan' else 'data' end;
    insert into public.ai_knowledge (clinic_id, question, question_norm, answer, kind, tools_used, data_fingerprint, source_usage_id, verified_by)
    values (v_clinic, left(u.question, 1000), u.question_norm, u.answer, v_kind, u.tools_used, u.data_fingerprint, u.id, auth.uid())
    on conflict (clinic_id, question_norm) do update set
      question = excluded.question, answer = excluded.answer, kind = excluded.kind,
      tools_used = excluded.tools_used, data_fingerprint = excluded.data_fingerprint,
      source_usage_id = excluded.source_usage_id, verified_by = excluded.verified_by, updated_at = now();
    return jsonb_build_object('saved', true, 'kind', v_kind);
  end if;

  -- Dinilai kurang tepat: jangan pakai lagi jawaban tersimpan untuk pertanyaan yang sama
  delete from public.ai_knowledge where clinic_id = v_clinic and question_norm = u.question_norm;
  return jsonb_build_object('saved', false);
end $$;

create or replace function public.ai_knowledge_match(p_norm text, p_limit int default 3)
returns table (id uuid, question text, answer text, kind text, data_fingerprint text, similarity real)
language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
#variable_conflict use_column
declare v_clinic uuid := public.ai_require_admin();
begin
  return query
  select k.id, k.question, k.answer, k.kind, k.data_fingerprint, extensions.similarity(k.question_norm, p_norm) as sim
  from public.ai_knowledge k
  where k.clinic_id = v_clinic and extensions.similarity(k.question_norm, p_norm) >= 0.45
  order by sim desc
  limit least(greatest(coalesce(p_limit, 3), 1), 5);
end $$;

revoke all on function public.ai_answer_feedback(uuid, boolean, text) from public, anon;
revoke all on function public.ai_knowledge_match(text, int) from public, anon;
grant execute on function public.ai_answer_feedback(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.ai_knowledge_match(text, int) to authenticated, service_role;
