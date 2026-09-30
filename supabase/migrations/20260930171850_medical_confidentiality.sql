-- =============================================================================
-- Kerahasiaan rekam medis: HANYA DOKTER yang dapat membaca isi rekam medis
-- -----------------------------------------------------------------------------
-- Keputusan pemilik (1 Okt 2026): admin & resepsionis hanya melihat data
-- administratif + keluhan. Isi medis (pemeriksaan, diagnosa, kode ICD-10,
-- terapi, catatan dokter, riwayat medis, odontogram, rencana perawatan,
-- rujukan, foto/radiologi, riwayat versi) hanya untuk peran 'dokter'.
--
-- Penegakan di database (bukan hanya di tampilan):
--   1. is_medical_reader(): dokter, service_role (edge function SATUSEHAT),
--      atau koneksi langsung (migrasi/pg_cron). Admin/resepsionis/anon = false.
--   2. Kolom medis visits disimpan dengan penanda 'PGPM:' (pgcrypto, kunci
--      yang sama dengan 'PGP:'). decrypt_field() mengembalikan
--      '[Terbatas: hanya dokter]' untuk 'PGPM:' bila pemanggil bukan dokter.
--   3. Trigger BEFORE INSERT/UPDATE pada visits: menyegel kolom medis, dan
--      non-dokter tidak dapat mengubahnya (nilai lama dipertahankan). Catatan
--      jadwal dari resepsionis (catatan_dokter saat pendaftaran) tetap boleh
--      diisi saat INSERT, lalu ikut disegel.
--   4. Policy RESTRICTIVE dokter-only pada tabel medis per pasien.
--      Hapus pasien oleh admin tetap berjalan (ON DELETE CASCADE mengabaikan RLS).
--   5. audit_logs & medical_record_versions: nilai medis lama disegel.
--   6. Fungsi SECURITY DEFINER yang melewati RLS dipersempit ke dokter;
--      get_audit_logs() kini juga dibatasi ke klinik pemanggil (sebelumnya
--      admin melihat log semua klinik).
-- =============================================================================

create schema if not exists private;

-- 1. Siapa yang boleh membaca isi medis ---------------------------------------
create or replace function public.is_medical_reader()
returns boolean
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_role text;
begin
  if v_claims is null then
    -- Bukan request PostgREST (migrasi, pg_cron, psql pemilik proyek)
    return session_user not in ('authenticator', 'anon', 'authenticated');
  end if;
  v_role := v_claims::jsonb ->> 'role';
  if v_role = 'service_role' then
    return true;
  end if;
  if v_role is distinct from 'authenticated' then
    return false;
  end if;
  return coalesce(public.get_user_role() = 'dokter', false);
end;
$$;
revoke all on function public.is_medical_reader() from public, anon;
grant execute on function public.is_medical_reader() to authenticated, service_role;

-- 2. Segel/buka nilai medis (hanya dipakai trigger & migrasi) ------------------
create or replace function private.medical_plain(p text)
returns text
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if p is null then return null; end if;
  if p like 'PGPM:%' then
    return pgp_sym_decrypt(decode(substring(p from 6), 'base64'), private.get_encryption_key()::text);
  end if;
  if p like 'PGP:%' then
    return pgp_sym_decrypt(decode(substring(p from 5), 'base64'), private.get_encryption_key()::text);
  end if;
  return p;
exception when others then
  -- Ciphertext rusak: perlakukan apa adanya agar penyimpanan tidak macet
  return p;
end;
$$;

create or replace function private.medical_seal(p text)
returns text
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if p is null or p = '' or p like 'PGPM:%' then return p; end if;
  return 'PGPM:' || encode(pgp_sym_encrypt(private.medical_plain(p), private.get_encryption_key()::text), 'base64');
end;
$$;

-- Nilai baru disegel; bila isinya sama dengan nilai lama, ciphertext lama
-- dipertahankan (agar simpan ulang tanpa perubahan tidak membuat versi baru).
create or replace function private.medical_reseal(p_new text, p_old text)
returns text
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if p_old is not null and private.medical_plain(p_new) is not distinct from private.medical_plain(p_old) then
    return p_old;
  end if;
  return private.medical_seal(p_new);
end;
$$;

