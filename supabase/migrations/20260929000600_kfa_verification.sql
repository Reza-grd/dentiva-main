-- =============================================================================
-- Kode obat KFA terverifikasi untuk e-resep SATUSEHAT
-- -----------------------------------------------------------------------------
-- Sebelumnya kode KFA diketik bebas (placeholder formulir: 93000001) dan
-- aplikasi menyertakan daftar contoh berurutan 93000001–93000010. Kode yang
-- salah membuat MedicationRequest ditolak / tercatat keliru di SATUSEHAT.
--
-- Sekarang:
--   * kfa_verified_at, kfa_nama, kfa_bentuk_sediaan_nama diisi HANYA oleh
--     service_role (Edge Function satusehat-kfa, setelah mengecek API KFA).
--   * Trigger master_bahan_kfa_guard: bila browser (anon/authenticated) mengubah
--     kode_kfa, status verifikasi otomatis dihapus; browser tidak bisa mengisi
--     kolom verifikasi sendiri.
--   * MedicationRequest hanya dikirim untuk obat dengan kfa_verified_at.
--   * Kode contoh 93000001–93000010 dibersihkan bila ada.
-- =============================================================================

alter table public.master_bahan
  add column if not exists kfa_nama text,
  add column if not exists kfa_bentuk_sediaan_nama text,
  add column if not exists kfa_verified_at timestamptz;

comment on column public.master_bahan.kfa_verified_at is
  'Diisi Edge Function satusehat-kfa setelah kode dicek ke API KFA. Null = belum terverifikasi → tidak dikirim ke SATUSEHAT.';

create or replace function public.master_bahan_kfa_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  -- service_role (Edge Function) & koneksi langsung database (migrasi) dipercaya.
  if v_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.kfa_nama := null;
    new.kfa_bentuk_sediaan_nama := null;
    new.kfa_verified_at := null;
    return new;
  end if;

  if new.kode_kfa is distinct from old.kode_kfa then
    new.kfa_nama := null;
    new.kfa_bentuk_sediaan_nama := null;
    new.kfa_verified_at := null;
  else
    new.kfa_nama := old.kfa_nama;
    new.kfa_bentuk_sediaan_nama := old.kfa_bentuk_sediaan_nama;
    new.kfa_verified_at := old.kfa_verified_at;
  end if;
  return new;
end;
$$;

drop trigger if exists master_bahan_kfa_guard on public.master_bahan;
create trigger master_bahan_kfa_guard
  before insert or update on public.master_bahan
  for each row execute function public.master_bahan_kfa_guard();

revoke all on function public.master_bahan_kfa_guard() from public, anon, authenticated;

-- Bersihkan kode contoh yang pernah disarankan aplikasi (bukan kode KFA resmi).
update public.master_bahan
set kode_kfa = null, kfa_nama = null, kfa_bentuk_sediaan_nama = null, kfa_verified_at = null
where kode_kfa ~ '^930000(0[1-9]|10)$';

do $$
begin
  if to_regclass('public.master_obat') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'master_obat' and column_name = 'kode_kfa') then
    update public.master_obat set kode_kfa = null where kode_kfa ~ '^930000(0[1-9]|10)$';
  end if;
end $$;
