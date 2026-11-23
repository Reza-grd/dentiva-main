-- Migrasi data pasien lama dibantu tim Dentiva (lewat Dentiva Console).
--
-- Alur: operator Console mengunggah Excel klinik → pratinjau (validasi + cek duplikat
-- terhadap pasien yang sudah ada) → data dikirim bertahap dan disimpan TERENKRIPSI
-- atas nama klinik tujuan → klinik menerima notifikasi untuk memeriksa hasilnya.
-- Setiap migrasi tercatat sebagai satu kelompok yang bisa dibatalkan.
--
-- Semua fungsi di bawah hanya bisa dipanggil dari server (console-api, koneksi
-- postgres). Skema platform tidak di-expose ke PostgREST, dan EXECUTE dicabut dari
-- anon/authenticated.

-- ─── Kolom baru di pasien ───────────────────────────────────────────────────
alter table public.patients
  add column if not exists no_rm_lama varchar(50),
  add column if not exists migrasi_id uuid;

comment on column public.patients.no_rm_lama is 'Nomor rekam medis dari sistem lama klinik (hasil migrasi). Nomor RM Dentiva tetap dibuat otomatis.';
comment on column public.patients.migrasi_id is 'Kelompok migrasi (platform.migrasi_pasien) yang memasukkan pasien ini.';

create index if not exists idx_patients_no_rm_lama on public.patients (clinic_id, no_rm_lama) where no_rm_lama is not null;
create index if not exists idx_patients_migrasi on public.patients (migrasi_id) where migrasi_id is not null;

-- Daftar & pencarian pasien klinik memakai v_patient_summary; tambahkan no_rm_lama di AKHIR
-- (create or replace view hanya boleh menambah kolom di belakang).
create or replace view public.v_patient_summary with (security_invoker = true) as
 SELECT p.id,
    p.no_rm,
    p.nama_lengkap,
    p.jenis_kelamin,
    p.umur,
    p.no_wa,
    p.status,
    p.created_at,
    p.tempat_lahir,
    p.tanggal_lahir,
    p.agama,
    p.status_pernikahan,
    p.pendidikan_terakhir,
    p.pekerjaan,
    p.golongan_darah,
    p.berat_badan,
    p.tinggi_badan,
    p.alamat,
    p.alamat_detail,
    p.provinsi,
    p.kabupaten,
    p.kecamatan,
    p.desa,
    p.keluhan_awal,
    p.foto_profile,
    COALESCE(v.total_visits, 0::bigint) AS total_visits,
    v.last_visit,
    COALESCE(pay.total_spent, 0::numeric) AS total_spent,
    p.no_rm_lama
   FROM patients p
     LEFT JOIN ( SELECT visits.patient_id,
            count(*) AS total_visits,
            max(visits.tanggal_kunjungan) AS last_visit
           FROM visits
          GROUP BY visits.patient_id) v ON p.id = v.patient_id
     LEFT JOIN ( SELECT payments.patient_id,
            sum(payments.total_bayar) AS total_spent
           FROM payments
          WHERE payments.status_pembayaran::text = 'paid'::text
          GROUP BY payments.patient_id) pay ON p.id = pay.patient_id;

-- ─── Riwayat migrasi ────────────────────────────────────────────────────────
create table if not exists platform.migrasi_pasien (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  operator_id uuid references platform.operators(user_id) on delete set null,
  nama_berkas text not null check (char_length(trim(nama_berkas)) between 1 and 200),
  dasar_persetujuan text not null check (char_length(trim(dasar_persetujuan)) between 5 and 500),
  status text not null default 'berjalan' check (status in ('berjalan', 'selesai', 'dibatalkan')),
  total_baris int not null default 0 check (total_baris >= 0),
  jumlah_masuk int not null default 0,
  jumlah_lewati int not null default 0,
  jumlah_dibatalkan int not null default 0,
  jumlah_dipertahankan int not null default 0,
  dibuat_pada timestamptz not null default now(),
  selesai_pada timestamptz,
  dibatalkan_pada timestamptz,
  dibatalkan_oleh uuid references platform.operators(user_id) on delete set null,
  alasan_batal text
);
create index if not exists idx_migrasi_pasien_klinik on platform.migrasi_pasien (clinic_id, dibuat_pada desc);
create index if not exists idx_migrasi_pasien_operator on platform.migrasi_pasien (operator_id);
create index if not exists idx_migrasi_pasien_dibatalkan_oleh on platform.migrasi_pasien (dibatalkan_oleh);
alter table platform.migrasi_pasien enable row level security;
revoke all on platform.migrasi_pasien from public, anon, authenticated;