create or replace function private.medical_seal_json(j jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  k text;
begin
  if j is null or jsonb_typeof(j) <> 'object' then return j; end if;
  foreach k in array array['pemeriksaan_fisik', 'diagnosa', 'kode_icd10', 'terapi', 'catatan_dokter'] loop
    if jsonb_typeof(j -> k) = 'string' then
      j := jsonb_set(j, array[k], to_jsonb(private.medical_seal(j ->> k)));
    end if;
  end loop;
  return j;
end;
$$;

revoke all on function private.medical_plain(text) from public, anon, authenticated;
revoke all on function private.medical_seal(text) from public, anon, authenticated;
revoke all on function private.medical_reseal(text, text) from public, anon, authenticated;
revoke all on function private.medical_seal_json(jsonb) from public, anon, authenticated;

-- 3. decrypt_field: 'PGPM:' hanya terbuka untuk dokter -------------------------
create or replace function public.decrypt_field(p_ciphertext text)
returns text
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if p_ciphertext is null then
    return null;
  end if;
  if p_ciphertext like 'PGPM:%' then
    if not public.is_medical_reader() then
      return '[Terbatas: hanya dokter]';
    end if;
    begin
      return pgp_sym_decrypt(decode(substring(p_ciphertext from 6), 'base64'), private.get_encryption_key()::text);
    exception when others then
      return p_ciphertext;
    end;
  end if;
  if not p_ciphertext like 'PGP:%' then
    -- Return raw value if not encrypted with server-side PGP scheme
    return p_ciphertext;
  end if;
  begin
    return pgp_sym_decrypt(decode(substring(p_ciphertext from 5), 'base64'), private.get_encryption_key()::text);
  exception when others then
    -- Catch exception and return raw string (prevents crashes if key changes/corrupts)
    return p_ciphertext;
  end;
end;
$$;

-- 4. Trigger visits -----------------------------------------------------------
create or replace function public.protect_visit_medical_fields()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if tg_op = 'UPDATE' and not public.is_medical_reader() then
    -- Non-dokter (mis. ubah jadwal/status) tidak dapat mengubah isi medis;
    -- nilai '[Terbatas: hanya dokter]' yang terkirim balik diabaikan.
    new.pemeriksaan_fisik := old.pemeriksaan_fisik;
    new.diagnosa := old.diagnosa;
    new.kode_icd10 := old.kode_icd10;
    new.terapi := old.terapi;
    new.catatan_dokter := old.catatan_dokter;
    return new;
  end if;

  if tg_op = 'INSERT' and not public.is_medical_reader() then
    -- Pendaftaran/penjadwalan oleh resepsionis: tidak ada isi medis,
    -- kecuali catatan untuk dokter.
    new.pemeriksaan_fisik := null;
    new.diagnosa := null;
    new.kode_icd10 := null;
    new.terapi := null;
  end if;

  new.pemeriksaan_fisik := private.medical_reseal(new.pemeriksaan_fisik, case when tg_op = 'UPDATE' then old.pemeriksaan_fisik end);
  new.diagnosa := private.medical_reseal(new.diagnosa, case when tg_op = 'UPDATE' then old.diagnosa end);
  new.kode_icd10 := private.medical_reseal(new.kode_icd10, case when tg_op = 'UPDATE' then old.kode_icd10 end);
  new.terapi := private.medical_reseal(new.terapi, case when tg_op = 'UPDATE' then old.terapi end);
  new.catatan_dokter := private.medical_reseal(new.catatan_dokter, case when tg_op = 'UPDATE' then old.catatan_dokter end);
  return new;
end;
$$;
revoke all on function public.protect_visit_medical_fields() from public, anon, authenticated;

do $$
begin
  -- Hanya bila skema visits lengkap (baseline smoke test sintetis tidak punya kolom SOAP)
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'visits'
        and column_name in ('pemeriksaan_fisik', 'diagnosa', 'kode_icd10', 'terapi', 'catatan_dokter')) < 5 then
    raise notice 'visits tanpa kolom SOAP — trigger kerahasiaan dilewati';
    return;
  end if;

  drop trigger if exists a_protect_visit_medical_fields on public.visits;
  -- Awalan "a_" agar berjalan sebelum trigger BEFORE lainnya
  create trigger a_protect_visit_medical_fields
    before insert or update on public.visits
    for each row execute function public.protect_visit_medical_fields();

  -- Segel data lama tanpa membuat versi/audit baru
  if to_regprocedure('private.get_encryption_key()') is not null then
    alter table public.visits disable trigger user;
    update public.visits set
      pemeriksaan_fisik = private.medical_seal(pemeriksaan_fisik),
      diagnosa = private.medical_seal(diagnosa),
      kode_icd10 = private.medical_seal(kode_icd10),
      terapi = private.medical_seal(terapi),
      catatan_dokter = private.medical_seal(catatan_dokter)
    where (pemeriksaan_fisik <> '' and pemeriksaan_fisik not like 'PGPM:%')
       or (diagnosa <> '' and diagnosa not like 'PGPM:%')
       or (kode_icd10 <> '' and kode_icd10 not like 'PGPM:%')
       or (terapi <> '' and terapi not like 'PGPM:%')
       or (catatan_dokter <> '' and catatan_dokter not like 'PGPM:%');
    alter table public.visits enable trigger user;

    if to_regclass('public.medical_record_versions') is not null then
      alter table public.medical_record_versions disable trigger user;
      update public.medical_record_versions set
        pemeriksaan_fisik = private.medical_seal(pemeriksaan_fisik),
        diagnosa = private.medical_seal(diagnosa),
        kode_icd10 = private.medical_seal(kode_icd10),
        terapi = private.medical_seal(terapi),
        catatan_dokter = private.medical_seal(catatan_dokter),
        previous_data = private.medical_seal_json(previous_data),
        new_data = private.medical_seal_json(new_data);
      alter table public.medical_record_versions enable trigger user;
    end if;

    if to_regclass('public.audit_logs') is not null then
      alter table public.audit_logs disable trigger user;
      update public.audit_logs set
        previous_value = private.medical_seal_json(previous_value),
        new_value = private.medical_seal_json(new_value)
      where module = 'visits';
      alter table public.audit_logs enable trigger user;
    end if;
  end if;
