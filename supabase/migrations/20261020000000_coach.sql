-- Coach: one commitment per promise per ticket, and the tasks each stage opens.
-- Run once, after 20261019000000_feed_items.sql. Not idempotent.
-- RLS on with no policies: only the secret key reads or writes.

create table public.commitments (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid references public.tickets (id) on delete cascade,
  promise_id      text not null check (length(promise_id) between 1 and 60),
  opened_at       timestamptz not null default now(),
  due_at          timestamptz not null,
  status          text not null default 'open' check (status in ('open', 'at_risk', 'kept', 'missed')),
  closed_at       timestamptz,
  miss_reason     text check (length(miss_reason) <= 1000),
  alerted_status  text check (length(alerted_status) <= 20)
);
create index commitments_live_idx on public.commitments (status, due_at);
create index commitments_ticket_idx on public.commitments (ticket_id);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references public.tickets (id) on delete cascade,
  stage       text not null check (stage in ('inbox', 'bug_review', 'audit', 'fixing', 'live', 'closed')),
  key         text not null check (length(key) between 1 and 60),
  owner       text not null check (owner in ('coach', 'anadi', 'helper')),
  title       text not null check (length(title) between 1 and 200),
  done_when   text not null default '' check (length(done_when) <= 300),
  status      text not null default 'open' check (status in ('open', 'done')),
  created_at  timestamptz not null default now(),
  done_at     timestamptz,
  unique (ticket_id, stage, key)
);
create index tasks_ticket_idx on public.tasks (ticket_id);

alter table public.commitments enable row level security;
alter table public.tasks enable row level security;
revoke all on public.commitments from anon, authenticated;
revoke all on public.tasks from anon, authenticated;
