-- =============================================================================
-- Pemeriksaan pasca-migration (jalankan di SQL Editor staging & produksi).
-- Semua kueri di bawah seharusnya mengembalikan 0 baris.
-- =============================================================================

-- 1. Tabel public ber-clinic_id tanpa RLS aktif
select c.relname as table_tanpa_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attname = 'clinic_id' and not a.attisdropped
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

-- 2. Tabel public ber-clinic_id tanpa policy restrictive tenant_isolation
select c.relname as table_tanpa_tenant_isolation
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attname = 'clinic_id' and not a.attisdropped
where n.nspname = 'public' and c.relkind = 'r'
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
      and p.policyname = 'tenant_isolation' and p.permissive = 'RESTRICTIVE'
  );

-- 3. Tabel public yang MUNGKIN berisi data klinik tetapi belum punya clinic_id
--    (tinjau manual; tabel katalog global seperti roles/permissions/subscription_plans wajar muncul)
select t.table_name as kandidat_tanpa_clinic_id
from information_schema.tables t
where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
  and not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = t.table_name and c.column_name = 'clinic_id'
  )
  and t.table_name not in ('clinics', 'roles', 'permissions', 'role_permissions', 'user_permissions',
                           'subscription_plans', 'satusehat_token_cache', 'invoice_counters')
order by 1;

-- 4. User klinik yang klaim JWT-nya tidak cocok dengan public.users.clinic_id
select u.id, u.email
from public.users u
join auth.users au on au.id = u.id
where (au.raw_app_meta_data ->> 'clinic_id') is distinct from u.clinic_id::text;

-- 5. Policy yang masih memanggil fungsi tanpa (select ...) (performa)
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'get_user_clinic_id\(\)'
  and (coalesce(qual, '') || coalesce(with_check, '')) !~* 'select (public\.)?get_user_clinic_id\(\)';

-- 6. Skema platform tidak boleh bisa diakses anon/authenticated
select grantee, privilege_type, table_name
from information_schema.role_table_grants
where table_schema = 'platform' and grantee in ('anon', 'authenticated', 'PUBLIC');

-- 7. Job pg_cron Console terdaftar (seharusnya 2 baris — ini SATU-SATUNYA kueri yang tidak 0)
select jobname, schedule, active from cron.job
where jobname in ('platform-collect-usage-daily', 'platform-mark-overdue-invoices');
