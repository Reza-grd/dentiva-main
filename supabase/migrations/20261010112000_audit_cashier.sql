-- One PostgreSQL transaction owns visit details, payment and completion/costing.
alter table public.payments drop constraint if exists chk_status_pembayaran;
alter table public.payments drop constraint if exists payments_status_pembayaran_check;
alter table public.payments add constraint payments_status_pembayaran_check check(status_pembayaran in ('paid','pending','partial','cancelled'));

create or replace function public.save_visit_payment(p_visit_id uuid,p_treatments jsonb,p_medications jsonb,p_payment jsonb)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare
 cid uuid:=public.get_user_clinic_id(); v public.visits%rowtype; pay public.payments%rowtype;
 item jsonb; existing jsonb; requested jsonb; same_t boolean; same_m boolean;
 total_t numeric; total_m numeric; extra numeric; discount numeric; total numeric; amount numeric;
 payment_status text:=p_payment->>'status_pembayaran'; method text:=p_payment->>'metode_pembayaran';
begin
 if cid is null or public.get_user_role() not in ('admin','dokter','resepsionis') then raise exception 'Akses ditolak' using errcode='42501'; end if;
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
         item->>'dosis',item->>'frekuensi'
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
 if payment_status='paid' and v.status<>'completed' then update public.visits set status='completed' where id=p_visit_id; end if;
 return to_jsonb(pay);
end $$;
revoke all on function public.save_visit_payment(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_visit_payment(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Direct table/API writes must enforce the same paid/partial arithmetic.
create or replace function public.audit_payment_amount()
returns trigger language plpgsql set search_path=public,extensions as $$
begin
 if new.total_bayar<0 or new.jumlah_bayar<0 or new.total_bayar::text in ('NaN','Infinity') or new.jumlah_bayar::text in ('NaN','Infinity')
 or (new.status_pembayaran='paid' and coalesce(new.jumlah_bayar,0)<new.total_bayar)
 or (new.status_pembayaran='partial' and (coalesce(new.jumlah_bayar,0)<=0 or new.jumlah_bayar>=new.total_bayar)) then
   raise exception 'Nilai pembayaran tidak sesuai status' using errcode='22023'; end if;
 return new;
end $$;
create trigger zz_audit_payment_amount before insert or update on public.payments for each row execute function public.audit_payment_amount();
revoke all on function public.audit_payment_amount() from public,anon,authenticated;
