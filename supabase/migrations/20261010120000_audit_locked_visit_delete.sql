-- Lock applies to direct deletion and attribution/date changes as well as SOAP.
-- Authorized patient purges retain their existing cascade behavior.
create or replace function public.audit_visit_lock()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare oldj jsonb:=to_jsonb(old); newj jsonb:=to_jsonb(new);
begin
  if tg_op='DELETE' then
    if oldj->>'is_locked'='true' and exists(select 1 from public.patients where id=old.patient_id) then
      raise exception 'Buka kunci rekam medis sebelum menghapus kunjungan' using errcode='42501';
    end if;
    return old;
  end if;
  if oldj->>'is_locked'='true' and
    (oldj->'patient_id',oldj->'dokter_id',oldj->'tanggal_kunjungan',oldj->'deleted_at',oldj->'deleted_by',oldj->'keluhan',oldj->'pemeriksaan_fisik',oldj->'diagnosa',oldj->'kode_icd10',oldj->'terapi',oldj->'catatan_dokter')
    is distinct from
    (newj->'patient_id',newj->'dokter_id',newj->'tanggal_kunjungan',newj->'deleted_at',newj->'deleted_by',newj->'keluhan',newj->'pemeriksaan_fisik',newj->'diagnosa',newj->'kode_icd10',newj->'terapi',newj->'catatan_dokter') then
      raise exception 'Rekam medis terkunci' using errcode='42501';
  end if;
  if oldj->>'is_locked' is distinct from newj->>'is_locked' and auth.role()='authenticated' then
    if public.get_user_role() is distinct from 'dokter' then raise exception 'Hanya dokter dapat mengubah kunci' using errcode='42501'; end if;
    if newj->>'is_locked'='false' and length(trim(coalesce(newj->>'lock_change_reason',''))) < 5 then raise exception 'Alasan membuka kunci wajib diisi (minimal 5 karakter)' using errcode='22023'; end if;
    new:=jsonb_populate_record(new,jsonb_build_object('locked_by',case when newj->>'is_locked'='true' then auth.uid() else null end,'locked_at',case when newj->>'is_locked'='true' then now() else null end));
  end if;
  return new;
end $$;
drop trigger zz_audit_visit_lock on public.visits;
create trigger zz_audit_visit_lock before update on public.visits for each row execute function public.audit_visit_lock();
-- Run before the existing soft-delete trigger can return NULL and cancel DELETE.
create trigger a_audit_visit_delete before delete on public.visits for each row execute function public.audit_visit_lock();
revoke all on function public.audit_visit_lock() from public,anon,authenticated;