end $$;

-- 5. Tabel medis per pasien: dokter saja ---------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clinical_data', 'intra_oral_data', 'extra_oral_data', 'periodontal_data',
    'tooth_conditions', 'odontogram_meta', 'medical_history', 'treatment_plans',
    'medical_record_versions', 'patient_referrals', 'patient_media'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop policy if exists medical_dokter_only on public.%I', t);
    execute format(
      'create policy medical_dokter_only on public.%I as restrictive for all to authenticated '
      'using ((select public.is_medical_reader())) with check ((select public.is_medical_reader()))', t);
  end loop;
end $$;

-- 6. Fungsi SECURITY DEFINER yang melewati RLS --------------------------------
do $$
declare
  r record;
  v_def text;
  v_new text;
begin
  for r in
    select p.oid, p.proname from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('restore_emr_version', 'replace_tooth_conditions', 'replace_treatment_plans')
  loop
    v_def := pg_get_functiondef(r.oid);
    v_new := regexp_replace(v_def,
      $re$get_user_role\(\)\s+not\s+in\s+\(\s*'(admin|dokter)'\s*,\s*'(admin|dokter)'\s*\)$re$,
      $rp$get_user_role() is distinct from 'dokter'$rp$, 'gi');
    v_new := replace(v_new, 'Hanya dokter atau admin yang dapat', 'Hanya dokter yang dapat');
    if v_new = v_def then
      raise exception 'Pemeriksaan peran pada %() tidak ditemukan — periksa manual', r.proname;
    end if;
    execute v_new;
  end loop;
end $$;

-- Hapus pasien oleh admin: path berkas untuk dibersihkan dari storage,
-- tanpa membuka baris patient_media (yang kini khusus dokter).
create or replace function public.get_patient_media_paths(p_patient_id uuid)
returns table (category text, file_url text)
language plpgsql
stable
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if public.get_user_role() not in ('admin', 'dokter') then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  return query
    select m.category::text, m.file_url::text
    from public.patient_media m
    join public.patients p on p.id = m.patient_id
    where m.patient_id = p_patient_id
      and p.clinic_id = public.get_user_clinic_id();
end;
$$;
revoke all on function public.get_patient_media_paths(uuid) from public, anon;
grant execute on function public.get_patient_media_paths(uuid) to authenticated;

-- get_audit_logs: dibatasi ke klinik pemanggil (sebelumnya lintas klinik)
create or replace function public.get_audit_logs()
returns setof public.audit_logs
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
begin
  if public.get_user_role() = 'admin' then
    return query select * from public.audit_logs
      where clinic_id = public.get_user_clinic_id()
      order by timestamp desc;
  elsif public.get_user_role() = 'dokter' then
    return query select * from public.audit_logs
      where user_id = auth.uid() and clinic_id = public.get_user_clinic_id()
      order by timestamp desc;
  else
    raise exception 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat log audit';
  end if;
end;
$$;
