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
- Phase 3 · Task 9: `/privacy`, `docs/data-map.md` and `docs/launch-checklist.md` cover the lead scan, the brief, `feed_items` and `/admin` (`DOCSCOMMIT`).
- Phase 3 complete.

## Manual steps for Anadi

(collected from the lines above; also see `docs/launch-checklist.md`)

- Apply `supabase/migrations/20261019000000_feed_items.sql` once in the Supabase SQL editor (after the tickets migration).
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel (Production; a different pair on Preview).
- On the preview, run the new "Brief, feed and `/admin`" smoke test in `docs/launch-checklist.md` step 8.

## Decisions to confirm

- `/admin` is prerendered as an empty login shell (noindex, Disallow, not in the sitemap) instead of not prerendered at all; Vercel would otherwise 404 the path. No data is in the static file.
- `/admin` v1 is password-only. The email-plus-passkey login is in Phase 5.

- Drafts are stored as `Subject: …` + blank line + body, because `messages` has no subject column. `/admin` splits it. A `subject` column could replace this later.
- Two runs of `processTicket` at the same moment (the request's `waitUntil` and the cron) could both brief one ticket; the cron only picks tickets with no brief, so this needs the cron to fire within seconds of a new ticket. Left as is.

- The lead brief drops any field that mentions money at all (stricter than the plan's "published prices only"), so `likelyPackage` is a package name and never a range.

## Blocked
