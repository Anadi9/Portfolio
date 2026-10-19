# Moving anadithakur.in to Cloudflare: your steps

> **Follow `docs/go-live-guide.md` instead.** It merges this guide with the
> launch checklist into one ordered path. This file stays as reference.

The code is ready on the `cloudflare-migration` branch. These are the steps only you
can do, in order. Plan about 1–2 hours, plus waiting for DNS (usually minutes,
up to 24 hours).

**Nothing changes for visitors until Part 6.** Until then Vercel keeps serving
the site. If anything goes wrong at any point, Part 9 puts it back on Vercel
in minutes.

What you need open: GoDaddy (your domain), Vercel, Supabase, and
`.env.local` (for the values you already use).

---

## Part 1 · Write down what you have today (10 min)

1. GoDaddy → **My Products** → `anadithakur.in` → **DNS** → **DNS Records**.
   Take a screenshot of every record. You'll compare against it in Part 2 and
   need it for a rollback.
2. In the same place, find **DNSSEC**. If it is **on**, turn it **off** now and
   wait 1 hour before Part 3. Switching nameservers with DNSSEC on takes the
   whole domain offline, email included.
3. Vercel → your project → **Settings → Environment Variables**. Keep this tab
   open: you'll copy the **Production** values in Part 4.

## Part 2 · Add the domain to Cloudflare (15 min)

1. Sign up at <https://dash.cloudflare.com/sign-up> (free).
2. **Add a domain** → `anadithakur.in` → choose **Free** → Continue.
3. Cloudflare imports your DNS records. Compare them with your Part 1
   screenshot and add anything missing. These matter most:
   - **Email:** every `MX` record, the SPF `TXT` (`v=spf1 …`), DKIM `TXT`
     records (names like `resend._domainkey`, `zmail._domainkey`), `_dmarc`, and
     Resend's records on the `send` subdomain.
   - **Verification:** `TXT` records for Google Search Console, Bing, Stripe or
     anything else (`google-site-verification=…` and similar).
4. Set the **Proxy status** of every record to **DNS only** (grey cloud) for
   now, including the ones pointing at Vercel (`76.76.21.21` or
   `cname.vercel-dns.com`). The site keeps running on Vercel exactly as today.
   Email and verification records must **always** stay grey.
5. Cloudflare shows two nameservers (like `xxx.ns.cloudflare.com`). Keep that
   page open.

## Part 3 · Point GoDaddy at Cloudflare (5 min, then wait)

1. GoDaddy → **My Products** → `anadithakur.in` → **DNS** → **Nameservers** →
   **Change Nameservers** → **I'll use my own nameservers**.
2. Enter the two Cloudflare nameservers → **Save** → confirm.
3. Wait for Cloudflare's "your domain is now active" email (usually under an
   hour). The site is still on Vercel. Check that email still arrives: send
   yourself a test message.
4. In Cloudflare for `anadithakur.in`:
   - **SSL/TLS → Overview**: **Full (strict)**.
   - **SSL/TLS → Edge Certificates**: **Always Use HTTPS** on, **Minimum TLS
     Version** 1.2. Leave Cloudflare's own HSTS off: the site already sends it.
   - **Speed → Optimization**: **Rocket Loader** off.
   - **Scrape Shield**: **Email Address Obfuscation** off. It rewrites email
     links in the HTML, which breaks React hydration.

## Part 4 · Create the Worker and its secrets (30 min)

On your Mac, in the project folder:

```bash
git switch cloudflare-migration
npm install
npx wrangler login            # opens the browser; allow access
npm run build
npm run cf:deploy             # creates the "anadi-site" Worker (no domain yet)
```

Now add the production secrets. Use the same **Production** values as on
Vercel, with the real Supabase project.

Workers & Pages → **anadi-site** → **Settings → Variables and Secrets** → **Add**.
Choose type **Secret** for each:

