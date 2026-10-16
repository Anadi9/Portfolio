# Plan: launch prep + Phase 0 (pass our own audit) + Phase 1 (real tickets, Bit AI)

Branch `repositioning`. Spec: `docs/bit-roadmap-todo.md` (Phase 0, Phase 1) plus Anadi's decisions recorded
below. Progress log for humans: `docs/rebrand-progress.md` (append one line per task).

## Decisions (from Anadi, 16 Oct 2026) — binding

- **Bit's send policy:** transactional messages are automatic (ticket receipt, stage-change email fired only when
  Anadi moves the stage). Anything about price, scope, findings, fit, or follow-up nudges is a **draft** for
  approval. Implemented as a policy table keyed by message `kind` (`auto` | `draft`).
- **New-ticket alerts:** email (Resend, exists) **and** WhatsApp via Meta's official WhatsApp Cloud API (template
  message to Anadi's number). No Telegram, no unofficial WhatsApp bridges. WhatsApp is env-gated: missing env →
  skipped and logged, never an error.
- **Ticket numbers:** `A-1001` upwards from a Postgres sequence; internal primary key is a UUID. A ticket number is
  a label only and never grants access.
- **Tracking board:** real tickets only, anonymised (category, stack, stage, updated date — never name, email, URL,
  company), shown only when the client opted in. Fewer than 3 visible tickets → no kanban; show an honest empty
  state. All sample tickets on the board are removed. (The process section's example log stays, labelled example.)
- **Pricing:** Bit only ever states published prices from `src/data/bitsQuest.ts` (and builder sums of them) and
  always says Anadi confirms the exact fixed price after the free first-bug video. No custom quotes, no discounts.
  Add an optional "budget" question to Bit's Fix and AI flows (recorded on the ticket, never answered with a price).
- **Recorded teardown:** $149, 15–20 min recorded walkthrough + written fix list, 48 hours, credited 100% toward
  the $349 audit or an AI build within 30 days.
- **Kit:** keep Stripe as the source of truth for pack prices. Homepage card copy: "Free core kit · packs from $5"
  (check the Kit page wording first and match it; if the core kit is not free, say "Packs from $5 · full kit $19").

## Global constraints (every task)

1. **Never touch the portfolio:** `src/pages/Home.tsx`, `src/pages/Index.tsx`, `src/components/portfolio/*`,
   `src/styles/portfolio.css`, `src/components/IntroLoader.tsx`, `src/hooks/use-portfolio-motion.ts`,
   `src/components/terminal-head/TerminalHead.tsx`, `src/data/portfolio.ts`, `index.html`, `public/favicon*`,
   `public/og.png`. Anything shared (e.g. `src/main.tsx`, `vercel.json`) must not change what the portfolio host
   renders.
2. **Nothing fake.** No invented tickets, numbers, testimonials or success states. If a backend is missing (env not
   set) the UI falls back to the existing real paths (first-bug form `/audit?type=app`, email to Anadi) and says so.
3. **Serverless functions:** files in `api/` are transpiled file-by-file to native ESM. Every relative import in the
   `api/` → `src/lib/` graph must end in `.js`, and every new module in that graph must be added to `GRAPH` in
   `src/lib/teardown/serverless-imports.test.ts`.
4. **Secrets only server-side.** Supabase writes use `SUPABASE_URL` + `SUPABASE_SECRET_KEY` in `api/` only. RLS on
   every new table, no anon/authenticated policies (same pattern as `supabase/migrations/20260928000000_reviews.sql`).
   Public data comes only through API routes that select safe columns.
5. **Rate limit** every new public POST with `createRateLimiter` from `src/lib/scan/rate-limit.ts`; honeypot field
   `hp` like `api/audit.ts`; validate with `zod`.
6. **Brand:** new UI uses `src/styles/home.css` classes and brand CSS variables (`--bq-*`); copy is plain, friendly,
   no game jargon.
7. **Done means:** `npx tsc -p tsconfig.app.json --noEmit`, `npx vitest run` (all pass), `npm run build` (exit 0),
   `npm run check` (OK) — and, for UI tasks, a check on the dev server (`http://localhost:8080`, already running).
   One commit per task, message ending with
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy.
8. **Manual steps** (accounts, keys, applying migrations, Meta template approval, uptime service, DNS) are not done
   by tasks: each task appends what Anadi must do to `docs/launch-checklist.md` (create it if missing) under its
   own heading, with exact env var names and values to set.

## Task 1: Launch-prep copy and the real-only board

- `src/data/bitsQuest.ts` free-tools card "Recorded teardown": kind `Paid add-on · $149`, body states 15–20 min
  recorded walkthrough + written fix list in 48 hours, credited in full toward the $349 audit or an AI build within
  30 days. Kit card: wording per the Kit decision above (read `src/pages/ProductionKit.tsx` first).
- `src/lib/bit/chat.ts` teardown node: add the $149 and the credit. Add an optional `budget` question
  (`Under $2,000` / `$2,000–$5,000` / `$5,000–$20,000` / `Not sure yet`, key `budget`) after `prod3` (before
  `recProd`) and after `ai2` (before `recAi`); recommendations unchanged; budget shows in the email body via
  `mailto`. Update `src/lib/bit/chat.test.ts` paths accordingly and add a test that budget never produces a price
  outside the published list.
- `scripts/generate-feeds.mjs` llms.txt: add the recorded teardown at $149 under Free tools / services.
- Homepage tracking board (`TrackingBoard` in `src/components/home/sections.tsx`, data `board` in
  `src/data/bitsQuest.ts`): remove the sample kanban columns and the "sample tickets" note. Render the live board
  component slot as an empty state for now: heading stays, short honest line ("Live requests appear here,
  anonymised, once clients opt in.") — Task 7 replaces the slot with live data. Keep the example ticket timeline
  but label it clearly "Example ticket". Keep "How you're kept in the loop" and its CTA.
- Visual check at 1440 and 390 on `/`.

## Task 2: Phase 0 — security headers

- `vercel.json` `headers`: a site-wide entry (`source: "/(.*)"`) with `Strict-Transport-Security:
  max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self
  "https://checkout.stripe.com")`, `X-Frame-Options: DENY`, and `Content-Security-Policy-Report-Only` (report-only
  first, so nothing breaks; enforcing is a checklist item) allowing self, Google Fonts (`fonts.googleapis.com`,
  `fonts.gstatic.com`), Vercel analytics (`va.vercel-scripts.com`, `/_vercel/insights`), Stripe
  (`js.stripe.com`, `checkout.stripe.com`, `api.stripe.com`), Supabase (`*.supabase.co`) and `frame-ancestors
  'none'`. Find every third-party origin the built site actually loads (grep `src/`, `index.html`, built `dist/`)
  and include it. Keep the existing `/kit/(.*)` entry.
- A vitest test that parses `vercel.json` and asserts each header is present on the site-wide source.
- Checklist entry: verify headers on the preview with securityheaders.com, read CSP reports, then switch to
  enforcing `Content-Security-Policy`.

## Task 3: Phase 0 — error monitoring and health

- `api/client-error.ts`: POST, rate-limited, zod-validated `{ message, source?, line?, col?, stack?, path }`
  (lengths capped), logs one structured `console.error('[client-error]', JSON)` line (Vercel logs are the store),
  returns 204. No PII fields accepted.
- `src/lib/monitoring/report.ts` + a call in `src/main.tsx`: in the browser only, on the **main-site host only**
  (skip when `location.hostname` is `portfolio.anadithakur.in`), listen to `error` and `unhandledrejection`, dedupe,
  cap at 5 reports per page view, `navigator.sendBeacon` to `/api/client-error`.
- Server side: a small `withErrorLog(handlerName, fn)` wrapper in `src/lib/monitoring/` that logs a structured
  `[api-error]` line with the handler name and rethrows/returns 500; apply it to the new handlers in this plan
  (and leave existing handlers as they are).
- `api/health.ts`: GET, returns `{ ok, checks: { resend, supabase, whatsapp, ai } }` where each is `configured` /
  `missing` from env presence, plus a cheap Supabase reachability check when configured; never leaks values.
  `Cache-Control: no-store`.
- Tests for the validator, the dedupe/cap logic, and health's shape. Update `GRAPH`.
- Checklist: create a free uptime monitor (e.g. UptimeRobot or Better Stack) on `https://anadithakur.in/` and
  `/api/health`, alerting by email; note Vercel log drains/Sentry as optional upgrades.

## Task 4: Phase 0 — privacy, data map, SEO fixes

- `docs/data-map.md`: every place personal data enters (`/audit` forms, `/api/rescue-audit`, `/api/audit`,
  `/review`, Kit checkout/Stripe, `/scan` (stores nothing), Bit chat + `/api/bit/ticket` + `/api/bit/ask` from this
  plan), what is collected, where it is stored (Resend emails, Supabase tables from Task 5, Stripe), who can access,
  retention, legal basis/consent.
- Retention rule (in the data map and the privacy page): leads/tickets kept 24 months after last activity then
  deleted; chat transcripts for AI answers not stored beyond the ticket; deletion on request within 30 days by
  emailing Anadi (reply "delete" keeps working).
- `/privacy` copy (`src/data/legal.ts` / `src/pages/Legal.tsx`): add Bit (scripted + AI answers), the AI processors
  (Vercel AI Gateway, Groq) with "not used to train models" and "no personal data sent to the AI beyond the typed
  question", ticket storage in Supabase, WhatsApp alerts (Anadi's own alerts; clients only if they opt in), the
  retention rule, deletion requests, public anonymised board only with opt-in. Update "Last updated".
- Forms that promise "Nothing is stored" / "used only to send your report" (`src/pages/Audit.tsx`,
  `src/components/audit/AppAuditForm.tsx`, `src/lib/audit/intake.ts` email footer, `api/audit.ts` comment): make the
  copy true for the ticket storage added in Task 6 ("saved as a ticket so Anadi can track it; used only for this
  request; deleted on request").
- SEO: go through `docs/seo-geo-aeo-todo.md`; for each open item that is a code/config change in this repo and not
  already done, do it (e.g. robots meta, 404 noindex, WebSite+Person on every page, trailing slash, RSS full content,
  lastmod) — without touching portfolio files. Tick done items; leave content-writing and account items open with a
  one-line note. Keep `npm run check` green.

## Task 5: Phase 1 — tickets schema and store

- `supabase/migrations/20261016000000_tickets.sql`: tables `clients` (uuid, email unique, name, company,
  whatsapp, created_at), `tickets` (uuid pk, `number` text unique default `'A-' || nextval('ticket_number_seq')`
  with the sequence starting at 1001, client_id, `kind` (`first_bug`|`audit`|`build`|`care`|`question`|`teardown`),
  `stage` (`inbox`|`bug_review`|`audit`|`fixing`|`live`|`closed`), app_url, stack, answers jsonb, budget,
  `board_opt_in` bool default false, `whatsapp_opt_in` bool default false, source (`bit`|`audit_form`|`app_form`),
  category text (anonymised label e.g. "Booking app"), created_at, updated_at), `ticket_events` (timeline: type,
  data jsonb, at), `messages` (ticket_id, direction in/out, kind, status `draft`|`sent`|`failed`, body, channel,
  created_at, sent_at), `briefs` (ticket_id, body jsonb, created_at), `notifications` outbox (ticket_id, channel
  `email`|`whatsapp`, template, payload jsonb, status `pending`|`sent`|`failed`|`skipped`, attempts, last_error,
  created_at, sent_at), `scorecard_runs` (run_at, results jsonb). View `public_board` selecting only number,
  category, stack, stage, updated_at from tickets where board_opt_in and stage <> 'closed'. RLS on all tables, no
  anon/authenticated policies; revoke all from anon, authenticated. Indexes on stage, client_id, status.
- `src/lib/tickets/`: `types.ts` (zod schemas + types), `store.ts` (`ticketStore()` returning a Supabase-backed
  store or `null` when env missing, like `src/lib/kit/store.ts`; methods: `createTicket`, `addEvent`,
  `enqueueNotifications`, `pendingNotifications`, `markNotification`, `publicBoard`, `saveScorecard`,
  `latestScorecard`), `memory.ts` (in-memory store for tests), `policy.ts` (message kind → `auto`|`draft`, per the
  decision). Unit tests against the memory store. Update `GRAPH` for modules `api/` will import.
- Checklist: apply the migration (`supabase db push` or SQL editor), confirm env `SUPABASE_URL` /
  `SUPABASE_SECRET_KEY` are set in Vercel.

## Task 6: Phase 1 — ticket API and notifications

- `api/bit/ticket.ts` (POST): zod body `{ email, name?, appUrl?, kind, answers, budget?, boardOptIn, whatsappOptIn,
  whatsapp?, hp }`; rate-limited; creates client (upsert by email) + ticket + `created` event; enqueues
  notifications (email to Anadi, receipt email to the visitor with the ticket number and the 24-hour first-bug
  promise when kind is `first_bug`, WhatsApp alert to Anadi); then dispatches pending notifications inline
  (best-effort, errors logged, never fail the request once the ticket is saved). Returns `{ number }`. If the store
  is not configured → 501 `{ error: 'tickets not configured' }` (the UI falls back).
- `src/lib/notify/`: `dispatch.ts` (takes pending outbox rows, sends via channel adapters, marks rows, retries up to
  3 attempts), `email.ts` (Resend, templates for `new_ticket_admin`, `ticket_receipt`, `stage_change`), `whatsapp.ts`
  (Meta Cloud API `POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`, template
  `WHATSAPP_TEMPLATE_NEW_TICKET`, recipient `WHATSAPP_ALERT_TO`, token `WHATSAPP_TOKEN`; missing env → `skipped`).
  Message sends respect `policy.ts` (only `auto` kinds are sent; `draft` kinds are stored as `messages` drafts).
- `api/cron/notify.ts`: CRON_SECRET-protected retry of pending notifications; add to `vercel.json` crons (daily, to
  stay within the Hobby plan; note in checklist that Pro allows a shorter interval).
- Wire existing `api/audit.ts` and `api/rescue-audit.ts` to also create a ticket (source `audit_form`/`app_form`)
  after their current emails succeed; ticket failure is logged and never changes their responses.
- Tests with fakes (memory store, fake Resend, fake fetch): ticket created and numbered, receipt only for real
  email, WhatsApp skipped without env, retries capped, policy respected, audit handlers unaffected when the store is
  missing. Update `GRAPH`.
- Checklist: env vars `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ALERT_TO`, `WHATSAPP_TEMPLATE_NEW_TICKET`
  (+ the exact template text to submit to Meta for approval, utility category), `TICKETS_INBOX` (defaults to
  `RESCUE_INBOX`), Meta Business setup steps, Resend sender domain.

## Task 7: Phase 1 — chat creates tickets, live board

- `src/components/home/BitChat.tsx` + `src/lib/bit/chat.ts`: at the `qurl` (qualified first bug) and `contact`
  endings, Bit shows an in-chat form (email required, app link, name optional, "show my anonymised request on the
  public board" checkbox default off, "send me WhatsApp updates" checkbox default off + number when ticked, short
  privacy line linking `/privacy`). Submit → `POST /api/bit/ticket` with the answers → Bit replies with the real
  ticket number and what happens next. On 501/network error → Bit says it couldn't save it and offers the existing
  real fallbacks (first-bug form / email). Keyboard and screen-reader accessible; focus management like the existing
  chat.
- `api/board.ts` (GET): reads `public_board`, returns columns for the 5 stages, `Cache-Control: s-maxage=300,
  stale-while-revalidate=600`; 501 when not configured.
- Homepage board slot (from Task 1) becomes `LiveBoard`: fetches `/api/board`; ≥3 tickets → kanban (5 columns,
  ticket number, category, stack, updated); fewer or error → the Task 1 empty state. The visitor's own ticket (number
  remembered in `localStorage` after submitting, try/catch) is highlighted if present.
- Tests for the board API mapping and the chat form state transitions. Visual check at 1440 and 390.

## Task 8: Phase 1 — Bit answers typed questions with AI

- Install the AI SDK (`ai`, current major) and use Vercel AI Gateway with a plain `"provider/model"` string for a
  small fast model as primary, Groq as fallback (via the gateway or `@ai-sdk/groq`, whichever the installed docs
  recommend). Read the installed docs (`node_modules/ai/docs/`) — do not code from memory.
- `api/bit/ask.ts` (POST `{ question, node?, answers? }`): rate-limited (e.g. 10/min/IP), question ≤ 500 chars, max
  6 AI replies per conversation (client sends a counter; server enforces per IP window too). System prompt built from
  `src/data/bitsQuest.ts` (services, packages, FAQ, free tools) — prices come from a `getPrices` tool / injected
  table, never invented. Output contract: `{ answer, route }` where `route` is one of the chat's node ids so the chat
  can continue with buttons. A post-check rejects any answer containing a `$` amount not in the published price list
  and falls back to keyword routing. Env flag `BIT_AI=on` + gateway key required; otherwise 501 and the chat keeps
  using `classify()`.
- Chat: typed questions call `/api/bit/ask` when available; show the AI answer as Bit, then continue with the routed
  node's options; on any failure use the existing `classify()` path. Label AI answers subtly ("Bit · AI answer").
- Tests: price guard, route validation, fallback on provider error, caps. Update `GRAPH`.
- Checklist: `AI_GATEWAY_API_KEY` (or OIDC on Vercel), `GROQ_API_KEY` if direct, `BIT_AI=on`, model names to use.

## Task 9: "We audit ourselves" scorecard

- `api/cron/scorecard.ts` (CRON_SECRET, daily in `vercel.json`): runs the existing AI-readiness analysis
  (`src/lib/readiness/`) against `https://anadithakur.in/`, checks the response headers from Task 2, and records a
  summary in `scorecard_runs` (score, passed/failed checks, run_at). `api/scorecard.ts` (GET, cached) returns the
  latest run.
- `/scorecard` page (new route, `ServicePage`-like styling with `home.css`, `Seo`, in sitemap and footer): shows the
  three audit areas for our own site — Search & AI visibility (latest readiness score + checks), Reliability &
  security (headers present/missing), Privacy & compliance (links to `/privacy`, data map summary, consent on forms)
  — with the run date. No data yet → honest empty state ("First scan runs after launch"). Bump the sitemap count in
  `scripts/check-notes.mjs`.
- Tests for the summariser. Visual check.

## Task 10: Launch checklist pass and docs

- Consolidate `docs/launch-checklist.md` into one ordered list Anadi can follow tonight/tomorrow: (1) set env vars
  in Vercel (table: name, where to get it, required/optional, which feature), (2) apply the Supabase migration,
  (3) Resend domain check, (4) Meta WhatsApp setup + template text, (5) AI Gateway / Groq keys + `BIT_AI=on`,
  (6) Stripe: confirm Kit pack prices match the homepage card, (7) uptime monitor, (8) push branch → Vercel preview
  → smoke test list (each route, chat → ticket → emails → WhatsApp, board with 3 test tickets then delete them,
  /api/health, CSP report-only reports) → deploy, (9) after launch: switch CSP to enforcing, Search Console/Bing
  verification, IndexNow key.
- Update `docs/bit-roadmap-todo.md` ticks for what this plan delivered, and `docs/rebrand-progress.md`.
- No code changes beyond docs in this task.
