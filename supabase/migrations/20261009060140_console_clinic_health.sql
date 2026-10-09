-- Fase E (Console): skor kesehatan klinik 0–100 + alasan, dan adopsi fitur.
-- Deterministik (aturan tetap, tanpa model AI) dan hanya angka agregat — tanpa data pasien.
create or replace function platform.clinic_health(p_limit int default 50)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  return (
  with base as (
    select o.id, o.name, o.status, o.plan_name, o.users_count, o.last_activity_at, o.trial_ends_at, o.created_at,
      (select count(*)::int from public.visits v where v.clinic_id = o.id and v.deleted_at is null
         and v.tanggal_kunjungan > current_date - 30) as visits_30,
      (select count(*)::int from public.visits v where v.clinic_id = o.id and v.deleted_at is null
         and v.tanggal_kunjungan > current_date - 60 and v.tanggal_kunjungan <= current_date - 30) as visits_prev_30,
      (select count(*)::int from public.payments p where p.clinic_id = o.id and p.status_pembayaran = 'paid'
         and p.tanggal_pembayaran > now() - interval '30 days') as payments_30,
      (select count(*)::int from platform.invoices i where i.clinic_id = o.id and i.status = 'overdue') as overdue,
      exists (select 1 from public.booking_requests b where b.clinic_id = o.id and b.created_at > now() - interval '30 days') as f_booking,
      exists (select 1 from platform.usage_daily u where u.clinic_id = o.id and u.date > current_date - 30 and u.wa_sent > 0) as f_wa,
      exists (select 1 from public.visits v where v.clinic_id = o.id and v.satusehat_encounter_id is not null
                and v.updated_at > now() - interval '30 days') as f_satusehat,
      exists (select 1 from public.ai_usage a where a.clinic_id = o.id and a.created_at > now() - interval '30 days') as f_ai,
      exists (select 1 from public.expenses e where e.clinic_id = o.id and e.created_at > now() - interval '30 days') as f_expenses
    from platform.clinic_overview o
    where o.status in ('trial', 'active')
  ), scored as (
    select b.*,
      extract(day from now() - b.last_activity_at)::int as days_inactive,
      (b.f_booking::int + b.f_wa::int + b.f_satusehat::int + b.f_ai::int + b.f_expenses::int) as features_used,
      array_remove(array[
        case when b.last_activity_at is null then 'Belum pernah ada staf yang login'
             when b.last_activity_at < now() - interval '14 days' then 'Tidak ada login staf ' || extract(day from now() - b.last_activity_at)::int || ' hari'
             when b.last_activity_at < now() - interval '7 days' then 'Login staf terakhir ' || extract(day from now() - b.last_activity_at)::int || ' hari lalu' end,
        case when b.visits_30 = 0 then 'Tidak ada kunjungan tercatat 30 hari terakhir'
             when b.visits_prev_30 > 0 and b.visits_30 < b.visits_prev_30 * 0.5
               then 'Kunjungan turun ' || round((1 - b.visits_30::numeric / b.visits_prev_30) * 100) || '% dibanding 30 hari sebelumnya' end,
        case when b.visits_30 > 0 and b.payments_30 = 0 then 'Ada kunjungan tetapi pembayaran tidak dicatat di Dentiva' end,
        case when b.overdue > 0 then b.overdue || ' invoice lewat jatuh tempo' end,
        case when b.status = 'trial' and b.trial_ends_at is not null and b.trial_ends_at < now() + interval '7 days'
             then 'Trial berakhir ' || to_char(b.trial_ends_at at time zone 'Asia/Jakarta', 'DD-MM-YYYY') end,
        case when b.users_count <= 1 then 'Hanya ' || b.users_count || ' pengguna terdaftar' end,
        case when not (b.f_booking or b.f_wa or b.f_satusehat or b.f_ai or b.f_expenses) then 'Belum memakai fitur tambahan (booking, WA, SATUSEHAT, AI, pengeluaran)' end
      ], null) as reasons,
      greatest(0, least(100, 100
        - case when b.last_activity_at is null or b.last_activity_at < now() - interval '30 days' then 45
               when b.last_activity_at < now() - interval '14 days' then 35
               when b.last_activity_at < now() - interval '7 days' then 15 else 0 end
        - case when b.visits_30 = 0 then 25
               when b.visits_prev_30 > 0 and b.visits_30 < b.visits_prev_30 * 0.5 then 15 else 0 end
        - case when b.visits_30 > 0 and b.payments_30 = 0 then 5 else 0 end
        - case when b.overdue > 0 then 20 else 0 end
        - case when b.status = 'trial' and b.trial_ends_at is not null and b.trial_ends_at < now() + interval '7 days' then 10 else 0 end
        - case when b.users_count <= 1 then 5 else 0 end
        - case when not (b.f_booking or b.f_wa or b.f_satusehat or b.f_ai or b.f_expenses) then 5 else 0 end
      ))::int as score
    from base b
  ), leveled as (
    select s.*, case when s.score >= 70 then 'sehat' when s.score >= 40 then 'perhatian' else 'berisiko' end as level
    from scored s
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'total', (select count(*) from leveled),
      'sehat', (select count(*) from leveled where level = 'sehat'),
      'perhatian', (select count(*) from leveled where level = 'perhatian'),
      'berisiko', (select count(*) from leveled where level = 'berisiko')),
    'adoption', jsonb_build_object(
      'booking', (select count(*) from leveled where f_booking),
      'whatsapp', (select count(*) from leveled where f_wa),
      'satusehat', (select count(*) from leveled where f_satusehat),
      'ai', (select count(*) from leveled where f_ai),
      'expenses', (select count(*) from leveled where f_expenses)),
    'clinics', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'status', status, 'plan_name', plan_name,
        'score', score, 'level', level, 'reasons', to_jsonb(reasons),
        'metrics', jsonb_build_object(
          'days_inactive', days_inactive, 'visits_30', visits_30, 'visits_prev_30', visits_prev_30,
          'payments_30', payments_30, 'overdue_invoices', overdue, 'users', users_count, 'features_used', features_used)
      ) order by score, name)
      from (select * from leveled order by score, name limit greatest(1, least(coalesce(p_limit, 50), 500))) x), '[]'::jsonb)
  ));
end;
$$;

revoke all on function platform.clinic_health(int) from public, anon, authenticated;
grant execute on function platform.clinic_health(int) to service_role;
