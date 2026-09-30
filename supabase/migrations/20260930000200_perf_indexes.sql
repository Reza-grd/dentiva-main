-- =============================================================================
-- Performa: indeks foreign key, indeks ganda, auth.*() per baris di policy
-- -----------------------------------------------------------------------------
-- Dari Supabase Performance Advisor (30 Sep 2026):
--   * 63 foreign key tanpa indeks penutup → join & ON DELETE memindai seluruh tabel.
--   * 2 indeks identik (payments.visit_id, visits.patient_id).
--   * 15 policy memanggil auth.uid()/auth.jwt()/auth.role() per baris.
-- Tidak mengubah hak akses apa pun.
-- =============================================================================

-- 1. Indeks untuk setiap FK (public & platform) yang belum punya indeks dengan
--    kolom FK sebagai kolom terdepan.
do $$
declare
  fk record;
  v_name text;
begin
  for fk in
    select c.conrelid::regclass as tbl, n.nspname as sch, t.relname as tname,
           array_agg(a.attname order by x.ord) as cols, c.conkey
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as x(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = x.attnum
    where c.contype = 'f' and n.nspname in ('public', 'platform')
    group by c.oid, c.conrelid, n.nspname, t.relname, c.conkey
  loop
    if exists (
      select 1 from pg_index i
      where i.indrelid = fk.tbl
        and (i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1] = fk.conkey
    ) then
      continue;
    end if;
    v_name := left(format('idx_%s_%s', fk.tname, array_to_string(fk.cols, '_')), 63);
    execute format('create index if not exists %I on %s (%s)',
                   v_name, fk.tbl, (select string_agg(format('%I', c), ', ') from unnest(fk.cols) c));
  end loop;
end $$;

-- 2. Indeks ganda (pertahankan yang bernama *_id)
drop index if exists public.idx_payments_visit;
drop index if exists public.idx_visits_patient;

-- 3. auth.uid()/auth.jwt()/auth.role() → (select …) agar dihitung sekali per query
do $$
declare
  p record;
  q text;
  c text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.(uid|jwt|role)\(\)' or coalesce(with_check, '') ~ 'auth\.(uid|jwt|role)\(\)')
  loop
    q := p.qual;
    c := p.with_check;
    -- lindungi yang sudah dibungkus, bungkus sisanya, lalu kembalikan
    q := regexp_replace(q, '\( SELECT auth\.(uid|jwt|role)\(\) AS (uid|jwt|role)\)', '@@\1@@', 'g');
    c := regexp_replace(c, '\( SELECT auth\.(uid|jwt|role)\(\) AS (uid|jwt|role)\)', '@@\1@@', 'g');
    q := regexp_replace(q, 'auth\.(uid|jwt|role)\(\)', '( SELECT auth.\1() AS \1)', 'g');
    c := regexp_replace(c, 'auth\.(uid|jwt|role)\(\)', '( SELECT auth.\1() AS \1)', 'g');
    q := regexp_replace(q, '@@(uid|jwt|role)@@', '( SELECT auth.\1() AS \1)', 'g');
    c := regexp_replace(c, '@@(uid|jwt|role)@@', '( SELECT auth.\1() AS \1)', 'g');

    if q is not distinct from p.qual and c is not distinct from p.with_check then
      continue;
    end if;
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
  end loop;
end $$;
