-- =============================================================================
-- Recall Fase 3 — perbaikan pasca-analisis (20261130090000).
--
-- recall_wa_cari: jalur cadangan (tanpa pesan dikutip) dulu memakai pesan recall terakhir ke nomor itu dalam
-- 21 hari — walaupun pasien sebenarnya membalas pesan lain (pengingat janji H-1, struk, edukasi) yang dikirim
-- SESUDAHNYA dari nomor yang sama. "Ya"/"ok" untuk pengingat janji bisa tercatat sebagai jawaban recall.
-- Kini jalur cadangan hanya dipakai bila pesan keluar TERAKHIR ke nomor itu adalah bagian percakapan recall
-- (recall_awal / recall_ulang / recall_balasan).
-- =============================================================================

create index if not exists notification_logs_recipient_hash_waktu
  on public.notification_logs (recipient_hash, "timestamp" desc)
  where recipient_hash is not null;

create or replace function public.recall_wa_cari(p_pesan_id text, p_sender_hash text)
returns table (
  id uuid, clinic_id uuid, patient_id uuid, status text, wajib boolean, wa_jawaban text, tanggal_target date,
  wa_petunjuk_at timestamptz, no_rm text, nama_lengkap text, kode_wa text, nama_klinik text, telepon_klinik text
)
language sql stable security definer set search_path = '' as $$
  with log as (
    (select n.visit_id, 1 as urut, n."timestamp"
     from public.notification_logs n
     where p_pesan_id is not null and n.provider_message_id = p_pesan_id
       and n.message_type in ('recall_awal', 'recall_ulang') and n.status = 'sent'
     limit 1)
    union all
    (select n.visit_id, 2, n."timestamp"
     from public.notification_logs n
     where p_sender_hash is not null and n.recipient_hash = p_sender_hash
       and n.message_type in ('recall_awal', 'recall_ulang') and n.status = 'sent'
       and n."timestamp" > now() - interval '21 days'
       -- Sesudah pesan recall ini tidak ada pesan lain (bukan percakapan recall) ke nomor yang sama.
       and not exists (
         select 1 from public.notification_logs x
         where x.recipient_hash = p_sender_hash and x.status = 'sent' and x."timestamp" > n."timestamp"
           and x.message_type not in ('recall_awal', 'recall_ulang', 'recall_balasan')
       )
     order by n."timestamp" desc
     limit 1)
  ), pilih as (
    select visit_id from log order by urut, "timestamp" desc limit 1
  )
  select r.id, r.clinic_id, r.patient_id, r.status, r.wajib, r.wa_jawaban, r.tanggal_target, r.wa_petunjuk_at,
         p.no_rm::text, p.nama_lengkap::text, c.kode_wa,
         coalesce(nullif(btrim(sn.value), ''), c.name), coalesce(nullif(btrim(st.value), ''), '-')
  from pilih
  join public.recall_jadwal r on r.visit_id = pilih.visit_id and r.keputusan = 'perlu'
  join public.patients p on p.id = r.patient_id
  join public.clinics c on c.id = r.clinic_id
  left join public.clinic_settings sn on sn.clinic_id = c.id and sn.key = 'clinic_name'
  left join public.clinic_settings st on st.clinic_id = c.id and st.key = 'clinic_phone';
$$;

revoke all on function public.recall_wa_cari(text, text) from public, anon, authenticated;
grant execute on function public.recall_wa_cari(text, text) to service_role;
