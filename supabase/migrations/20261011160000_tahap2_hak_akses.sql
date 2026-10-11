-- Tahap 2 remediasi audit 11 Okt 2026 — pemisahan kewenangan (B01, B02, B03, B06).
-- Keputusan pemilik: admin = antrean sederhana + laporan agregat tanpa identitas; kasir & registrasi hanya
-- resepsionis; tindakan klinis hanya dokter; peran dokter diberikan operator Dentiva, bukan admin klinik.

-- ── Utilitas ────────────────────────────────────────────────────────────────
create or replace function public.is_permission_revoked(p_name text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.user_permissions up join public.permissions p on p.id = up.permission_id
                  where up.user_id = auth.uid() and p.name = p_name and up.is_revoked);
$$;

-- ── B02: admin tidak bisa mengangkat dokter / dirinya sendiri ───────────────
create or replace function public.users_guard_sensitive()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_actor_role text;
begin
  if v_actor is null then return new; end if;
  if new.clinic_id is distinct from old.clinic_id then
    raise exception 'clinic_id pengguna tidak boleh diubah dari aplikasi' using errcode = 'insufficient_privilege';
  end if;
  if old.status = 'suspended' and (new.status is distinct from old.status or new.is_active is distinct from old.is_active) then
    raise exception 'Akun ini ditangguhkan oleh tim Dentiva dan hanya bisa diaktifkan kembali oleh tim Dentiva' using errcode = 'insufficient_privilege';
  end if;
  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    raise exception 'Status "ditangguhkan" khusus untuk tim Dentiva; gunakan "nonaktif"' using errcode = 'insufficient_privilege';
  end if;
  if v_actor = old.id and old.status = 'invited' and new.status = 'active'
     and new.role is not distinct from old.role and new.role_id is not distinct from old.role_id
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;
  if new.role is distinct from old.role or new.role_id is distinct from old.role_id
     or new.status is distinct from old.status or new.is_active is distinct from old.is_active then
    select u.role into v_actor_role from public.users u where u.id = v_actor and u.status in ('invited', 'active');
    if v_actor_role is distinct from 'admin' then
      raise exception 'Hanya admin klinik yang boleh mengubah role atau status pengguna' using errcode = 'insufficient_privilege';
    end if;
    if v_actor = old.id then
      raise exception 'Peran dan status akun sendiri tidak boleh diubah' using errcode = 'insufficient_privilege';
    end if;
    if new.role is distinct from old.role and new.role = 'dokter' then
      raise exception 'Peran dokter (akses rekam medis) hanya diberikan oleh tim Dentiva setelah verifikasi' using errcode = 'insufficient_privilege';
    end if;
    if new.role_id is distinct from old.role_id and exists (
         select 1 from public.roles r where r.id = new.role_id and r.name in ('Dentist', 'Super Admin', 'Clinic Owner')) then
      raise exception 'Peran tersebut hanya diberikan oleh tim Dentiva' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.users_guard_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if; -- service role (admin-create-user, console, migrasi)
  if new.role = 'dokter' or (new.role_id is not null and exists (
       select 1 from public.roles r where r.id = new.role_id and r.name in ('Dentist', 'Super Admin', 'Clinic Owner'))) then
    raise exception 'Akun dokter dibuat/diverifikasi oleh tim Dentiva — hubungi dukungan Dentiva' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
drop trigger if exists a_users_guard_insert on public.users;
create trigger a_users_guard_insert before insert on public.users for each row execute function public.users_guard_insert();

-- ── B01: status klinis hanya dokter ─────────────────────────────────────────
create or replace function public.guard_visit_status()
returns trigger language plpgsql security definer set search_path = public
as $$
declare r text;
begin
  if auth.uid() is null then return new; end if;
  r := public.get_user_role();
  if tg_op = 'INSERT' then
    if new.status in ('ongoing', 'completed') and r is distinct from 'dokter' then
      raise exception 'Hanya dokter yang boleh memulai atau menyelesaikan tindakan' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    if new.status in ('ongoing', 'completed') and r is distinct from 'dokter' then
      raise exception 'Hanya dokter yang boleh memulai atau menyelesaikan tindakan' using errcode = '42501';
    end if;
    if old.status = 'completed' and r is distinct from 'dokter' then
      raise exception 'Kunjungan yang sudah selesai hanya dapat diubah dokter' using errcode = '42501';
    end if;
    if r not in ('dokter', 'resepsionis') then
      raise exception 'Peran Anda tidak boleh mengubah status kunjungan' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists a_guard_visit_status on public.visits;
