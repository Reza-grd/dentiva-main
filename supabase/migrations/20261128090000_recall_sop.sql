-- =============================================================================
-- Recall berbasis SOP perawatan (Fase 1) — docs/rencana/RENCANA-RECALL-SOP-DAN-BOOKING-WA.md
-- -----------------------------------------------------------------------------
-- * public.recall_sop    : aturan recall per perawatan per klinik (perlu?, berapa hari, wajib?, tujuan).
--                          Diubah manajer klinik (admin). Default diisi otomatis, bisa diubah.
-- * public.recall_jadwal : keputusan recall dokter per kunjungan (belum / tidak_perlu / perlu)
--                          + jadwal & status tindak lanjut. Satu baris per kunjungan.
-- * Kunjungan selesai menutup recall lama pasien; kunjungan terjadwal menandainya "dibooking".
-- * Harian 08.00 WIB: recall lewat 7 hari → "terlewat"; recall WAJIB jatuh tempo/terlewat → lonceng.
-- * recall_candidates (> N bulan) tetap ada untuk pasien lama tanpa recall aktif.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SOP recall per perawatan
-- ---------------------------------------------------------------------------
create table if not exists public.recall_sop (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null default public.get_user_clinic_id() references public.clinics (id) on delete cascade,
  treatment_id uuid not null references public.treatments (id) on delete cascade,
  perlu        boolean not null default true,
  interval_hari integer check (interval_hari between 1 and 730),
  wajib        boolean not null default false,
  tujuan       text check (char_length(tujuan) <= 200),
  diubah_oleh  uuid references public.users (id) on delete set null,
  updated_at   timestamptz not null default now(),
  constraint recall_sop_unik unique (clinic_id, treatment_id),
  constraint recall_sop_interval_wajib_bila_perlu check (not perlu or interval_hari is not null),
  constraint recall_sop_wajib_hanya_bila_perlu check (perlu or not wajib)
);
create index if not exists recall_sop_treatment on public.recall_sop (treatment_id);

alter table public.recall_sop enable row level security;

drop policy if exists tenant_isolation on public.recall_sop;
create policy tenant_isolation on public.recall_sop as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));

drop policy if exists recall_sop_baca on public.recall_sop;
create policy recall_sop_baca on public.recall_sop for select to authenticated
  using ((select public.get_user_role()) in ('admin', 'dokter', 'resepsionis'));

drop policy if exists recall_sop_kelola on public.recall_sop;
create policy recall_sop_kelola on public.recall_sop for all to authenticated
  using ((select public.get_user_role()) = 'admin')
  with check (
    (select public.get_user_role()) = 'admin'
    and exists (select 1 from public.treatments t where t.id = treatment_id and t.clinic_id = recall_sop.clinic_id)
  );

revoke all on public.recall_sop from anon;
revoke truncate, references, trigger on public.recall_sop from authenticated;
grant select, insert, update, delete on public.recall_sop to authenticated;

create or replace function public.recall_sop_cap()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.diubah_oleh := coalesce(auth.uid(), new.diubah_oleh);
  if not new.perlu then
    new.interval_hari := null;
    new.wajib := false;
  end if;
  return new;
end $$;
revoke all on function public.recall_sop_cap() from public, anon, authenticated;

drop trigger if exists trg_recall_sop_cap on public.recall_sop;
create trigger trg_recall_sop_cap before insert or update on public.recall_sop
  for each row execute function public.recall_sop_cap();

