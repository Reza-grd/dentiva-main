-- Bucket publik untuk installer aplikasi desktop (halaman /unduh).
-- Hanya bisa diunggah lewat dashboard Supabase / service_role; publik hanya membaca & melihat daftar.
insert into storage.buckets (id, name, public)
values ('downloads', 'downloads', true)
on conflict (id) do update set public = true;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    update storage.buckets
       set file_size_limit = 200 * 1024 * 1024,
           allowed_mime_types = null
     where id = 'downloads';
  end if;
end $$;

drop policy if exists downloads_public_list on storage.objects;
create policy downloads_public_list on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'downloads');
