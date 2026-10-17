# Ticket pipeline: auto-brief, drafts and admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The site's promises live in one data file. Every new ticket gets scanned, briefed and a drafted first reply within minutes. Anadi sees it as a card in the `/admin` feed and approves and sends from there.

**Architecture:** `src/data/promises.ts` holds every promise (deadline, clock start, kept-when); `TURNAROUND_HOURS` and the reply-by time read from it. On ticket creation, `waitUntil` runs `processTicket`: an outside-in scan of the app URL (AI-readiness + security headers), an AI brief (AI Gateway, structured output, with a non-AI fallback), and a deterministic first-reply draft into `messages`. Each step posts a card to a new `feed_items` table; the "brief ready" email is a copy of that card and links to it. `/admin` (password + signed cookie) opens on the **feed**: one card per thing that needs Anadi, each with an action (Open, Approve & send, Edit, Mark done, Snooze). A Tickets tab holds the list with the 24h clock and the ticket view (brief, scan, answers, timeline, drafts, stage change). The overdue alert moved to the Coach heartbeat (master plan Phase 4).

**Tech Stack:** Vite + React Router 6, Vercel Functions (Node), AI SDK 7 via AI Gateway, Supabase (secret key, RLS on), Resend, zod, vitest.

**Spec:** `docs/master-plan.md` Phases 2 and 3, its promise list and the decisions recorded there (16 and 18 Oct 2026). Promise source today: `TURNAROUND_HOURS` in `src/lib/rescue/intake.ts`, used by `src/components/audit/AppAuditForm.tsx` and `src/pages/Hub.tsx:35`.

## Global Constraints