-- Pemetaan kolom akhir operator (tebakan mesin vs pilihan operator) untuk melatih ulang
-- mesin pengenal kolom di Console. TANPA isi data pasien: hanya judul kolom + angka ciri
-- statistik kolom. Ekspor: lihat docs/dentiva-console.md (Migrasi → mesin pengenal kolom).
create table if not exists platform.migrasi_koreksi_kolom (
  id bigint generated always as identity primary key,
  migrasi_id uuid not null references platform.migrasi_pasien(id) on delete cascade,
  kolom smallint not null,
  judul text,
  fitur real[] not null,
  tebakan text not null,
  final text not null,
  dikoreksi boolean generated always as (tebakan <> final) stored,
  versi_model text,
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_migrasi_koreksi_kolom_migrasi on platform.migrasi_koreksi_kolom (migrasi_id);
alter table platform.migrasi_koreksi_kolom enable row level security;
revoke all on platform.migrasi_koreksi_kolom from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'patients_migrasi_id_fkey') then
    alter table public.patients
      add constraint patients_migrasi_id_fkey foreign key (migrasi_id) references platform.migrasi_pasien(id) on delete set null;
  end if;
end $$;

-- ─── Pembantu ───────────────────────────────────────────────────────────────
create or replace function platform.migrasi_norm_nama(t text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'))
$$;

/** Kuota pasien paket aktif (logika sama dengan trigger check_max_patients_limit). */
create or replace function platform.kuota_pasien(p_clinic uuid)
returns table (maks int, terpakai int)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((
      select sp.max_patients
      from public.clinic_subscriptions cs
      join public.subscription_plans sp on sp.id = cs.plan_id
      where cs.clinic_id = p_clinic and cs.status in ('trialing', 'active', 'past_due')
      order by cs.current_period_end desc
      limit 1
    ), 1000)::int,
    (select count(*)::int from public.patients where clinic_id = p_clinic and deleted_at is null)
$$;

/**
 * Cek duplikat baris masukan terhadap pasien klinik yang sudah ada.
 * Data terenkripsi dibuka HANYA di dalam database; yang keluar hanya nomor baris,
 * alasan, dan No. RM Dentiva yang cocok.
 *   pasti = true  → No. RM lama sama, NIK sama, atau nama + tanggal lahir sama (dilewati saat impor)
 *   pasti = false → nama sama tetapi tanggal lahir kosong (hanya peringatan)
 */
create or replace function platform.migrasi_cek_duplikat(p_clinic uuid, p_baris jsonb)
returns table (baris int, alasan text, no_rm text, pasti boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
  with masuk as (
    select (r ->> 'baris')::int as baris,
           platform.migrasi_norm_nama(r ->> 'nama_lengkap') as nama,
           nullif(r ->> 'tanggal_lahir', '')::date as tgl,
           nullif(trim(r ->> 'nik'), '') as nik,
           nullif(trim(r ->> 'no_rm_lama'), '') as rm_lama
    from jsonb_array_elements(p_baris) r
  ),
  ada as materialized (
    select p.no_rm::text as no_rm, p.no_rm_lama::text as rm_lama, p.tanggal_lahir as tgl,
           platform.migrasi_norm_nama(private.decrypt_for_clinic(p.nama_lengkap, p_clinic)) as nama,
           nullif(private.decrypt_for_clinic(p.nik, p_clinic), '') as nik
    from public.patients p
    where p.clinic_id = p_clinic and p.deleted_at is null
  ),
  cocok as (
    select m.baris, a.no_rm,
      case
        when m.rm_lama is not null and a.rm_lama = m.rm_lama then 1
        when m.nik is not null and a.nik = m.nik then 2
        when m.tgl is not null and a.tgl = m.tgl and a.nama = m.nama then 3
        else 4
      end as jenis
    from masuk m
    join ada a on (m.rm_lama is not null and a.rm_lama = m.rm_lama)
               or (m.nik is not null and a.nik = m.nik)
               or (a.nama = m.nama and (m.tgl is null or a.tgl is null or a.tgl = m.tgl))
  )
  select distinct on (c.baris) c.baris,
    case c.jenis
      when 1 then 'No. RM lama sudah ada'
      when 2 then 'NIK sudah terdaftar'
      when 3 then 'Nama dan tanggal lahir sama'
      else 'Nama sama (tanggal lahir kosong) — periksa manual'
    end,
    c.no_rm,
    c.jenis < 4
  from cocok c
  order by c.baris, c.jenis;
end $$;

-- ─── Mulai, kirim, selesai, batalkan ────────────────────────────────────────
create or replace function platform.migrasi_mulai(
  p_clinic uuid, p_operator uuid, p_nama_berkas text, p_dasar text, p_total int
) returns platform.migrasi_pasien
language plpgsql security definer set search_path = '' as $$
declare
  m platform.migrasi_pasien;
  k record;
begin
  if exists (select 1 from platform.migrasi_pasien where clinic_id = p_clinic and status = 'berjalan') then
    raise exception 'Masih ada migrasi yang berjalan untuk klinik ini. Selesaikan atau batalkan dulu.' using errcode = 'P0001';
  end if;
  select * into k from platform.kuota_pasien(p_clinic);
  if k.terpakai + p_total > k.maks then
    raise exception 'Kuota pasien paket tidak cukup: terpakai % dari %, berkas berisi % baris.', k.terpakai, k.maks, p_total
      using errcode = 'P0001';
  end if;
  insert into platform.migrasi_pasien (clinic_id, operator_id, nama_berkas, dasar_persetujuan, total_baris)
  values (p_clinic, p_operator, trim(p_nama_berkas), trim(p_dasar), p_total)
  returning * into m;
  return m;
end $$;

/**
 * Masukkan satu potongan baris (sudah divalidasi console-api). Baris duplikat "pasti"
 * dan duplikat di dalam potongan dilewati. Hasil: { masuk, lewati: [{baris, alasan, no_rm}] }.
 */
create or replace function platform.migrasi_kirim(p_migrasi uuid, p_baris jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m platform.migrasi_pasien;
  v_lewati jsonb;
  v_baris_lewati int[];
  v_masuk int;
  k record;
begin
  select * into m from platform.migrasi_pasien where id = p_migrasi for update;
  if not found then raise exception 'Migrasi tidak ditemukan' using errcode = 'P0002'; end if;
  if m.status <> 'berjalan' then
    raise exception 'Migrasi ini sudah berstatus %', m.status using errcode = 'P0001';
  end if;

  with dup as (
    select d.baris, d.alasan, d.no_rm from platform.migrasi_cek_duplikat(m.clinic_id, p_baris) d where d.pasti
  ),
  dalam as (
    -- duplikat di dalam potongan yang sama (baris pertama dipertahankan)
    select x.baris, 'Duplikat di dalam berkas'::text as alasan, null::text as no_rm
    from (
      select (r ->> 'baris')::int as baris,
             row_number() over (partition by coalesce(nullif(trim(r ->> 'no_rm_lama'), ''),
                                  platform.migrasi_norm_nama(r ->> 'nama_lengkap') || '|' || coalesce(r ->> 'tanggal_lahir', ''))
                                order by (r ->> 'baris')::int) as ke
      from jsonb_array_elements(p_baris) r
    ) x
    where x.ke > 1 and x.baris not in (select baris from dup)
  ),
  semua as (select * from dup union all select * from dalam)
  select coalesce(jsonb_agg(jsonb_build_object('baris', baris, 'alasan', alasan, 'no_rm', no_rm) order by baris), '[]'::jsonb),
         coalesce(array_agg(baris), '{}')
    into v_lewati, v_baris_lewati
  from semua;

  select * into k from platform.kuota_pasien(m.clinic_id);
  if k.terpakai + (jsonb_array_length(p_baris) - cardinality(v_baris_lewati)) > k.maks then
    raise exception 'Kuota pasien paket tidak cukup: terpakai % dari %.', k.terpakai, k.maks using errcode = 'P0001';
  end if;

  with ins as (
    insert into public.patients (
      clinic_id, nama_lengkap, tanggal_lahir, umur, jenis_kelamin, no_wa, alamat, nik,
      tempat_lahir, pekerjaan, golongan_darah, no_rm_lama, migrasi_id, status
    )
    select
      m.clinic_id,
      private.encrypt_envelope(trim(r ->> 'nama_lengkap'), m.clinic_id, false),
      nullif(r ->> 'tanggal_lahir', '')::date,
      case when nullif(r ->> 'tanggal_lahir', '') is null then null
           else date_part('year', age(current_date, (r ->> 'tanggal_lahir')::date))::int end,
      nullif(r ->> 'jenis_kelamin', ''),
      nullif(private.encrypt_envelope(nullif(trim(r ->> 'no_wa'), ''), m.clinic_id, false), ''),
      nullif(private.encrypt_envelope(nullif(trim(r ->> 'alamat'), ''), m.clinic_id, false), ''),
      nullif(private.encrypt_envelope(nullif(trim(r ->> 'nik'), ''), m.clinic_id, false), ''),
      nullif(trim(r ->> 'tempat_lahir'), ''),
      nullif(trim(r ->> 'pekerjaan'), ''),
      nullif(r ->> 'golongan_darah', ''),
      nullif(trim(r ->> 'no_rm_lama'), ''),
      m.id,
      'active'
    from jsonb_array_elements(p_baris) with ordinality as e(r, urut)
    where not ((r ->> 'baris')::int = any (v_baris_lewati))
    order by e.urut -- urutan kiriman Console (sudah diurutkan menurut No. RM lama)
    returning 1
  )
  select count(*)::int into v_masuk from ins;

  update platform.migrasi_pasien
     set jumlah_masuk = jumlah_masuk + v_masuk,
         jumlah_lewati = jumlah_lewati + cardinality(v_baris_lewati)
   where id = m.id;

  return jsonb_build_object('masuk', v_masuk, 'lewati', v_lewati);
end $$;

create or replace function platform.migrasi_selesai(p_migrasi uuid)
returns platform.migrasi_pasien
language plpgsql security definer set search_path = '' as $$
declare m platform.migrasi_pasien;
begin
  update platform.migrasi_pasien set status = 'selesai', selesai_pada = now()
   where id = p_migrasi and status = 'berjalan'
  returning * into m;
  if not found then raise exception 'Migrasi tidak ditemukan atau sudah tidak berjalan' using errcode = 'P0001'; end if;

  if m.jumlah_masuk > 0 then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, jenis, judul, isi, tautan, kunci)
    values (
      m.clinic_id, null, null, 'sistem',
      'Data pasien lama sudah dipindahkan',
      left(format('Tim Dentiva memindahkan %s pasien dari berkas "%s"%s. Nomor RM lama tetap tersimpan di data pasien. Mohon periksa daftar pasien dan hubungi tim Dentiva bila ada yang keliru.',
        m.jumlah_masuk, m.nama_berkas,
        case when m.jumlah_lewati > 0 then format(' (%s baris dilewati karena duplikat)', m.jumlah_lewati) else '' end), 1000),
      '/patients',
      'migrasi:' || m.id
    );
  end if;
  return m;
end $$;

/**
 * Batalkan migrasi: pasien hasil migrasi yang BELUM dipakai (tanpa kunjungan, pembayaran,
 * rencana perawatan, persetujuan, riwayat medis, dan belum diubah klinik) dihapus (soft delete).
 * Pasien yang sudah dipakai dipertahankan dan dihitung.
 */
create or replace function platform.migrasi_batalkan(p_migrasi uuid, p_operator uuid, p_alasan text)
returns platform.migrasi_pasien
language plpgsql security definer set search_path = '' as $$
declare
  m platform.migrasi_pasien;
  v_hapus int;
  v_tahan int;
begin
  select * into m from platform.migrasi_pasien where id = p_migrasi for update;
  if not found then raise exception 'Migrasi tidak ditemukan' using errcode = 'P0002'; end if;
  if m.status = 'dibatalkan' then raise exception 'Migrasi ini sudah dibatalkan' using errcode = 'P0001'; end if;

  with sasaran as (
    select p.id,
      (exists (select 1 from public.visits v where v.patient_id = p.id)
        or exists (select 1 from public.patient_visits pv where pv.patient_id = p.id)
        or exists (select 1 from public.payments pa where pa.patient_id = p.id)
        or exists (select 1 from public.treatment_plans tp where tp.patient_id = p.id)
        or exists (select 1 from public.informed_consents ic where ic.patient_id = p.id)
        or exists (select 1 from public.medical_history mh where mh.patient_id = p.id)
        or p.updated_at > p.created_at + interval '1 minute') as dipakai
    from public.patients p
    where p.migrasi_id = m.id and p.deleted_at is null
  ),
  hapus as (
    update public.patients p set deleted_at = now(), deleted_by = null
    from sasaran s where s.id = p.id and not s.dipakai
    returning 1
  )
  select (select count(*) from hapus)::int, (select count(*) from sasaran where dipakai)::int
    into v_hapus, v_tahan;

  update platform.migrasi_pasien
     set status = 'dibatalkan', dibatalkan_pada = now(), dibatalkan_oleh = p_operator,
         alasan_batal = trim(p_alasan), jumlah_dibatalkan = v_hapus, jumlah_dipertahankan = v_tahan
   where id = m.id
  returning * into m;

  if v_hapus > 0 then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, jenis, judul, isi, tautan, kunci)
    values (
      m.clinic_id, null, null, 'sistem',
      'Migrasi data pasien dibatalkan',
      left(format('Tim Dentiva membatalkan migrasi berkas "%s": %s pasien hasil migrasi dihapus%s.',
        m.nama_berkas, v_hapus,
        case when v_tahan > 0 then format(', %s pasien dipertahankan karena sudah dipakai', v_tahan) else '' end), 1000),
      '/patients',
      'migrasi-batal:' || m.id
    );
  end if;
  return m;
end $$;

-- ─── Hak akses: hanya server ────────────────────────────────────────────────
revoke all on function platform.migrasi_norm_nama(text) from public, anon, authenticated;
revoke all on function platform.kuota_pasien(uuid) from public, anon, authenticated;
revoke all on function platform.migrasi_cek_duplikat(uuid, jsonb) from public, anon, authenticated;
revoke all on function platform.migrasi_mulai(uuid, uuid, text, text, int) from public, anon, authenticated;
revoke all on function platform.migrasi_kirim(uuid, jsonb) from public, anon, authenticated;
revoke all on function platform.migrasi_selesai(uuid) from public, anon, authenticated;
revoke all on function platform.migrasi_batalkan(uuid, uuid, text) from public, anon, authenticated;