| Name | Value |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | production project |
| `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` | as on Vercel |
| `RESCUE_INBOX`, `TICKETS_INBOX` | as on Vercel (if set) |
| `CRON_SECRET` | as on Vercel |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | as on Vercel |
| `PORTAL_SESSION_SECRET` | as on Vercel |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | as on Vercel (if set) |
| `BIT_AI` | `on` (if it is on today) |
| `AI_GATEWAY_API_KEY` | **new.** Vercel → **AI Gateway → API Keys → Create key**. On Vercel the gateway signed in by itself; off Vercel it needs this key. It's the same free monthly credit |
| `WHATSAPP_*` | only if you use WhatsApp alerts |

Don't add anything starting with `STRIPE_`, `KIT_` or `VERCEL`: Stripe and the paid kit are gone from the code.

Then apply the new migrations. Supabase → **SQL Editor** → paste
`supabase/migrations/20261024000000_events.sql` → **Run**, then
`supabase/migrations/20261025000000_invoice_ref.sql` → **Run** (it renames the
invoice's Stripe id column to `invoice_ref`; skip it if the `invoices` table doesn't exist yet). If any earlier
migration from `docs/launch-checklist.md` is not applied yet (for example
`20261020000000_coach.sql`), run those first, in date order.

## Part 5 · Page-view analytics and automatic deploys (15 min)

1. Cloudflare → **Analytics & Logs → Web Analytics** → **Add a site** →
   `anadithakur.in` → choose the **JS snippet** option. Copy only the `token`
   value from the snippet.
2. Workers & Pages → **anadi-site** → **Settings → Build** → **Connect** your
   GitHub repo `Anadi9/Portfolio`:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --env=""`
   - **Builds for non-production branches: off.** They would run with the live
     secrets.
   - **Build variables:** `VITE_CF_BEACON_TOKEN` = the token from step 1. Add
     `INDEXNOW_KEY` too if you set it on Vercel.
   - Node version: the repo's `.node-version` pins 22.

## Part 6 · Test before switching (20 min)

The production Worker has no public address yet, on purpose: no duplicate copy
of the site for Google to find. Test with the **preview** Worker, which uses
**test** keys:

```bash
npm run cf:deploy:preview     # creates "anadi-site-preview" on *.workers.dev
```

Give it test secrets in the dashboard (**anadi-site-preview → Settings →
Variables and Secrets**): ideally a test Supabase project, and the same
Resend key. Then open the printed
`https://anadi-site-preview.<you>.workers.dev` and check:

