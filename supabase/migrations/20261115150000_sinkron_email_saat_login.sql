-- =============================================================================
-- Ganti email dengan konfirmasi (akun-ganti-email → tautan ke email lama & baru).
-- Email Auth baru berlaku setelah kedua tautan diklik; public.users.email disamakan
-- saat pengguna masuk berikutnya (record_login), karena tabel auth.users dimiliki
-- layanan Auth sehingga trigger tidak dipasang di sana.
-- =============================================================================
create or replace function public.record_login()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users u
  set last_login_at = now(),
      status = case when u.status = 'invited' then 'active' else u.status end,
      email = coalesce((select lower(a.email) from auth.users a where a.id = u.id), u.email)
  where u.id = auth.uid()
    and u.status in ('invited', 'active');
end;
$$;

revoke all on function public.record_login() from public, anon;
grant execute on function public.record_login() to authenticated;
