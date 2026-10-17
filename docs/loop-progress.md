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

## Manual steps for Anadi

(collected from the lines above; also see `docs/launch-checklist.md`)

- Apply `supabase/migrations/20261019000000_feed_items.sql` once in the Supabase SQL editor (after the tickets migration).

## Decisions to confirm

- Drafts are stored as `Subject: …` + blank line + body, because `messages` has no subject column. `/admin` splits it. A `subject` column could replace this later.
- Two runs of `processTicket` at the same moment (the request's `waitUntil` and the cron) could both brief one ticket; the cron only picks tickets with no brief, so this needs the cron to fire within seconds of a new ticket. Left as is.

- The lead brief drops any field that mentions money at all (stricter than the plan's "published prices only"), so `likelyPackage` is a package name and never a range.

## Blocked
