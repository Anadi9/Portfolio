-- ============================================================================
-- RLS status report for a Supabase project
-- Run in: Supabase Dashboard > SQL Editor (runs as the postgres role).
-- Read-only: every query below is a SELECT. Nothing is changed.
-- Run each query separately (the SQL Editor shows only the last result
-- when you run several at once).
-- ============================================================================


-- 1. Every table in exposed schemas: RLS on/off and how many policies it has.
--    Anything with rls_enabled = false is readable/writable by anyone holding
--    your anon/publishable key (which is public), subject to table grants.
--    rls_enabled = true with policy_count = 0 means nobody but the service role
--    can access it (safe, but probably not what the app expects).
select
  n.nspname                                   as schema,
  c.relname                                   as table_name,
  case c.relkind when 'p' then 'partitioned' else 'table' end as kind,
  c.relrowsecurity                            as rls_enabled,
  c.relforcerowsecurity                       as rls_forced,
  (
    select count(*)
    from pg_policies p
    where p.schemaname = n.nspname
      and p.tablename  = c.relname
  )                                           as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p')          -- ordinary + partitioned tables
  and n.nspname = 'public'             -- add other exposed schemas here if you use them
order by c.relrowsecurity asc, c.relname;


-- 2. Every policy, in readable form.
--    Look for: roles = {public} (applies to anon too), qual = 'true' on
--    insert/update/delete, update policies with no with_check, and policies
--    calling auth.uid() without a (select ...) wrapper.
select
  tablename,
  policyname,
  permissive,          -- PERMISSIVE policies are OR-ed together; RESTRICTIVE are AND-ed
  roles,
  cmd,                 -- SELECT / INSERT / UPDATE / DELETE / ALL
  qual       as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- 3. Views in public. Views run with the owner's privileges and bypass RLS
--    unless created with security_invoker = true (Postgres 15+).
select
  c.relname as view_name,
  coalesce(
    (select option_value
     from pg_options_to_table(c.reloptions)
     where option_name = 'security_invoker'),
    'false'
  ) as security_invoker
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')    -- views and materialized views (matviews have no RLS at all)
order by c.relname;


-- 4. SECURITY DEFINER functions in public. These bypass RLS and are callable
--    through the API (supabase.rpc) by default. Each one should either be
--    moved to a non-exposed schema, or check permissions itself and set
--    search_path.
select
  p.proname                                  as function_name,
  pg_get_function_identity_arguments(p.oid)  as arguments,
  p.proconfig                                as settings   -- want: {search_path=""} or similar
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;


-- 5. Storage policies (file access rules).
select
  policyname,
  roles,
  cmd,
  qual       as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'storage'
  and tablename  = 'objects'
order by policyname;


-- 6. Buckets and whether they are public. Public buckets serve every file to
--    anyone who has (or guesses) the URL, regardless of policies on reads.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by name;


-- 7. Foreign key columns without an index (slow joins and slow RLS checks).
--    Simplified check: only looks at the first column of each FK.
select
  c.conrelid::regclass as table_name,
  a.attname            as fk_column,
  c.confrelid::regclass as references_table
from pg_constraint c
join pg_attribute a
  on a.attrelid = c.conrelid
 and a.attnum   = c.conkey[1]
where c.contype = 'f'
  and c.connamespace = 'public'::regnamespace
  and not exists (
    select 1
    from pg_index i
    where i.indrelid = c.conrelid
      and i.indkey[0] = c.conkey[1]
  )
order by 1, 2;
