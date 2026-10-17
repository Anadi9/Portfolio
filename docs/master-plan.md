# Master plan

One plan for the whole business site. It replaces `bit-roadmap-todo.md`
(15–17 Oct) and folds in the 18 Oct decisions on Coach and the command centre.

**Goal:** launch "Your app, made production-ready" with Bit as the client-facing
assistant, keep every promise the site makes, then build the back office that
makes keeping them automatic.

**Scope:** Anadi's own website and products only. No multi-tenancy, public API
or packaging Bit for other agencies (considered and dropped, 18 Oct).

Where things stand (18 Oct 2026): Phases 0 and 1 are built on the
`repositioning` branch, pending `docs/launch-checklist.md`. Phases 2 onwards are
not started. The next build is
`docs/superpowers/plans/2026-10-18-ticket-pipeline-brief-and-admin.md`
(Phases 2 and 3).

Process: each phase gets a plan in `docs/superpowers/plans/`, then build → test
→ check in the browser → commit. Tick items here when they ship.

---

## Rules that hold for every phase

- **Budget close to $0 a month.** Supabase, Resend, WhatsApp Cloud API (one
  Meta-approved template per message type), Vercel AI Gateway free credit with a
  small model, Groq as fallback through the gateway, cron-job.org for hourly
  pings. Avoid Gemini's free tier and xAI's data-sharing credits: both can train
  on visitors' messages.
- **Vercel Hobby.** At most 12 functions, so no new files under `api/`; register
  handlers in `src/server/routes.ts`. Vercel crons run daily only.
- **Send policy (16 Oct).** Receipts and stage emails are automatic. Anything
  about price, scope, findings, fit or follow-up nudges is a draft until Anadi
  approves it.
- **AI writes words, never decisions.** Briefs, drafts and summaries only. Prices
  come from published data (`src/lib/bit/prices.ts`, `src/data/bitsQuestFacts.ts`),
  never from a model. No name, email, phone or company is sent to a model.
- **Privacy docs move with the code.** `docs/data-map.md`, `src/data/legal.ts`
  and `/privacy` change in the same branch as any feature that collects or
  processes something new.
- **The portfolio is off limits** (`portfolio.anadithakur.in`; see the list in
  `docs/rebrand-progress.md`). It keeps the Terminal Head on its testimonials, so
  `src/components/terminal-head/` stays.

## Decisions

16 Oct 2026:

- Phase 0 (privacy groundwork) before Bit collects personal data.
- Send policy as above.
- New-ticket alerts by email (Resend) and WhatsApp (Meta Cloud API template),
  env-gated. No Telegram, no unofficial bridges.
- Ticket numbers `A-1001` upwards from a Postgres sequence; UUID primary key;
  the number grants no access.
- Public tracking board: real tickets only, anonymised, opt-in; fewer than 3
  shows an honest empty state.
- Bit states only published prices and builder sums, and says Anadi confirms the
  fixed price after the free first-bug video. No custom quotes or discounts.
- Dark mode toggle shipped (rebrand).

18 Oct 2026:

- **Coach** is the mentor: the same Bit sprite in **green** (the site's "OK"
  colour). Red Bit talks to clients; Coach talks only to Anadi and never
  messages a client.
- **Coach is rules, not a chatbot.** Deadlines, warnings, gates and "what's
  next" are plain code over the database.
- **A missed promise blocks the stage gate** until Anadi writes a reason. The
  miss stays counted in "promises kept".
- **The command centre** (`/admin`) is a private feed both bots post to. Email
  stays the record of everything.
- **The portfolio keeps the Terminal Head** on its testimonials (Bit's change
  reverted).

---

## The promise list

Every promise the site makes, with what starts the clock and what counts as
kept. Phase 2 turns this into one data file, `src/data/promises.ts`. The site
copy and Coach both read that file, so the copy and the deadlines can't drift
apart. "Enforced" says which phase starts tracking it.