-- Default SOP: dicocokkan dari nama/kode perawatan. Hanya mengisi perawatan yang BELUM punya aturan.
-- Angka adalah usulan awal; wajib ditinjau dokter penanggung jawab klinik.
create or replace function public.recall_sop_isi_default(p_clinic uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  with aturan (urut, pola, perlu, interval_hari, wajib, tujuan) as (values
    (1,  'saluran akar|psa|endodon',                                   true,  7,   true,  'Lanjutan perawatan saluran akar'),
    (2,  'pulpotomi|pulpektomi|perawatan saraf',                       true,  7,   true,  'Lanjutan perawatan saraf gigi'),
    (3,  'implan',                                                      true,  14,  true,  'Kontrol penyembuhan implan'),
    (4,  'odontektomi|impaksi|sisa akar|alveolo|eksisi|insisi|abses|bedah', true, 7, true,  'Kontrol pasca tindakan bedah & lepas jahitan'),
    (5,  'ortodon|behel|kawat gigi|bracket|aligner',                   true,  30,  true,  'Kontrol & aktivasi kawat gigi'),
    (6,  'gigi tiruan|denture|protesa',                                true,  7,   false, 'Penyesuaian gigi tiruan'),
    (7,  'mahkota|crown|jembatan|bridge|veneer|inlay|onlay',           true,  14,  false, 'Kontrol pemasangan restorasi'),
    (8,  'kuretase|root planing|srp|gingivek|gingivopl|periodon',      true,  30,  false, 'Evaluasi jaringan gusi'),
    (9,  'scaling|karang gigi',                                         true,  180, false, 'Kontrol rutin & scaling berkala'),
    (10, 'sealant|fluor',                                               true,  180, false, 'Kontrol rutin gigi anak'),
    (11, 'tambal|restorasi',                                            true,  180, false, 'Kontrol tambalan'),
    (12, 'cabut|ekstraksi',                                             false, null, false, null),
    (13, 'bleaching|pemutihan',                                         false, null, false, null),
    (14, 'rontgen|radiograf|foto',                                      false, null, false, null),
    (15, 'pemeriksaan|konsultasi|kontrol',                              true,  180, false, 'Kontrol rutin 6 bulan')
  ), cocok as (
    select distinct on (t.id) t.id as treatment_id, a.perlu, a.interval_hari, a.wajib, a.tujuan
    from public.treatments t
    join aturan a on lower(t.nama_treatment || ' ' || coalesce(t.kategori, '')) ~ a.pola
    where t.clinic_id = p_clinic
      and not exists (select 1 from public.recall_sop s where s.clinic_id = p_clinic and s.treatment_id = t.id)
    order by t.id, a.urut
  ), baru as (
    insert into public.recall_sop (clinic_id, treatment_id, perlu, interval_hari, wajib, tujuan)
    select p_clinic, treatment_id, perlu, interval_hari, wajib, tujuan from cocok
    on conflict (clinic_id, treatment_id) do nothing
    returning 1
  )
  select count(*)::int into v_n from baru;
  return v_n;
end $$;
revoke all on function public.recall_sop_isi_default(uuid) from public, anon, authenticated;

-- Dipanggil manajer dari Pengaturan → SOP Recall (mis. setelah menambah perawatan baru).
create or replace function public.recall_sop_isi_default_saya()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_clinic uuid := public.get_user_clinic_id();
begin
  if public.get_user_role() <> 'admin' or v_clinic is null then
    raise exception 'Hanya manajer klinik' using errcode = 'insufficient_privilege';
  end if;
  return public.recall_sop_isi_default(v_clinic);
end $$;
revoke all on function public.recall_sop_isi_default_saya() from public, anon;
grant execute on function public.recall_sop_isi_default_saya() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Keputusan & jadwal recall per kunjungan
-- ---------------------------------------------------------------------------
create table if not exists public.recall_jadwal (
  id                    uuid primary key default gen_random_uuid(),
  clinic_id             uuid not null references public.clinics (id) on delete cascade,
  patient_id            uuid not null references public.patients (id) on delete cascade,
  visit_id              uuid not null unique references public.visits (id) on delete cascade,
  dokter_id             uuid references public.users (id) on delete set null,
  keputusan             text not null check (keputusan in ('belum', 'tidak_perlu', 'perlu')),
  interval_hari         integer check (interval_hari between 1 and 730),
  tanggal_target        date,
  wajib                 boolean not null default false,
  tujuan                text check (char_length(tujuan) <= 200),
  sumber                text not null default 'dokter' check (sumber in ('sop', 'dokter')),
  status                text check (status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti',
                                               'dibooking', 'selesai', 'tidak_jadi', 'terlewat')),
  catatan               text check (char_length(catatan) <= 500),
  ditutup_oleh_visit_id uuid references public.visits (id) on delete set null,
  diputuskan_oleh       uuid references public.users (id) on delete set null,
  diputuskan_at         timestamptz,
  status_diubah_oleh    uuid references public.users (id) on delete set null,
  status_diubah_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint recall_jadwal_konsisten check (
    (keputusan = 'perlu' and interval_hari is not null and tanggal_target is not null and status is not null)
    or (keputusan <> 'perlu' and tanggal_target is null and status is null and not wajib)
  )
);
create index if not exists recall_jadwal_antrean on public.recall_jadwal (clinic_id, status, tanggal_target)
  where keputusan = 'perlu';
