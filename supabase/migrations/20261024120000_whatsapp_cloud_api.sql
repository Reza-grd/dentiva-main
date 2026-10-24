-- WhatsApp Cloud API (Meta): status kirim/terima/baca dari webhook & pesan masuk pasien.
-- Minimal data: tidak ada isi pesan maupun nomor telepon — penerima dikenali lewat sidik HMAC (recipient_hash)
-- yang dihitung di edge function (supabase/functions/_shared/whatsapp.ts → recipientHash).

-- ── 1. Status pengiriman pada notification_logs ──
-- `status` tetap milik mekanisme klaim (sending/sent/failed/...; indeks unik bergantung padanya);
-- status dari Meta disimpan terpisah di `delivery_status`.
alter table public.notification_logs
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists recipient_hash text,
  add column if not exists delivery_status text,
  add column if not exists delivery_updated_at timestamptz,
  add column if not exists delivery_error text;

alter table public.notification_logs drop constraint if exists notification_logs_delivery_status_check;
alter table public.notification_logs add constraint notification_logs_delivery_status_check
  check (delivery_status is null or delivery_status in ('accepted', 'sent', 'delivered', 'read', 'failed'));

create unique index if not exists notification_logs_provider_message_id
  on public.notification_logs (provider_message_id) where provider_message_id is not null;
create index if not exists notification_logs_penerima_terbaru
  on public.notification_logs (recipient_hash, "timestamp" desc) where recipient_hash is not null;

-- Staf boleh mencatat log (kebijakan insert lama), tetapi kolom penyedia hanya diisi server:
-- ID pesan & status pengiriman tidak bisa dipalsukan dari aplikasi.
create or replace function public.notification_logs_kolom_server()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' then
      new.provider := old.provider;
      new.provider_message_id := old.provider_message_id;
      new.recipient_hash := old.recipient_hash;
      new.delivery_status := old.delivery_status;
      new.delivery_updated_at := old.delivery_updated_at;
      new.delivery_error := old.delivery_error;
    else
      new.provider := null;
      new.provider_message_id := null;
      new.recipient_hash := null;
      new.delivery_status := null;
      new.delivery_updated_at := null;
      new.delivery_error := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notification_logs_kolom_server on public.notification_logs;
create trigger notification_logs_kolom_server
  before insert or update on public.notification_logs
  for each row execute function public.notification_logs_kolom_server();

-- Status dari webhook: tidak pernah mundur (pesan 'delivered' yang datang setelah 'read' diabaikan).
create or replace function public.wa_catat_status(p_wamid text, p_status text, p_at timestamptz, p_error text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  urutan constant text[] := array['accepted', 'sent', 'delivered', 'read', 'failed'];
begin
  if p_wamid is null or array_position(urutan, p_status) is null then
    return false;
  end if;
  update public.notification_logs n
     set delivery_status = p_status,
         delivery_updated_at = coalesce(p_at, now()),
         delivery_error = coalesce(left(p_error, 300), n.delivery_error)
   where n.provider_message_id = p_wamid
     and array_position(urutan, p_status) > coalesce(array_position(urutan, n.delivery_status), 0);
  return found;
end;
$$;

revoke all on function public.wa_catat_status(text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.wa_catat_status(text, text, timestamptz, text) to service_role;

-- ── 2. Pesan masuk (tanpa isi) ──
create table if not exists public.whatsapp_inbound (
  id uuid primary key default gen_random_uuid(),
  wamid text not null unique,                       -- ID pesan Meta: kiriman ulang webhook tidak tercatat dua kali
  clinic_id uuid references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  sender_hash text not null,
  message_type text not null,
  action text not null default 'none' check (action in ('none', 'auto_reply', 'opt_out')),
  received_at timestamptz not null default now()
);

create index if not exists whatsapp_inbound_pengirim on public.whatsapp_inbound (sender_hash, received_at desc);
create index if not exists whatsapp_inbound_klinik on public.whatsapp_inbound (clinic_id, received_at desc);
create index if not exists whatsapp_inbound_pasien on public.whatsapp_inbound (patient_id);
create index if not exists whatsapp_inbound_umur on public.whatsapp_inbound (received_at);

alter table public.whatsapp_inbound enable row level security;
revoke all on public.whatsapp_inbound from anon, authenticated;
grant select on public.whatsapp_inbound to authenticated;
grant all on public.whatsapp_inbound to service_role;

-- Hanya admin klinik itu yang melihat; ditulis oleh webhook (service role) saja.
drop policy if exists whatsapp_inbound_admin_baca on public.whatsapp_inbound;
create policy whatsapp_inbound_admin_baca on public.whatsapp_inbound
  for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id()) and (select public.get_user_role()) = 'admin');

-- Balasan "BERHENTI": cabut persetujuan WA semua pasien yang pernah dikirimi pesan ke nomor itu.
create or replace function public.wa_cabut_persetujuan(p_sender_hash text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  jumlah integer;
begin
  update public.patients p
     set wa_consent = false
   where p.wa_consent is distinct from false
     and p.id in (select n.patient_id from public.notification_logs n
                   where n.recipient_hash = p_sender_hash and n.patient_id is not null);
  get diagnostics jumlah = row_count;
  return jumlah;
end;
$$;

revoke all on function public.wa_cabut_persetujuan(text) from public, anon, authenticated;
grant execute on function public.wa_cabut_persetujuan(text) to service_role;
