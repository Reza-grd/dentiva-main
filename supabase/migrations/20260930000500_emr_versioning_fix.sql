-- =============================================================================
-- Versi rekam medis (Permenkes 24/2022): satu versi per perubahan, restore aman
-- -----------------------------------------------------------------------------
-- Diverifikasi di produksi 30 Sep 2026 (rollback):
--   1. Dua trigger (trigger_audit_emr_update + trigger_visit_versioning) →
--      SATU perubahan SOAP menghasilkan DUA versi ("EMR Updated" + ringkasan).
--   2. restore_emr_version() memulihkan dari new_data, padahal versi dari
--      process_visit_versioning() tidak mengisi new_data → restore mengosongkan
--      seluruh SOAP kunjungan.
--   3. restore_emr_version() SECURITY DEFINER tanpa cek klinik → pengguna
--      dengan izin emr.update bisa mengubah kunjungan klinik lain lewat ID.
--
-- Perbaikan:
--   * Hanya process_visit_versioning(); kini juga menyimpan previous_data &
--     new_data (JSON) serta alasan (set_config('dentiva.change_reason')).
--   * restore_emr_version(): kunjungan harus milik klinik pemanggil, peran
--     admin/dokter, alasan wajib (≥ 5 karakter), kunjungan terkunci ditolak,
--     data diambil dari kolom versi (fallback new_data untuk versi lama).
--   * restore_visit_version() lama (tanpa alasan & cek klinik) ditutup.
-- =============================================================================

drop trigger if exists trigger_audit_emr_update on public.visits;

create or replace function public.process_visit_versioning()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_version int;
  v_summary text := '';
  v_old jsonb;
  v_new jsonb := jsonb_build_object(
    'diagnosa', new.diagnosa, 'keluhan', new.keluhan, 'pemeriksaan_fisik', new.pemeriksaan_fisik,
    'terapi', new.terapi, 'catatan_dokter', new.catatan_dokter, 'kode_icd10', new.kode_icd10);
  v_reason text := nullif(current_setting('dentiva.change_reason', true), '');
  v_restored int := nullif(current_setting('dentiva.restored_from', true), '')::int;
begin
  if tg_op = 'INSERT' then
    v_version := 1;
    v_summary := 'Rekam medis dibuat';
  else
    v_old := jsonb_build_object(
      'diagnosa', old.diagnosa, 'keluhan', old.keluhan, 'pemeriksaan_fisik', old.pemeriksaan_fisik,
      'terapi', old.terapi, 'catatan_dokter', old.catatan_dokter, 'kode_icd10', old.kode_icd10);
    if v_old is not distinct from v_new then
      return new;
    end if;
    select coalesce(max(version), 0) + 1 into v_version
    from public.medical_record_versions where visit_id = new.id;

    if old.diagnosa is distinct from new.diagnosa then v_summary := v_summary || 'Diagnosa diubah. '; end if;
    if old.keluhan is distinct from new.keluhan then v_summary := v_summary || 'Keluhan diubah. '; end if;
    if old.pemeriksaan_fisik is distinct from new.pemeriksaan_fisik then v_summary := v_summary || 'Pemeriksaan fisik diubah. '; end if;
    if old.terapi is distinct from new.terapi then v_summary := v_summary || 'Terapi diubah. '; end if;
    if old.catatan_dokter is distinct from new.catatan_dokter then v_summary := v_summary || 'Catatan dokter diubah. '; end if;
    if old.kode_icd10 is distinct from new.kode_icd10 then v_summary := v_summary || 'Kode ICD-10 diubah. '; end if;
    if v_restored is not null then v_summary := format('Dipulihkan dari versi %s. ', v_restored) || v_summary; end if;
  end if;

  insert into public.medical_record_versions (
    visit_id, patient_id, version, diagnosa, keluhan, pemeriksaan_fisik, terapi, catatan_dokter, kode_icd10,
    changed_by, change_summary, previous_data, new_data, reason, restored_from, clinic_id)
  values (
    new.id, new.patient_id, v_version, new.diagnosa, new.keluhan, new.pemeriksaan_fisik, new.terapi,
    new.catatan_dokter, new.kode_icd10, coalesce(auth.uid(), new.dokter_id), trim(v_summary),
    v_old, v_new, v_reason, v_restored, new.clinic_id);
  return new;
end;
$$;

create or replace function public.restore_emr_version(p_visit_id uuid, p_version int, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_visit record;
  v_ver record;
begin
  if public.get_user_role() not in ('admin', 'dokter') then
    raise exception 'Hanya dokter atau admin yang dapat memulihkan rekam medis' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Alasan pemulihan wajib diisi (minimal 5 karakter)' using errcode = 'check_violation';
  end if;

  select id, clinic_id, is_locked into v_visit from public.visits where id = p_visit_id;
  if not found or v_visit.clinic_id is distinct from public.get_user_clinic_id() then
    raise exception 'Kunjungan tidak ditemukan' using errcode = 'no_data_found';
  end if;
  if coalesce(v_visit.is_locked, false) then
    raise exception 'Rekam medis kunjungan ini sudah dikunci' using errcode = 'check_violation';
  end if;

  select * into v_ver from public.medical_record_versions where visit_id = p_visit_id and version = p_version;
  if not found then
    raise exception 'Versi % tidak ditemukan', p_version using errcode = 'no_data_found';
  end if;

  perform set_config('dentiva.change_reason', trim(p_reason), true);
  perform set_config('dentiva.restored_from', p_version::text, true);

  update public.visits set
    diagnosa          = coalesce(v_ver.diagnosa,          v_ver.new_data ->> 'diagnosa'),
    keluhan           = coalesce(v_ver.keluhan,           v_ver.new_data ->> 'keluhan'),
    pemeriksaan_fisik = coalesce(v_ver.pemeriksaan_fisik, v_ver.new_data ->> 'pemeriksaan_fisik'),
    terapi            = coalesce(v_ver.terapi,            v_ver.new_data ->> 'terapi'),
    catatan_dokter    = coalesce(v_ver.catatan_dokter,    v_ver.new_data ->> 'catatan_dokter'),
    kode_icd10        = coalesce(v_ver.kode_icd10,        v_ver.new_data ->> 'kode_icd10')
  where id = p_visit_id;

  perform set_config('dentiva.change_reason', '', true);
  perform set_config('dentiva.restored_from', '', true);
  return true;
end;
$$;

revoke all on function public.restore_emr_version(uuid, int, text) from public, anon;
grant execute on function public.restore_emr_version(uuid, int, text) to authenticated;

do $$
begin
  if to_regprocedure('public.restore_visit_version(uuid, integer)') is not null then
    revoke all on function public.restore_visit_version(uuid, integer) from public, anon, authenticated;
  end if;
end $$;
