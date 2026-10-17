-- Asisten AI berganti nama: Denti → Eira (17 Okt 2026, keputusan pemilik).
-- Hanya teks yang terlihat pengguna di dua fungsi agen; logika, izin, dan search_path tidak berubah
-- (definisi disalin persis dari 20261014090000_ai_agen.sql, definisi terakhir kedua fungsi ini).
-- Catatan lama yang sudah tersimpan ("Opname lewat Denti …") sengaja TIDAK diubah: itu riwayat.

-- ai_agent_apply: 1 teks "Denti" → "Eira"
create or replace function public.ai_agent_apply(p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_clinic uuid := public.ai_require_admin(); v_user uuid := auth.uid(); r public.ai_actions; x jsonb; out jsonb := '[]'; n int := 0; v_id uuid;
begin
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 60 then
    raise exception 'Pilih 1–60 usulan' using errcode = 'AG001';
  end if;
  for r in select * from public.ai_actions where id = any (p_ids) order by created_at, id for update loop
    if r.clinic_id <> v_clinic or r.user_id <> v_user then
      raise exception 'Usulan ini bukan milik Anda' using errcode = 'insufficient_privilege';
    end if;
    if r.status <> 'pending' then raise exception 'Usulan "%" sudah % — tidak bisa dijalankan lagi.', r.preview ->> 'judul', r.status using errcode = 'AG001'; end if;
    if r.expires_at <= now() then
      update public.ai_actions set status = 'expired', decided_at = now() where id = r.id;
      raise exception 'Usulan "%" sudah kedaluwarsa (lebih dari 30 menit). Minta Eira membuatnya lagi.', r.preview ->> 'judul' using errcode = 'AG001';
    end if;
    begin
      execute format('select public.ai_agent_x_%s($1, $2, $3)', r.kind) into x using v_clinic, v_user, r.args;
    exception when sqlstate 'AG001' then
      raise exception '%: %', r.preview ->> 'judul', sqlerrm using errcode = 'AG001';
    when check_violation or not_null_violation or numeric_value_out_of_range or unique_violation or foreign_key_violation or invalid_text_representation then
      raise exception '%: data tidak dapat disimpan (%)', r.preview ->> 'judul', sqlerrm using errcode = 'AG001';
    end;
    update public.ai_actions set status = 'applied', result = x -> 'hasil', before = nullif(x -> 'sebelum', 'null'::jsonb), undoable = coalesce((x ->> 'bisa_batal')::boolean, false), decided_at = now()
     where id = r.id;
    out := out || jsonb_build_array(jsonb_build_object('id', r.id, 'judul', r.preview ->> 'judul', 'hasil', x -> 'hasil', 'bisa_batal', coalesce((x ->> 'bisa_batal')::boolean, false)));
    n := n + 1;
  end loop;
  if n <> cardinality(p_ids) then raise exception 'Sebagian usulan tidak ditemukan' using errcode = 'AG001'; end if;
  return jsonb_build_object('ok', true, 'dijalankan', n, 'tindakan', out);
end $$;

-- ai_agent_x_stok_opname: 2 teks "Denti" → "Eira"
create or replace function public.ai_agent_x_stok_opname(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare b public.master_bahan; fisik numeric := (a ->> 'stok_fisik')::numeric; sel numeric; v_oid uuid; v_mid uuid;
begin
  select * into b from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan sudah tidak ada.'); end if;
  sel := fisik - b.stok_saat_ini;
  if sel = 0 then perform public.ai_agent_fail('Stok sistem sudah sama dengan stok fisik — tidak ada yang perlu disesuaikan.'); end if;
  insert into public.stok_opname (clinic_id, tanggal, material_id, stok_sistem, stok_fisik, catatan, dilakukan_oleh)
  values (v_clinic, public.ai_agent_today(), b.id, b.stok_saat_ini, fisik, coalesce(a ->> 'catatan', 'Opname lewat Eira Agen'), v_user) returning id into v_oid;
  update public.master_bahan set stok_saat_ini = fisik, updated_at = now() where id = b.id;
  insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan, created_by)
  values (v_clinic, b.id, 'opname', sel, b.stok_saat_ini, fisik, 'opname', v_oid, b.harga_rata2, coalesce(a ->> 'catatan', 'Penyesuaian stok opname (Eira Agen)'), v_user) returning id into v_mid;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', b.id, 'opname_id', v_oid, 'movement_id', v_mid, 'selisih', sel),
    'sebelum', jsonb_build_object('stok', b.stok_saat_ini), 'bisa_batal', true);
end $$;
