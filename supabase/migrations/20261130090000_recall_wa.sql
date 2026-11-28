-- =============================================================================
-- Recall Fase 3 — pesan WhatsApp recall otomatis (H-7) + jawaban pasien 1/2/3.
--
-- Jalur sementara: sidecar WhatsApp Web di VPS (balasan angka). Logika di sini tidak bergantung penyedia,
-- sehingga bisa dipindah ke template Meta bertombol tanpa mengubah skema.
--
--   * Klinik ikut serta lewat clinic_settings 'wa_recall_otomatis' = 'true' (bawaan MATI) dan paket berfitur
--     whatsapp_reminders. Hanya pasien dengan wa_consent = true.
--   * Pesan awal: status 'menunggu', target dalam 0–7 hari. Pesan ulang: sekali, 2 hari setelah pesan awal
--     bila belum dijawab.
--   * Jawaban: 1 Bisa datang → 'dikonfirmasi'; 2 Ganti jadwal → 'minta_ganti'; 3 Tidak perlu → 'tidak_jadi'
--     (recall WAJIB: tidak ditutup, diteruskan ke resepsionis & dokter sebagai 'minta_ganti').
--   * Semua fungsi di sini hanya untuk service role (edge function recall-wa).
-- =============================================================================

alter table public.recall_jadwal
  add column if not exists wa_awal_at     timestamptz,
  add column if not exists wa_ulang_at    timestamptz,
  add column if not exists wa_jawaban     text,
  add column if not exists wa_dijawab_at  timestamptz,
  add column if not exists wa_petunjuk_at timestamptz;

alter table public.recall_jadwal drop constraint if exists recall_jadwal_wa_jawaban_check;
alter table public.recall_jadwal add constraint recall_jadwal_wa_jawaban_check
  check (wa_jawaban is null or wa_jawaban in ('bisa', 'ganti', 'tidak'));

-- Antrean pesan otomatis (status menunggu/diingatkan per klinik).
create index if not exists recall_jadwal_wa_antrean on public.recall_jadwal (status, tanggal_target)
  where keputusan = 'perlu' and status in ('menunggu', 'diingatkan');

-- Satu pesan awal & satu pesan ulang per recall (recall unik per kunjungan asal → visit_id).
create unique index if not exists notification_logs_satu_aktif_recall
  on public.notification_logs (visit_id, message_type)
  where visit_id is not null
    and message_type in ('recall_awal', 'recall_ulang')
    and status in ('sending', 'sent');

-- Catatan pesan masuk: tindakan baru 'recall'.
alter table public.whatsapp_inbound drop constraint if exists whatsapp_inbound_action_check;
alter table public.whatsapp_inbound add constraint whatsapp_inbound_action_check
  check (action in ('none', 'auto_reply', 'opt_out', 'tautan', 'eira', 'recall'));