| Promise | Where it's promised | Clock starts | Deadline | Kept when | Enforced |
|---|---|---|---|---|---|
| Free first-bug video | Hub hero, `/production-ready`, `/ai-visibility`, `/dpdp`, audit form, portfolio contact, Bit (`TURNAROUND_HOURS` in `src/lib/rescue/intake.ts`) | `first_bug` ticket created | 24 h | First reply with the video link is sent | Phase 2 (reply-by), Phase 4 (commitment) |
| Five first-bug videos a week | `FREE_CARDS` in `bitsQuestFacts.ts` | Monday 00:00 IST | Weekly cap | No more than five accepted; extras told the next free slot | Phase 4 |
| Fixed price after the video | `bitsQuest.ts`, FAQ | Video sent | Same message | The reply states one fixed price | Phase 2 (send refuses `[PRICE]`) |
| Production audit report | `PRICE_GROUPS` (48 hours) | Audit paid | 48 h | Report sent | Phase 4 |
| Recorded teardown | `FREE_CARDS` ($149, 48 hours) | Teardown paid | 48 h | Video and fix list sent | Phase 4 |
| Audit credited 100% | `GUARANTEES`, FAQ, `/production-ready` | Audit paid | 30 days | Fix booked within 30 days gets the credit on its invoice | Phase 7 (invoices) |
| Teardown credited toward audit or AI build | `FREE_CARDS` | Teardown paid | 30 days | Credit applied | Phase 7 |
| Nothing found? Full refund | `GUARANTEES`, FAQ | Audit report sent | On report | Refund issued when the report finds no real issue | Phase 4 (gate) |
| Daily written updates | `PRICE_GROUPS` Fix, FAQ | Stage `fixing` entered | Every 24 h | An update sent each day in `fixing` | Phase 4 |
| Pay the second half when it's live | `GUARANTEES`, FAQ | Stage `live` entered | — | Second invoice only after the client confirms | Phase 4 (gate) |
| Care monthly health review | Care plan ($299/mo) | Care starts | Monthly | Review sent each month | Phase 7 |
| Deletion request handled | `/privacy` (`src/pages/Legal.tsx`) | Request received | 30 days | Data deleted and confirmed | Phase 4 |
| Daily scorecard | `/scorecard` | Daily | 24 h | A run saved in the last 24 h | Phase 4 (already runs by cron) |

## Client stages

The database stages map onto the journey the site describes:

| Journey | `tickets.stage` | Client email on entry |
|---|---|---|
| Enquiry | `inbox` | Receipt with ticket number (automatic, built) |
| First-bug video | `bug_review` | None (the video reply is the message) |
| Audit | `audit` | Stage email (automatic) |
| Fix | `fixing` | Stage email (automatic) |
| Live | `live` | Stage email (automatic) |
| Done / Care | `closed` | Stage email; Care continues as a `care` ticket |

Phase 4 adds what each stage creates on entry, what must be true to leave it,
and the block on a missed promise.

---

## Phase 0: pass our own audit

Reliability and security
- [x] Site-wide security headers in `vercel.json`.
- [x] Error monitoring for the frontend and `/api/*`.
- [ ] Uptime monitor on `/` and `/api/health` (endpoint built; the monitor is a
      launch-checklist step).

Privacy and compliance
- [x] Data map (`docs/data-map.md`).
- [x] Retention rule and deletion-request process.
- [x] `/privacy` covers Bit and the AI processing.

Proof
- [x] Public "We audit ourselves" scorecard, refreshed daily by cron.

## Phase 1: Bit's chat and the ticket foundation

- [x] Supabase tables (`clients`, `tickets`, `ticket_events`, `messages`,
      `briefs`, `notifications`), RLS on with no anon policies.
- [x] Scripted chat: conversation tree, qualifying questions, recommendations,
      package builder, hero menu and "Talk to Bit".
- [ ] Service picker (← → with the hopping Bit).
- [x] `/api/bit/ticket`, the `/audit` form into the same table, the visitor's own
      card on the board.
- [x] AI answers for typed questions (gateway + fallback, price guard, rate
      limits, keyword fallback).

## Launch

- [ ] Work through `docs/launch-checklist.md` (env vars, migration, Resend,
      WhatsApp template, AI Gateway, Stripe check, uptime, preview smoke test,
      deploy, after-launch steps).

## Phase 2: the promise list and lead processing

Plan: `docs/superpowers/plans/2026-10-18-ticket-pipeline-brief-and-admin.md`.

- [x] `src/data/promises.ts` from the table above; `TURNAROUND_HOURS` and the
      site copy read from it.
- [x] Readable admin email with the reply-by time.
- [x] Outside-in scan of the app URL on every new ticket.
- [x] AI-written brief with a non-AI fallback.
- [x] Drafted first reply (and questions draft for other kinds).
- [x] All of it runs in the background on ticket creation, with a daily backfill.

## Phase 3: command centre v1 (`/admin`)

Same plan as Phase 2. `/admin` starts as the **feed**, not a ticket list.

- [x] `feed_items` table: one row per card, posted by Bit (client news) or Coach
      (deadlines, plan). Email and WhatsApp alerts are copies of feed items.
- [x] Login for Anadi only (password + signed cookie in v1; passkey in Phase 5).
      `noindex`, not prerendered, not in the sitemap; reads only through
      authenticated server routes.
- [x] Feed view: cards newest first, red Bit and green Coach, every card has an
      action (Open, Approve & send, Edit, Mark done, Snooze). Done and snoozed
      cards leave the feed.