create index if not exists recall_jadwal_belum on public.recall_jadwal (clinic_id, created_at desc)
  where keputusan = 'belum';
create index if not exists recall_jadwal_pasien on public.recall_jadwal (patient_id);
create index if not exists recall_jadwal_dokter on public.recall_jadwal (dokter_id);

alter table public.recall_jadwal enable row level security;

drop policy if exists tenant_isolation on public.recall_jadwal;
create policy tenant_isolation on public.recall_jadwal as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));

drop policy if exists recall_jadwal_baca on public.recall_jadwal;
create policy recall_jadwal_baca on public.recall_jadwal for select to authenticated
  using ((select public.get_user_role()) in ('admin', 'dokter', 'resepsionis'));

-- Penulisan hanya lewat fungsi di bawah (aturan peran & konsistensi dijaga server).
revoke all on public.recall_jadwal from anon, authenticated;
grant select on public.recall_jadwal to authenticated;

-- Hari ini menurut WIB.
create or replace function public.recall_hari_ini()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Jakarta')::date
$$;

/**
 * Dokter (atau manajer) menyimpan keputusan recall untuk satu kunjungan.
 *   p_keputusan: 'belum' | 'tidak_perlu' | 'perlu'
 *   'perlu' wajib menyertakan p_interval_hari (1–730); tanggal target = tanggal kunjungan + interval.
 */
create or replace function public.recall_simpan_keputusan(
  p_visit_id uuid,
  p_keputusan text,
  p_interval_hari integer default null,
  p_wajib boolean default false,
  p_tujuan text default null,
  p_sumber text default 'dokter'
) returns public.recall_jadwal
language plpgsql security definer set search_path = '' as $$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_role text := public.get_user_role();
  v_visit record;
  v_lama public.recall_jadwal;
  v_target date;
  v_status text;
  v_hasil public.recall_jadwal;
