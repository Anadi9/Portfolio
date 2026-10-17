-- Client portal: one row per emailed sign-in link, so each link works once.
-- Run once, after 20261021000000_command_v2.sql. Not idempotent.
-- RLS on with no policies: only the secret key reads or writes.

create table public.portal_links (
  nonce       text primary key check (length(nonce) between 16 and 100),
  email       text not null check (email = lower(email) and length(email) between 3 and 254),
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);
create index portal_links_created_idx on public.portal_links (created_at);

alter table public.portal_links enable row level security;
revoke all on public.portal_links from anon, authenticated;