- [ ] Home, a note, `/production-ready`, `/about`, `/portfolio` load
- [ ] Bit chat opens; a typed question gets an answer (if `BIT_AI=on`)
- [ ] The free first-bug form (`/audit?type=app`) submits; the email arrives
- [ ] `/products/production-kit` → **Download the kit, free** gives the zip; `/kit/thanks` redirects to the kit page
- [ ] `/api/health` shows `"ok":true` and `supabaseReachable: reachable`
- [ ] In Terminal, `curl -sI https://anadi-site-preview.<you>.workers.dev/ | grep -i robots` prints `noindex, nofollow` (preview only; production doesn't send it)

Passkey sign-in to `/admin` won't work on the preview address, because passkeys
are tied to `anadithakur.in`. Password sign-in works. Check passkeys after the switch.

When you're happy, merge the branch into `main`: open a pull request on GitHub
from `cloudflare-migration` and merge it. This branch also carries the
`repositioning` work, so merging launches that on `main` too. Both Vercel and
Cloudflare will build it; Vercel stays live until the next step.

## Part 7 · Switch the live site to Cloudflare (15 min)

1. Cloudflare → **DNS → Records**: delete the records for `anadithakur.in` (the
   `A` to Vercel), `portfolio` and `www` (the Vercel `CNAME`s). **Don't touch
   email or TXT records.**
2. Workers & Pages → **anadi-site** → **Settings → Domains & Routes** → **Add →
   Custom domain** → `anadithakur.in`. Repeat for `portfolio.anadithakur.in`.
   Cloudflare creates the DNS records and certificates (a few minutes).
3. **DNS → Add record**: Type `AAAA`, Name `www`, IPv6 address `100::`, Proxy
   **on** (orange). It only exists so the redirect below can catch `www`.
4. **Rules → Redirect Rules → Create rule** (Single Redirect), twice:

   **Rule 1: `www` to the main domain**
   - Custom filter expression → **Edit expression**:
     `(http.host eq "www.anadithakur.in")`
   - Then: **Dynamic**, URL `concat("https://anadithakur.in", http.request.uri.path)`,
     status **301**, **Preserve query string** on.

   **Rule 2: portfolio host pages to the main site** (what `vercel.json` did)
   - Expression:
     `(http.host eq "portfolio.anadithakur.in" and http.request.uri.path ne "/" and http.request.uri.path ne "/portfolio" and not starts_with(http.request.uri.path, "/assets/") and not starts_with(http.request.uri.path, "/api/") and not (http.request.uri.path contains "."))`
   - Then: **Dynamic**, URL `concat("https://anadithakur.in", http.request.uri.path)`,
     status **301**, **Preserve query string** on.
5. Check from your phone, on mobile data:
   - <https://anadithakur.in> loads
   - <https://www.anadithakur.in/about> goes to `https://anadithakur.in/about`
   - <https://portfolio.anadithakur.in> shows the portfolio
   - <https://portfolio.anadithakur.in/about> goes to the main site
   - <https://anadithakur.in/portfolio> goes to the portfolio host
   - <https://anadithakur.in/api/health> shows `"ok":true`
   - `/admin`: sign in with your passkey

## Part 8 · Search engines and housekeeping (15 min)

1. **Don't let Cloudflare block crawlers.** This is the SEO and GEO step.
   In Cloudflare for the domain, look under **Security → Bots** and **AI Crawl
   Control** (names move around):
   - **Bot Fight Mode**: off
   - **Block AI bots / AI Scrapers and Crawlers**: off ("Do not block")
   - **Manage robots.txt / Content Signals**: off ("Do not change"), so
     your own `robots.txt` is served as written
   - **AI Labyrinth**: off

   Then open <https://anadithakur.in/robots.txt> and check it matches `dist/robots.txt`.
2. **Google Search Console**: your property stays the same. **Sitemaps** →
   resubmit `https://anadithakur.in/sitemap.xml`. **URL Inspection** → **Test
   live URL** on the home page and one note: both should say "URL is available
   to Google". **Bing Webmaster Tools**: resubmit the sitemap there too.
3. **Stripe** (optional tidy-up): Developers → Webhooks → delete the endpoint
   `https://anadithakur.in/api/stripe-webhook`, and archive the kit Products.
   The site no longer has that endpoint, so Stripe would only log failed
   deliveries. Your Stripe account itself can stay; it costs nothing.
4. **cron-job.org**: turn off the hourly heartbeat job. Cloudflare now runs the
   heartbeat every hour, plus the daily jobs at their usual times.
5. **Logs**: Workers & Pages → anadi-site → **Logs** is where `console` output
   goes now (the free plan keeps it for a few days).

## Part 9 · Rollback (only if something is wrong)

1. Workers & Pages → anadi-site → **Domains & Routes**: remove both custom domains.
2. **DNS**: re-add the Vercel records from your Part 1 screenshot (usually `A`
   `@` → `76.76.21.21`, `CNAME` `portfolio` and `www` → `cname.vercel-dns.com`),
   all **DNS only** (grey).
3. Disable the two Redirect Rules.
4. Turn the cron-job.org heartbeat job back on.

Vercel serves the site again within minutes. The code on `main` runs on both.

## Part 10 · After a week on Cloudflare

- Vercel → project → **Settings → Git → Disconnect**, and remove the domains
  from the project. Keep the Vercel account: the AI Gateway key lives there.
- Optional clean-up, later and in code: remove `vercel.json`'s Vercel-only
  parts, `middleware.ts` and `@vercel/node`. Not needed to run on Cloudflare.

## What runs where now

| Thing | Where | Cost |
| --- | --- | --- |
| Pages, images, fonts | Cloudflare static assets | free, no request limit |
| `/api/*`, `/`, `/portfolio` | Worker `anadi-site` | free up to 100,000 requests/day |
| Crons | one hourly Cron Trigger (`worker/cron.ts`) | free |
| Page views | Cloudflare Web Analytics | free |
| Button events | Supabase `events` table | free tier |
| AI answers | Vercel AI Gateway (key) | free monthly credit |
| Database, email | Supabase, Resend | as before |