- [x] Tickets tab: list with stage filter and the 24 h clock; ticket view with
      brief, scan, answers, timeline, drafts and stage change.

## Phase 4: Coach (promises, commitments, gates, heartbeat)

- [x] **Commitments:** one row per promise per client, with a due time and
      status `open` / `at_risk` / `kept` / `missed`. Misses stay visible and feed
      an honest "promises kept" number.
- [x] **Tasks with owners:** Coach (automatic prep: scan, brief, draft), Anadi
      (judgment: record the video, approve the price, send the report), helper (a
      label for future hand-offs). Each task has "done when".
- [x] **Stage gates:** per stage, the tasks it creates on entry, its exit
      conditions and the client email it sends. A ticket can't move on until the
      stage is really done, and a missed commitment blocks the gate until a
      reason is written.
- [x] **Heartbeat:** `/api/cron/heartbeat`, hourly from cron-job.org with a daily
      Vercel cron as a floor. At 75% of a window → `at_risk`, a Coach card and an
      urgent alert; past due → `missed`, logged, top of tomorrow. This replaces
      the overdue alert (Task 8 of the Phase 2–3 plan).
- [x] Coach cards in the feed in green.

## Phase 5: command centre v2

- [x] **"While you were away"** card at the top on login.
- [x] **Today panel:** never more than 3 items, picked by Coach.
- [x] **Numbers:** promises kept, chats → tickets → paid, average first reply,
      pipeline by stage. Tabs for Tickets, Numbers, Plan.
- [x] **Fewer emails:** urgent (promise at risk) → email + WhatsApp + push;
      routine → feed only plus one daily summary email; every email links to its
      card.
- [x] **Phone first:** installable PWA with free web push.
- [x] **While Anadi is away** the bots prepare (scan, brief, draft, recompute
      deadlines, scorecard, SEO checks, numbers, morning summary) and never send
      anything about price, scope or findings.
- [x] **Security:** passkey on top of the email check; Supabase Realtime only on
      Anadi's session.
- [x] **Plan as data:** this plan's open items and the SEO list in a form Coach
      can read, so it can say what's next and post weekly progress.
- [x] "Give to helper" action (label only until there is a helper).

## Phase 6: client portal (`/portal`)

- [x] Login with an emailed link (our own signed, single-use link rather than
      Supabase Auth, so the database stays closed to the browser).
- [x] The client sees only their own tickets: stage, timeline, report, messages.
- [x] Covers the whole journey: enquiry → first-bug video → audit → fix → live →
      Care.
- [x] Test that one client can never read another's data.

## Phase 7: one audit engine and money

- [x] Combine scan, AI readiness, DPDP and teardown scoring into one engine.
- [x] Draft the report skeleton from the engine's findings.
- [x] Monthly Care monitoring by cron, results in the portal and the feed.
- [x] Follow-up nudges for quiet leads (drafts, per the send policy).
- [x] Invoices linked to tickets, with the audit and teardown credits applied
      (planned in `/admin`; the second half waits for the client's confirmation).
- [ ] Create those invoices in Stripe automatically. Needs Anadi's OK for code
      to write to Stripe; until then he copies each plan into Stripe by hand.

## Phase 8: finish the homepage and the products

- [ ] Carry the visitor's chat answers across the page ("BIT'S PICK" on the
      matching service and pricing card, "YOURS" on the matching bug and
      checklist column, blog filtered to their topic).
- [x] Mini-Bit dock, Bit's tour, playable process run (rebrand).
- [ ] Boot screen, scanlines, scroll reveals.
- [ ] Paid self-serve scans; keep the Production Kit updated.

## Running alongside: search and AI visibility

Tracked in `docs/seo-geo-aeo-todo.md`. Code items can go into any phase; account
and content items are Anadi's.

- [ ] Search Console and Bing verified, sitemap submitted (launch checklist).
- [x] `llms-full.txt` generated at build.
- [x] IndexNow ping after deploy (`scripts/indexnow.mjs`; needs `INDEXNOW_KEY`).
- [x] Self-host the brand fonts (Space Grotesk, Press Start 2P, Jersey 10).
- [x] FAQPage where posts are already shaped that way (built from their own
      question headings, `scripts/lib/faq.mjs`).
- [ ] HowTo on the procedural drops: needs ordered-step copy written per drop
      (Anadi, content).
- [ ] About page for "who is Anadi Thakur".
- [x] Coach reminder on the 1st of each month to ask ChatGPT, Claude and Perplexity
      the buyers' questions (built in Phase 5).
- [ ] Monthly: actually ask them and record whether the site is cited (Anadi).
