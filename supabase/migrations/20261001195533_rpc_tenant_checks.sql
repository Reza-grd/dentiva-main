-- =============================================================================
-- Audit 2 Okt 2026: fungsi SECURITY DEFINER tanpa pemeriksaan klinik
-- -----------------------------------------------------------------------------
-- Fungsi berikut melewati RLS tetapi tidak memastikan data milik klinik pemanggil:
--   * replace_visit_treatments   — tanpa cek peran & klinik: pengguna mana pun
--     bisa mengganti tindakan/tagihan kunjungan klinik lain bila tahu ID-nya.
--   * replace_tooth_conditions / replace_treatment_plans — dokter klinik A bisa
--     menghapus odontogram / rencana perawatan pasien klinik B.
--   * fn_proses_stok_dan_snapshot_visit_treatment — hanya dipanggil trigger,
--     tetapi bisa dipanggil langsung oleh siapa pun yang login (stok klinik lain).
-- =============================================================================

create or replace function public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if public.get_user_role() is null
     or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.visits v
    where v.id = p_visit_id
      and v.clinic_id = public.get_user_clinic_id()
      and v.deleted_at is null
  ) then
    raise exception 'Kunjungan tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from visit_treatments where visit_id = p_visit_id;

  if jsonb_array_length(p_treatments) > 0 then
    insert into visit_treatments (visit_id, treatment_id, tooth_number, quantity, harga_satuan, subtotal, notes)
    select
      p_visit_id,
      (elem->>'treatment_id')::uuid,
      (elem->>'tooth_number')::integer,
      (elem->>'quantity')::integer,
      (elem->>'harga_satuan')::numeric,
      (elem->>'subtotal')::numeric,
      elem->>'notes'
    from jsonb_array_elements(p_treatments) as elem
    -- tindakan harus dari master klinik sendiri
    where exists (
      select 1 from public.treatments t
      where t.id = (elem->>'treatment_id')::uuid
        and t.clinic_id = public.get_user_clinic_id()
    );
  end if;
end;
$function$;

create or replace function public.replace_tooth_conditions(p_patient_id uuid, p_conditions jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Unauthorized: only dokter can modify clinical data';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id and p.clinic_id = public.get_user_clinic_id()
  ) then
    raise exception 'Pasien tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from tooth_conditions where patient_id = p_patient_id;

  if jsonb_array_length(p_conditions) > 0 then
    insert into tooth_conditions (patient_id, tooth_number, condition_type, condition_code, surface, has_rct, notes, recorded_by)
    select
      p_patient_id,
      (elem->>'tooth_number')::integer,
      elem->>'condition_type',
      elem->>'condition_code',
      elem->>'surface',
      (elem->>'has_rct')::boolean,
      elem->>'notes',
      (elem->>'recorded_by')::uuid
    from jsonb_array_elements(p_conditions) as elem;
  end if;
end;
$function$;

create or replace function public.replace_treatment_plans(p_patient_id uuid, p_plans jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Unauthorized: only dokter can modify clinical data';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id and p.clinic_id = public.get_user_clinic_id()
  ) then
    raise exception 'Pasien tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from treatment_plans where patient_id = p_patient_id;

  if jsonb_array_length(p_plans) > 0 then
    insert into treatment_plans (patient_id, prioritas, tindakan, gigi, keterangan, status, created_by)
    select
      p_patient_id,
      (elem->>'prioritas')::integer,
      elem->>'tindakan',
      elem->>'gigi',
      elem->>'keterangan',
      elem->>'status',
      (elem->>'created_by')::uuid
    from jsonb_array_elements(p_plans) as elem;
  end if;
end;
$function$;

-- Hanya dipakai trigger (berjalan sebagai pemilik); tidak boleh dipanggil lewat API.
do $$
begin
  if to_regprocedure('public.fn_proses_stok_dan_snapshot_visit_treatment(uuid)') is not null then
    revoke all on function public.fn_proses_stok_dan_snapshot_visit_treatment(uuid) from public, anon, authenticated;
  end if;
end $$;