create trigger a_guard_visit_status before insert or update on public.visits for each row execute function public.guard_visit_status();

-- ── B06: dosis/frekuensi hanya dokter; tindakan & obat terkunci setelah lunas ──
create or replace function public.guard_visit_obat_clinical()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.get_user_role() = 'dokter' then return new; end if;
  if tg_op = 'INSERT' then
    new.dosis := null; new.frekuensi := null;
  else
    new.dosis := old.dosis; new.frekuensi := old.frekuensi;
  end if;
  return new;
end;
$$;
drop trigger if exists a_guard_visit_obat_clinical on public.visit_obat;
create trigger a_guard_visit_obat_clinical before insert or update on public.visit_obat for each row execute function public.guard_visit_obat_clinical();

create or replace function public.guard_billed_visit_items()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v uuid := case when tg_op = 'DELETE' then old.visit_id else new.visit_id end;
begin
  if auth.uid() is not null and exists (select 1 from public.payments where visit_id = v and status_pembayaran = 'paid') then
    raise exception 'Tindakan/obat tidak dapat diubah setelah pembayaran lunas' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists a_guard_billed_vt on public.visit_treatments;
create trigger a_guard_billed_vt before insert or update or delete on public.visit_treatments for each row execute function public.guard_billed_visit_items();
drop trigger if exists a_guard_billed_vo on public.visit_obat;
create trigger a_guard_billed_vo before insert or update or delete on public.visit_obat for each row execute function public.guard_billed_visit_items();

