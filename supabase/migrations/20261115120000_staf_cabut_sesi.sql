-- =============================================================================
-- Pencabutan sesi staf setelah manajer klinik mengatur ulang passwordnya
-- (fungsi admin-atur-password-staf, service role). Membungkus platform.revoke_user_sessions
-- karena skema platform tidak dibuka ke PostgREST.
-- =============================================================================
create or replace function public.staf_cabut_sesi(p_user uuid)
returns int
language sql
security definer
set search_path = ''
as $$
  select platform.revoke_user_sessions(p_user);
$$;

revoke all on function public.staf_cabut_sesi(uuid) from public, anon, authenticated;
grant execute on function public.staf_cabut_sesi(uuid) to service_role;