- No new files under `api/`: Hobby caps a deployment at 12 functions. New handlers go in `src/server/` and are registered in `src/server/routes.ts` (`API_ROUTES` / `CRON_ROUTES`).
- Nothing about price, scope, findings or fit is sent to a client automatically. The draft is `status='draft'` until Anadi sends it from `/admin`.
- Prices in any draft come from published prices only (`src/lib/bit/prices.ts`, `src/data/bitsQuestFacts.ts`); the model never writes a price. Run `guardPrices` on every model string that lands in a draft.
- The model never receives name, email, WhatsApp number or company. It gets: kind, stack, app URL, the `answers` object, budget, and scan results.
- Every AI call sets `providerOptions.gateway` exactly like `gatewayAttempts()` in `src/lib/bit/ai.ts` (disallowPromptTraining, Groq fallback). Reuse `gatewayAttempts(aiConfig())`.
- The scan only fetches through `safeGet` / `runCheck` from `src/lib/readiness/check.ts` (SSRF guard). No Supabase `/scan` probe in this plan (needs the client's key and consent).
- First-bug deadline is `createdAt + TURNAROUND_HOURS` hours. Times shown to Anadi are in `Asia/Kolkata`.
- Secrets are server-only; none start with `VITE_`.
- `/privacy` must not ship stale: Task 9 updates it in the same branch before deploy.

## Review Focus

- **App URL missing or unreachable** (blocked, 403, timeout): brief still saved with `scan: { ok: false, error }`, draft still written, nothing throws. Test in Task 2 and Task 6.
- **AI off (`BIT_AI` not `on`) or both models fail:** brief falls back to `fallbackBrief()` from raw answers, `brief.source = 'fallback'`. Test in Task 3.
- **Model output names a price or rupee amount:** that field is dropped by `guardPrices`, not shown in the draft. Test in Task 3.
- **`processTicket` runs twice for one ticket** (waitUntil + cron backfill): second run is a no-op when a brief exists. Test in Task 6.
- **Wrong or missing admin cookie / expired session / tampered signature:** every `/api/admin` op returns 401 and leaks no ticket data. Test in Task 7.

---

### Task 0: Promise list

**Files:**
- Create: `src/data/promises.ts`
- Modify: `src/lib/rescue/intake.ts` (`TURNAROUND_HOURS` reads from the list), `src/data/bitsQuestFacts.ts` (the 24h / 48h / 30-day / five-a-week wording reads from the list where it's a plain number)
- Test: `src/data/promises.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PromiseId = 'first_bug_video' | 'first_bug_weekly_cap' | 'fixed_price_after_video' | 'audit_report' | 'teardown' | 'audit_credit' | 'teardown_credit' | 'refund_if_nothing' | 'daily_update' | 'pay_when_live' | 'care_review' | 'deletion' | 'daily_scorecard';
  export type SitePromise = { id: PromiseId; what: string; where: string[]; clockStarts: string; deadlineHours: number | null; keptWhen: string; enforcedIn: string };
  export const PROMISES: Record<PromiseId, SitePromise>;
  export function promiseHours(id: PromiseId): number; // throws if that promise has no deadline
  ```
  Values come from the promise-list table in `docs/master-plan.md`. Task 1's `replyBy` and Phase 4's commitments use `promiseHours('first_bug_video')`.

- [ ] **Step 1: Failing tests:** `promiseHours('first_bug_video') === 24`; `TURNAROUND_HOURS === promiseHours('first_bug_video')`; `promiseHours('audit_report') === 48`; `promiseHours('deletion') === 720`; every `where` entry names a file that exists (`fs.existsSync`); the first-bug card text in `FREE_CARDS` contains `${promiseHours('first_bug_video')} hours`.
- [ ] **Step 2: Run** `npx vitest run src/data/promises.test.ts`: expect FAIL.
- [ ] **Step 3: Implement.** Keep copy readable: only swap literal numbers for template values; don't restructure sentences. The portfolio's `Contact.tsx` is off limits, so it stays a literal and is listed in `where` only.
- [ ] **Step 4: Run** `npx vitest run`: all green. `npm run build`: the prerendered pages still say "24 hours".
- [ ] **Step 5: Commit** `feat(promises): one list of the site's promises, read by the copy and the deadlines`.

### Task 1: Admin email shows readable answers and the reply-by deadline

**Files:**
- Modify: `src/lib/notify/email.ts` (`answerRows`, `renderNewTicketAdmin`)
- Modify: `src/lib/notify/ticket.ts` (`notifyFor` adds `createdAt` to `base`)
- Test: `src/lib/notify/notify.test.ts`

**Interfaces:**
- Produces: `export const ANSWER_LABEL: Record<string, string>` and `export function replyBy(createdAt: string, hours?: number): string` in `email.ts` (Task 8 reuses `replyBy` for the Tickets tab).

- [ ] **Step 1: Write failing tests** in `notify.test.ts`:
  - `renders answer keys as labels`: `renderNewTicketAdmin({ number:'A-1', kind:'first_bug', answers:{ live:'Launching within 30 days', when:'This month', users:'Real users or a client', impact:'It’s embarrassing' } }).html` contains `Live status`, `Timeline`, `Users`, `Impact`, and does not contain `>live<`.
  - `shows reply-by in IST`: `replyBy('2026-10-17T18:13:00Z')` === `'Sun 18 Oct, 23:43 IST'`; the admin html with `createdAt` set contains `Reply by` and that string.
  - `flags a WhatsApp number with no country code`: payload `whatsapp:'7466914279'` renders `7466914279 (no country code)`; `'+917466914279'` renders unchanged.
- [ ] **Step 2: Run** `npx vitest run src/lib/notify/notify.test.ts` — expect the three to FAIL.
- [ ] **Step 3: Implement.** `ANSWER_LABEL` covers every key in `ANSWER_KEYS` (`src/lib/bit/nodes.ts:33`): stack→Stack, live→Live status, scope→Scope, asked→Asked for, js→JavaScript rendering, pd→Personal data, consent→Consent, kitTool→Kit tool, users→Users, impact→Impact, when→Timeline, aiwant→AI wanted, aistage→AI stage, budget→Budget; unknown keys fall back to the raw key. `replyBy` uses `Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Kolkata', weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:false })`, default `hours = promiseHours('first_bug_video')` (Task 0). Add a `Reply by` row right after `Kind` when `p.createdAt` is a string. Country-code flag: digits-only value of length 10 with no leading `+`.
- [ ] **Step 4: Run** the file again — PASS. Run `npx vitest run` — all green.
- [ ] **Step 5: Commit** `fix(notify): readable answer labels, reply-by deadline and country-code flag in the ticket email`.

### Task 2: Outside-in lead scan

**Files:**
- Create: `src/lib/brief/scan.ts`
- Modify: `src/lib/readiness/check.ts` (`Fetched` gains `headers: Record<string,string>`; `safeGet` fills it from the final response)
- Test: `src/lib/brief/scan.test.ts`

**Interfaces:**
- Consumes: `runCheck`, `safeGet` (check.ts); `checkHeaders` (`src/lib/scorecard/summary.ts`).
- Produces:
  ```ts
  export type LeadScan =
    | { ok: true; url: string; readiness: { score: number; topFixes: { id: string; label: string; fix?: string }[] }; headers: HeaderCheck; ms: number }
    | { ok: false; url: string | null; error: string; ms: number };
  export async function scanLead(appUrl: string | null, deps?: { runCheck?: typeof runCheck; safeGet?: typeof safeGet }): Promise<LeadScan>;
  ```

- [ ] **Step 1: Failing tests** with injected fakes: `no url -> ok:false, error 'no app link'`; `runCheck failure -> ok:false with its error`; `success -> score and topFixes copied, headers from checkHeaders(fake headers)`; `bare host 'antasignal.vercel.app' is fetched as https://antasignal.vercel.app`; `whole scan bounded at 15000 ms` (fake that never resolves → `ok:false, error 'scan timed out'`, use `vi.useFakeTimers`).
- [ ] **Step 2: Run** `npx vitest run src/lib/brief/scan.test.ts` — FAIL.
- [ ] **Step 3: Implement `scanLead`.** Run `runCheck` and `safeGet` in parallel under one 15 s `withTimeout` (`src/lib/notify/timeout.ts`). Never throws.
- [ ] **Step 4: Run** the file and `src/lib/readiness/*.test.ts` — PASS.
- [ ] **Step 5: Commit** `feat(brief): outside-in lead scan (AI readiness + security headers)`.

### Task 3: AI brief with fallback

**Files:**
- Create: `src/lib/brief/brief.ts`
- Test: `src/lib/brief/brief.test.ts` (use `src/lib/bit/mock-models.ts` patterns)

**Interfaces:**
- Consumes: `LeadScan` (Task 2); `gatewayAttempts`, `aiConfig`, `Attempt` (ai.ts); `guardPrices`, `priceTable` (prices.ts).
- Produces:
  ```ts
  export const BriefSchema: z.ZodObject<...>; // summary, stack, situation, topRisk, risks[], redFlags[], approach, likelyPackage, missingInfo[], questions[]
  export type Brief = z.infer<typeof BriefSchema> & { source: 'ai' | 'fallback'; model?: string };
  export type BriefInput = { kind: TicketKind; stack: string | null; appUrl: string | null; answers: Record<string, unknown>; budget: string | null; scan: LeadScan };
  export function briefPrompt(input: BriefInput): string;
  export function fallbackBrief(input: BriefInput): Brief;
  export async function writeBrief(input: BriefInput, attempts?: Attempt[], env?: Record<string,string|undefined>): Promise<Brief>;
  ```
  Field caps: strings ≤ 400 chars, arrays ≤ 5 items. `likelyPackage` is a package **name** from `PRICE_GROUPS`, never an amount.

- [ ] **Step 1: Failing tests:** `briefPrompt` contains the app URL, answer values and scan top fixes and does NOT contain an email/phone even if present in answers (mask with `redact` from ai.ts); `BIT_AI` unset → `source:'fallback'`, `topRisk` = first scan topFix label or `'Not scanned: <error>'`; mock model returns valid object → `source:'ai'`; first model throws, second succeeds → `model` is the fallback label; any field containing `$500` or `₹2000` is replaced by `''` (array items removed); both fail → fallback.
- [ ] **Step 2: Run** `npx vitest run src/lib/brief/brief.test.ts` — FAIL.
- [ ] **Step 3: Implement.** `generateText({ model, output: Output.object({ schema: BriefSchema }), system, prompt, providerOptions })`, 20 s total, 12 s for the primary. System prompt: senior reviewer of AI-built apps, plain English, rank by business impact, never state prices, say "unknown" rather than guess. Include `priceTable()` only as package names/scope context.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(brief): AI-written lead brief with price guard and fallback`.

### Task 4: Deterministic first-reply draft

**Files:**
- Create: `src/lib/brief/draft.ts`
- Test: `src/lib/brief/draft.test.ts`

**Interfaces:**
- Consumes: `Brief` (Task 3), `kindLabel` (email.ts).
- Produces: `export function draftFirstReply(input: { number: string; kind: TicketKind; name: string | null; appUrl: string | null; brief: Brief }): { subject: string; body: string }`. Exported constant `VIDEO_PLACEHOLDER = '[PASTE LOOM LINK]'`.

- [ ] **Step 1: Failing tests:** first_bug draft for `{ name:'Adi', appUrl:'antasignal.vercel.app' }` has subject `Your first bug: antasignal.vercel.app (A-1001)`, starts `Hi Adi,`, contains `brief.topRisk`, `VIDEO_PLACEHOLDER`, `$349` and `credited`, ends `Anadi`; no name → `Hi,`; non-first_bug kinds produce a "questions" draft containing up to 3 `brief.questions` and no `VIDEO_PLACEHOLDER`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Plain-text body, ≤ 1500 chars. First-bug copy: the risk in one line, the video placeholder, "Fixed price to fix it: [PRICE]" (Anadi fills it), the $349 audit credited 100% within 30 days. `[PRICE]` is literal; the send step refuses a body that still contains `[` placeholders (Task 7).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(brief): first-reply and questions drafts`.

### Task 5: Feed items

The command centre's feed is a table, not a view over `ticket_events`: a card needs its own done/snooze state, and Coach (Phase 4) posts cards that belong to no ticket.

**Files:**
- Create: `supabase/migrations/20261019000000_feed_items.sql`, `src/lib/feed/types.ts`
- Modify: `src/lib/tickets/store.ts` (interface + `supabaseStore`), `src/lib/tickets/memory.ts`
- Test: `src/lib/tickets/tickets.test.ts`

**Interfaces:**
- Table `feed_items`: `id uuid pk default gen_random_uuid()`, `ticket_id uuid null references tickets on delete cascade`, `bot text check (bot in ('bit','coach'))`, `kind text` (1–60 chars, e.g. `new_ticket`, `brief_ready`, `draft_ready`), `title text` (≤ 140), `body text` (≤ 2000), `action text check (action in ('open','approve_send','mark_done'))` (the card's main button; Edit, Snooze and Mark done are on every card), `ref uuid null` (e.g. the draft's `messages.id`), `urgent boolean default false`, `created_at timestamptz default now()`, `done_at timestamptz null`, `snoozed_until timestamptz null`. Index on `(done_at, created_at desc)`. RLS on, no policies, anon/authenticated revoked, same as `20261016000000_tickets.sql`. Not idempotent; applied once like the tickets migration.
- Produces on `TicketStore`:
  ```ts
  postFeed(item: NewFeedItem): Promise<FeedItem>;
  openFeed(now?: Date, limit?: number): Promise<FeedItem[]>;  // done_at null and (snoozed_until null or <= now), newest first, urgent first
  markFeedDone(id: string): Promise<void>;
  snoozeFeed(id: string, until: Date): Promise<void>;
  doneFeedFor(ref: string): Promise<void>;                    // closes every open card with this ref (used when a draft is sent)
  ```

- [ ] **Step 1: Failing tests** (memory store): posted card appears in `openFeed`; `markFeedDone` removes it; `snoozeFeed` hides it until the time passes (inject `now`); urgent cards sort first; `doneFeedFor(messageId)` closes the `draft_ready` card for that draft only.
- [ ] **Step 2: Run** `npx vitest run src/lib/tickets/tickets.test.ts`: FAIL.
- [ ] **Step 3: Implement** the migration, the types and both stores.
- [ ] **Step 4: Run** `npx vitest run`: green.
- [ ] **Step 5: Commit** `feat(feed): feed_items table and store, the command centre's cards`.

### Task 6: Store methods and `processTicket`

**Files:**
- Modify: `src/lib/tickets/store.ts` (interface + `supabaseStore`), `src/lib/tickets/memory.ts`, `src/lib/tickets/types.ts`
- Create: `src/lib/brief/process.ts`
- Modify: `src/lib/notify/email.ts` (template `brief_ready` → Anadi's inbox), `src/lib/notify/ticket.ts`, `src/server/bit/ticket.ts`, `src/server/cron/notify.ts`
- Add dep: `npm i @vercel/functions`
- Test: `src/lib/tickets/tickets.test.ts`, `src/lib/brief/process.test.ts`

**Interfaces:**
- Produces on `TicketStore`:
  ```ts
  getTicket(id: string): Promise<TicketDetail | null>;          // ticket + client {name,email,whatsapp} + events + messages + brief
  listTickets(opts?: { stage?: TicketStage; limit?: number }): Promise<TicketRow[]>; // newest first, includes client name/email, hasBrief, firstReplySentAt
  saveBrief(ticketId: string, body: Record<string, unknown>): Promise<void>;
  setStage(ticketId: string, stage: TicketStage): Promise<void>;
  updateMessage(id: string, patch: { body?: string; status?: 'sent' | 'failed' }): Promise<void>; // sets sent_at when sent
  ticketsMissingBrief(limit?: number): Promise<string[]>;       // ids, created in last 7 days
  ```
  `TicketDetail`, `TicketRow`, `Message`, `TicketEvent` types go in `types.ts`.
- Produces: `export async function processTicket(store: TicketStore, ticketId: string, deps?: { scan?: typeof scanLead; brief?: typeof writeBrief; notify?: NotifyDeps }): Promise<'done' | 'skipped' | 'missing'>` in `process.ts`.

- [ ] **Step 1: Failing store tests** (memory store) for each new method, including `ticketsMissingBrief` excluding briefed tickets and `updateMessage` setting `sentAt`.
- [ ] **Step 2: Failing `processTicket` tests:** happy path saves brief `{ ...brief, scan }`, saves one draft (`kind:'first_reply'`, `channel:'email'`), adds event `brief_ready`, posts one Bit card (`kind:'draft_ready'`, `action:'approve_send'`, `ref` = the draft's id, title `<number> · <topRisk clipped 60>`), enqueues+dispatches one `brief_ready` email; second call returns `'skipped'` and writes nothing; `submitTicket` posts a `new_ticket` card (`action:'open'`) for every ticket; unknown id → `'missing'`; scan `ok:false` still saves brief and draft; brief throws → fallback brief saved.
- [ ] **Step 3: Run** both files — FAIL.
- [ ] **Step 4: Implement.** Supabase: `saveBrief` inserts into `briefs`; `getTicket` uses `select('*, clients(name,email,whatsapp), ticket_events(*), messages(*), briefs(*)')`. `brief_ready` email: subject `Brief ready: <number> · <topRisk clipped 60>`, body = brief summary, top risk, scan score, reply-by, link to the card `https://anadithakur.in/admin#card-<feed item id>`. `saveDraftMessage` returns the new message id so the card can reference it.
- [ ] **Step 5: Wire it up.** `submitTicket` returns the ticket as today; in `src/server/bit/ticket.ts` and in `recordFormTicket` call `waitUntil(processTicket(store, ticket.id).catch(log))` from `@vercel/functions`. In `src/server/cron/notify.ts`, after the retry loop, run `processTicket` for up to 5 ids from `ticketsMissingBrief()` (backfill).
- [ ] **Step 6: Run** `npx vitest run` — all green. `npx tsc -p tsconfig.app.json --noEmit` clean.
- [ ] **Step 7: Commit** `feat(brief): scan, brief and draft every new ticket in the background`.

### Task 7: `/api/admin` (auth + operations)

**Files:**
- Create: `src/lib/admin/session.ts`, `src/server/admin.ts`
- Modify: `src/server/routes.ts` (`API_ROUTES.admin`), `src/lib/notify/email.ts` (`sendClientMessage`)
- Test: `src/lib/admin/session.test.ts`, `src/server/admin.test.ts`

**Interfaces:**
- `session.ts`: `signSession(secret: string, now?: number): string` (payload `{ exp }`, 12 h, HMAC-SHA256, base64url); `verifySession(token: string | undefined, secret: string, now?: number): boolean`; `checkPassword(given: string, expected: string): boolean` (`crypto.timingSafeEqual` over SHA-256 digests).
- `admin.ts`: `POST /api/admin` with body `{ op, ... }`:
  - `login { password }` → sets `admin_session` cookie (`HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=43200`), 200; wrong → 401 after a fixed 500 ms delay; rate limit 5/min/IP.
  - `logout` → clears cookie.
  - `feed` → `{ items: FeedItem[] }` from `openFeed()`.
  - `done { feedId }` → `markFeedDone`. `snooze { feedId, hours }` → `snoozeFeed(now + hours)`, `hours` in 1–168.
  - `list { stage? }` → `{ tickets: TicketRow[] }`.
  - `get { id }` → `{ ticket: TicketDetail }`.
  - `stage { id, stage }` → `setStage`, `addEvent('stage', {from,to})`, enqueue+dispatch `stage_change` to the client unless `stage` is `inbox` or `bug_review`.
  - `saveDraft { messageId, body }` → `updateMessage`.
  - `send { messageId, subject, body }` → refuses (400) if body contains `[PASTE` or `[PRICE]`; else Resend from `Anadi Thakur <tickets@anadithakur.in>`, `replyTo` = `TICKETS_INBOX`/`RESCUE_INBOX`, then `updateMessage(status:'sent')`, `addEvent('reply_sent')`, `doneFeedFor(messageId)`; on first_bug in `inbox`, auto-move to `bug_review`.
- Env: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (missing either → every op 501).

- [ ] **Step 1: Failing tests:** session sign/verify, expired, tampered; every op except `login` → 401 without cookie, with bad cookie, with expired cookie; `send` refuses placeholders; `send` closes the draft's feed card; `snooze` rejects `hours` outside 1–168; `stage` to `audit` enqueues `stage_change`, to `bug_review` does not; GET → 405.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with `withErrorLog('admin', ...)` and the memory store in tests (inject `ticketStore` via a module-level `deps` param like other handlers).
- [ ] **Step 4: Run** `npx vitest run` — green.
- [ ] **Step 5: Commit** `feat(admin): password-protected admin API for tickets, stages and drafts`.

### Task 8: `/admin` page (feed first)

**Files:**
- Create: `src/pages/Admin.tsx`, `src/lib/admin/client.ts` (fetch wrappers for each op)
- Modify: `src/routes.tsx` (route `/admin`, lazy, **not prerendered**), `scripts/generate-feeds.mjs` (confirm `/admin` is not listed), `vercel.json` (header `X-Robots-Tag: noindex` for `/admin`), `public/robots.txt` (`Disallow: /admin`)
- Test: `src/lib/admin/client.test.ts`

**Interfaces:** consumes the ops in Task 7, `replyBy` from Task 1 and `FeedItem` from Task 5.

- [ ] **Step 1: Failing client tests:** each wrapper POSTs `{ op, ... }` to `/api/admin` with `credentials:'same-origin'`; 401 resolves to `{ ok:false, auth:false }`.
- [ ] **Step 2: Implement the page** (use the site kit in `src/components/site`, light/dark tokens already in the app):
  - Login form when not authed.
  - **Feed tab (default):** open cards, urgent first, then newest. Each card shows a small Bit (red for `bit`; green for `coach`, unused until Phase 4), title, body, age, and its buttons: the main action (Open → ticket view; Approve & send → the draft editor with Send; Mark done), plus Edit (for draft cards), Snooze (3 h / tomorrow 09:00 IST / 1 week) and Mark done. Done and snoozed cards leave the list straight away. Empty feed shows "Nothing needs you." URL hash `#card-<id>` scrolls to and highlights that card. Refetch on window focus; no Realtime yet.
  - **Tickets tab:** number, kind, app host, client name, stage, **time left** to reply-by (red under 6 h, "LATE" past it, hidden once `firstReplySentAt`), brief badge. Stage filter. Newest first. URL hash `#A-1001` opens that ticket.
  - Ticket view: reply-by, client contact (mailto, `wa.me` link when the number has a country code), answers with `ANSWER_LABEL`, brief sections, scan score + top fixes + missing headers, timeline, drafts in an editable textarea with Save and Send (Send disabled while placeholders remain), stage select.
  - `<Seo noindex>` (check `src/components/Seo.tsx` prop name).
- [ ] **Step 3: Run** `npx vitest run` and `npm run build` — green; `dist/sitemap.xml` has no `/admin`.
- [ ] **Step 4: Browser check** on `npm run dev` with the memory store or the preview: log in, see the `draft_ready` card for A-1001, Approve & send opens the editor with Send disabled while placeholders remain, Snooze hides the card, Mark done removes it; Tickets tab shows the 24 h clock. Check at 390 px wide (phone first).
- [ ] **Step 5: Commit** `feat(admin): /admin command centre feed, tickets tab, drafts and stages`.

> The overdue first-bug alert that used to be Task 8 is now part of the Coach heartbeat (`docs/master-plan.md` Phase 4), which tracks every promise, not only the first-bug video. Until Phase 4 ships, the Tickets tab's red/LATE clock is the only warning.

### Task 9: Privacy, data map and launch docs

**Files:**
- Modify: `src/pages/Legal.tsx`, `docs/data-map.md`, `docs/launch-checklist.md`, `docs/master-plan.md`

- [ ] **Step 1:** `/privacy` and `docs/data-map.md`: on a request, the app's public pages are fetched once to prepare the review; the request's answers, app link, stack and budget plus those scan results go to the AI providers already listed, with no name, email or phone, and no training. Remove the line saying nothing from the ticket form reaches the AI.
- [ ] **Step 2:** Launch checklist: env table rows for `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (`openssl rand -base64 32`); the `feed_items` migration (`20261019000000_feed_items.sql`, run once after the tickets migration); "delete test tickets and feed cards before launch" step.
- [ ] **Step 3:** `docs/master-plan.md`: tick the Phase 2 and Phase 3 items delivered.
- [ ] **Step 4:** `npx vitest run && npm run build` — green.
- [ ] **Step 5: Commit** `docs: privacy and launch steps for briefs and /admin`.

---

## Not tonight

Master plan Phase 4 (Coach: commitments, stage gates, hourly heartbeat incl. the overdue alert), Phase 5 (command centre v2: away card, Today panel, numbers, PWA push, passkey), Phase 6 (client portal), Phase 7 (one audit engine, Care monitoring, nudges, invoices), Supabase `/scan` on leads (needs client key + consent).
