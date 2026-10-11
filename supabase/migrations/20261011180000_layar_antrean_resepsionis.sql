-- Layar antrean TV dikelola dari menu oleh admin DAN resepsionis (sebelumnya hanya admin, di Pengaturan).
-- Isi layar tetap hanya nomor urut, inisial pasien & dokter (get_queue_display) — tidak berubah.
create or replace function public.create_queue_display_link(p_label text default null::text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_clinic uuid := public.get_user_clinic_id(); v_token text; v_id uuid;
begin
  if v_clinic is null or public.get_user_role() not in ('admin', 'resepsionis') then
    raise exception 'Hanya admin atau resepsionis klinik yang dapat membuat tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.queue_display_links where clinic_id = v_clinic and revoked_at is null) >= 10 then
    raise exception 'Maksimal 10 tautan aktif. Cabut tautan lama terlebih dahulu.' using errcode = 'check_violation';
  end if;
  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  insert into public.queue_display_links (clinic_id, label, token_hash, token_hint, created_by)
  values (v_clinic, coalesce(nullif(trim(p_label), ''), 'Layar ruang tunggu'),
          encode(extensions.digest(v_token, 'sha256'), 'hex'), right(v_token, 4), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$function$;

create or replace function public.revoke_queue_display_link(p_id uuid)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'resepsionis') then
    raise exception 'Hanya admin atau resepsionis klinik yang dapat mencabut tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;
  update public.queue_display_links set revoked_at = coalesce(revoked_at, now())
   where id = p_id and clinic_id = public.get_user_clinic_id();
  if not found then raise exception 'Tautan tidak ditemukan' using errcode = 'no_data_found'; end if;
end;
$function$;

drop policy if exists queue_display_links_admin_select on public.queue_display_links;
drop policy if exists queue_display_links_staf_select on public.queue_display_links;
create policy queue_display_links_staf_select on public.queue_display_links for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id()) and (select public.get_user_role()) in ('admin', 'resepsionis'));
