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
- Phase 6 · `clientView` strips briefs, drafts, Coach data, internal events, budget and contact details (`b07ad67`); single-use `portal_links` + client-scoped store (`e9cbb98`); `/api/portal` (emailed link, same answer for unknown emails, per-IP and per-email limits, 7-day session, isolation tests) (`0e38330`); `/portal` page (`ca0f66b`); receipt email links the portal, privacy/data map/checklist (`PHASE6`). Browser-checked the sign-in form locally; the signed-in views need real data (preview).
- Phase 6 complete; `npm run build` green.

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
- Create the hourly cron-job.org job for `/api/cron/heartbeat` (launch checklist step 9.8) and run the "Coach" smoke test (step 8).

## Decisions to confirm

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
