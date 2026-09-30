-- =============================================================================
-- Konsolidasi policy RLS permissive (Performance Advisor: 444 multiple_permissive)
-- -----------------------------------------------------------------------------
-- Tabel utama memiliki hingga 10 policy permissive dari dua sistem hak akses
-- lama (berbasis peran get_user_role() dan berbasis izin has_permission()).
-- Postgres menggabungkan policy permissive dengan OR per perintah; fungsi ini
-- melakukan penggabungan yang sama secara eksplisit menjadi SATU policy per
-- perintah (per kelompok role database), sehingga:
--   * hak akses efektif TIDAK berubah (OR dari ekspresi yang sama);
--   * setiap query hanya mengevaluasi satu policy per perintah;
--   * aturan akses bisa dibaca di satu tempat.
-- Policy RESTRICTIVE (tenant_isolation) tidak disentuh — isolasi klinik tetap.
--
-- Pemetaan semantik Postgres:
--   SELECT/DELETE : USING  = OR(qual) dari policy cmd itu + ALL
--   INSERT        : CHECK  = OR(coalesce(with_check, qual)) dari INSERT + ALL
--   UPDATE        : USING  = OR(qual), CHECK = OR(coalesce(with_check, qual))
-- Diverifikasi di produksi (transaksi di-rollback): peta akses baca/ubah/hapus
-- admin, dokter, resepsionis identik sebelum & sesudah.
-- =============================================================================

create or replace function platform.rls_consolidate()
returns int
language plpgsql
set search_path = ''
as $$
declare
  g record;
  c text;
  using_expr text;
  check_expr text;
  creates text[];
  stmt text;
  n int := 0;
begin
  for g in
    select tablename, roles, array_to_string(roles, ', ') as roles_sql,
           replace(array_to_string(roles, '_'), '"', '') as roles_tag
    from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by tablename, roles
    having count(*) > 1
  loop
    creates := array[]::text[];

    foreach c in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      using_expr := null;
      check_expr := null;

      if c <> 'INSERT' then
        select '(' || string_agg(distinct qual, ') OR (') || ')'
        into using_expr
        from pg_policies
        where schemaname = 'public' and tablename = g.tablename and roles = g.roles
          and permissive = 'PERMISSIVE' and cmd in (c, 'ALL') and qual is not null;
      end if;

      if c in ('INSERT', 'UPDATE') then
        select '(' || string_agg(distinct coalesce(with_check, qual), ') OR (') || ')'
        into check_expr
        from pg_policies
        where schemaname = 'public' and tablename = g.tablename and roles = g.roles
          and permissive = 'PERMISSIVE' and cmd in (c, 'ALL') and coalesce(with_check, qual) is not null;
      end if;

      if using_expr is null and check_expr is null then
        continue;  -- tidak ada policy untuk perintah ini → tetap tertutup
      end if;

      stmt := format('create policy %I on public.%I as permissive for %s to %s',
                     'rls_' || lower(c) || '_' || g.roles_tag, g.tablename, c, g.roles_sql);
      if using_expr is not null then stmt := stmt || format(' using (%s)', using_expr); end if;
      if check_expr is not null then stmt := stmt || format(' with check (%s)', check_expr); end if;
      creates := creates || stmt;
    end loop;

    -- Hapus policy lama kelompok ini, lalu buat gabungannya.
    for stmt in
      select format('drop policy %I on public.%I', policyname, tablename)
      from pg_policies
      where schemaname = 'public' and tablename = g.tablename and roles = g.roles and permissive = 'PERMISSIVE'
    loop
      execute stmt;
    end loop;
    foreach stmt in array creates loop
      execute stmt;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;

revoke all on function platform.rls_consolidate() from public, anon, authenticated, service_role;

select platform.rls_consolidate();
