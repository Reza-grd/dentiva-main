-- Audit 10 Oct: authenticate data class and tenant INSIDE the encrypted payload.
-- Prefixes remain compatible with existing clients. No keys or plaintext leave DB.
-- The authenticated envelope is larger than legacy ciphertext.
do $$ declare def text;
begin
  if to_regclass('public.v_patient_summary') is not null then
    def:=pg_get_viewdef('public.v_patient_summary'::regclass,true); drop view public.v_patient_summary;
  end if;
  alter table public.patients alter column nama_lengkap type text;
  if def is not null then
    execute 'create view public.v_patient_summary with (security_invoker=true) as '||def;
    revoke all on public.v_patient_summary from public,anon;
    grant select on public.v_patient_summary to authenticated,service_role;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='visits' and column_name='kode_icd10') then
    alter table public.visits alter column kode_icd10 type text;
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='medical_record_versions' and column_name='kode_icd10') then
    alter table public.medical_record_versions alter column kode_icd10 type text;
  end if;
end $$;
create or replace function private.encrypt_envelope(p text, cid uuid, medical boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if p is null or p='' then return p; end if;
  if cid is null then raise exception 'Klinik tidak diketahui' using errcode='42501'; end if;
  return case when medical then 'PGPM:' else 'PGP:' end || encode(pgp_sym_encrypt(
    jsonb_build_object('format','dentiva-v2','clinic_id',cid,'medical',medical,'value',p)::text,
    private.get_encryption_key()::text), 'base64');
end $$;
create or replace function private.read_envelope(p text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare j jsonb;
begin
  if p is null or p !~ '^PGPM?:' then return null; end if;
  j := pgp_sym_decrypt(decode(substr(p,case when p like 'PGPM:%' then 6 else 5 end),'base64'),private.get_encryption_key()::text)::jsonb;
  if j->>'format' is distinct from 'dentiva-v2' or jsonb_typeof(j->'value') is distinct from 'string'
     or (j->>'medical')::boolean is distinct from (p like 'PGPM:%') or j->>'clinic_id' is null then
    raise exception 'Encrypted classification mismatch';
  end if;
  return j;
exception when others then raise exception 'Ciphertext tidak valid' using errcode='22023';
end $$;
create or replace function private.decrypt_for_clinic(p text, cid uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare j jsonb;
begin
  if p is null or p !~ '^PGPM?:' then return p; end if;
  j:=private.read_envelope(p);
  if (j->>'clinic_id')::uuid is distinct from cid then raise exception 'Tenant ciphertext mismatch' using errcode='42501'; end if;
  return j->>'value';
end $$;

-- One-time conversion of stored legacy ciphertext, including nested audit/version JSON.
create or replace function private.backfill_envelope(j jsonb, cid uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare p text; plain text; item record; outj jsonb; decoded jsonb;
begin
  if j is null then return null; end if;
  if jsonb_typeof(j)='string' then
    p:=j#>>'{}';
    if p !~ '^PGPM?:' then return j; end if;
    plain:=pgp_sym_decrypt(decode(substr(p,case when p like 'PGPM:%' then 6 else 5 end),'base64'),private.get_encryption_key()::text);
    begin decoded:=plain::jsonb; exception when others then decoded:=null; end;
    if decoded->>'format'='dentiva-v2' then
      perform private.decrypt_for_clinic(p,cid); return j;
    end if;
    return to_jsonb(private.encrypt_envelope(plain,cid,p like 'PGPM:%'));
  elsif jsonb_typeof(j)='object' then
    outj:='{}'; for item in select * from jsonb_each(j) loop
      outj:=outj||jsonb_build_object(item.key,private.backfill_envelope(item.value,cid)); end loop; return outj;
  elsif jsonb_typeof(j)='array' then
    outj:='[]'; for item in select value from jsonb_array_elements(j) loop
      outj:=outj||jsonb_build_array(private.backfill_envelope(item.value,cid)); end loop; return outj;
  end if;
  return j;
end $$;
do $$ declare t record; c record; tr record;
begin
  -- Synthetic smoke fixtures omit pgcrypto/key storage; real DB must have it.
  if to_regprocedure('private.get_encryption_key()') is null then return; end if;
  create temporary table audit_trigger_state on commit drop as
    select tgrelid,tgname,tgenabled from pg_trigger where not tgisinternal;
  for t in select table_name from information_schema.columns where table_schema='public' and column_name='clinic_id'
    and exists(select 1 from information_schema.tables tb where tb.table_schema='public' and tb.table_name=columns.table_name and tb.table_type='BASE TABLE')
  loop
    execute format('alter table public.%I disable trigger user',t.table_name);
    for c in select column_name,data_type from information_schema.columns where table_schema='public' and table_name=t.table_name
      and data_type in ('text','character varying','character','json','jsonb') and is_generated='NEVER'
    loop
      if c.data_type in ('json','jsonb') then
        execute format('update public.%I set %I=private.backfill_envelope(%I::jsonb,clinic_id)::%s where %I::text like ''%%PGP%%''',t.table_name,c.column_name,c.column_name,c.data_type,c.column_name);
      else
        execute format('update public.%I set %I=private.backfill_envelope(to_jsonb(%I::text),clinic_id)#>>''{}'' where %I::text ~ ''^PGPM?:''',t.table_name,c.column_name,c.column_name,c.column_name);
      end if;
    end loop;
    for tr in select * from audit_trigger_state where tgrelid=('public.'||quote_ident(t.table_name))::regclass loop
      execute format('alter table public.%I %s trigger %I',t.table_name,
        case tr.tgenabled when 'D' then 'disable' when 'A' then 'enable always' when 'R' then 'enable replica' else 'enable' end,tr.tgname);
    end loop;
  end loop;
end $$;
drop function private.backfill_envelope(jsonb,uuid);

create or replace function public.decrypt_field(p_ciphertext text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare j jsonb; cid uuid; claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}');
begin
  if p_ciphertext is null or p_ciphertext !~ '^PGPM?:' then return p_ciphertext; end if;
  j:=private.read_envelope(p_ciphertext);
  if claims->>'role'='service_role' or (claims='{}' and session_user not in ('authenticator','anon','authenticated')) then return j->>'value'; end if;
  cid:=public.get_user_clinic_id();
  if cid is null or cid is distinct from (j->>'clinic_id')::uuid then raise exception 'Ciphertext bukan milik klinik Anda' using errcode='42501'; end if;
  if (j->>'medical')::boolean and not public.is_medical_reader() then return '[Terbatas: hanya dokter]'; end if;
  return j->>'value';
end $$;
create or replace function public.encrypt_field(p_plaintext text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid:=public.get_user_clinic_id(); j jsonb;
begin
  if p_plaintext is null or p_plaintext='' then return p_plaintext; end if;
  if p_plaintext ~ '^PGPM?:' then
    j:=private.read_envelope(p_plaintext);
    if cid is null or (j->>'clinic_id')::uuid is distinct from cid then raise exception 'Tenant ciphertext mismatch' using errcode='42501'; end if;
    return p_plaintext;
  end if;
  return private.encrypt_envelope(p_plaintext,cid,false);
end $$;
create or replace function private.medical_plain(p text)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin if p ~ '^PGPM?:' then return private.read_envelope(p)->>'value'; end if; return p; end $$;
-- Validate pre-encrypted values too; arbitrary ciphertext must never bypass tenant checks.
create or replace function private.medical_seal(p text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare cid uuid:=nullif(current_setting('dentiva.medical_clinic',true),'')::uuid; j jsonb;
begin
  if p is null or p='' then return p; end if;
  cid:=coalesce(cid,public.get_user_clinic_id());
  if p ~ '^PGPM?:' then
    j:=private.read_envelope(p);
    if (j->>'clinic_id')::uuid is distinct from cid then raise exception 'Tenant ciphertext mismatch' using errcode='42501'; end if;
    if (j->>'medical')::boolean then return p; end if;
    p:=j->>'value';
  end if;
  return private.encrypt_envelope(p,cid,true);
end $$;
-- Supply the row tenant to internal medical sealing, including service sync/migrations.
do $$ declare def text;
begin
  select pg_get_functiondef('public.protect_visit_medical_fields()'::regprocedure) into def;
  def:=replace(def,E'begin\n',E'begin\n  perform set_config(''dentiva.medical_clinic'', new.clinic_id::text, true);\n');
  execute def;
end $$;
-- Public booking and token-bound queue RPCs already authorize an explicit clinic.
do $$ declare def text;
begin
  if to_regprocedure('public.submit_booking_request(text,uuid,date,text,text,text,text)') is not null then
    def:=pg_get_functiondef('public.submit_booking_request(text,uuid,date,text,text,text,text)'::regprocedure);
    def:=replace(def,'public.encrypt_field(trim(p_name))','private.encrypt_envelope(trim(p_name),v_clinic,false)');
    def:=replace(def,'public.encrypt_field(v_phone)','private.encrypt_envelope(v_phone,v_clinic,false)');
    def:=replace(def,'public.encrypt_field(nullif(trim(coalesce(p_complaint, '''')), ''''))','private.encrypt_envelope(nullif(trim(coalesce(p_complaint, '''')), ''''),v_clinic,false)');
    execute def;
  end if;
  if to_regprocedure('public.get_queue_display(text)') is not null then
    def:=pg_get_functiondef('public.get_queue_display(text)'::regprocedure);
    def:=replace(def,'public.decrypt_field(p.nama_lengkap::text)','private.decrypt_for_clinic(p.nama_lengkap::text,v_link.clinic_id)'); execute def;
  end if;
end $$;

-- F03: validate every tenant-bearing FK on INSERT and UPDATE, including explicit clinic_id.
create or replace function public.audit_tenant_relations()
returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb:=to_jsonb(new); fk record; value text; parent_clinic uuid;
begin
  if j->>'clinic_id' is null then return new; end if;
  for fk in select src.attname as child_col,n.nspname as ns,c.relname as parent, dst.attname as parent_col
    from pg_constraint k join pg_class c on c.oid=k.confrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_attribute src on src.attrelid=k.conrelid and src.attnum=k.conkey[1]
    join pg_attribute dst on dst.attrelid=k.confrelid and dst.attnum=k.confkey[1]
    where k.conrelid=tg_relid and k.contype='f' and cardinality(k.conkey)=1
      and exists(select 1 from pg_attribute a where a.attrelid=k.confrelid and a.attname='clinic_id' and not a.attisdropped)
  loop
    value:=j->>fk.child_col; if value is null then continue; end if;
    execute format('select clinic_id from %I.%I where %I::text=$1',fk.ns,fk.parent,fk.parent_col) into parent_clinic using value;
    if parent_clinic is null or parent_clinic::text is distinct from j->>'clinic_id' then raise exception 'Relasi lintas klinik ditolak (%)',fk.child_col using errcode='42501'; end if;
  end loop;
  -- Legacy medication ID lost its FK; validate it explicitly.
  if tg_table_name='visit_obat' and j->>'obat_id' is not null then
    select clinic_id into parent_clinic from public.master_bahan where id=(j->>'obat_id')::uuid;
    if parent_clinic::text is distinct from j->>'clinic_id' then raise exception 'Obat bukan milik klinik' using errcode='42501'; end if;
  end if;
  return new;
end $$;
do $$ declare t record;
begin for t in select table_name from information_schema.columns where table_schema='public' and column_name='clinic_id'
  and exists(select 1 from information_schema.tables tb where tb.table_schema='public' and tb.table_name=columns.table_name and tb.table_type='BASE TABLE')
loop execute format('create trigger zz_audit_tenant_relations before insert or update on public.%I for each row execute function public.audit_tenant_relations()',t.table_name); end loop; end $$;

-- F02: radiology is medical. Preserve separate administrative/profile-photo access.
do $$ begin if to_regclass('storage.objects') is not null then
  create policy medical_radiology_only on storage.objects as restrictive for all to authenticated
    using (bucket_id<>'radiologi' or public.is_medical_reader())
    with check (bucket_id<>'radiologi' or public.is_medical_reader());
end if; end $$;

-- F12: backend lock enforcement, explicit reason and trustworthy lock metadata.
alter table public.visits add column if not exists lock_change_reason text;
create or replace function public.audit_visit_lock()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare oldj jsonb:=to_jsonb(old); newj jsonb:=to_jsonb(new); claims text:=nullif(current_setting('request.jwt.claims',true),'');
begin
  if oldj->>'is_locked'='true' and (oldj->>'patient_id',oldj->>'keluhan',oldj->>'diagnosa',oldj->>'pemeriksaan_fisik',oldj->>'kode_icd10',oldj->>'terapi',oldj->>'catatan_dokter')
     is distinct from (newj->>'patient_id',newj->>'keluhan',newj->>'diagnosa',newj->>'pemeriksaan_fisik',newj->>'kode_icd10',newj->>'terapi',newj->>'catatan_dokter') then
    raise exception 'Rekam medis terkunci; buka kunci terlebih dahulu' using errcode='42501';
  end if;
  if oldj->>'is_locked' is distinct from newj->>'is_locked' and claims is not null and claims::jsonb->>'role'='authenticated' then
    if public.get_user_role() is distinct from 'dokter' then raise exception 'Hanya dokter dapat mengubah kunci' using errcode='42501'; end if;
    if newj->>'is_locked'='false' and length(trim(coalesce(newj->>'lock_change_reason',''))) < 5 then raise exception 'Alasan membuka kunci wajib diisi (minimal 5 karakter)' using errcode='22023'; end if;
    new:=jsonb_populate_record(new,jsonb_build_object('locked_by',case when newj->>'is_locked'='true' then auth.uid() else null end,'locked_at',case when newj->>'is_locked'='true' then now() else null end));
  end if;
  return new;
end $$;
create trigger zz_audit_visit_lock before update on public.visits for each row execute function public.audit_visit_lock();
create or replace function public.audit_child_lock()
returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare j jsonb; previous jsonb;
begin
  if tg_op<>'DELETE' then j:=to_jsonb(new); end if;
  if tg_op<>'INSERT' then previous:=to_jsonb(old); end if;
  if exists(select 1 from public.visits v where (v.id=(j->>'visit_id')::uuid or v.id=(previous->>'visit_id')::uuid) and to_jsonb(v)->>'is_locked'='true') then
    raise exception 'Rekam medis terkunci' using errcode='42501';
  end if;
  if tg_table_name='visit_treatments' and exists(select 1 from public.visits v where (v.id=(j->>'visit_id')::uuid or v.id=(previous->>'visit_id')::uuid) and v.status='completed') then
    raise exception 'Tindakan kunjungan selesai dan snapshot biaya tidak dapat diganti' using errcode='42501';
  end if;
  return coalesce(new,old);
end $$;
do $$ declare t text;
begin foreach t in array array['visit_treatments','visit_obat','informed_consents'] loop
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='visit_id') then
    execute format('create trigger zz_audit_child_lock before insert or update or delete on public.%I for each row execute function public.audit_child_lock()',t);
  end if;
end loop; end $$;
revoke all on function private.encrypt_envelope(text,uuid,boolean),private.read_envelope(text),private.decrypt_for_clinic(text,uuid),private.medical_plain(text),private.medical_seal(text) from public,anon,authenticated;
revoke all on function public.audit_tenant_relations(),public.audit_visit_lock(),public.audit_child_lock() from public,anon,authenticated;
