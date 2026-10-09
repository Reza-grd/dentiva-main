-- Basis pengetahuan: pencocokan mengembalikan question_norm (kecocokan persis dibandingkan utuh)
-- dan penghitung pemakaian jawaban tersimpan (khusus service_role / Edge Function).
drop function if exists public.ai_knowledge_match(text, int);
create function public.ai_knowledge_match(p_norm text, p_limit int default 3)
returns table (id uuid, question text, question_norm text, answer text, kind text, data_fingerprint text, similarity real)
language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
#variable_conflict use_column
declare v_clinic uuid := public.ai_require_admin();
begin
  return query
  select k.id, k.question, k.question_norm, k.answer, k.kind, k.data_fingerprint,
         case when k.question_norm = p_norm then 1::real else extensions.similarity(k.question_norm, p_norm) end as sim
  from public.ai_knowledge k
  where k.clinic_id = v_clinic
    and (k.question_norm = p_norm or extensions.similarity(k.question_norm, p_norm) >= 0.45)
  order by sim desc
  limit least(greatest(coalesce(p_limit, 3), 1), 5);
end $$;
revoke all on function public.ai_knowledge_match(text, int) from public, anon;
grant execute on function public.ai_knowledge_match(text, int) to authenticated, service_role;

create or replace function public.ai_knowledge_hit(p_id uuid)
returns void language sql volatile security definer set search_path = 'public' as $$
  update public.ai_knowledge set hit_count = hit_count + 1, last_used_at = now() where id = p_id;
$$;
revoke all on function public.ai_knowledge_hit(uuid) from public, anon, authenticated;
grant execute on function public.ai_knowledge_hit(uuid) to service_role;
