-- The Production Kit, sold as packs: orders, what each order bought, one access
-- link per buyer, and the Stripe events already handled.
--
-- Only the site's server functions touch these tables, with the secret key.
-- RLS is on with no policies, so the publishable/anon key and signed-in users
-- can read and write nothing.

create table public.stripe_events (
  id          text primary key,                 -- evt_…; a repeat is a Stripe retry
  type        text not null,
  received_at timestamptz not null default now()
);

create table public.kit_orders (
  id                    uuid primary key default gen_random_uuid(),
  stripe_session_id     text unique,             -- null only for an upgrade the credit covered
  stripe_payment_intent text unique,             -- how charge.refunded finds the order
  email                 text not null check (email = lower(email) and position('@' in email) > 1),
  amount_total          integer not null check (amount_total >= 0),   -- minor units
  currency              text not null check (currency in ('usd', 'inr')),
  kind                  text not null check (kind in ('purchase', 'upgrade')),
  status                text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at            timestamptz not null default now(),
  refunded_at           timestamptz,
  check ((status = 'refunded') = (refunded_at is not null))
);
create index kit_orders_email_idx on public.kit_orders (email);

create table public.kit_order_items (
  order_id uuid not null references public.kit_orders (id) on delete cascade,
  pack_id  text not null check (pack_id in ('full', 'data-security', 'auth', 'launch', 'ai-discipline', 'lovable-bolt')),
  amount   integer not null check (amount >= 0),   -- paid for this line, after discounts
  unique (order_id, pack_id)                        -- also the index on order_id
);
create index kit_order_items_pack_idx on public.kit_order_items (pack_id);

create table public.kit_access (
  email      text primary key check (email = lower(email)),
  token_hash text not null unique,                 -- sha256 of the token; the token itself is never stored
  token_salt text not null,                        -- the token is HMAC(KIT_TOKEN_SECRET, salt)
  created_at timestamptz not null default now()
);

alter table public.stripe_events   enable row level security;
alter table public.kit_orders      enable row level security;
alter table public.kit_order_items enable row level security;
alter table public.kit_access      enable row level security;

-- Belt and braces: no grants to the public roles either.
revoke all on public.stripe_events, public.kit_orders, public.kit_order_items, public.kit_access from anon, authenticated;
