-- The command centre's feed (/admin): one row per card. Bit posts client news,
-- Coach posts deadlines and plan items. Run once, after 20261016000000_tickets.sql.
-- Not idempotent. RLS on with no policies: only the secret key reads or writes.

create table public.feed_items (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid references public.tickets (id) on delete cascade,
  bot            text not null check (bot in ('bit', 'coach')),
  kind           text not null check (length(kind) between 1 and 60),
  title          text not null check (length(title) between 1 and 140),
  body           text not null default '' check (length(body) <= 2000),
  action         text not null check (action in ('open', 'approve_send', 'mark_done')),
  ref            uuid,
  urgent         boolean not null default false,
  created_at     timestamptz not null default now(),
  done_at        timestamptz,
  snoozed_until  timestamptz
);
create index feed_items_open_idx on public.feed_items (done_at, created_at desc);
create index feed_items_ref_idx on public.feed_items (ref) where ref is not null;

alter table public.feed_items enable row level security;
revoke all on public.feed_items from anon, authenticated;
