-- =============================================================================
-- Dentiva Console · Fase 1 · Migration 3/7 — tenant_columns   (TAMBAHAN)
-- -----------------------------------------------------------------------------
-- Tidak ada di panduan awal, tapi WAJIB sebelum klinik kedua didaftarkan:
-- 19 tabel data klinik belum punya kolom clinic_id (18 dari repo + patient_visits di produksi), sehingga tindakan, bahan,
-- stok, consent, template SOAP, dll. akan terlihat dan bisa diubah lintas klinik.
--
-- Migration ini:
--   1. Menambah clinic_id (FK ke public.clinics) ke tabel-tabel tersebut.
--   2. Mengisi data lama: tabel anak diturunkan dari tabel induk
--      (visit_id → visits, patient_id → patients, material_id → master_bahan, ...),
--      tabel master diisi klinik warisan (klinik default dari migration 24).
--   3. Mengubah UNIQUE global menjadi UNIQUE per klinik
--      (kode_treatment, kode_bahan, periode overhead, tier, key clinic_settings).
--   4. Memasang trigger public.tenant_fill_clinic_id() pada SEMUA tabel ber-clinic_id:
--      clinic_id diisi otomatis dari tabel induk lebih dulu, lalu dari JWT pemanggil.
--      Urutan ini mencegah baris anak ditautkan ke induk milik klinik lain.
--
-- Kebijakan RLS per klinik untuk semua tabel ini dipasang di migration 4 (tenant_guard).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Klinik warisan untuk data master lama
-- -----------------------------------------------------------------------------
create or replace function platform.legacy_clinic_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select id from public.clinics where id = 'd0000000-0000-0000-0000-000000000000'),
    (select id from public.clinics order by created_at limit 1)
  );
$$;

-- -----------------------------------------------------------------------------
-- 1. Tambah kolom (idempotent, hanya untuk tabel yang benar-benar ada)
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    -- master per klinik
    'treatments', 'master_bahan', 'overhead_costs', 'overhead_monthly_target',
    'soap_templates', 'tier_weights', 'treatment_education',
    -- turunan
    'material_batches', 'material_purchases', 'stok_movements', 'stok_opname',
    'treatment_materials', 'visit_treatments', 'visit_treatment_material_overrides',
    'treatment_cost_snapshot', 'informed_consents', 'reminder_logs', 'satusehat_consents',
    'patient_visits'
  ];
