# Loop progress

Written by the build loop working through `docs/master-plan.md`. One line per
task: what was done, the commit, and any manual step it creates for Anadi.

## Done

- Phase 2 · Task 0: `src/data/promises.ts` (13 promises); `TURNAROUND_HOURS` and the 24h/48h numbers in `bitsQuestFacts.ts` read from it. Manual: none.

- Phase 2 · Task 1: admin ticket email shows readable answer labels, the reply-by time (IST) and flags WhatsApp numbers with no country code (`2faca3e`). Manual: none.
- Phase 2 · Task 2: `src/lib/brief/scan.ts` outside-in lead scan (readiness + headers, 15 s cap); `safeGet` now returns response headers (`0659f35`). Manual: none.
- Phase 2 · Task 3: `src/lib/brief/brief.ts` AI brief through the gateway (tag `lead-brief`), fallback without AI, any field naming money dropped (`777dea3`). Manual: none beyond `BIT_AI=on` from the launch checklist.
- Phase 2 · Task 4: `src/lib/brief/draft.ts` first-reply / questions drafts with `[PASTE LOOM LINK]` and `[PRICE]` placeholders (`586fef2`). Manual: none.
- Phase 3 · Task 5: `feed_items` table, types and store methods (post, open, done, snooze, done-for-ref) (`b52ce3a`). Manual: apply `supabase/migrations/20261019000000_feed_items.sql` once, after the tickets migration.
- Phase 2 · Task 6: store methods for ticket detail/list/briefs/stages/messages (`bfc1e52`); `processTicket` scans, briefs, drafts, posts a `draft_ready` card and emails a `brief_ready` copy; new tickets post a `new_ticket` card and run it via `waitUntil`; the notify cron backfills 5 a day (`a77aeb7`). Added dependency `@vercel/functions`. Manual: none new (uses existing Resend/AI env).
- Phase 2 complete: `npm run build` green.
- Phase 3 · Task 7: `/api/admin` (password + HMAC session cookie, JSON-only, login rate limit; ops feed/done/snooze/list/get/stage/saveDraft/send; send refuses placeholders and closes the card) (`0e4de1d`). Manual: set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel.
- Phase 3 · Task 8: `/admin` page: feed first, red Bit / green Coach cards, Tickets tab with 24 h clock, ticket view, draft editor, stage picker; `Coach` sprite (Bit in `signal` green); noindex header + robots Disallow (`88f93ed`). Browser-checked login and layout locally without a database; the data views are covered by tests only. Manual: smoke-test `/admin` with real data on the preview (launch checklist step 8).
- Phase 3 · Task 9: `/privacy`, `docs/data-map.md` and `docs/launch-checklist.md` cover the lead scan, the brief, `feed_items` and `/admin` (`9c61654`).
- Phase 3 complete.
- Phase 4 plan: `docs/superpowers/plans/2026-10-19-coach-commitments-gates-heartbeat.md`.
- Phase 4 · Tasks 1–2: `src/lib/coach/rules.ts` (75% → at risk, past due → missed, kept rate, IST week) and `stages.ts` (tasks and gate per stage) (`75238b5`, `bc0daea`). Manual: none.
- Phase 4 · Task 3: `commitments` and `tasks` tables and store methods (`26534f9`). Manual: apply `supabase/migrations/20261020000000_coach.sql` after the feed migration.
- Phase 4 · Task 4: hooks: new ticket opens inbox tasks and the 24 h promise (and a Coach card past five first bugs a week); first reply keeps it; stage entry opens tasks and promises; audit report task keeps the 48 h promise; daily updates roll over (`aeabecf`). Manual: none.
- Phase 4 · Task 5: `/api/cron/heartbeat`: at-risk card + one email, missed card, stale-scorecard card, idempotent; daily Vercel cron 05:00 UTC (`5bccd69`). Manual: cron-job.org hourly job with the bearer header.
- Phase 4 · Tasks 6–7: `/api/admin` refuses stage moves while the gate is closed (409 + blockers); ops `taskDone`, `keep`, `missReason`; Coach box on the ticket view (`ebc5b35`, `f735890`). Not browser-checked (needs ticket data); covered by tests. Manual: check the Coach box on the preview.
- Phase 4 · Task 8: data map and launch checklist (`483fad0`). Phase 4 complete; `npm run build` green.
- Phase 5 plan: `docs/superpowers/plans/2026-10-19-command-centre-v2.md`.
- Phase 5 · Numbers tab (promises kept, average first reply, tickets, pipeline) (`cad427c`); Today panel (max three) and While you were away card (`30522f0`).
- Phase 5 · per-brief email dropped; one 08:30 IST morning summary email from `/api/cron/summary` (`88a7c9d`).
- Phase 5 · plan as data (`scripts/generate-plan.mjs` → `src/data/plan.generated.ts`), Plan tab, Coach's Monday review and 1st-of-month AI-visibility card (`632d21e`).
- Phase 5 · Give to helper + migration `20261021000000_command_v2.sql` (`18e48ab`); installable `/admin` (manifest + service worker) and web push for urgent cards (`710841b`); email check + passkey login (`3858dd6`); 60 s polling, plan served without a database (`5829c06`).
- Phase 5 browser-checked locally without a database: email + password login, Settings (passkeys, phone alerts), Plan tab. Passkey and push need HTTPS and a real device: check on the preview.
- Phase 5 complete; `npm run build` green.
- Phase 6 plan: `docs/superpowers/plans/2026-10-19-client-portal.md`.
- Phase 6 · `clientView` strips briefs, drafts, Coach data, internal events, budget and contact details (`b07ad67`); single-use `portal_links` + client-scoped store (`e9cbb98`); `/api/portal` (emailed link, same answer for unknown emails, per-IP and per-email limits, 7-day session, isolation tests) (`0e38330`); `/portal` page (`ca0f66b`); receipt email links the portal, privacy/data map/checklist (`61b2df0`). Browser-checked the sign-in form locally; the signed-in views need real data (preview).
- Phase 6 complete; `npm run build` green.
- Phase 7 plan: `docs/superpowers/plans/2026-10-19-audit-engine-and-money.md`.
- Phase 7 · one engine (`src/lib/engine/`: adapters for the lead scan, Supabase scan, DPDP check and Wrapper Test; ranked findings; area scores, null when unchecked) (`f2af5ac`); audit report skeleton from a fresh scan, `[ANADI: …]` blocks sending, sending it keeps the 48 h promise (`5a5ef7f`); daily `/api/cron/care`: monthly Care checks (portal shows the score, review drafted, `care_review` promise rolls monthly) and one follow-up draft per quiet lead (`49d77cb`); invoice plans with credits, second half held until confirmation (`a580fa9`); docs (`b7b10f0`).
- Phase 7 complete except creating invoices in Stripe automatically (blocked by the no-Stripe-changes rule; see Blocked).
- Phase 8 · chat answers carried across the homepage (Bit's pick on the service card and package, Yours on the audit area and demo bug, blog on their topic) (`c754292`); boot screen once per session, scanlines, scroll reveals (`9de77d8`). Browser-checked.
- Phase 1 · service picker with the hopping Bit (← → Enter) opens from "Start with Bit" (`2aca61f`). Browser-checked.
- Search · `llms-full.txt` (`b14e0e9`); IndexNow after production builds (`b602b15`); self-hosted brand fonts with preloads (`42a96d1`); FAQPage on Q&A-shaped notes (`b06f4cb`); `/about` entity page (`4c47c1c`).
- **Loop finished 19 Oct 2026: no code items left.** Remaining master-plan boxes are manual, content, or blocked (below).

## Manual steps for Anadi

(collected from the lines above; also see `docs/launch-checklist.md`)

- Apply `supabase/migrations/20261019000000_feed_items.sql` once in the Supabase SQL editor (after the tickets migration).
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel (Production; a different pair on Preview).
- On the preview, run the new "Brief, feed and `/admin`" smoke test in `docs/launch-checklist.md` step 8.
- Apply `supabase/migrations/20261020000000_coach.sql` once, after the feed migration.
- Apply `supabase/migrations/20261021000000_command_v2.sql` once, after the Coach migration.
- Set `ADMIN_EMAIL`; generate VAPID keys (`npx web-push generate-vapid-keys`) and set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- On the preview: add a passkey on phone and laptop, add `/admin` to the phone's Home Screen and enable phone alerts (launch checklist step 8, "Command centre v2").
- Apply `supabase/migrations/20261022000000_portal.sql` once, after the v2 migration; set `PORTAL_SESSION_SECRET`.
- On the preview, run the "Client portal" smoke test with two of your own addresses (launch checklist step 8).
- Apply `supabase/migrations/20261023000000_invoices.sql` once, after the portal migration.
- For each planned invoice: create it in Stripe by hand, then paste the `in_…` id into `/admin` (launch checklist "Care checks, nudges and invoices").
- Create the hourly cron-job.org job for `/api/cron/heartbeat` (launch checklist "After launch", Coach's hourly heartbeat) and run the "Coach" smoke test (step 8).
- Optional: set `INDEXNOW_KEY` (`openssl rand -hex 16`) in Vercel Production.
- Review the wording of `/about` (built only from facts already on the site).
- Content still yours: HowTo steps for the procedural drops, keeping the Production Kit current, the monthly "do AI assistants cite us?" check (Coach reminds you on the 1st).
- Everything else in `docs/launch-checklist.md`: env vars, the tickets migration first, Resend, the WhatsApp template, AI Gateway, uptime monitor, Search Console and Bing, the preview smoke tests, then promote.

## Decisions to confirm

- The audit report's "Draft from a fresh scan" uses the outside-in scan only. The Supabase scan needs the client's key and consent, so the engine accepts its results but never fetches them itself.
- Engine scores come from findings (each severity costs points); an area nobody checked shows "not checked", never 100.
- The $149 teardown credit applies to the audit or an AI build, as the site says, not to fix work.
- Quiet-lead nudges start 5 days after your last sent reply, one per ticket per stage, as drafts.

- The portal signs clients in with our own emailed, signed, single-use link instead of Supabase Auth, so the database stays closed to the browser (Supabase Auth would need the anon key and per-client policies).
- Clients can read in the portal but not write; they reply by email.
- The sign-in link lives in the URL fragment (`#token=`), so it never reaches server logs or other sites.

- New briefs no longer send an email each; the feed card plus the 08:30 summary covers them. The new-ticket email (the record of every enquiry) and the at-risk email (urgent) stay.
- No Supabase Realtime: it would mean opening the database to the browser. `/admin` polls every 60 s while visible.
- Numbers leave out "chats" (the site promises chats aren't stored) and "paid" (payments link to tickets in Phase 7).
- With a passkey registered, login needs email + password + passkey (all three), not passkey alone.
- "While you were away" uses this browser's last visit (kept in localStorage), so each device has its own.

- Stage gates are tasks you tick by hand (e.g. "Confirm the $349 audit is paid") until payments are linked to tickets in Phase 7.
- Closing a ticket or moving it back skips the open-task check; only a missed promise without a reason blocks those moves.
- At-risk alerts go by email and feed card only. WhatsApp needs a second Meta template, and push comes in Phase 5.
- Over the five-a-week cap, Coach only posts a card. Nothing is said to the client automatically.

- `/admin` is prerendered as an empty login shell (noindex, Disallow, not in the sitemap) instead of not prerendered at all; Vercel would otherwise 404 the path. No data is in the static file.
- `/admin` v1 is password-only. The email-plus-passkey login is in Phase 5.

- Drafts are stored as `Subject: …` + blank line + body, because `messages` has no subject column. `/admin` splits it. A `subject` column could replace this later.
- Two runs of `processTicket` at the same moment (the request's `waitUntil` and the cron) could both brief one ticket; the cron only picks tickets with no brief, so this needs the cron to fire within seconds of a new ticket. Left as is.

- The lead brief drops any field that mentions money at all (stricter than the plan's "published prices only"), so `likelyPackage` is a package name and never a range.

## Blocked

- Paid self-serve scans: needs you to decide the offer and create a Stripe price; this build may not change Stripe.
- Creating invoices in Stripe automatically: this build may not change Stripe. Invoice plans are ready in `/admin`; automating the Stripe step needs your OK and a restricted Stripe key with invoice write access.

## Cloudflare migration

Plan: `docs/superpowers/plans/2026-10-19-cloudflare-migration.md`. Manual steps: `docs/cloudflare-migration-guide.md`.

- Task 1: `worker/adapter.ts` runs the Vercel-style handlers on Fetch requests (raw body, every Set-Cookie, trusted forwarding headers, 500 on throw or no response) (`0434d7b`). Manual: none.
- Task 2: `worker/router.ts` resolves `/api/...` to the same `api/` files and params as Vercel; `src/lib/runtime/wait-until.ts` replaces `@vercel/functions` (Worker context, or Vercel's own) (`c083dc7`). Manual: none.
- Task 3: `scripts/lib/cf-static.mjs` + `scripts/generate-cf-static.mjs` write `dist/_headers` and `dist/_redirects` from `vercel.json`; host rules left to the Worker and a Redirect Rule; CSP allows Cloudflare's beacon (`1dcd295`). Manual: none.
- Task 4: spike showed `web-push`'s `generateRequestDetails` works on workerd, so `push.ts` sends with `fetch`; `scripts/build-kit-archive.ts` + `src/lib/kit/archive-source.ts` give the Worker a prebuilt kit zip; wrangler 4.151.1 added (`949700a`). Manual: none.
- Task 5: `worker/index.ts` (API via the adapter, host rules, assets, noindex off production), `worker/cron.ts` (one hourly trigger), `wrangler.jsonc` (+ preview env), `POST /api/event` + `events` migration replacing Vercel Analytics events, Cloudflare beacon in `main.tsx` (`1bb9c54`). Manual: apply `supabase/migrations/20261024000000_events.sql`; Cloudflare Web Analytics token as `VITE_CF_BEACON_TOKEN` (guide).
- Task 6: build green; Worker 629 KB gzipped (limit 3 MB). wrangler dev smoke: / and /about 200, /about/ 307 → /about, the three 301s, /kit/downloads/* 200, unknown page 404, security headers on pages and API, /api/health 200 (Supabase reachable), unknown API 404, webhook bad signature 400, portfolio host serves the portfolio, /portfolio 301, /api/event 204, DNS-guarded readiness check and Stripe prices work, hourly cron ran heartbeat + notify. Browser: home, Bit chat, audit form, notes, /admin render with no console errors. Readiness read cap 2 MB → 600 KB for the 10 ms CPU budget (`3aa80c9`). Manual: none.
- Task 7: /privacy, data map, stripe-setup and launch checklist updated; `docs/cloudflare-migration-guide.md` written (`5cf6384`). Manual: everything in the guide.
- Cloudflare migration complete: 1,104 tests and the build green. Your steps: `docs/cloudflare-migration-guide.md`.
