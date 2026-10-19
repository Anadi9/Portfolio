-- First-party funnel events from POST /api/event (src/server/event.ts), which
-- replace Vercel Analytics' custom events. No IP, cookie or visitor id: the
-- event name, up to 8 small props, the page path and the rough country.
-- Run once, after 20261023000000_invoices.sql. Not idempotent. RLS on with no
-- policies (the server's secret key only).

create table public.events (
  id          bigint generated always as identity primary key,
  name        text not null check (name ~ '^[a-z][a-z0-9_:-]{1,48}$'),
  props       jsonb not null default '{}'::jsonb,
  path        text check (length(path) <= 200),
  country     text check (length(country) <= 2),
  created_at  timestamptz not null default now()
);
create index events_name_created_idx on public.events (name, created_at desc);

alter table public.events enable row level security;