begin
  if v_role not in ('dokter', 'admin') or v_clinic is null then
    raise exception 'Hanya dokter atau manajer klinik yang dapat menentukan recall' using errcode = 'insufficient_privilege';
  end if;
  if p_keputusan not in ('belum', 'tidak_perlu', 'perlu') then
    raise exception 'Pilihan recall tidak dikenal' using errcode = '22023';
  end if;
  if p_sumber not in ('sop', 'dokter') then
    raise exception 'Sumber recall tidak dikenal' using errcode = '22023';
  end if;

  select v.id, v.patient_id, v.tanggal_kunjungan, v.dokter_id into v_visit
  from public.visits v
  where v.id = p_visit_id and v.clinic_id = v_clinic and v.deleted_at is null;
  if not found then
    raise exception 'Kunjungan tidak ditemukan' using errcode = 'P0002';
  end if;

  select * into v_lama from public.recall_jadwal where visit_id = p_visit_id;

  if p_keputusan = 'perlu' then
    if p_interval_hari is null or p_interval_hari < 1 or p_interval_hari > 730 then
      raise exception 'Jarak recall harus 1–730 hari' using errcode = '22023';
    end if;
    v_target := v_visit.tanggal_kunjungan + p_interval_hari;
    -- Status lama dipertahankan bila jadwalnya tidak berubah; selain itu mulai lagi dari "menunggu".
    v_status := case
      when v_lama.keputusan = 'perlu' and v_lama.tanggal_target = v_target then v_lama.status
      else 'menunggu' end;
    -- Sudah ada jadwal kunjungan mendatang di sekitar tanggal target → langsung "dibooking".
    if v_status = 'menunggu' and exists (
      select 1 from public.visits f
      where f.patient_id = v_visit.patient_id and f.clinic_id = v_clinic and f.deleted_at is null
        and f.status = 'scheduled' and f.id <> p_visit_id
        and f.tanggal_kunjungan > v_visit.tanggal_kunjungan
        and f.tanggal_kunjungan >= v_target - 14
    ) then
      v_status := 'dibooking';
    end if;
  end if;

  insert into public.recall_jadwal as r (
    clinic_id, patient_id, visit_id, dokter_id, keputusan, interval_hari, tanggal_target, wajib, tujuan,
    sumber, status, diputuskan_oleh, diputuskan_at, updated_at
  ) values (
    v_clinic, v_visit.patient_id, p_visit_id, coalesce(v_visit.dokter_id, auth.uid()), p_keputusan,
    case when p_keputusan = 'perlu' then p_interval_hari end,
    v_target,
    p_keputusan = 'perlu' and coalesce(p_wajib, false),
    nullif(left(btrim(coalesce(p_tujuan, '')), 200), ''),
    p_sumber,
    v_status, auth.uid(), now(), now()
  )
  on conflict (visit_id) do update set
    keputusan = excluded.keputusan, interval_hari = excluded.interval_hari,
    tanggal_target = excluded.tanggal_target, wajib = excluded.wajib, tujuan = excluded.tujuan,
    sumber = excluded.sumber, status = excluded.status,
    catatan = case when excluded.status is distinct from r.status then null else r.catatan end,
    diputuskan_oleh = excluded.diputuskan_oleh, diputuskan_at = excluded.diputuskan_at, updated_at = now()
  returning * into v_hasil;
  return v_hasil;
end $$;
revoke all on function public.recall_simpan_keputusan(uuid, text, integer, boolean, text, text) from public, anon;
grant execute on function public.recall_simpan_keputusan(uuid, text, integer, boolean, text, text) to authenticated;

/** Staf menindaklanjuti recall (dihubungi, dikonfirmasi, dibooking, tidak jadi, dst.). */
create or replace function public.recall_ubah_status(p_id uuid, p_status text, p_catatan text default null)
returns public.recall_jadwal
language plpgsql security definer set search_path = '' as $$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_hasil public.recall_jadwal;
  v_catatan text := nullif(left(btrim(coalesce(p_catatan, '')), 500), '');
begin
  if public.get_user_role() not in ('admin', 'dokter', 'resepsionis') or v_clinic is null then
    raise exception 'Tidak diizinkan' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'dibooking', 'selesai', 'tidak_jadi') then
    raise exception 'Status recall tidak dikenal' using errcode = '22023';
  end if;
  if p_status = 'tidak_jadi' and (v_catatan is null or char_length(v_catatan) < 3) then
    raise exception 'Tuliskan alasan recall tidak jadi' using errcode = '22023';
  end if;

  update public.recall_jadwal set
    status = p_status,
    catatan = coalesce(v_catatan, case when p_status = status then catatan end),
    status_diubah_oleh = auth.uid(), status_diubah_at = now(), updated_at = now()
  where id = p_id and clinic_id = v_clinic and keputusan = 'perlu'
  returning * into v_hasil;
  if not found then
    raise exception 'Recall tidak ditemukan' using errcode = 'P0002';
  end if;
  return v_hasil;
end $$;
revoke all on function public.recall_ubah_status(uuid, text, text) from public, anon;
grant execute on function public.recall_ubah_status(uuid, text, text) to authenticated;

/**
 * Daftar recall untuk halaman Recall. Nama & WA pasien dikembalikan TERENKRIPSI (dibuka di aplikasi).
 *   p_tab: 'jatuh_tempo' (≤ 14 hari lagi / lewat) | 'mendatang' | 'terlewat' | 'minta_ganti' | 'belum' | 'riwayat'
 */
