-- =============================================================================
-- Perbaikan recall SOP (lanjutan 20261128090000) — hasil analisis pasca-rilis
-- 1. Kunjungan asal dihapus (soft delete) → recall-nya ditutup "tidak_jadi"
--    (sebelumnya tetap hidup: lonceng WAJIB untuk kunjungan yang sudah dihapus & pasien
--    hilang dari daftar "Pasien lama" selamanya).
-- 2. "dibooking" basi: jadwal sudah lewat tetapi tidak pernah diselesaikan/dibatalkan
--    (pasien tidak datang) → recall kembali "menunggu" agar masuk jatuh tempo/terlewat lagi.
-- 3. Tugas harian hanya memproses recall yang kunjungan asalnya masih ada.
-- =============================================================================

create or replace function public.recall_ikuti_kunjungan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.patient_id is null then
    return new;
  end if;

  -- Kunjungan asal recall dihapus → recall ditutup.
  if tg_op = 'UPDATE' and new.deleted_at is not null and old.deleted_at is null then
    update public.recall_jadwal set
      status = 'tidak_jadi', catatan = 'Kunjungan asal dihapus', updated_at = now(), status_diubah_at = now()
    where visit_id = new.id and keputusan = 'perlu'
      and status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'dibooking', 'terlewat');
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
     and (new.status = 'cancelled' or (new.deleted_at is not null and old.deleted_at is null)) then
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

create or replace function public.recall_harian()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.recall_hari_ini();
  v_n integer;
begin
  -- Kunjungan asal sudah dihapus (data lama sebelum perbaikan) → tutup.
  update public.recall_jadwal r set status = 'tidak_jadi', catatan = 'Kunjungan asal dihapus', updated_at = now(), status_diubah_at = now()
  from public.visits v
  where v.id = r.visit_id and v.deleted_at is not null
    and r.keputusan = 'perlu' and r.status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti', 'dibooking', 'terlewat');

  -- "dibooking" basi: tidak ada lagi jadwal mendatang (hari ini atau sesudahnya) → kembali menunggu.
  update public.recall_jadwal r set status = 'menunggu', updated_at = now(), status_diubah_at = now()
  where r.keputusan = 'perlu' and r.status = 'dibooking'
    and not exists (
      select 1 from public.visits f
      where f.patient_id = r.patient_id and f.clinic_id = r.clinic_id and f.deleted_at is null
        and f.status in ('scheduled', 'ongoing') and f.tanggal_kunjungan >= v_today
    );

  -- Lewat 7 hari dari tanggal target tanpa kunjungan/jadwal → terlewat.
  update public.recall_jadwal set status = 'terlewat', updated_at = now(), status_diubah_at = now()
  where keputusan = 'perlu' and status in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti')
    and tanggal_target < v_today - 7;

  -- Recall WAJIB: jatuh tempo hari ini (resepsionis) & terlewat (resepsionis + dokter yang memutuskan).
  with sasaran as (
    select r.id, r.clinic_id, r.dokter_id, r.status, r.tanggal_target, p.no_rm
    from public.recall_jadwal r
    join public.patients p on p.id = r.patient_id and p.deleted_at is null
    join public.visits v on v.id = r.visit_id and v.deleted_at is null
    where r.keputusan = 'perlu' and r.wajib
      and ((r.status in ('menunggu', 'diingatkan') and r.tanggal_target = v_today) or r.status = 'terlewat')
  ), baru as (
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, penerima_id, jenis, judul, isi, tautan, kunci)
    select s.clinic_id, null::uuid, 'resepsionis'::text, null::uuid, 'sistem'::text,
           case when s.status = 'terlewat' then 'Recall WAJIB terlewat' else 'Recall WAJIB jatuh tempo hari ini' end,
           'Pasien RM ' || s.no_rm || ' — segera hubungi pasien untuk menjadwalkan kontrol.',
           case when s.status = 'terlewat' then '/resepsionis/recall?tab=terlewat' else '/resepsionis/recall' end, 'recall:' || s.status || ':' || s.id
    from sasaran s
    union all
    select s.clinic_id, null::uuid, null::text, s.dokter_id, 'sistem'::text, 'Recall WAJIB pasien Anda terlewat',
           'Pasien RM ' || s.no_rm || ' belum kembali sejak target ' || to_char(s.tanggal_target, 'DD-MM-YYYY') || '.',
           '/dokter/recall?tab=terlewat', 'recall:terlewat-dokter:' || s.id
    from sasaran s where s.status = 'terlewat' and s.dokter_id is not null
    on conflict do nothing
    returning 1
  )
  select count(*)::int into v_n from baru;
  return v_n;
end $$;
revoke all on function public.recall_harian() from public, anon, authenticated;
