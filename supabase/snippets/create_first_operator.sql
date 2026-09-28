-- =============================================================================
-- Buat operator OWNER pertama Dentiva Console (jalankan SEKALI per lingkungan).
-- Operator berikutnya ditambahkan dari menu Console → Operator oleh owner.
--
-- Langkah:
--   1. Supabase Dashboard → Authentication → Users → "Invite user"
--      Isi email kerja (mis. nama@dentiva.co.id). JANGAN pakai email akun klinik.
--   2. Ganti email di bawah, lalu jalankan di SQL Editor.
--   3. Buka tautan undangan dari email → buat password → Console akan meminta
--      pendaftaran MFA (TOTP) sebelum bisa dipakai.
-- =============================================================================

do $$
declare
  v_email text := 'owner@dentiva.co.id';   -- ← GANTI
  v_name  text := 'Nama Owner';            -- ← GANTI
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise exception 'User % belum ada di auth.users. Undang dulu lewat Dashboard → Authentication.', v_email;
  end if;

  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'Email % adalah akun klinik. Operator wajib memakai akun terpisah.', v_email;
  end if;

  -- Pastikan akun operator tidak membawa klaim klinik.
  update auth.users
  set raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'clinic_id')
                          || jsonb_build_object('dentiva_operator', true)
  where id = v_uid;

  insert into platform.operators (user_id, full_name, role)
  values (v_uid, v_name, 'owner')
  on conflict (user_id) do update set role = 'owner', is_active = true, full_name = excluded.full_name;

  raise notice 'Operator owner % siap. Login ke Console dan aktifkan MFA.', v_email;
end $$;
