-- Remediasi audit keamanan 11 Okt 2026 — Tahap 1 (tanpa mengubah alur kerja peran).
--   B04  rahasia (password/token/…) tidak pernah tersimpan di audit_logs — disamarkan di server
--   B07  aktor audit_logs (user_id, user_role, waktu) ditentukan server, bukan dikirim klien
--   B05  pembayaran LUNAS tidak bisa diubah/dihapus langsung lewat tabel (hanya penanda wa_sent)
--   B09  non-dokter tidak bisa mengisi catatan_dokter saat INSERT kunjungan
--   A4   Realtime: perubahan kunjungan disiarkan (dashboard resepsionis); RLS tetap berlaku

-- ── B04: penyamaran rahasia di JSON, rekursif ───────────────────────────────
create or replace function private.redact_sensitive(j jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case jsonb_typeof(j)
    when 'object' then (
      select coalesce(jsonb_object_agg(
        k,
        case when k ~* '(password|passwd|secret|token|api_?key|credential)' or lower(k) in ('pwd', 'pass', 'otp', 'pin')
             then to_jsonb('[disamarkan]'::text)
             else private.redact_sensitive(v) end), '{}'::jsonb)
      from jsonb_each(j) as e(k, v))
    when 'array' then (
      select coalesce(jsonb_agg(private.redact_sensitive(x)), '[]'::jsonb)
      from jsonb_array_elements(j) as a(x))
    else j
  end
$$;

-- ── B04 + B07: integritas setiap baris audit_logs ───────────────────────────
create or replace function public.audit_log_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  new.previous_value := private.redact_sensitive(new.previous_value);
  new.new_value := private.redact_sensitive(new.new_value);
  new."timestamp" := now();
  -- Permintaan pengguna (JWT): aktor = pemanggil sebenarnya, tidak bisa dipalsukan dari klien.
  -- Proses server tanpa JWT (service role, cron) tetap memakai nilai yang dikirimnya.
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.user_role := coalesce(public.get_user_role(), 'unknown');
  end if;
  return new;
end;
$$;

drop trigger if exists a_audit_log_integrity on public.audit_logs;
create trigger a_audit_log_integrity
  before insert on public.audit_logs
  for each row execute function public.audit_log_integrity();

-- ── B05: transaksi lunas bersifat final ─────────────────────────────────────
create or replace function public.guard_paid_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status_pembayaran = 'paid' then
    if tg_op = 'DELETE' then
      raise exception 'Pembayaran lunas tidak boleh dihapus — gunakan koreksi/refund resmi'
        using errcode = '42501';
    end if;
    -- Hanya penanda kuitansi WA (wa_sent) yang boleh berubah; updated_at diisi trigger lain.
    if (to_jsonb(new) - array['wa_sent', 'updated_at']) is distinct from (to_jsonb(old) - array['wa_sent', 'updated_at']) then
      raise exception 'Pembayaran lunas tidak boleh diubah — gunakan koreksi/refund resmi'
        using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists a_guard_paid_payment on public.payments;
create trigger a_guard_paid_payment
  before update or delete on public.payments
  for each row execute function public.guard_paid_payment();

-- ── B09: catatan_dokter ikut dikosongkan pada INSERT oleh non-dokter ────────
create or replace function public.protect_visit_medical_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
begin
  perform set_config('dentiva.medical_clinic', new.clinic_id::text, true);
  if tg_op = 'UPDATE' and not public.is_medical_reader() then
    new.pemeriksaan_fisik := old.pemeriksaan_fisik;
    new.diagnosa := old.diagnosa;
    new.kode_icd10 := old.kode_icd10;
    new.terapi := old.terapi;
    new.catatan_dokter := old.catatan_dokter;
    return new;
  end if;

  if tg_op = 'INSERT' and not public.is_medical_reader() then
    new.pemeriksaan_fisik := null;
    new.diagnosa := null;
    new.kode_icd10 := null;
    new.terapi := null;
    new.catatan_dokter := null;
  end if;

  new.pemeriksaan_fisik := private.medical_reseal(new.pemeriksaan_fisik, case when tg_op = 'UPDATE' then old.pemeriksaan_fisik end);
  new.diagnosa := private.medical_reseal(new.diagnosa, case when tg_op = 'UPDATE' then old.diagnosa end);
  new.kode_icd10 := private.medical_reseal(new.kode_icd10, case when tg_op = 'UPDATE' then old.kode_icd10 end);
  new.terapi := private.medical_reseal(new.terapi, case when tg_op = 'UPDATE' then old.terapi end);
  new.catatan_dokter := private.medical_reseal(new.catatan_dokter, case when tg_op = 'UPDATE' then old.catatan_dokter end);
  return new;
end;
$function$;

-- ── A4: Realtime untuk kunjungan (dashboard resepsionis berlangganan public.visits) ──
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'visits') then
    alter publication supabase_realtime add table public.visits;
  end if;
end $$;
