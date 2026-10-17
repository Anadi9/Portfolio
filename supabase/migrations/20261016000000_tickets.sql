-- Tickets: the intake pipeline behind Bit, the audit/app forms and the public board.
--
-- Only the API routes write here, with the secret key. RLS is on with no
-- policies, so the publishable/anon key can read and write nothing. The only
-- thing the public ever sees is `public_board`, and only through an API route
-- that reads it with the secret key. A ticket number is a label, never access.

create sequence public.ticket_number_seq start 1001;

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email) and length(email) between 3 and 254),
  name        text check (length(name) <= 120),
  company     text check (length(company) <= 120),
  whatsapp    text check (length(whatsapp) <= 40),
  created_at  timestamptz not null default now()
);

create table public.tickets (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique default 'A-' || nextval('public.ticket_number_seq'),
  client_id         uuid not null references public.clients (id) on delete cascade,
  kind              text not null check (kind in ('first_bug', 'audit', 'build', 'care', 'question', 'teardown')),
  stage             text not null default 'inbox' check (stage in ('inbox', 'bug_review', 'audit', 'fixing', 'live', 'closed')),
  app_url           text check (length(app_url) <= 500),
  stack             text check (length(stack) <= 120),
  answers           jsonb not null default '{}'::jsonb,
  budget            text check (length(budget) <= 120),
  board_opt_in      boolean not null default false,
  whatsapp_opt_in   boolean not null default false,
  source            text not null check (source in ('bit', 'audit_form', 'app_form')),
  category          text check (length(category) <= 120),   -- anonymised label, e.g. "Booking app"
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index tickets_stage_idx on public.tickets (stage);
create index tickets_client_id_idx on public.tickets (client_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- Timeline of what happened to a ticket.
create table public.ticket_events (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.tickets (id) on delete cascade,
  type       text not null check (length(type) between 1 and 60),
  data       jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create index ticket_events_ticket_id_idx on public.ticket_events (ticket_id, at);

-- Messages to and from the client. `draft` waits for Anadi's approval.
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  direction   text not null check (direction in ('in', 'out')),
  kind        text not null check (length(kind) between 1 and 60),
  status      text not null default 'draft' check (status in ('draft', 'sent', 'failed')),
  body        text not null,
  channel     text not null check (channel in ('email', 'whatsapp')),
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index messages_ticket_id_idx on public.messages (ticket_id);
create index messages_status_idx on public.messages (status);

-- Anadi's brief for a ticket.
create table public.briefs (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  body        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index briefs_ticket_id_idx on public.briefs (ticket_id);

-- Outbox: what to send, worked off by the API with retries.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  channel     text not null check (channel in ('email', 'whatsapp')),
  template    text not null check (length(template) between 1 and 60),
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index notifications_status_idx on public.notifications (status, created_at);
create index notifications_ticket_id_idx on public.notifications (ticket_id);

-- Daily self-audit runs.
create table public.scorecard_runs (
  id       uuid primary key default gen_random_uuid(),
  run_at   timestamptz not null default now(),
  results  jsonb not null default '{}'::jsonb
);
create index scorecard_runs_run_at_idx on public.scorecard_runs (run_at desc);

alter table public.clients enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_events enable row level security;
alter table public.messages enable row level security;
alter table public.briefs enable row level security;
alter table public.notifications enable row level security;
alter table public.scorecard_runs enable row level security;

revoke all on public.clients from anon, authenticated;
revoke all on public.tickets from anon, authenticated;
revoke all on public.ticket_events from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.briefs from anon, authenticated;
revoke all on public.notifications from anon, authenticated;
revoke all on public.scorecard_runs from anon, authenticated;
revoke all on sequence public.ticket_number_seq from anon, authenticated;

-- The anonymised board: no name, email, URL or company, only opted-in tickets.
-- A plain view runs as its owner (postgres), so it can read `tickets` despite
-- RLS; nobody but the secret key can select from it.
create view public.public_board as
  select number, kind, category, stack, stage, updated_at
  from public.tickets
  where board_opt_in and stage <> 'closed';

revoke all on public.public_board from anon, authenticated;