create or replace function public.recall_daftar(p_tab text, p_limit integer default 300)
returns table (
  id uuid, patient_id uuid, visit_id uuid, no_rm text, nama_lengkap text, no_wa text, wa_consent boolean,
  tanggal_kunjungan date, dokter_id uuid, dokter_nama text, keputusan text, interval_hari integer,
  tanggal_target date, hari_lagi integer, wajib boolean, tujuan text, status text, catatan text,
  diputuskan_at timestamptz, status_diubah_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_today date := public.recall_hari_ini();
begin
  if public.get_user_role() not in ('admin', 'dokter', 'resepsionis') or v_clinic is null then
    raise exception 'Tidak diizinkan' using errcode = 'insufficient_privilege';
  end if;
  if p_tab not in ('jatuh_tempo', 'mendatang', 'terlewat', 'minta_ganti', 'belum', 'riwayat') then
    raise exception 'Tab recall tidak dikenal' using errcode = '22023';
  end if;
  return query
  select r.id, r.patient_id, r.visit_id, p.no_rm::text, p.nama_lengkap::text, p.no_wa::text, coalesce(p.wa_consent, false),
         v.tanggal_kunjungan, r.dokter_id, u.full_name::text, r.keputusan, r.interval_hari,
         r.tanggal_target, (r.tanggal_target - v_today)::int, r.wajib, r.tujuan, r.status, r.catatan,
         r.diputuskan_at, r.status_diubah_at
  from public.recall_jadwal r
  join public.patients p on p.id = r.patient_id and p.deleted_at is null
  join public.visits v on v.id = r.visit_id and v.deleted_at is null
  left join public.users u on u.id = r.dokter_id
  where r.clinic_id = v_clinic
    and case p_tab
      when 'jatuh_tempo' then r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi')
                              and r.tanggal_target <= v_today + 14
      when 'mendatang'   then r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi')
                              and r.tanggal_target > v_today + 14
      when 'terlewat'    then r.keputusan = 'perlu' and r.status = 'terlewat'
      when 'minta_ganti' then r.keputusan = 'perlu' and r.status = 'minta_ganti'
      when 'belum'       then r.keputusan = 'belum'
      else r.keputusan = 'perlu' and r.status in ('dibooking', 'selesai', 'tidak_jadi')
                              and coalesce(r.status_diubah_at, r.updated_at) > now() - interval '90 days'
    end
  order by
    case when p_tab in ('belum', 'riwayat') then null else r.wajib end desc nulls last,
    case when p_tab = 'belum' then v.tanggal_kunjungan end desc,
    case when p_tab = 'riwayat' then coalesce(r.status_diubah_at, r.updated_at) end desc,
    r.tanggal_target asc nulls last
  limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end $$;
revoke all on function public.recall_daftar(text, integer) from public, anon;
grant execute on function public.recall_daftar(text, integer) to authenticated;

/** Jumlah per tab (lencana di halaman Recall & dasbor). */
create or replace function public.recall_ringkasan()
returns table (jatuh_tempo integer, wajib_jatuh_tempo integer, terlewat integer, minta_ganti integer, belum integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_today date := public.recall_hari_ini();
begin
  if public.get_user_role() not in ('admin', 'dokter', 'resepsionis') or v_clinic is null then
    raise exception 'Tidak diizinkan' using errcode = 'insufficient_privilege';
  end if;
  return query
  select
    count(*) filter (where r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi') and r.tanggal_target <= v_today + 14)::int,
    count(*) filter (where r.keputusan = 'perlu' and r.wajib and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi') and r.tanggal_target <= v_today + 14)::int,
    count(*) filter (where r.keputusan = 'perlu' and r.status = 'terlewat')::int,
    count(*) filter (where r.keputusan = 'perlu' and r.status = 'minta_ganti')::int,
    count(*) filter (where r.keputusan = 'belum')::int
  from public.recall_jadwal r
  join public.patients p on p.id = r.patient_id and p.deleted_at is null
  join public.visits v on v.id = r.visit_id and v.deleted_at is null
  where r.clinic_id = v_clinic;
end $$;
revoke all on function public.recall_ringkasan() from public, anon;
grant execute on function public.recall_ringkasan() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Kunjungan menutup / menandai recall (anti pengingat ganda)
-- ---------------------------------------------------------------------------
create or replace function public.recall_ikuti_kunjungan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.patient_id is null then
    return new;
  end if;

  -- Pasien datang (kunjungan selesai) → recall lama yang jatuh temponya ≤ 14 hari lagi dianggap terpenuhi.
  if new.status = 'completed' and new.deleted_at is null
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.tanggal_kunjungan is distinct from new.tanggal_kunjungan) then
    update public.recall_jadwal r set
      status = 'selesai', ditutup_oleh_visit_id = new.id, updated_at = now(), status_diubah_at = now()
    from public.visits asal
    where asal.id = r.visit_id
      and r.patient_id = new.patient_id and r.clinic_id = new.clinic_id and r.visit_id <> new.id
      and r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'dibooking', 'terlewat')
      and new.tanggal_kunjungan > asal.tanggal_kunjungan
      and new.tanggal_kunjungan >= r.tanggal_target - 14;
  end if;

  -- Jadwal kunjungan dibuat → recall terbuka di sekitar tanggal target menjadi "dibooking".
  if new.status = 'scheduled' and new.deleted_at is null
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.tanggal_kunjungan is distinct from new.tanggal_kunjungan) then
    update public.recall_jadwal r set status = 'dibooking', updated_at = now(), status_diubah_at = now()
    from public.visits asal
    where asal.id = r.visit_id
      and r.patient_id = new.patient_id and r.clinic_id = new.clinic_id and r.visit_id <> new.id
      and r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'terlewat')
      and new.tanggal_kunjungan > asal.tanggal_kunjungan
      and new.tanggal_kunjungan >= r.tanggal_target - 14;
  end if;

  -- Jadwal dibatalkan/dihapus → recall "dibooking" kembali "menunggu" bila tidak ada jadwal pengganti.
  if tg_op = 'UPDATE' and old.status = 'scheduled'
     and (new.status in ('cancelled') or (new.deleted_at is not null and old.deleted_at is null)) then
    update public.recall_jadwal r set status = 'menunggu', updated_at = now(), status_diubah_at = now()
    where r.patient_id = new.patient_id and r.clinic_id = new.clinic_id
      and r.keputusan = 'perlu' and r.status = 'dibooking'
      and not exists (
        select 1 from public.visits f
        where f.patient_id = new.patient_id and f.clinic_id = new.clinic_id and f.id <> new.id
          and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= r.tanggal_target - 14
      );
  end if;
  return new;
