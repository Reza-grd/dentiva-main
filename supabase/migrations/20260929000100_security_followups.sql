-- =============================================================================
-- Tindak lanjut keamanan setelah Dentiva Console (lihat docs/dentiva-console.md §6)
-- -----------------------------------------------------------------------------
-- 1. public.users: kolom sensitif dijaga trigger.
--    CELAH: policy lama users_update_own membolehkan user mengubah barisnya
--    sendiri tanpa batas kolom → dokter/resepsionis bisa menjadikan dirinya admin.
--    Sekarang dari aplikasi (ada JWT user):
--      * clinic_id tidak bisa diubah siapa pun;
--      * role / role_id / status / is_active hanya boleh diubah admin klinik;
--      * status 'suspended' hanya boleh dipasang/dilepas tim Dentiva (Console).
-- 2. Storage: bucket radiologi, klinik, patient-photos dijadikan PRIVAT (di produksi
--    ketiganya ternyata publik → siapa pun dengan URL bisa membuka rontgen/foto pasien;
--    aplikasi sudah memakai signed URL). File klinis diisolasi per klinik
--    berdasarkan folder pertama path (<clinic_id>/...). Avatar hanya bisa ditulis
--    ke folder milik sendiri (<user_id>/...).
-- 3. Nomor rekam medis (no_rm) per klinik: RM-000001 dst. untuk setiap klinik,
--    UNIQUE (clinic_id, no_rm). Klinik lama melanjutkan nomor terakhirnya.
-- 4. Cron SATUSEHAT: job lama memakai placeholder 'YOUR_SERVICE_ROLE_KEY'.
--    Dijadwalkan ulang dengan URL & kunci dari Supabase Vault.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Guard kolom sensitif public.users
-- -----------------------------------------------------------------------------
create or replace function public.users_guard_sensitive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
begin
  -- Tanpa JWT user: service_role, console-api (koneksi langsung), migration, cron.
  if v_actor is null then
    return new;
  end if;

  if new.clinic_id is distinct from old.clinic_id then
    raise exception 'clinic_id pengguna tidak boleh diubah dari aplikasi'
      using errcode = 'insufficient_privilege';
  end if;

  if old.status = 'suspended'
     and (new.status is distinct from old.status or new.is_active is distinct from old.is_active) then
    raise exception 'Akun ini ditangguhkan oleh tim Dentiva dan hanya bisa diaktifkan kembali oleh tim Dentiva'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    raise exception 'Status "ditangguhkan" khusus untuk tim Dentiva; gunakan "nonaktif"'
      using errcode = 'insufficient_privilege';
  end if;

  -- Aktivasi diri pada login pertama (public.record_login): invited → active, kolom lain tetap.
  if v_actor = old.id
     and old.status = 'invited' and new.status = 'active'
     and new.role is not distinct from old.role
     and new.role_id is not distinct from old.role_id
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.role_id is distinct from old.role_id
     or new.status is distinct from old.status
     or new.is_active is distinct from old.is_active then
    select u.role into v_actor_role
    from public.users u
    where u.id = v_actor and u.status in ('invited', 'active');

    if v_actor_role is distinct from 'admin' then
      raise exception 'Hanya admin klinik yang boleh mengubah role atau status pengguna'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.users_guard_sensitive() from public, anon, authenticated;

-- Nama trigger diurutkan sebelum trg_users_sync_status (trigger BEFORE berjalan urut abjad),
-- sehingga guard melihat nilai persis yang dikirim aplikasi.
drop trigger if exists trg_users_guard_sensitive on public.users;
create trigger trg_users_guard_sensitive
  before update on public.users
  for each row execute function public.users_guard_sensitive();

-- -----------------------------------------------------------------------------
-- 2. Storage per klinik
-- -----------------------------------------------------------------------------
-- Objek boleh diakses jika folder pertamanya = klinik user. File warisan (diunggah
-- sebelum multi-tenant, folder pertama bukan ID klinik) hanya untuk klinik warisan.
create or replace function public.storage_object_in_my_clinic(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select public.get_user_clinic_id() as cid)
  select case
    when me.cid is null then false
    when split_part(p_name, '/', 1) = me.cid::text then true
    when exists (select 1 from public.clinics c where c.id::text = split_part(p_name, '/', 1)) then false
    else me.cid = platform.legacy_clinic_id()
  end
  from me;
$$;

