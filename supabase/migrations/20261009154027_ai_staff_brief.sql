-- Asisten AI untuk resepsionis: ringkasan operasional tanpa angka keuangan.
--   ai_staff_status()   : apakah AI tersedia & diaktifkan admin (untuk admin/resepsionis).
--   ai_staff_snapshot() : angka operasional hari ini (jumlah saja, tanpa nominal & tanpa identitas pasien).
--   ai_insights.kind    : tambah 'staff_brief' (resepsionis & admin boleh membaca).
--   ai_status()         : laporan otomatis (daily_brief, staff_brief) tidak mengurangi kuota.

create or replace function public.ai_staff_status()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare v_clinic uuid := public.recall_require_staff(); v_feature boolean; v_enabled boolean;
begin
  select coalesce((p.features ->> 'ai_assistant')::boolean, false) into v_feature
    from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.clinic_id = v_clinic and s.status in ('active', 'trialing')
   order by s.created_at desc limit 1;
  select value = 'true' into v_enabled from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  return jsonb_build_object('tersedia_di_paket', coalesce(v_feature, false), 'aktif', coalesce(v_enabled, false));
end $$;

create or replace function public.ai_staff_snapshot()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare
  v_clinic uuid := public.recall_require_staff();
  v_now timestamp := now() at time zone 'Asia/Jakarta';
  v_today date := v_now::date;
  v_dow int := extract(dow from v_now)::int;
  v_hari text := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from v_now)::int + 1];
begin
  return jsonb_build_object(
    'dihitung_pada', to_char(v_now, 'YYYY-MM-DD HH24:MI') || ' WIB',
    'hari', v_hari,
    'kunjungan_hari_ini', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.visits
        where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today group by 1) s), '{}'),
    'kunjungan_per_dokter_hari_ini', coalesce((select jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'menunggu', x.menunggu, 'selesai', x.selesai) order by x.menunggu desc)
      from (select dokter_id,
                   count(*) filter (where status = 'scheduled') menunggu,
                   count(*) filter (where status = 'completed') selesai
            from public.visits where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today
            group by 1) x left join public.users u on u.id = x.dokter_id), '[]'),
    'jadwal_3_jam_ke_depan', (select count(*) from public.visits where clinic_id = v_clinic and deleted_at is null
        and status = 'scheduled' and tanggal_kunjungan = v_today and jam_kunjungan is not null
        and jam_kunjungan between v_now::time and (v_now + interval '3 hours')::time),
    'dokter_praktik_hari_ini', coalesce((select jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'jam', to_char(ds.jam_mulai, 'HH24:MI') || '–' || to_char(ds.jam_selesai, 'HH24:MI')) order by ds.jam_mulai)
      from public.doctor_schedules ds left join public.users u on u.id = ds.dokter_id
      where ds.clinic_id = v_clinic and coalesce(ds.is_active, true) and ds.hari = v_dow), '[]'),
    'booking_menunggu_konfirmasi', (select count(*) from public.booking_requests where clinic_id = v_clinic and status = 'pending'),
    'booking_untuk_hari_ini', (select count(*) from public.booking_requests where clinic_id = v_clinic
        and status in ('pending', 'confirmed') and requested_date = v_today),
    'pasien_baru_hari_ini', (select count(*) from public.patients where clinic_id = v_clinic and deleted_at is null
        and (created_at at time zone 'Asia/Jakarta')::date = v_today),
    'selesai_belum_dibayar_hari_ini', (select count(*) from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null
        and v.tanggal_kunjungan = v_today and v.status = 'completed'
        and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')),
    'selesai_belum_dibayar_7_hari', (select count(*) from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null
        and v.tanggal_kunjungan between v_today - 6 and v_today and v.status = 'completed'
        and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')),
    'terjadwal_besok', (select count(*) from public.visits where clinic_id = v_clinic and deleted_at is null
        and status = 'scheduled' and tanggal_kunjungan = v_today + 1),
    'recall', (
      with last_visit as (
        select v.patient_id, max(v.tanggal_kunjungan) terakhir from public.visits v
        where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed' group by 1
      ), due as (
        select p.id, coalesce(p.wa_consent, false) wa from last_visit lv
        join public.patients p on p.id = lv.patient_id and p.clinic_id = v_clinic and p.deleted_at is null
        where lv.terakhir <= (v_today - interval '6 months')::date
          and not exists (select 1 from public.visits f where f.patient_id = p.id and f.clinic_id = v_clinic
                          and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= v_today)
      )
      select jsonb_build_object(
        'perlu_dihubungi', (select count(*) from due),
        'bisa_via_wa', (select count(*) from due where wa),
        'sudah_dihubungi_30_hari', (select count(distinct rc.patient_id) from public.recall_contacts rc
            where rc.clinic_id = v_clinic and rc.created_at > now() - interval '30 days' and rc.patient_id in (select id from due)))
    )
  );
end $$;

revoke all on function public.ai_staff_status() from public, anon;
revoke all on function public.ai_staff_snapshot() from public, anon;
grant execute on function public.ai_staff_status() to authenticated, service_role;
grant execute on function public.ai_staff_snapshot() to authenticated, service_role;

alter table public.ai_insights drop constraint if exists ai_insights_kind_check;
alter table public.ai_insights add constraint ai_insights_kind_check check (kind in ('daily_brief', 'staff_brief'));
drop policy if exists ai_insights_admin_select on public.ai_insights;
create policy ai_insights_admin_select on public.ai_insights for select to authenticated
  using ((select public.get_user_role()) = 'admin'
         or ((select public.get_user_role()) = 'resepsionis' and kind = 'staff_brief'));

create or replace function public.ai_status()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare
  v_clinic uuid := public.ai_require_admin();
  v_plan text; v_feature boolean; v_enabled boolean; v_used int;
begin
  select p.name, coalesce((p.features ->> 'ai_assistant')::boolean, false)
    into v_plan, v_feature
    from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.clinic_id = v_clinic and s.status in ('active', 'trialing')
   order by s.created_at desc limit 1;
  select value = 'true' into v_enabled from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  select count(*) into v_used from public.ai_usage
   where clinic_id = v_clinic and status = 'ok' and feature not in ('daily_brief', 'staff_brief')
     and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  return jsonb_build_object(
    'paket', v_plan,
    'tersedia_di_paket', coalesce(v_feature, false),
    'aktif', coalesce(v_enabled, false),
    'kuota_bulanan', case v_plan when 'Enterprise' then 1000 when 'Pro' then 300 else 0 end,
    'terpakai_bulan_ini', v_used
  );
end $$;
