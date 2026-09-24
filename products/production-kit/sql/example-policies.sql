-- ============================================================================
-- Example RLS policies for Supabase
-- Four patterns you can copy and adapt:
--   A. Owner-only CRUD           (private notes, drafts, settings)
--   B. Public read, own write    (profiles, public posts, comments)
--   C. Team membership           (workspaces/organisations via a join table)
--   D. Storage: per-user folders (avatars, uploads)
--
-- Table and column names are examples. Rename to match your schema.
-- Best run as a migration: `supabase migration new rls_policies`, paste the
-- relevant parts, then `supabase db push`. Or paste into the SQL Editor.
--
-- Conventions used throughout:
--   * (select auth.uid()) instead of auth.uid(): evaluated once per query
--     rather than once per row. Same result, much faster on large tables.
--   * "to authenticated" / "to anon" on every policy, so policies only run
--     for the roles they're meant for.
--   * Indexes on every column used in a policy.
--
-- Postgres has no "create policy if not exists". To re-run a section, first
-- drop the policy:  drop policy if exists "notes: owner can select" on public.notes;
-- ============================================================================


-- ----------------------------------------------------------------------------
-- A. Owner-only CRUD
-- Only the user who created a row can see or change it.
-- ----------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  body       text,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes (user_id);

alter table public.notes enable row level security;

create policy "notes: owner can select"
  on public.notes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "notes: owner can insert"
  on public.notes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notes: owner can update"
  on public.notes for update
  to authenticated
  using ((select auth.uid()) = user_id)          -- which rows they can target
  with check ((select auth.uid()) = user_id);    -- stops them handing a row to someone else

create policy "notes: owner can delete"
  on public.notes for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ----------------------------------------------------------------------------
-- B. Public read, own write
-- Anyone (logged in or not) can read; only the owner can change their row.
-- Here the profile id IS the auth user id (one row per user).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: anyone can read"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: user can insert own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: user can update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: rows go away via "on delete cascade" when the auth user
-- is deleted. With no delete policy, clients cannot delete profiles.

-- Only put columns in a publicly readable table that are fine to be public.
-- RLS filters rows, not columns: keep emails, phone numbers, billing info
-- etc. in a separate owner-only table.

-- Create the profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

-- This function only makes sense as a trigger; stop it being called via the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- C. Team membership via a join table
-- Users belong to teams through team_members. Members can read team
-- projects; owners/admins can manage them.
--
-- The membership check lives in a SECURITY DEFINER helper in a private
-- (non-API-exposed) schema. Two reasons:
--   1. A policy on team_members that queries team_members directly would
--      recurse infinitely ("infinite recursion detected in policy").
--   2. It's faster: one indexed lookup instead of re-running RLS.
-- These calls take a column from the current row (team_id), so they are not
-- wrapped in (select ...): that caching trick only helps when the expression
-- is the same for every row, like auth.uid().
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- The primary key covers (team_id, user_id). Add the reverse for
-- "which teams am I in?" lookups.
create index if not exists team_members_user_id_idx on public.team_members (user_id);

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists projects_team_id_idx on public.projects (team_id);
create index if not exists teams_created_by_idx on public.teams (created_by);

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.projects     enable row level security;

-- Private schema for helper functions. Not listed in Dashboard > Settings >
-- API > Exposed schemas, so these can't be called via supabase.rpc().
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_team_role(p_team_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = (select auth.uid())
      and tm.role = any (p_roles)
  );
$$;

revoke execute on function private.is_team_member(uuid)        from public, anon;
revoke execute on function private.has_team_role(uuid, text[]) from public, anon;
grant  execute on function private.is_team_member(uuid)        to authenticated;
grant  execute on function private.has_team_role(uuid, text[]) to authenticated;

-- teams
-- The created_by check lets the creator read the row immediately after
-- inserting it: supabase.from('teams').insert(...).select() checks this
-- policy before the AFTER INSERT trigger below has added the membership row.
create policy "teams: members can read"
  on public.teams for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or private.is_team_member(id)
  );

create policy "teams: any user can create"
  on public.teams for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "teams: owners can update"
  on public.teams for update
  to authenticated
  using (private.has_team_role(id, array['owner']))
  with check (private.has_team_role(id, array['owner']));

create policy "teams: owners can delete"
  on public.teams for delete
  to authenticated
  using (private.has_team_role(id, array['owner']));

-- team_members
create policy "team_members: members can see their team's members"
  on public.team_members for select
  to authenticated
  using (private.is_team_member(team_id));

create policy "team_members: owners/admins can add members"
  on public.team_members for insert
  to authenticated
  with check (
    private.has_team_role(team_id, array['owner', 'admin'])
    and role <> 'owner'   -- admins can't mint new owners
  );

create policy "team_members: owners/admins can remove, anyone can leave"
  on public.team_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_team_role(team_id, array['owner', 'admin'])
  );

-- Note: the team creator is not a member yet when the team row is inserted,
-- so the first 'owner' membership row can't pass the insert policy above.
-- Add it with a trigger on teams (security definer), e.g.:
create or replace function private.add_team_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function private.add_team_creator_as_owner();

-- No update policy on team_members: role changes are deliberately not
-- possible from the client. Do them in a server route or an RPC that checks
-- the caller is an owner.

-- projects
create policy "projects: members can read"
  on public.projects for select
  to authenticated
  using (private.is_team_member(team_id));

create policy "projects: members can create"
  on public.projects for insert
  to authenticated
  with check (private.is_team_member(team_id));

create policy "projects: members can update"
  on public.projects for update
  to authenticated
  using (private.is_team_member(team_id))
  with check (private.is_team_member(team_id));   -- can't move a project into a team you're not in

create policy "projects: owners/admins can delete"
  on public.projects for delete
  to authenticated
  using (private.has_team_role(team_id, array['owner', 'admin']));


-- ----------------------------------------------------------------------------
-- D. Storage: private bucket, one folder per user
-- Files are uploaded to "<user id>/<filename>".
-- Client: supabase.storage.from('user-files').upload(`${user.id}/${file.name}`, file)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-files', 'user-files', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "user-files: read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "user-files: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Needed for upsert: true / replacing a file.
create policy "user-files: update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "user-files: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ----------------------------------------------------------------------------
-- Testing a policy from the SQL Editor
-- Wrap in a transaction and roll back so nothing sticks.
-- Replace the uuid with a real user id from Authentication > Users.
-- ----------------------------------------------------------------------------
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims',
--     '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
--   select * from public.notes;          -- should return only that user's notes
-- rollback;
--
-- begin;
--   set local role anon;
--   select * from public.notes;          -- should return 0 rows
-- rollback;
