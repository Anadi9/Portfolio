# Production Kit: Stripe, Supabase and going live

The kit sells as five packs plus the full kit (`src/data/kit`, copied from the
kit repo's release manifest). Prices live in Stripe, one Price per pack, found
by lookup key. Orders, access links and the zips live in Supabase. Delivery is
an email from the Stripe webhook with a link to `/kit/downloads/<token>`.

| Piece | Where |
| --- | --- |
| Product page + picker | `src/pages/ProductionKit.tsx`, `src/components/kit/PackPicker.tsx` |
| After payment | `src/pages/KitThanks.tsx` (`/kit/thanks`) |
| Buyer's downloads | `src/pages/KitDownloads.tsx` (`/kit/downloads/<token>`) |
| `/api/kit/{prices,checkout,order,library,download,upgrade,ping}` | `api/kit/[action].ts` → `src/lib/kit/handlers.ts` |
| Webhook | `api/stripe-webhook.ts` → `src/lib/kit/fulfil.ts` |
| Tables | `supabase/migrations/20260925000000_kit_packs.sql` |
| Earlier buyers' links | `api/production-kit-download.ts`, unchanged: still zips `products/production-kit/` |

The rule: **live keys only in the Production environment; test keys everywhere
else.** A `cs_test_…` session can only be read with a test key. Use a separate
Supabase project for test and live if you can; if you use one, test orders sit
next to real ones (they're marked by `cs_test_` session ids).

## Environment variables

All server-only. None of them may start with `VITE_`.

| Variable | Production | Preview + Development |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | live key (`sk_live_…`, or a restricted `rk_live_…`, see below) | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the live endpoint | Development: the one `stripe listen` prints |
| `RESEND_API_KEY` | yes | yes |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | same, or the test project's |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | same, or the test project's |
| `KIT_TOKEN_SECRET` | 32 random bytes | a different 32 random bytes |
| `CRON_SECRET` (optional) | any random string; Vercel sends it to the daily ping | not needed |

```sh
openssl rand -base64 32                        # a KIT_TOKEN_SECRET; run once per environment
vercel env add SUPABASE_URL production         # repeat for preview and development
vercel env add SUPABASE_SECRET_KEY production
vercel env add KIT_TOKEN_SECRET production
```

Local values live in `.env.local`, edited by hand. Don't run `vercel env pull
.env.local`: it replaces the file with Vercel's Development variables, which
are empty for this project.

Never change `KIT_TOKEN_SECRET` in production once buyers have links: every
emailed link is derived from it, and changing it breaks them all.

**Restricted live key (recommended).** Dashboard → Developers → API keys →
Create restricted key: **Checkout Sessions: Write** and **Prices: Read**. That
covers creating sessions (packs and upgrades), reading them and their line
items, and looking up prices. The backfill script needs more (Checkout
Sessions, Payment Intents and Charges: Read), so run it with your full secret
key from your own shell, not from Vercel.

## Stripe: one Product per pack (test mode first)

Dashboard, **Test mode** on → Product catalog → **+ Add product**, six times:

| Name | USD | INR | Lookup key |
| --- | --- | --- | --- |
| The Production Kit | 19.00 | 1,599 | `kit_full` |
| Lock Down Your Data | 9.00 | 749 | `kit_data_security` |
| Fix Sign-up and Login | 7.00 | 599 | `kit_auth` |
| Launch Ready | 7.00 | 599 | `kit_launch` |
| Stop the AI Breaking Things | 7.00 | 599 | `kit_ai_discipline` |
| Lovable & Bolt Pack | 5.00 | 399 | `kit_lovable_bolt` |

For each:
1. Name as above. Description: the pack's tagline (optional; Checkout shows it).
2. Pricing: **One-off**. Currency **USD**, amount from the table.
3. **Add another currency** (under the amount) → **INR** → the rupee amount.
4. **More options** → **Lookup key** → paste the key exactly.
5. **Add product**.

Check: `stripe prices list --lookup-keys kit_full --lookup-keys kit_lovable_bolt`
returns both, each with `currency_options.inr`.

Then `npm run dev` should print `[kit-prices] wrote 6 USD and 6 INR prices from Stripe`,
and the "Dev: suggested prices" note on the page goes away.

Repeat in **live mode** before the production deploy: a production build
**fails** if it can't read these Prices, so it can never ship guessed prices.

Changing a price later: on the Product, **Add another price**, tick **Transfer
lookup key**, and archive the old one. Checkout uses it immediately; the page
shows it within an hour (the prices response is cached at the edge for an
hour), or at the next deploy.

## Stripe: webhook events

Live mode → Developers → Webhooks → **Add endpoint** (or **Add destination**)
for `https://anadithakur.in/api/stripe-webhook` (the apex domain: `www`
redirects, and Stripe doesn't follow redirects). Copy its signing secret into
`STRIPE_WEBHOOK_SECRET` for Production. Events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`

Refunds: issue them in the dashboard (Payments → the payment → Refund, full
amount). The webhook marks the order refunded and its packs disappear from the
buyer's downloads page. A partial refund leaves access alone and emails you. If
you refund someone's packs after they upgraded, refund the upgrade too: the
webhook doesn't do that for you.

## Supabase

1. [supabase.com](https://supabase.com) → **New project**. Region: closest to
   most buyers (Mumbai if most are in India). Save the database password.
2. **Project Settings → API Keys**: copy the project URL into `SUPABASE_URL` and
   create/copy a **secret key** (`sb_secret_…`) into `SUPABASE_SECRET_KEY`.
   The publishable key isn't used anywhere.
3. **SQL Editor** → paste `supabase/migrations/20260925000000_kit_packs.sql` → Run.
   (Or with the CLI: `supabase link --project-ref <ref>` then `supabase db push`.)
4. Check: **Database → Tables** shows the four tables, each with "RLS enabled"
   and no policies. **Advisors → Security Advisor** should show nothing for them.
5. **Storage → New bucket**: name `products`, **Public bucket off**. Optional:
   allowed MIME type `application/zip`, file size limit 5 MB.
6. Upload the release (checks every sha256 against the manifest first, never
   overwrites):

   ```sh
   node scripts/kit-upload.mjs ~/Downloads/production-kit/release/dist/1.2.0
   ```

   Storage → `products` → `kit/1.2.0/` should list six zips.

The free plan pauses a project after 7 days without requests. `vercel.json`
runs `/api/kit/ping` daily, which queries the database to keep it awake. If
the project is paused anyway, the webhook fails and Stripe retries for three
days; restoring the project in the dashboard lets those retries through.

## Local development and testing

```sh
# .env.local: test Stripe key, Supabase URL + secret key, KIT_TOKEN_SECRET
npm run dev                       # site + /api on http://localhost:8080
npm run stripe:listen             # second terminal; prints whsec_…
```

Put the `whsec_…` from `stripe listen` in `.env.local` as `STRIPE_WEBHOOK_SECRET`
and restart `npm run dev`. `KIT_DEV_COUNTRY=IN` in `.env.local` makes you a
visitor from India (rupee prices and checkout); remove it for dollars.

Pay with `4000 0035 6000 0008` (Indian test card, for rupees) or `4242 4242 4242 4242` (dollars), any future date, any CVC. Then:

- The thanks page shows "Preparing your download…" at most briefly, then a download button per pack.
- `stripe listen` shows `checkout.session.completed` → `200`.
- The email arrives with the `/kit/downloads/<token>` link.
- Downloaded zip: `shasum -a 256 production-kit-auth-v1.2.0.zip` matches the manifest.

Refund test: `stripe refunds create --payment-intent pi_…` (the id is on the
order row), then reload the downloads page.

Duplicate test: `stripe events resend evt_…` → `stripe listen` shows `200` and
`kit_orders` still has one row for that session.

## Going live, in order

1. Live Stripe Products and Prices with the same lookup keys (above).
2. Supabase set up (above), zips uploaded.
3. Production env vars: `STRIPE_SECRET_KEY` (live), `SUPABASE_URL`,
   `SUPABASE_SECRET_KEY`, `KIT_TOKEN_SECRET`, optionally `CRON_SECRET`.
4. Add `charge.refunded` to the live webhook.
5. Deploy. The build log should say `[kit-prices] wrote 6 USD and 6 INR prices from Stripe`.
6. One real purchase with a 100% promotion code, or a real card then a refund.
   Check the email, the download, and Dashboard → Webhooks showing success.
7. Earlier buyers (full secret key in your shell):

   ```sh
   node scripts/kit-backfill.mjs                 # dry run: read the list
   node scripts/kit-backfill.mjs --apply         # record them
   node scripts/kit-backfill.mjs --apply --send  # email each their new link, once
   ```

   Their old links keep working whatever you do here.

## Housekeeping

**New kit release.** `node scripts/kit-add-release.mjs ~/Downloads/production-kit/release/dist/<version>`,
add the import at the top of `RELEASES` in `src/data/kit/index.ts`, upload with
`kit-upload.mjs`, deploy. Buyers see it on their downloads page with older
versions still listed.

**A buyer's link leaked.** In the SQL editor, give them a new one (the old one stops working):

```sql
delete from kit_access where email = 'buyer@example.com';
```

A fresh link is created the next time one is needed: a new purchase, or
opening `/kit/thanks?session_id=<one of their paid cs_… ids>` (the session ids
are on their `kit_orders` rows). Open that URL yourself and send them the
downloads link it shows. There's no admin screen for this yet.