-- ── 1. Antrean kirim ─────────────────────────────────────────────────────────
-- Nama & nomor WA dikembalikan TERENKRIPSI (dibuka di edge function).
create or replace function public.recall_wa_antrean(p_limit integer default 20)
returns table (
  id uuid, clinic_id uuid, patient_id uuid, visit_id uuid, jenis text, tanggal_target date, tujuan text, wajib boolean,
  no_rm text, nama_lengkap text, no_wa text, kode_wa text, nama_klinik text, telepon_klinik text
)
language sql stable security definer set search_path = '' as $$
  with hari as (select public.recall_hari_ini() as d),
  klinik as (
    select c.id, c.kode_wa,
           coalesce(nullif(btrim(sn.value), ''), c.name) as nama,
           coalesce(nullif(btrim(st.value), ''), '-') as telepon
    from public.clinics c
    join public.clinic_settings so on so.clinic_id = c.id and so.key = 'wa_recall_otomatis' and so.value = 'true'
    left join public.clinic_settings sn on sn.clinic_id = c.id and sn.key = 'clinic_name'
    left join public.clinic_settings st on st.clinic_id = c.id and st.key = 'clinic_phone'
    where c.status in ('trial', 'active')
      and exists (
        select 1 from public.clinic_subscriptions cs
        join public.subscription_plans sp on sp.id = cs.plan_id
        where cs.clinic_id = c.id and cs.status in ('trialing', 'active')
          and coalesce((sp.features ->> 'whatsapp_reminders')::boolean, false)
      )
  ),
  calon as (
    select r.*,
           case when r.status = 'menunggu' and r.wa_awal_at is null then 'awal'
                when r.status = 'diingatkan' and r.wa_awal_at is not null and r.wa_ulang_at is null
                     and r.wa_jawaban is null and r.wa_awal_at < now() - interval '2 days' then 'ulang'
           end as jenis
    from public.recall_jadwal r, hari
    where r.keputusan = 'perlu'
      and r.status in ('menunggu', 'diingatkan')
      and r.tanggal_target between hari.d and hari.d + 7
      -- Jangan langsung mengirim pada hari kunjungan asal (mis. interval 7 hari).
      and r.created_at < now() - interval '1 day'
  )
  select r.id, r.clinic_id, r.patient_id, r.visit_id, r.jenis, r.tanggal_target, r.tujuan, r.wajib,
         p.no_rm::text, p.nama_lengkap::text, p.no_wa::text, k.kode_wa, k.nama, k.telepon
  from calon r
  join klinik k on k.id = r.clinic_id
  join public.patients p on p.id = r.patient_id and p.deleted_at is null
  join public.visits v on v.id = r.visit_id and v.deleted_at is null
  cross join hari
  where r.jenis is not null
    and p.wa_consent is true
    and nullif(btrim(coalesce(p.no_wa::text, '')), '') is not null
    -- Jenis pesan ini sudah pernah dicoba (terkirim / gagal permanen / tidak pasti / dilewati) → tidak diulang.
    and not exists (
      select 1 from public.notification_logs n
      where n.visit_id = r.visit_id and n.message_type = 'recall_' || r.jenis
    )
    -- Sudah punya jadwal mendatang → tidak perlu diingatkan.
    and not exists (
      select 1 from public.visits f
      where f.patient_id = r.patient_id and f.clinic_id = r.clinic_id and f.deleted_at is null
        and f.status in ('scheduled', 'ongoing') and f.tanggal_kunjungan >= hari.d
    )
  order by r.tanggal_target, r.created_at
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- ── 2. Tandai terkirim ──────────────────────────────────────────────────────
create or replace function public.recall_wa_tandai(p_id uuid, p_jenis text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_jenis = 'awal' then
    update public.recall_jadwal set
      wa_awal_at = now(),
      status = case when status = 'menunggu' then 'diingatkan' else status end,
      status_diubah_at = case when status = 'menunggu' then now() else status_diubah_at end,
      updated_at = now()
    where id = p_id and keputusan = 'perlu';
  elsif p_jenis = 'ulang' then
    update public.recall_jadwal set wa_ulang_at = now(), updated_at = now()
    where id = p_id and keputusan = 'perlu';
  else
    raise exception 'Jenis pesan recall tidak dikenal' using errcode = '22023';
  end if;
end $$;

-- ── 3. Cari recall dari balasan pasien ──────────────────────────────────────
-- Prioritas: pesan yang dikutip (ID pesan penyedia) → pesan recall terakhir ke nomor itu (21 hari).
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

-- ── 4. Catat jawaban pasien ─────────────────────────────────────────────────
-- Hasil: 'dikonfirmasi' | 'minta_ganti' | 'tidak_jadi' | 'diteruskan' (WAJIB) | 'sudah' (jawaban sama) | 'ditutup'.
create or replace function public.recall_wa_jawab(p_id uuid, p_jawaban text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  r public.recall_jadwal;
  v_rm text;
  v_status text;
  v_hasil text;
  v_catatan text;
  v_tgl text;
begin
  if p_jawaban not in ('bisa', 'ganti', 'tidak') then
    raise exception 'Jawaban tidak dikenal' using errcode = '22023';
  end if;
  select * into r from public.recall_jadwal where id = p_id and keputusan = 'perlu' for update;
  if not found then
    raise exception 'Recall tidak ditemukan' using errcode = 'P0002';
  end if;
  if r.wa_jawaban = p_jawaban then
    return 'sudah';
  end if;
  if r.status not in ('menunggu', 'diingatkan', 'dikonfirmasi', 'minta_ganti') then
    return 'ditutup';
  end if;

  select no_rm::text into v_rm from public.patients where id = r.patient_id;
  v_tgl := to_char(r.tanggal_target, 'DD-MM-YYYY');

  if p_jawaban = 'bisa' then
    v_status := 'dikonfirmasi'; v_hasil := 'dikonfirmasi';
    v_catatan := 'Pasien menjawab Bisa datang lewat WhatsApp';
  elsif p_jawaban = 'ganti' then
    v_status := 'minta_ganti'; v_hasil := 'minta_ganti';
    v_catatan := 'Pasien meminta ganti jadwal lewat WhatsApp';
  elsif r.wajib then
    v_status := 'minta_ganti'; v_hasil := 'diteruskan';
    v_catatan := 'Pasien menjawab Tidak perlu lewat WhatsApp, tetapi recall WAJIB. Mohon hubungi pasien';
  else
    v_status := 'tidak_jadi'; v_hasil := 'tidak_jadi';
    v_catatan := 'Pasien menjawab Tidak perlu lewat WhatsApp';
  end if;

  update public.recall_jadwal set
    status = v_status, catatan = v_catatan, wa_jawaban = p_jawaban, wa_dijawab_at = now(),
    status_diubah_oleh = null, status_diubah_at = now(), updated_at = now()
  where id = r.id;

  -- Notifikasi dalam aplikasi untuk resepsionis (dan dokter bila recall WAJIB ditolak pasien).
  if v_hasil in ('dikonfirmasi', 'minta_ganti', 'diteruskan') then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, penerima_id, jenis, judul, isi, tautan, kunci)
    values (
      r.clinic_id, null, 'resepsionis', null, 'sistem',
      case v_hasil when 'dikonfirmasi' then 'Pasien bersedia kontrol'
                   when 'minta_ganti' then 'Pasien meminta ganti jadwal kontrol'
                   else 'Recall WAJIB ditolak pasien' end,
      'Pasien RM ' || coalesce(v_rm, '-') || case v_hasil
        when 'dikonfirmasi' then ' bersedia kontrol sekitar ' || v_tgl || '. Hubungi pasien untuk menetapkan jam.'
        when 'minta_ganti' then ' meminta jadwal lain (target ' || v_tgl || '). Hubungi pasien untuk menawarkan waktu.'
        else ' menjawab tidak perlu kontrol, padahal recall WAJIB (target ' || v_tgl || '). Mohon hubungi pasien.' end,
      case v_hasil when 'dikonfirmasi' then '/resepsionis/recall' else '/resepsionis/recall?tab=minta_ganti' end,
      'recall:wa:' || p_jawaban || ':' || r.id
    )
    on conflict do nothing;
  end if;
  if v_hasil = 'diteruskan' and r.dokter_id is not null then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, penerima_id, jenis, judul, isi, tautan, kunci)
    values (r.clinic_id, null, null, r.dokter_id, 'sistem', 'Recall WAJIB ditolak pasien',
            'Pasien RM ' || coalesce(v_rm, '-') || ' menjawab tidak perlu kontrol (target ' || v_tgl || ').',
            '/dokter/recall?tab=minta_ganti', 'recall:wa:tidak-dokter:' || r.id)
    on conflict do nothing;
  end if;

  return v_hasil;
