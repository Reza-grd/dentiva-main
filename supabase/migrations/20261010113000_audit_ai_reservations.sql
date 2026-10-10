alter table public.ai_usage drop constraint if exists ai_usage_status_check;
alter table public.ai_usage add constraint ai_usage_status_check check(status in ('ok','error','refused','cached','reserved'));
create index if not exists ai_usage_reservations on public.ai_usage(clinic_id,created_at) where status='reserved';
create or replace function public.ai_reserve_usage(p_clinic uuid,p_user uuid,p_feature text,p_model text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare plan_name text; feature_enabled boolean; quota int; used int; reservation uuid; brief boolean:=p_feature in ('daily_brief','staff_brief');
begin
 if p_feature not in ('finance_chat','receipt_scan','recall_template','daily_brief','staff_brief') then raise exception 'Fitur AI tidak valid'; end if;
 if not exists(select 1 from public.users u join public.clinics c on c.id=u.clinic_id where u.id=p_user and u.clinic_id=p_clinic
   and u.status in ('active','invited') and c.status in ('active','trial')
   and (u.role='admin' or (p_feature='staff_brief' and u.role='resepsionis'))) then raise exception 'Akun AI tidak aktif' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('ai:'||p_clinic::text,0));
 select p.name,coalesce((p.features->>'ai_assistant')::boolean,false) into plan_name,feature_enabled
 from public.clinic_subscriptions s join public.subscription_plans p on p.id=s.plan_id
 where s.clinic_id=p_clinic and s.status in ('active','trialing') order by s.created_at desc limit 1;
 if not coalesce(feature_enabled,false) or not exists(select 1 from public.clinic_settings where clinic_id=p_clinic and key='ai_assistant_enabled' and value='true') then
   raise exception 'AI tidak diaktifkan atau tidak tersedia di paket' using errcode='42501'; end if;
 -- Expire abandoned claims; all provider requests time out before this interval.
 update public.ai_usage set status='error' where clinic_id=p_clinic and status='reserved' and created_at<now()-interval '10 minutes';
 if brief then
   if exists(select 1 from public.ai_usage where clinic_id=p_clinic and feature=p_feature
     and (status='reserved' or (status='ok' and created_at>now()-interval '15 minutes'))) then
     raise exception 'Catatan AI sedang diproses atau baru diperbarui' using errcode='54000'; end if;
 else
   quota:=case plan_name when 'Enterprise' then 1000 when 'Pro' then 300 else 0 end;
   select count(*) into used from public.ai_usage where clinic_id=p_clinic and status in ('ok','reserved') and feature not in ('daily_brief','staff_brief')
     and created_at>=date_trunc('month',now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
   if used>=quota then raise exception 'Kuota AI bulan ini habis' using errcode='54000'; end if;
 end if;
 if (select count(*) from public.ai_usage where clinic_id=p_clinic and user_id=p_user and status='reserved')>=2
 or (select count(*) from public.ai_usage where clinic_id=p_clinic and user_id=p_user and created_at>now()-interval '1 minute')>=6 then
   raise exception 'Terlalu banyak permintaan AI, coba sebentar lagi' using errcode='54000'; end if;
 insert into public.ai_usage(clinic_id,user_id,feature,model,status) values(p_clinic,p_user,p_feature,p_model,'reserved') returning id into reservation;
 return reservation;
end $$;
revoke all on function public.ai_reserve_usage(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ai_reserve_usage(uuid,uuid,text,text) to service_role;