begin
  foreach t in array tenant_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'tenant_columns: tabel public.% tidak ada, dilewati', t;
      continue;
    end if;
    execute format(
      'alter table public.%I add column if not exists clinic_id uuid references public.clinics (id) on delete cascade',
      t);
    execute format('create index if not exists %I on public.%I (clinic_id)', 'idx_' || t || '_clinic', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Backfill — urutan penting: master dulu, lalu anak yang bergantung padanya.
-- -----------------------------------------------------------------------------
do $$
declare
  legacy uuid := platform.legacy_clinic_id();
  has_col boolean;
begin
  if legacy is null then
    raise notice 'tenant_columns: belum ada klinik sama sekali, backfill dilewati';
    return;
  end if;

  -- 2a. Master: tidak punya induk → klinik warisan
  if to_regclass('public.treatments') is not null then
    update public.treatments set clinic_id = legacy where clinic_id is null;
  end if;
  if to_regclass('public.master_bahan') is not null then
    update public.master_bahan set clinic_id = legacy where clinic_id is null;
  end if;
  if to_regclass('public.overhead_costs') is not null then
    update public.overhead_costs set clinic_id = legacy where clinic_id is null;
  end if;
  if to_regclass('public.overhead_monthly_target') is not null then
    update public.overhead_monthly_target set clinic_id = legacy where clinic_id is null;
  end if;
  if to_regclass('public.tier_weights') is not null then
    update public.tier_weights set clinic_id = legacy where clinic_id is null;
  end if;

  -- soap_templates: pakai pembuatnya jika ada kolom created_by/dokter_id
  if to_regclass('public.soap_templates') is not null then
    select exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'soap_templates' and column_name = 'created_by')
      into has_col;
    if has_col then
      execute 'update public.soap_templates s set clinic_id = u.clinic_id
               from public.users u where u.id = s.created_by and s.clinic_id is null';
    end if;
    update public.soap_templates set clinic_id = legacy where clinic_id is null;
  end if;

  -- 2b. Anak dari treatments / master_bahan
  if to_regclass('public.treatment_education') is not null then
    update public.treatment_education x set clinic_id = t.clinic_id
    from public.treatments t where t.id = x.treatment_id and x.clinic_id is null;
    update public.treatment_education set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.treatment_materials') is not null then
    update public.treatment_materials x set clinic_id = t.clinic_id
    from public.treatments t where t.id = x.treatment_id and x.clinic_id is null;
    update public.treatment_materials set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.material_batches') is not null then
    update public.material_batches x set clinic_id = m.clinic_id
    from public.master_bahan m where m.id = x.material_id and x.clinic_id is null;
    update public.material_batches set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.material_purchases') is not null then
    update public.material_purchases x set clinic_id = m.clinic_id
    from public.master_bahan m where m.id = x.material_id and x.clinic_id is null;
    update public.material_purchases set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.stok_movements') is not null then
    update public.stok_movements x set clinic_id = m.clinic_id
    from public.master_bahan m where m.id = x.material_id and x.clinic_id is null;
    update public.stok_movements set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.stok_opname') is not null then
    update public.stok_opname x set clinic_id = m.clinic_id
    from public.master_bahan m where m.id = x.material_id and x.clinic_id is null;
    update public.stok_opname set clinic_id = legacy where clinic_id is null;
  end if;

  -- 2c. Anak dari visits / patients
  if to_regclass('public.visit_treatments') is not null then
    update public.visit_treatments x set clinic_id = v.clinic_id
    from public.visits v where v.id = x.visit_id and x.clinic_id is null;
    update public.visit_treatments set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.visit_treatment_material_overrides') is not null then
    update public.visit_treatment_material_overrides x set clinic_id = vt.clinic_id
    from public.visit_treatments vt where vt.id = x.visit_treatment_id and x.clinic_id is null;
    update public.visit_treatment_material_overrides set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.treatment_cost_snapshot') is not null then
    update public.treatment_cost_snapshot x set clinic_id = vt.clinic_id
    from public.visit_treatments vt where vt.id = x.visit_treatment_id and x.clinic_id is null;
    update public.treatment_cost_snapshot set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.informed_consents') is not null then
    update public.informed_consents x set clinic_id = p.clinic_id
    from public.patients p where p.id = x.patient_id and x.clinic_id is null;
    update public.informed_consents set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.reminder_logs') is not null then
    update public.reminder_logs x set clinic_id = v.clinic_id
    from public.visits v where v.id = x.visit_id and x.clinic_id is null;
    update public.reminder_logs set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.satusehat_consents') is not null then
    update public.satusehat_consents x set clinic_id = p.clinic_id
    from public.patients p where p.id = x.patient_id and x.clinic_id is null;
    update public.satusehat_consents set clinic_id = legacy where clinic_id is null;
  end if;

  if to_regclass('public.patient_visits') is not null then
    update public.patient_visits x set clinic_id = p.clinic_id
    from public.patients p where p.id = x.patient_id and x.clinic_id is null;
    update public.patient_visits set clinic_id = legacy where clinic_id is null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. NOT NULL setelah backfill
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'clinic_id'
      and c.is_nullable = 'YES'
      and c.table_name = any (array[
        'treatments', 'master_bahan', 'overhead_costs', 'overhead_monthly_target',
        'soap_templates', 'tier_weights', 'treatment_education',
        'material_batches', 'material_purchases', 'stok_movements', 'stok_opname',
        'treatment_materials', 'visit_treatments', 'visit_treatment_material_overrides',
        'treatment_cost_snapshot', 'informed_consents', 'reminder_logs', 'satusehat_consents',
        'patient_visits'
      ])
  loop
    execute format('alter table public.%I alter column clinic_id set not null', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. UNIQUE global → UNIQUE per klinik
--    Mencari constraint/index unik satu kolom secara dinamis karena nama
--    constraint di produksi bisa berbeda dari file migration lama.
-- -----------------------------------------------------------------------------
create or replace function platform.make_unique_per_clinic(p_table text, p_column text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  rel regclass := to_regclass('public.' || p_table);
  col_num smallint;
  con record;
  idx record;
begin
  if rel is null then
    return;
  end if;

  select attnum into col_num
  from pg_attribute
  where attrelid = rel and attname = p_column and not attisdropped;

  if col_num is null then
    return;
  end if;

  -- Constraint UNIQUE / PRIMARY KEY yang hanya berisi kolom ini
  for con in
    select conname, contype
    from pg_constraint
    where conrelid = rel
      and contype in ('u', 'p')
      and conkey = array[col_num]
  loop
    if con.contype = 'p' then
      -- PK tunggal (mis. tier_weights.tier) → PK komposit (clinic_id, kolom)
      execute format('alter table public.%I drop constraint %I', p_table, con.conname);
      execute format('alter table public.%I add primary key (clinic_id, %I)', p_table, p_column);
    else
      execute format('alter table public.%I drop constraint %I', p_table, con.conname);
    end if;
  end loop;

  -- Index unik mandiri (bukan milik constraint) yang hanya berisi kolom ini
  for idx in
    select i.indexrelid::regclass::text as idxname
    from pg_index i
    where i.indrelid = rel
      and i.indisunique
      and i.indkey::smallint[] = array[col_num]
      and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
  loop
    execute format('drop index %s', idx.idxname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = rel and contype in ('u', 'p')
      and conkey @> array[col_num]
      and conkey @> array[(select attnum from pg_attribute where attrelid = rel and attname = 'clinic_id')]
  ) then
    execute format('alter table public.%I add constraint %I unique (clinic_id, %I)',
                   p_table, p_table || '_clinic_' || p_column || '_key', p_column);
  end if;
end;
$$;

select platform.make_unique_per_clinic('treatments', 'kode_treatment');
select platform.make_unique_per_clinic('master_bahan', 'kode_bahan');
select platform.make_unique_per_clinic('overhead_monthly_target', 'periode');
select platform.make_unique_per_clinic('tier_weights', 'tier');
select platform.make_unique_per_clinic('clinic_settings', 'key');

-- Helper sekali pakai; tidak boleh dipanggil dari luar migration.
revoke all on function platform.make_unique_per_clinic(text, text) from service_role;

-- -----------------------------------------------------------------------------
-- 5. Pengisian clinic_id otomatis untuk SEMUA tabel ber-clinic_id
-- -----------------------------------------------------------------------------
create or replace function public.tenant_fill_clinic_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb := to_jsonb(new);
  v uuid;
begin
  if new.clinic_id is not null then
    return new;
  end if;

  -- Turunkan dari induk lebih dulu (mencegah tautan lintas klinik).
  if v is null and (r ->> 'visit_id') is not null then
    select clinic_id into v from public.visits where id = (r ->> 'visit_id')::uuid;
  end if;
  if v is null and (r ->> 'visit_treatment_id') is not null then
    select clinic_id into v from public.visit_treatments where id = (r ->> 'visit_treatment_id')::uuid;
  end if;
  if v is null and (r ->> 'patient_id') is not null then
    select clinic_id into v from public.patients where id = (r ->> 'patient_id')::uuid;
  end if;
  if v is null and (r ->> 'treatment_id') is not null then
    select clinic_id into v from public.treatments where id = (r ->> 'treatment_id')::uuid;
  end if;
  if v is null and (r ->> 'material_id') is not null then
    select clinic_id into v from public.master_bahan where id = (r ->> 'material_id')::uuid;
  end if;

  -- Lalu dari sesi pemanggil (JWT app_metadata.clinic_id).
  if v is null then
    v := public.get_user_clinic_id();
  end if;

  new.clinic_id := v;
  return new;
end;
$$;

revoke all on function public.tenant_fill_clinic_id() from public, anon, authenticated;

do $$
declare
  t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name = 'clinic_id'
      and c.table_name not in ('users', 'clinic_subscriptions')  -- wajib eksplisit
  loop
    execute format('drop trigger if exists trg_tenant_fill_clinic_id on public.%I', t);
    execute format(
      'create trigger trg_tenant_fill_clinic_id before insert on public.%I
         for each row execute function public.tenant_fill_clinic_id()', t);
  end loop;
end $$;