create or replace function public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb)
returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare r text := public.get_user_role(); v public.visits%rowtype;
begin
  if r is null or r not in ('dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  select * into v from public.visits where id = p_visit_id and clinic_id = public.get_user_clinic_id() and deleted_at is null;
  if not found then raise exception 'Kunjungan tidak ditemukan' using errcode = 'no_data_found'; end if;
  if r <> 'dokter' and v.status = 'completed' then
    raise exception 'Tindakan kunjungan yang sudah selesai hanya dapat diubah dokter' using errcode = '42501';
  end if;
  if exists (select 1 from public.payments where visit_id = p_visit_id and status_pembayaran = 'paid') then
    raise exception 'Tindakan tidak dapat diubah setelah pembayaran lunas' using errcode = '42501';
  end if;
  delete from visit_treatments where visit_id = p_visit_id;
  if jsonb_array_length(p_treatments) > 0 then
    insert into visit_treatments (visit_id, treatment_id, tooth_number, quantity, harga_satuan, subtotal, notes)
    select p_visit_id, (elem->>'treatment_id')::uuid, (elem->>'tooth_number')::integer, (elem->>'quantity')::integer,
           (elem->>'harga_satuan')::numeric, (elem->>'subtotal')::numeric, elem->>'notes'
    from jsonb_array_elements(p_treatments) as elem
    where exists (select 1 from public.treatments t where t.id = (elem->>'treatment_id')::uuid and t.clinic_id = public.get_user_clinic_id());
  end if;
end;
$$;

create or replace function public.get_patient_media_paths(p_patient_id uuid)
returns table(category text, file_url text) language plpgsql stable security definer set search_path to 'public', 'extensions'
as $$
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  return query select m.category::text, m.file_url::text from public.patient_media m
    join public.patients p on p.id = m.patient_id
   where m.patient_id = p_patient_id and p.clinic_id = public.get_user_clinic_id();
end;
$$;

create or replace function public.restore_visit_version(p_visit_id uuid, p_version integer)
returns void language plpgsql security definer set search_path to 'public', 'extensions'
as $$
declare d record;
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Akses ditolak: hanya dokter yang dapat memulihkan versi rekam medis';
  end if;
  select * into d from public.medical_record_versions where visit_id = p_visit_id and version = p_version;
  if not found then raise exception 'Versi tidak ditemukan'; end if;
  update public.visits set diagnosa = d.diagnosa, keluhan = d.keluhan, pemeriksaan_fisik = d.pemeriksaan_fisik,
         terapi = d.terapi, catatan_dokter = d.catatan_dokter, kode_icd10 = d.kode_icd10
   where id = p_visit_id;
end;
$$;

-- ── Kasir: hanya resepsionis, tidak menutup kunjungan, tidak menulis dosis ───
create or replace function public.save_visit_payment(p_visit_id uuid,p_treatments jsonb,p_medications jsonb,p_payment jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
 cid uuid:=public.get_user_clinic_id(); v public.visits%rowtype; pay public.payments%rowtype;
 item jsonb; existing jsonb; requested jsonb; same_t boolean; same_m boolean;
 total_t numeric; total_m numeric; extra numeric; discount numeric; total numeric; amount numeric;
 payment_status text:=p_payment->>'status_pembayaran'; method text:=p_payment->>'metode_pembayaran';
begin
 if cid is null or public.get_user_role() is distinct from 'resepsionis' or public.is_permission_revoked('finance.payment') or public.is_permission_revoked('finance.update') then
   raise exception 'Hanya kasir (resepsionis) yang boleh menerima pembayaran' using errcode='42501'; end if;
 select * into v from public.visits where id=p_visit_id and clinic_id=cid and deleted_at is null for update;
 if not found then raise exception 'Kunjungan tidak ditemukan' using errcode='P0002'; end if;
 if jsonb_typeof(p_treatments) is distinct from 'array' or jsonb_array_length(p_treatments)=0
    or jsonb_typeof(p_medications) is distinct from 'array' then raise exception 'Daftar tindakan/obat tidak valid' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_treatments) loop
   if not exists(select 1 from public.treatments where id=(item->>'treatment_id')::uuid and clinic_id=cid)
      or coalesce((item->>'quantity')::int,0)<1 or coalesce((item->>'harga_satuan')::numeric,-1)<0 then
     raise exception 'Tindakan, kuantitas atau harga tidak valid' using errcode='22023'; end if;
 end loop;
 for item in select value from jsonb_array_elements(p_medications) loop
   if not exists(select 1 from public.master_bahan where id=coalesce(item->>'master_bahan_id',item->>'obat_id')::uuid and clinic_id=cid)
      or coalesce((item->>'qty')::int,0)<1 or coalesce((item->>'harga_satuan')::numeric,-1)<0 then
     raise exception 'Obat, kuantitas atau harga tidak valid' using errcode='22023'; end if;
 end loop;
 select coalesce(sum((x->>'quantity')::int*(x->>'harga_satuan')::numeric),0) into total_t from jsonb_array_elements(p_treatments) x;
 select coalesce(sum((x->>'qty')::int*(x->>'harga_satuan')::numeric),0) into total_m from jsonb_array_elements(p_medications) x;
 extra:=coalesce((p_payment->>'biaya_tambahan')::numeric,0); discount:=coalesce((p_payment->>'diskon')::numeric,0);
 amount:=coalesce((p_payment->>'jumlah_bayar')::numeric,0); total:=total_t+total_m+extra-discount;
 if extra<0 or discount<0 or amount<0 or total<0 or total::text in ('NaN','Infinity') or amount::text in ('NaN','Infinity')
   or payment_status is null or payment_status not in ('paid','pending','partial','cancelled') or method is null or method not in ('cash','transfer','qris') then
   raise exception 'Nilai pembayaran tidak valid' using errcode='22023'; end if;
 if payment_status='paid' and amount<total then raise exception 'Jumlah bayar belum mencukupi tagihan' using errcode='22023'; end if;
 if payment_status='partial' and (amount<=0 or amount>=total) then raise exception 'Nilai pembayaran sebagian tidak valid' using errcode='22023'; end if;

 -- Compare only billing fields. Clinical notes/prescription instructions remain intact.
 select coalesce(jsonb_agg(jsonb_build_array(treatment_id,tooth_number,quantity,harga_satuan) order by treatment_id,tooth_number,quantity,harga_satuan),'[]')
 into existing from public.visit_treatments where visit_id=p_visit_id;
 select coalesce(jsonb_agg(jsonb_build_array((x->>'treatment_id')::uuid,nullif(x->>'tooth_number','')::int,(x->>'quantity')::int,(x->>'harga_satuan')::numeric)
   order by (x->>'treatment_id')::uuid,nullif(x->>'tooth_number','')::int,(x->>'quantity')::int,(x->>'harga_satuan')::numeric),'[]')
 into requested from jsonb_array_elements(p_treatments) x;
 same_t:=existing=requested;
 select coalesce(jsonb_agg(jsonb_build_array(coalesce(master_bahan_id,obat_id),qty,harga_satuan) order by coalesce(master_bahan_id,obat_id),qty,harga_satuan),'[]')
 into existing from public.visit_obat where visit_id=p_visit_id;
 select coalesce(jsonb_agg(jsonb_build_array(coalesce(x->>'master_bahan_id',x->>'obat_id')::uuid,(x->>'qty')::int,(x->>'harga_satuan')::numeric)
   order by coalesce(x->>'master_bahan_id',x->>'obat_id')::uuid,(x->>'qty')::int,(x->>'harga_satuan')::numeric),'[]')
 into requested from jsonb_array_elements(p_medications) x;
 same_m:=existing=requested;
 if (to_jsonb(v)->>'is_locked'='true' or v.status='completed') and not (same_t and same_m) then
   raise exception 'Tindakan/obat kunjungan terkunci atau selesai tidak dapat diganti' using errcode='42501'; end if;
 select * into pay from public.payments where visit_id=p_visit_id for update;
 if found and pay.status_pembayaran='paid' then
   if same_t and same_m and pay.total_bayar=total and pay.jumlah_bayar=amount and payment_status='paid'
      and pay.metode_pembayaran=method and pay.biaya_tambahan=extra and pay.diskon=discount then return to_jsonb(pay); end if;
   raise exception 'Pembayaran lunas tidak dapat diubah' using errcode='42501';
 end if;
 if not same_t then
   -- Keep existing IDs and their clinical notes; only remove explicitly omitted rows.
   delete from public.visit_treatments vt where visit_id=p_visit_id and not exists(
     select 1 from jsonb_array_elements(p_treatments) x where x->>'id'=vt.id::text);
   for item in select value from jsonb_array_elements(p_treatments) loop
     if item->>'id' is not null then
       update public.visit_treatments set treatment_id=(item->>'treatment_id')::uuid,tooth_number=nullif(item->>'tooth_number','')::int,
         quantity=(item->>'quantity')::int,harga_satuan=(item->>'harga_satuan')::numeric,
         subtotal=(item->>'quantity')::int*(item->>'harga_satuan')::numeric
       where id=(item->>'id')::uuid and visit_id=p_visit_id;
       if not found then raise exception 'Tindakan sudah berubah, muat ulang kunjungan' using errcode='40001'; end if;
     else
       insert into public.visit_treatments(clinic_id,visit_id,treatment_id,tooth_number,quantity,harga_satuan,subtotal)
       values(cid,p_visit_id,(item->>'treatment_id')::uuid,nullif(item->>'tooth_number','')::int,(item->>'quantity')::int,(item->>'harga_satuan')::numeric,(item->>'quantity')::int*(item->>'harga_satuan')::numeric);
     end if;
   end loop;
 end if;
 if not same_m then
   delete from public.visit_obat vo where visit_id=p_visit_id and not exists(select 1 from jsonb_array_elements(p_medications) x where x->>'id'=vo.id::text);
   for item in select value from jsonb_array_elements(p_medications) loop
     if item->>'id' is not null then
       update public.visit_obat set qty=(item->>'qty')::int,harga_satuan=(item->>'harga_satuan')::numeric
       where id=(item->>'id')::uuid and visit_id=p_visit_id and coalesce(master_bahan_id,obat_id)=coalesce(item->>'master_bahan_id',item->>'obat_id')::uuid;
       if not found then raise exception 'Resep sudah berubah, muat ulang kunjungan' using errcode='40001'; end if;
     else
       insert into public.visit_obat(clinic_id,visit_id,master_bahan_id,obat_id,nama_obat,qty,harga_satuan,dosis,frekuensi)
       select cid,p_visit_id,b.id,b.id,b.nama_bahan,(item->>'qty')::int,(item->>'harga_satuan')::numeric,
         null,null -- dosis & frekuensi hanya ditulis dokter
       from public.master_bahan b where b.id=coalesce(item->>'master_bahan_id',item->>'obat_id')::uuid and b.clinic_id=cid;
     end if;
   end loop;
 end if;
 if pay.id is null then
   insert into public.payments(clinic_id,visit_id,patient_id,total_treatment,biaya_tambahan,keterangan_tambahan,diskon,total_bayar,jumlah_bayar,kembalian,metode_pembayaran,status_pembayaran,tanggal_pembayaran,processed_by)
   values(cid,p_visit_id,v.patient_id,total_t,extra,p_payment->>'keterangan_tambahan',discount,total,amount,
     case when method='cash' then greatest(amount-total,0) else 0 end,method,payment_status,now(),auth.uid()) returning * into pay;
 else
   update public.payments set total_treatment=total_t,biaya_tambahan=extra,keterangan_tambahan=p_payment->>'keterangan_tambahan',diskon=discount,total_bayar=total,
     jumlah_bayar=amount,kembalian=case when method='cash' then greatest(amount-total,0) else 0 end,
     metode_pembayaran=method,status_pembayaran=payment_status,tanggal_pembayaran=now(),processed_by=auth.uid()
   where id=pay.id returning * into pay;
 end if;
 -- Status klinis dan status tagihan dipisah: pembayaran lunas TIDAK menyelesaikan kunjungan (hanya dokter).
 return to_jsonb(pay);
end $$;
revoke all on function public.save_visit_payment(uuid,jsonb,jsonb,jsonb) from public, anon;

-- ── B06: admin dikeluarkan dari data pasien/klinis/transaksi (policy RESTRICTIVE) ──
do $$
declare t text;
begin
  foreach t in array array['patients','visits','visit_treatments','visit_obat','clinical_data','extra_oral_data','intra_oral_data',
      'medical_history','odontogram_meta','periodontal_data','tooth_conditions','treatment_plans','patient_media','patient_referrals',
      'medical_record_versions','informed_consents','satusehat_consents','recall_contacts','booking_requests','patient_visits'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists tolak_admin_data_pasien on public.%I', t);
      execute format('create policy tolak_admin_data_pasien on public.%I as restrictive for all to authenticated
                      using (coalesce((select public.get_user_role()), '''') <> ''admin'')', t);
    end if;
  end loop;
end $$;

-- Pembayaran: baca = resepsionis & dokter; tulis = hanya resepsionis (RPC kasir tetap jalan: SECURITY DEFINER).
drop policy if exists payments_baca_peran on public.payments;
create policy payments_baca_peran on public.payments as restrictive for select to authenticated
  using (coalesce((select public.get_user_role()), '') in ('resepsionis', 'dokter'));
drop policy if exists payments_tulis_kasir_i on public.payments;
create policy payments_tulis_kasir_i on public.payments as restrictive for insert to authenticated
  with check ((select public.get_user_role()) = 'resepsionis');
drop policy if exists payments_tulis_kasir_u on public.payments;
create policy payments_tulis_kasir_u on public.payments as restrictive for update to authenticated
  using ((select public.get_user_role()) = 'resepsionis');
drop policy if exists payments_tulis_kasir_d on public.payments;
create policy payments_tulis_kasir_d on public.payments as restrictive for delete to authenticated
  using ((select public.get_user_role()) = 'resepsionis');

-- ── B03: izin yang dicabut (user_permissions.is_revoked) menang atas jalur izin peran ──
do $$
declare r record; perm text; cmdl text;
begin
  for r in select tablename, cmd, policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') as txt
             from pg_policies where schemaname = 'public' and permissive = 'PERMISSIVE' loop
    perm := (regexp_match(r.txt, 'has_permission\(''([a-z_.]+)''::text'))[1];
    continue when perm is null or r.cmd = 'ALL';
    cmdl := lower(r.cmd);
    execute format('drop policy if exists %I on public.%I', left('izin_dicabut_' || r.tablename || '_' || cmdl, 63), r.tablename);
    if r.cmd = 'INSERT' then
      execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (not public.is_permission_revoked(%L))',
                     left('izin_dicabut_' || r.tablename || '_' || cmdl, 63), r.tablename, perm);
    else
      execute format('create policy %I on public.%I as restrictive for %s to authenticated using (not public.is_permission_revoked(%L))',
                     left('izin_dicabut_' || r.tablename || '_' || cmdl, 63), r.tablename, cmdl, perm);
    end if;
  end loop;
end $$;

-- ── Antrean sederhana & laporan agregat (tanpa identitas pasien) ─────────────
create or replace function public.queue_today()
returns table(nomor integer, jam time, dokter text, status text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query
    select v.visit_number, v.jam_kunjungan,
           nullif(btrim(concat_ws(' ', u.gelar_depan, u.full_name)), ''), v.status::text
      from public.visits v left join public.users u on u.id = v.dokter_id
     where v.clinic_id = public.get_user_clinic_id() and v.deleted_at is null
       and v.tanggal_kunjungan = (now() at time zone 'Asia/Jakarta')::date
     order by v.jam_kunjungan nulls last, v.visit_number;
end;
$$;

create or replace function public.report_visit_counts(p_start date, p_end date)
returns table(tanggal date, jumlah integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query
    select v.tanggal_kunjungan, count(*)::integer from public.visits v
     where v.clinic_id = public.get_user_clinic_id() and v.deleted_at is null
       and v.tanggal_kunjungan between p_start and p_end
     group by 1 order by 1;
end;
$$;

create or replace function public.report_revenue_daily(p_start date, p_end date)
returns table(tanggal date, total_revenue numeric, total_transactions integer)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query
    select (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date, coalesce(sum(p.total_bayar), 0), count(*)::integer
      from public.payments p
     where p.clinic_id = public.get_user_clinic_id() and p.status_pembayaran = 'paid'
       and (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date between p_start and p_end
     group by 1 order by 1;
end;
$$;

create or replace function public.report_counts(p_start date, p_end date)
returns table(patients_total bigint, patients_new bigint, visits_in_range bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query select
    (select count(*) from public.patients where clinic_id = public.get_user_clinic_id() and deleted_at is null),
    (select count(*) from public.patients where clinic_id = public.get_user_clinic_id() and deleted_at is null
        and (created_at at time zone 'Asia/Jakarta')::date between p_start and p_end),
    (select count(*) from public.visits where clinic_id = public.get_user_clinic_id() and deleted_at is null
        and tanggal_kunjungan between p_start and p_end);
end;
$$;

create or replace function public.report_popular_treatments(p_limit integer default 5)
returns table(treatment_id uuid, nama_treatment text, kategori text, usage_count bigint, total_revenue numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  return query
    select t.id, t.nama_treatment::text, t.kategori::text, count(vt.id), coalesce(sum(vt.subtotal), 0)
      from public.treatments t join public.visit_treatments vt on vt.treatment_id = t.id
     where t.clinic_id = public.get_user_clinic_id()
     group by t.id, t.nama_treatment, t.kategori
     order by count(vt.id) desc limit least(greatest(coalesce(p_limit, 5), 1), 100);
end;
$$;

revoke all on function public.queue_today(), public.report_visit_counts(date, date), public.report_revenue_daily(date, date),
  public.report_counts(date, date), public.report_popular_treatments(integer), public.is_permission_revoked(text) from public, anon;
grant execute on function public.queue_today(), public.report_visit_counts(date, date), public.report_revenue_daily(date, date),
  public.report_counts(date, date), public.report_popular_treatments(integer), public.is_permission_revoked(text) to authenticated;