end $$;

-- ── 5. Petunjuk "balas 1/2/3" hanya sekali per recall ───────────────────────
create or replace function public.recall_wa_petunjuk(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.recall_jadwal set wa_petunjuk_at = now(), updated_at = now()
  where id = p_id and wa_petunjuk_at is null and wa_jawaban is null;
  return found;
end $$;

revoke all on function public.recall_wa_antrean(integer) from public, anon, authenticated;
revoke all on function public.recall_wa_tandai(uuid, text) from public, anon, authenticated;
revoke all on function public.recall_wa_cari(text, text) from public, anon, authenticated;
revoke all on function public.recall_wa_jawab(uuid, text) from public, anon, authenticated;
revoke all on function public.recall_wa_petunjuk(uuid) from public, anon, authenticated;
grant execute on function public.recall_wa_antrean(integer) to service_role;
grant execute on function public.recall_wa_tandai(uuid, text) to service_role;
grant execute on function public.recall_wa_cari(text, text) to service_role;
grant execute on function public.recall_wa_jawab(uuid, text) to service_role;
grant execute on function public.recall_wa_petunjuk(uuid) to service_role;

-- ── 6. Jadwal: tiap 5 menit (pesan masuk); kirim hanya 09.00–16.00 WIB (diatur di edge function) ──
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobname) from cron.job where jobname = 'recall-wa';
    perform cron.schedule('recall-wa', '*/5 * * * *', $cmd$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url')
               || '/functions/v1/recall-wa',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000)
      where exists (select 1 from vault.decrypted_secrets where name = 'dentiva_project_url')
        and exists (select 1 from vault.decrypted_secrets where name = 'dentiva_service_role_key');
    $cmd$);
  end if;
end $$;
