---
name: supabase-rls-audit
description: Audit and fix Supabase Row Level Security. Use when the user asks whether their Supabase data is secure, mentions RLS, policies, "anyone can see my data", leaked or exposed tables, a Supabase security advisor warning, "new row violates row-level security policy", or before launching an app that uses Supabase.
---

# Supabase RLS audit

Goal: every table the API can reach has RLS enabled, and each policy allows exactly what the app needs and nothing more. Verify by testing, not by reading alone.

The anon/publishable key is shipped to every browser. Without RLS, anyone can copy it from the site and read or write any table with plain HTTP requests. Treat that as the threat model.

## Step 1: Get the current state

If the Supabase CLI is linked or you have a database connection, run the queries yourself. Otherwise ask the user to run these in Dashboard > SQL Editor and paste the results. (The kit's `sql/rls-status.sql` contains all of them.)

Tables, RLS status, policy counts:

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
        where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relrowsecurity, c.relname;
```

All policies:

```sql
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

Also collect: views in `public` (they bypass RLS unless `security_invoker = true`), `security definer` functions in `public` (callable via `rpc()` and bypass RLS), `storage.objects` policies, and `storage.buckets` public flags.

If the project has `supabase/migrations/`, read those too and note any drift between migrations and the live database.

## Step 2: Map how the app uses each table

Search the code for `.from('<table>')` and `.rpc(` and `storage.from(`. For each table, write down:
- who reads it (anon visitor, any logged-in user, owner only, team members, admins)
- who inserts, updates, deletes it
- which column identifies the owner (`user_id`, `id` for profiles, `team_id`, etc.)
- whether any of these calls happen on the server with the secret/service_role key (those bypass RLS and aren't affected by policies)

This is the spec the policies must match. If the intended access for a table is unclear, ask the user rather than guessing.

## Step 3: Review each table against these checks

Report findings as a table: table, problem, severity, fix.

Critical:
- RLS disabled on any table in `public`.
- `using (true)` or `with check (true)` on insert/update/delete.
- Policy granted to `public` or `anon` that allows writes the app doesn't need.
- Authorization based on `auth.jwt() -> 'user_metadata'` (user-editable).
- `service_role`/secret key in client code or in a `VITE_`/`NEXT_PUBLIC_` variable (check the code and `.env*` files).
- A view in `public` without `security_invoker = true` exposing a protected table.
- A `security definer` function in `public` that returns or modifies data without checking `auth.uid()`.

High:
- `update` policy without `with check` (user can change `user_id` and hand the row to someone else, or move it into another team).
- `insert` policy that doesn't check the owner column equals `auth.uid()`.
- Publicly readable table containing private columns (emails, phone, addresses, billing). RLS filters rows, not columns; move those columns to an owner-only table or expose a restricted view with `security_invoker`.
- Public storage bucket holding user uploads.
- Storage policies that check only `bucket_id` and not the owner folder.

Medium (performance / correctness):
- `auth.uid()` not wrapped as `(select auth.uid())`.
- Policies with no `to authenticated` / `to anon` role target.
- Missing index on the columns policies filter by (`user_id`, `team_id`).
- A policy on a membership table that queries the same table (infinite recursion). Use a `security definer` helper in a non-exposed schema.
- RLS enabled with zero policies on a table the app does read (the feature is silently broken: queries return empty arrays, not errors).

## Step 4: Write the fix as a migration

- Create a migration (`supabase migration new fix_rls`) or, without the CLI, a single SQL script the user can paste into the SQL Editor. Save it in the repo either way.
- Order: `alter table ... enable row level security;` first, then `drop policy if exists ...` for policies being replaced, then `create policy ...`.
- Standard shapes (see `sql/example-policies.sql`):

```sql
create policy "owner select" on public.items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "owner insert" on public.items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "owner update" on public.items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "owner delete" on public.items for delete to authenticated
  using ((select auth.uid()) = user_id);
create index if not exists items_user_id_idx on public.items (user_id);
```

- Enabling RLS on a table the app uses without adding the right policies will break that feature. Always ship both together.
- Don't change table structure or app code in the same step unless required; list any code changes needed (e.g. a client that was inserting `user_id` from the UI) separately.

## Step 5: Test as anon and as two different users

Testing is mandatory. A policy that looks right can still be wrong.

In the SQL Editor (wrap in a transaction, roll back):

```sql
begin;
  set local role anon;
  select count(*) from public.items;   -- expect 0 unless intentionally public
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claims',
    '{"sub":"<USER_A_UUID>","role":"authenticated"}', true);
  select count(*) from public.items;                       -- only A's rows
  update public.items set title = 'x' where user_id <> '<USER_A_UUID>';  -- expect UPDATE 0
  insert into public.items (title, user_id) values ('spoof', '<USER_B_UUID>');  -- expect RLS error
rollback;
```

Then from outside, with only the public key (what an attacker has):

```bash
curl "https://<project-ref>.supabase.co/rest/v1/items?select=*" \
  -H "apikey: <ANON_OR_PUBLISHABLE_KEY>"
```

Expect `[]` for protected tables. Then log in as user A in the app and user B in a private window, and confirm B can't see or change A's data through the UI.

Finally, check Dashboard > Advisors > Security Advisor and resolve anything it flags.

## Step 6: Report

List: what was wrong, the migration file created, test results (actual output, not assumptions), and anything the user must do (run the migration, rotate a leaked key, make a bucket private). If a secret key was ever exposed client-side, tell the user to rotate it in Dashboard > Settings > API Keys; removing it from code is not enough.