end $$;
revoke all on function public.recall_ikuti_kunjungan() from public, anon, authenticated;

drop trigger if exists trg_recall_ikuti_kunjungan on public.visits;
create trigger trg_recall_ikuti_kunjungan
  after insert or update of status, tanggal_kunjungan, deleted_at on public.visits
  for each row execute function public.recall_ikuti_kunjungan();

-- ---------------------------------------------------------------------------
-- 4. Tugas harian: terlewat + lonceng untuk recall WAJIB
-- ---------------------------------------------------------------------------
create or replace function public.recall_harian()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.recall_hari_ini();
  v_n integer;
begin
  -- Lewat 7 hari dari tanggal target tanpa kunjungan/jadwal → terlewat.
  update public.recall_jadwal set status = 'terlewat', updated_at = now(), status_diubah_at = now()
  where keputusan = 'perlu' and status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti')
    and tanggal_target < v_today - 7;

  -- Recall WAJIB: jatuh tempo hari ini (resepsionis) & terlewat (resepsionis + dokter yang memutuskan).
  with sasaran as (
    select r.id, r.clinic_id, r.dokter_id, r.status, r.tanggal_target, p.no_rm
    from public.recall_jadwal r
    join public.patients p on p.id = r.patient_id and p.deleted_at is null
    where r.keputusan = 'perlu' and r.wajib
      and ((r.status in ('menunggu', 'diingatkan') and r.tanggal_target = v_today) or r.status = 'terlewat')
  ), baru as (
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, penerima_id, jenis, judul, isi, tautan, kunci)
    select s.clinic_id, null::uuid, 'resepsionis'::text, null::uuid, 'sistem'::text,
           case when s.status = 'terlewat' then 'Recall WAJIB terlewat' else 'Recall WAJIB jatuh tempo hari ini' end,
           'Pasien RM ' || s.no_rm || ' — segera hubungi pasien untuk menjadwalkan kontrol.',
           '/resepsionis/recall', 'recall:' || s.status || ':' || s.id
    from sasaran s
    union all
    select s.clinic_id, null::uuid, null::text, s.dokter_id, 'sistem'::text, 'Recall WAJIB pasien Anda terlewat',
           'Pasien RM ' || s.no_rm || ' belum kembali sejak target ' || to_char(s.tanggal_target, 'DD-MM-YYYY') || '.',
           '/dokter/recall', 'recall:terlewat-dokter:' || s.id
    from sasaran s where s.status = 'terlewat' and s.dokter_id is not null
    on conflict do nothing
    returning 1
  )
  select count(*)::int into v_n from baru;
  return v_n;