revoke all on function public.storage_object_in_my_clinic(text) from public;
grant execute on function public.storage_object_in_my_clinic(text) to anon, authenticated, service_role;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets set public = false
    where id in ('radiologi', 'klinik', 'patient-photos') and public;
  end if;

  if to_regclass('storage.objects') is null then
    raise notice 'security_followups: storage.objects tidak ada, policy storage dilewati';
    return;
  end if;

  -- File klinis: restrictive (digabung AND dengan policy lama yang hanya cek authenticated)
  execute 'drop policy if exists tenant_clinical_files_select on storage.objects';
  execute $p$
    create policy tenant_clinical_files_select on storage.objects
      as restrictive for select to public
      using (bucket_id not in ('radiologi', 'klinik', 'patient-photos')
             or public.storage_object_in_my_clinic(name))
  $p$;

  execute 'drop policy if exists tenant_clinical_files_delete on storage.objects';
  execute $p$
    create policy tenant_clinical_files_delete on storage.objects
      as restrictive for delete to public
      using (bucket_id not in ('radiologi', 'klinik', 'patient-photos')
             or public.storage_object_in_my_clinic(name))
  $p$;

  execute 'drop policy if exists tenant_clinical_files_update on storage.objects';
  execute $p$
    create policy tenant_clinical_files_update on storage.objects
      as restrictive for update to public
      using (bucket_id not in ('radiologi', 'klinik', 'patient-photos')
             or public.storage_object_in_my_clinic(name))
      with check (bucket_id not in ('radiologi', 'klinik', 'patient-photos')
                  or split_part(name, '/', 1) = (select public.get_user_clinic_id())::text)
  $p$;

  -- Unggahan baru WAJIB di folder klinik sendiri.
  execute 'drop policy if exists tenant_clinical_files_insert on storage.objects';
  execute $p$
    create policy tenant_clinical_files_insert on storage.objects
      as restrictive for insert to public
      with check (bucket_id not in ('radiologi', 'klinik', 'patient-photos')
                  or split_part(name, '/', 1) = (select public.get_user_clinic_id())::text)
  $p$;

  -- Avatar: baca publik (seperti sebelumnya), tulis hanya ke folder <user_id>/ sendiri.
  execute 'drop policy if exists avatars_own_folder_insert on storage.objects';
  execute $p$
    create policy avatars_own_folder_insert on storage.objects
      as restrictive for insert to public
      with check (bucket_id <> 'avatars' or split_part(name, '/', 1) = (select auth.uid())::text)
  $p$;

  execute 'drop policy if exists avatars_own_folder_update on storage.objects';
  execute $p$
    create policy avatars_own_folder_update on storage.objects
      as restrictive for update to public
      using (bucket_id <> 'avatars' or split_part(name, '/', 1) = (select auth.uid())::text)
      with check (bucket_id <> 'avatars' or split_part(name, '/', 1) = (select auth.uid())::text)
  $p$;

  execute 'drop policy if exists avatars_own_folder_delete on storage.objects';
  execute $p$
    create policy avatars_own_folder_delete on storage.objects
      as restrictive for delete to public
      using (bucket_id <> 'avatars' or split_part(name, '/', 1) = (select auth.uid())::text)
  $p$;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Nomor rekam medis per klinik
-- -----------------------------------------------------------------------------
create table if not exists public.clinic_rm_counters (
  clinic_id   uuid primary key references public.clinics (id) on delete cascade,
  last_value  int not null default 0 check (last_value >= 0)
);

alter table public.clinic_rm_counters enable row level security;
revoke all on public.clinic_rm_counters from anon, authenticated;

-- Isi dari nomor tertinggi yang sudah ada per klinik (format RM-000123).
insert into public.clinic_rm_counters as c (clinic_id, last_value)
select p.clinic_id, coalesce(max(substring(p.no_rm from '^RM-(\d+)$')::int), 0)
from public.patients p
group by p.clinic_id
on conflict (clinic_id) do update set last_value = greatest(c.last_value, excluded.last_value);

-- Klinik warisan melanjutkan dari sequence global lama agar tidak ada nomor terpakai ulang.
do $$
declare
  v_seq bigint;
  v_legacy uuid := platform.legacy_clinic_id();
begin
  if to_regclass('public.seq_no_rm') is not null and v_legacy is not null then
    execute 'select last_value from public.seq_no_rm' into v_seq;
    insert into public.clinic_rm_counters as c (clinic_id, last_value)
    values (v_legacy, v_seq)
    on conflict (clinic_id) do update set last_value = greatest(c.last_value, excluded.last_value);
  end if;
end $$;

create or replace function public.generate_no_rm()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic uuid;
  v_next int;
begin
  if new.no_rm is null or new.no_rm = '' then
    v_clinic := coalesce(new.clinic_id, public.get_user_clinic_id());
    if v_clinic is null then
      raise exception 'Klinik tidak diketahui; nomor rekam medis tidak bisa dibuat'
        using errcode = 'not_null_violation';
    end if;

    insert into public.clinic_rm_counters as c (clinic_id, last_value)
    values (v_clinic, 1)
    on conflict (clinic_id) do update set last_value = c.last_value + 1
    returning last_value into v_next;

    new.no_rm := 'RM-' || lpad(v_next::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function public.generate_no_rm() from public, anon, authenticated;

drop trigger if exists trigger_generate_no_rm on public.patients;
create trigger trigger_generate_no_rm
  before insert on public.patients
  for each row execute function public.generate_no_rm();

select platform.make_unique_per_clinic('patients', 'no_rm');

-- -----------------------------------------------------------------------------
-- 4. Cron SATUSEHAT via Vault
-- -----------------------------------------------------------------------------
-- Simpan rahasia SEKALI per lingkungan (SQL Editor, jangan di file migration):
--   select vault.create_secret('https://<ref>.supabase.co', 'dentiva_project_url');
--   select vault.create_secret('<service-role-key>',        'dentiva_service_role_key');
-- Selama rahasia belum ada, job berjalan tanpa melakukan apa pun.
do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'security_followups: pg_cron tidak tersedia, jadwal SATUSEHAT dilewati';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'process-satusehat-outbox';
  perform cron.schedule(
    'process-satusehat-outbox',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
               || '/functions/v1/satusehat-outbox-processor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')
        ),
        body := '{}'::jsonb
      )
      where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key')
        and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url');
    $job$
  );
end $$;
