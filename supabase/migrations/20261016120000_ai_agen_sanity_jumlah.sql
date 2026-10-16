-- Denti Agen — pemeriksaan kewajaran jumlah stok masuk (16 Okt 2026).
-- Temuan evaluasi model nyata: admin menulis "120 ampul" (satuan dasar) namun model mengisi jumlah_beli=120 (satuan beli: box isi 10),
-- sehingga kartu menampilkan +1.200 ampul. Harga total tampak benar sehingga mudah lolos. Kartu kini memperingatkan bila jumlah masuk jauh
-- di atas pembelian biasa bahan itu dan menyebut kemungkinan salah satuan. (Fungsi ini menggantikan versi 20261016090000, ditambah blok baru.)
create or replace function public.ai_agent_propose(p_kind text, p_args jsonb, p_group uuid default null)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_clinic uuid := public.ai_require_admin(); v_user uuid := auth.uid(); r jsonb; v_id uuid; v_detail text; v_nama text; v_mirip text;
  v_avg numeric; v_n int; v_satuan text; v_beli text; v_jd numeric;
begin
  if not p_kind = any (public.ai_agent_kinds()) then
    return jsonb_build_object('ok', false, 'error', format('Jenis tindakan "%s" tidak dikenal.', p_kind));
  end if;
  if p_args is null or jsonb_typeof(p_args) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Argumen harus berupa objek.');
  end if;
  if (select count(*) from public.ai_actions where clinic_id = v_clinic and user_id = v_user and status = 'pending' and expires_at > now()) >= 60 then
    return jsonb_build_object('ok', false, 'error', 'Terlalu banyak usulan yang belum diputuskan (maks 60). Setujui atau tolak dulu.');
  end if;
  begin
    execute format('select public.ai_agent_p_%s($1, $2)', p_kind) into r using v_clinic, p_args;
  exception when sqlstate 'AG001' then
    get stacked diagnostics v_detail = pg_exception_detail;
    return jsonb_build_object('ok', false, 'error', sqlerrm, 'kandidat', nullif(v_detail, '')::jsonb);
  end;
  -- peringatan: bahan lain dengan nama mirip (kemungkinan salah pilih)
  if r -> 'args' ? 'bahan_id' and p_kind in ('stok_masuk', 'stok_opname', 'batch_buang', 'bahan_ubah', 'resep_atur', 'resep_hapus') then
    select nama_bahan into v_nama from public.master_bahan where id = (r -> 'args' ->> 'bahan_id')::uuid and clinic_id = v_clinic;
    select string_agg(nama_bahan, ', ') into v_mirip from (
      select nama_bahan from public.master_bahan
       where clinic_id = v_clinic and id <> (r -> 'args' ->> 'bahan_id')::uuid and is_active
         and (position(public.ai_agent_norm(v_nama) in public.ai_agent_norm(nama_bahan)) > 0
              or position(public.ai_agent_norm(nama_bahan) in public.ai_agent_norm(v_nama)) > 0
              or similarity(public.ai_agent_norm(nama_bahan), public.ai_agent_norm(v_nama)) >= 0.6)
       order by nama_bahan limit 3) q;
    if v_mirip is not null then
      r := jsonb_set(r, '{preview,peringatan}', coalesce(r -> 'preview' -> 'peringatan', '[]'::jsonb)
             || to_jsonb(format('Ada bahan lain bernama mirip: %s. Pastikan ini bahan yang Anda maksud sebelum menyetujui.', v_mirip)::text));
    end if;
  end if;
  -- peringatan: jumlah stok masuk jauh di atas pembelian biasa (kemungkinan salah satuan beli vs satuan dasar)
  if p_kind = 'stok_masuk' then
    v_jd := (r -> 'args' ->> 'jumlah_dasar')::numeric;
    select avg(jumlah_dasar), count(*) into v_avg, v_n from public.material_purchases
     where clinic_id = v_clinic and material_id = (r -> 'args' ->> 'bahan_id')::uuid;
    if v_n >= 2 and v_avg > 0 and v_jd > v_avg * 8 then
      select satuan_dasar, coalesce(satuan_beli, satuan_dasar) into v_satuan, v_beli from public.master_bahan where id = (r -> 'args' ->> 'bahan_id')::uuid;
      r := jsonb_set(r, '{preview,peringatan}', coalesce(r -> 'preview' -> 'peringatan', '[]'::jsonb)
             || to_jsonb(format('Jumlah masuk %s %s jauh di atas pembelian biasa (rata-rata ±%s %s). Periksa satuannya: jumlah dihitung per %s (satuan beli), bukan per %s (satuan dasar).',
                  public.ai_agent_q(v_jd), v_satuan, public.ai_agent_q(round(v_avg)), v_satuan, v_beli, v_satuan)::text));
    end if;
  end if;
  insert into public.ai_actions (clinic_id, user_id, kind, args, preview, group_id)
  values (v_clinic, v_user, p_kind, r -> 'args', r -> 'preview', p_group) returning id into v_id;
  return jsonb_build_object('ok', true, 'action_id', v_id, 'jenis', p_kind, 'pratinjau', r -> 'preview');
end $$;

revoke all on function public.ai_agent_propose(text, jsonb, uuid) from public, anon;
grant execute on function public.ai_agent_propose(text, jsonb, uuid) to authenticated, service_role;