end $$;
revoke all on function public.recall_harian() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron tidak tersedia — jadwal recall harian dilewati';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'recall-harian') then
    perform cron.unschedule('recall-harian');
  end if;
  -- 01:05 UTC = 08:05 WIB
  perform cron.schedule('recall-harian', '5 1 * * *', 'select public.recall_harian()');
end $$;

-- ---------------------------------------------------------------------------
-- 5. Daftar lama "> N bulan": hanya pasien tanpa recall aktif (tidak dobel dengan recall SOP)
-- ---------------------------------------------------------------------------
create or replace function public.recall_candidates(p_bulan int, p_limit int default 300)
returns table (
  patient_id uuid, no_rm text, nama_lengkap text, no_wa text, wa_consent boolean,
  kunjungan_terakhir date, jumlah_kunjungan int, terakhir_dihubungi timestamptz, jumlah_dihubungi int
) language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
#variable_conflict use_column
declare
  v_clinic uuid := public.recall_require_staff();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p_bulan is null or p_bulan < 1 or p_bulan > 36 then
    raise exception 'Periode recall harus 1–36 bulan' using errcode = '22023';
  end if;
  return query
  with last_visit as (
    select v.patient_id, max(v.tanggal_kunjungan) terakhir, count(*)::int n
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed'
    group by 1
  ), contacts as (
    select rc.patient_id, max(rc.created_at) terakhir, count(*)::int n
    from public.recall_contacts rc where rc.clinic_id = v_clinic group by 1
  )
  select p.id, p.no_rm::text, p.nama_lengkap::text, p.no_wa, coalesce(p.wa_consent, false),
         lv.terakhir, lv.n, c.terakhir, coalesce(c.n, 0)
  from last_visit lv
  join public.patients p on p.id = lv.patient_id and p.clinic_id = v_clinic and p.deleted_at is null
  left join contacts c on c.patient_id = p.id
  where lv.terakhir <= (v_today - make_interval(months => p_bulan))::date
    and not exists (select 1 from public.visits f where f.patient_id = p.id and f.clinic_id = v_clinic
                    and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= v_today)
    and not exists (select 1 from public.recall_jadwal r where r.patient_id = p.id and r.clinic_id = v_clinic
                    and r.keputusan = 'perlu'
                    and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'dibooking', 'terlewat'))
  order by (c.terakhir is not null and c.terakhir > now() - interval '30 days'), lv.terakhir desc
  limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end $$;

-- ---------------------------------------------------------------------------
-- 6. Isi SOP default untuk semua klinik yang sudah ada
-- ---------------------------------------------------------------------------
do $$
declare c record;
begin
  for c in select id from public.clinics loop
    perform public.recall_sop_isi_default(c.id);
  end loop;
end $$;
