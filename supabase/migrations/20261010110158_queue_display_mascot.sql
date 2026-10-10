-- Layar antrean + maskot Denti: tambahkan 'kid' (boolean, usia < 12 th) per kunjungan dan
-- jam praktik hari ini (dari doctor_schedules). Tanggal lahir TIDAK pernah dikirim.
create or replace function public.get_queue_display(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_link  public.queue_display_links%rowtype;
  v_name  text;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_rows  jsonb;
  v_hours jsonb;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 64 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select l.* into v_link
  from public.queue_display_links l
  where l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found or v_link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select coalesce(nullif(trim(s.value), ''), c.name) into v_name
  from public.clinics c
  left join public.clinic_settings s on s.clinic_id = c.id and s.key = 'clinic_name'
  where c.id = v_link.clinic_id and c.status in ('trial', 'active');

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_link.last_seen_at is null or v_link.last_seen_at < now() - interval '5 minutes' then
    update public.queue_display_links set last_seen_at = now() where id = v_link.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'no',       q.no,
           'initials', q.initials,
           'doctor',   q.doctor,
           'time',     q.jam,
           'status',   q.status,
           'kid',      q.kid
         ) order by q.no), '[]'::jsonb)
  into v_rows
  from (
    select row_number() over (order by v.created_at, v.id) as no,
           public.queue_initials(public.decrypt_field(p.nama_lengkap::text)) as initials,
           u.full_name as doctor,
           to_char(v.jam_kunjungan, 'HH24:MI') as jam,
           case
             when v.status = 'ongoing' then 'ongoing'
             when v.status = 'completed' then 'completed'
             when v.status is null or v.status = 'scheduled' then 'waiting'
             else 'other'
           end as status,
           coalesce(p.tanggal_lahir > (v_today - interval '12 years')::date, false) as kid
    from public.visits v
    left join public.patients p on p.id = v.patient_id
    left join public.users u on u.id = v.dokter_id
    where v.clinic_id = v_link.clinic_id
      and v.tanggal_kunjungan = v_today
      and v.deleted_at is null
  ) q;

  select case when count(*) = 0 then null else jsonb_build_object(
           'open',  to_char(min(ds.jam_mulai), 'HH24:MI'),
           'close', to_char(max(ds.jam_selesai), 'HH24:MI')) end
  into v_hours
  from public.doctor_schedules ds
  where ds.clinic_id = v_link.clinic_id
    and ds.is_active is not false
    and ds.hari = extract(dow from v_today)::smallint;

  return jsonb_build_object('ok', true, 'clinic_name', v_name, 'date', v_today,
                            'hours', v_hours, 'visits', v_rows);
end;
$function$;
