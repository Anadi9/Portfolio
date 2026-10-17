-- Invoice plans per ticket, with the site's credits applied. Anadi creates the
-- matching invoice in Stripe and records its id here. Run once, after
-- 20261022000000_portal.sql. Not idempotent. RLS on with no policies.

create table public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  ticket_id          uuid not null references public.tickets (id) on delete cascade,
  key                text not null check (key in ('audit', 'start', 'live')),
  label              text not null check (length(label) between 1 and 200),
  lines              jsonb not null default '[]'::jsonb,
  total_cents        integer not null check (total_cents >= 0),
  currency           text not null default 'usd' check (currency in ('usd', 'inr')),
  after_confirm      boolean not null default false,
  status             text not null default 'planned' check (status in ('planned', 'sent', 'paid', 'void')),
  stripe_invoice_id  text check (length(stripe_invoice_id) <= 100),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index invoices_ticket_idx on public.invoices (ticket_id);

alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
