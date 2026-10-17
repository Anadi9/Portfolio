-- Command centre v2: "Give to helper" on cards, phone push subscriptions and
-- Anadi's passkeys. Run once, after 20261020000000_coach.sql. Not idempotent.
-- RLS on with no policies: only the secret key reads or writes.

alter table public.feed_items
  add column assignee text check (assignee in ('helper'));

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique check (length(endpoint) between 10 and 1000),
  p256dh      text not null check (length(p256dh) <= 200),
  auth        text not null check (length(auth) <= 100),
  created_at  timestamptz not null default now()
);

create table public.admin_passkeys (
  id          text primary key check (length(id) between 10 and 400),
  public_key  text not null,
  counter     bigint not null default 0,
  transports  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.admin_passkeys enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.admin_passkeys from anon, authenticated;
