-- Sidik (md5) konfigurasi keamanan skema Dentiva — dipakai salin-dari-supabase.sh, pulihkan-ke-vps.sh
-- dan backup-harian.sh. Sumber & tujuan menjalankan kueri yang sama; hasil harus identik.
--   seq/tbl/col/fn/sch  hak akses (GRANT) tabel, kolom, fungsi, skema
--   own                 pemilik tabel/view/sequence/fungsi
--   rls                 status RLS (enable/force) tiap tabel
--   pol                 definisi seluruh RLS policy (termasuk storage)
--   trg                 definisi trigger non-internal di skema Dentiva
--   pub                 tabel Dentiva di publikasi Realtime
with s as (select oid, nspname from pg_namespace where nspname in ('public','private','platform','supabase_migrations','backup_20260929')),
rel as (
  select case c.relkind when 'S' then 'seq' else 'tbl' end as k, s.nspname || '.' || c.relname as obj,
         aclexplode(coalesce(c.relacl, acldefault(case c.relkind when 'S' then 's' else 'r' end::"char", c.relowner))) as a
  from pg_class c join s on s.oid = c.relnamespace where c.relkind in ('r','p','v','m','f','S')
),
col as (
  select 'col' as k, s.nspname || '.' || c.relname || '.' || at.attname as obj, aclexplode(at.attacl) as a
  from pg_attribute at join pg_class c on c.oid = at.attrelid join s on s.oid = c.relnamespace
  where at.attacl is not null and at.attnum > 0 and not at.attisdropped
),
fn as (
  select 'fn' as k, s.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as obj,
         aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) as a
  from pg_proc p join s on s.oid = p.pronamespace
),
sch as (
  select 'sch' as k, s.nspname as obj, aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) as a
  from pg_namespace n join s on s.oid = n.oid
),
semua as (
  select k, obj || '|' || case (a).grantee when 0 then 'PUBLIC' else pg_get_userbyid((a).grantee) end
             || '|' || (a).privilege_type || case when (a).is_grantable then '*' else '' end as baris
  from (select * from rel union all select * from col union all select * from fn union all select * from sch) x
  union all
  select 'own', s.nspname || '.' || c.relname || '|' || c.relkind::text || '|' || pg_get_userbyid(c.relowner)
  from pg_class c join s on s.oid = c.relnamespace where c.relkind in ('r','p','v','m','f','S')
  union all
  select 'own', s.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')|f|' || pg_get_userbyid(p.proowner)
  from pg_proc p join s on s.oid = p.pronamespace
  union all
  select 'rls', s.nspname || '.' || c.relname || '|' || c.relrowsecurity::text || '|' || c.relforcerowsecurity::text
  from pg_class c join s on s.oid = c.relnamespace where c.relkind in ('r','p')
  union all
  select 'pol', schemaname || '.' || tablename || '|' || policyname || '|' || permissive::text || '|' || array_to_string(roles, ',')
             || '|' || cmd || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
  from pg_policies where schemaname in ('public','private','platform','storage')
  union all
  select 'trg', s.nspname || '.' || c.relname || '|' || t.tgname || '|' || t.tgenabled::text || '|' || pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join s on s.oid = c.relnamespace where not t.tgisinternal
  union all
  select 'pub', pubname || '|' || schemaname || '.' || tablename
  from pg_publication_tables where schemaname in ('public','private','platform')
)
select k, count(*) as jumlah, md5(string_agg(baris, ';' order by baris)) as sidik from semua group by k
union all
select 'SEMUA', count(*), md5(string_agg(baris, ';' order by baris)) from semua
order by 1;
