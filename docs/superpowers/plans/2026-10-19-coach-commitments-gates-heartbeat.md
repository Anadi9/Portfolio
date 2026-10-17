# Coach: commitments, stage gates and the heartbeat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every promise the site makes to a client becomes a tracked commitment with a due time. Coach (green Bit) warns Anadi before one is missed, records misses honestly, and a ticket can't move to its next stage until the stage's work is done and every miss has a written reason.

**Architecture:** Coach is rules, not a chatbot. Two new tables: `commitments` (one row per promise per ticket: due time, status `open`/`at_risk`/`kept`/`missed`, miss reason) and `tasks` (owner `coach`/`anadi`/`helper`, title, "done when", status). `src/lib/coach/` holds pure code: `rules.ts` (status from the clock: 75% of the window → `at_risk`, past due → `missed`), `stages.ts` (per stage: the tasks and commitments it opens on entry, and the gate to leave it). Events call into `coach/hooks.ts`: ticket created, first reply sent, stage entered, task done. `/api/cron/heartbeat` (hourly from cron-job.org, daily Vercel cron as a floor) recomputes statuses, posts urgent Coach cards and a `promise_at_risk` email to Anadi, and checks the daily scorecard. `/api/admin` refuses a stage change while the gate is closed (409 with the blockers) and gains ops to finish tasks, keep a commitment by hand and write a miss reason. `/admin` shows commitments, tasks and blockers on the ticket view; Coach cards are green.

**Tech Stack:** as the ticket pipeline plan (Vercel Functions via `src/server/routes.ts`, Supabase with RLS on and no policies, Resend, zod, vitest).

**Spec:** `docs/master-plan.md` Phase 4, the promise list and the client stages table; `src/data/promises.ts`.

## Global Constraints

- No new files under `api/`; the heartbeat is `CRON_ROUTES.heartbeat` behind the existing `api/cron/[job].ts`.
- Coach never messages a client. Its only outputs are feed cards, `tasks` rows and emails to Anadi's own inbox.
- No AI anywhere in this plan.
- Deadlines come from `promiseHours()` only; no literal hour counts in `src/lib/coach/`.
- A miss is never deleted or rewritten to `kept`. A reason is added next to it.
- The heartbeat is idempotent: running it twice in a row posts no second card or email for the same commitment and status (`alerted_status` on the row).
- `/privacy` and `docs/data-map.md` change with the new tables (Task 8).

## Review Focus

- **A commitment exactly at 75% / exactly at due:** `at_risk` at `>= 0.75`, `missed` at `now > due` (Task 1 tests the boundaries).
- **Heartbeat run twice:** second run sends nothing (Task 5).
- **Stage change with a missed commitment and no reason:** 409, ticket stays put, blockers listed (Task 6).
- **Weekly cap:** the sixth first-bug ticket in an IST week gets a Coach card, and the client is not told anything automatically (Task 4).
- **Cron auth:** no `CRON_SECRET` or a wrong bearer → 401, nothing recomputed (Task 5).

---

### Task 1: Rules (pure)

**Files:** Create `src/lib/coach/rules.ts`, `src/lib/coach/rules.test.ts`.

**Interfaces:**
```ts
export type CommitmentStatus = 'open' | 'at_risk' | 'kept' | 'missed';
export const AT_RISK_SHARE = 0.75;
export function statusAt(c: { openedAt: string; dueAt: string; status: CommitmentStatus }, now: Date): CommitmentStatus; // kept/missed are final
export function dueFrom(promise: PromiseId, from: Date | string): string; // ISO, from + promiseHours
export function keptRate(cs: { status: CommitmentStatus }[]): { kept: number; missed: number; rate: number | null }; // rate over closed ones
export function weekStartIst(now: Date): Date; // Monday 00:00 IST, as a UTC instant
```

- [ ] Failing tests: open → at_risk at exactly 75% of the window, open before; at_risk/open → missed one ms past due; kept and missed never change; `dueFrom('first_bug_video', t)` is t+24h; `keptRate` ignores open ones and is null with none closed; `weekStartIst` for a Sunday 23:00 IST and a Monday 00:30 IST.
- [ ] Implement, run, commit `feat(coach): commitment rules from the promise clock`.

### Task 2: Stage rules (pure)

**Files:** Create `src/lib/coach/stages.ts`, `src/lib/coach/stages.test.ts`.

**Interfaces:**
```ts
export type TaskOwner = 'coach' | 'anadi' | 'helper';
export type TaskTemplate = { key: string; owner: TaskOwner; title: string; doneWhen: string };
export type StageRule = { tasks: TaskTemplate[]; commitments: PromiseId[] };
export const STAGE_RULES: Record<TicketStage, StageRule>;
export type GateInput = { stage: TicketStage; to: TicketStage; tasks: { key: string; stage: TicketStage; status: 'open' | 'done' }[]; commitments: { promiseId: PromiseId; status: CommitmentStatus; missReason: string | null }[] };
export function gate(input: GateInput): { ok: boolean; blockers: string[] };
```
Stage contents (conservative; every gate is a task Anadi ticks unless the system can see it):
- `inbox`: tasks `brief` (coach, "Scan, brief and draft", done when the brief exists — ticked by `processTicket`) and `first_reply` (anadi, "Record the video and send the first reply", ticked when the reply is sent). Commitment `first_bug_video` for `first_bug` tickets only (opened at ticket creation, Task 4).
- `bug_review`: task `next_step` (anadi, "Agree the next step with the client: audit, fix or close").
- `audit`: tasks `audit_paid` (anadi, "Confirm the $349 audit is paid"), `audit_report` (anadi, "Send the audit report"), `refund_check` (anadi, "Real issues found? If not, refund in full"). Commitment `audit_report`.
- `fixing`: task `fix_shipped` (anadi, "Ship the fix"). Commitment `daily_update` (recurring while in `fixing`).
- `live`: tasks `client_confirmed` (anadi, "Client confirms it works"), `second_invoice` (anadi, "Send the second invoice, only after confirmation").
- `closed`: none.

Gate: a forward move is blocked by every open task of the current stage; any move (forward, back or to `closed`) is blocked by every `missed` commitment with no `missReason`. Closing a dead lead and stepping back are allowed with open tasks.

- [ ] Failing tests for each stage's gate, the closed exception, a missed commitment with and without a reason, and that every promise id named in `STAGE_RULES` has a deadline (`promiseHours` doesn't throw).
- [ ] Implement, run, commit `feat(coach): stage tasks and gates`.

### Task 3: Tables and store

**Files:** Create `supabase/migrations/20261020000000_coach.sql`, `src/lib/coach/types.ts`. Modify `src/lib/tickets/store.ts`, `src/lib/tickets/memory.ts`, `src/lib/tickets/types.ts` (`TicketDetail` gains `commitments`, `tasks`). Test `src/lib/tickets/tickets.test.ts`.

- `commitments`: `id uuid pk`, `ticket_id uuid null references tickets on delete cascade`, `promise_id text` (1–60), `opened_at timestamptz default now()`, `due_at timestamptz not null`, `status text check in (open, at_risk, kept, missed) default 'open'`, `closed_at timestamptz`, `miss_reason text` (≤ 1000), `alerted_status text`. Index `(status, due_at)`.
- `tasks`: `id uuid pk`, `ticket_id uuid null references tickets on delete cascade`, `stage text`, `key text` (1–60), `owner text check in (coach, anadi, helper)`, `title text` (≤ 200), `done_when text` (≤ 300), `status text check in (open, done) default 'open'`, `created_at`, `done_at`. Unique `(ticket_id, stage, key)` so a re-entered stage doesn't duplicate tasks.
- RLS on, no policies, anon/authenticated revoked.

Store methods:
```ts
openCommitment(c: { ticketId: string | null; promiseId: PromiseId; dueAt: string; openedAt?: string }): Promise<Commitment>;
liveCommitments(): Promise<Commitment[]>;                 // open + at_risk, soonest due first
updateCommitment(id: string, patch: { status?: CommitmentStatus; missReason?: string; alertedStatus?: string }): Promise<void>; // status kept/missed sets closed_at
addTasks(ticketId: string, stage: TicketStage, tasks: TaskTemplate[]): Promise<void>; // ignores duplicates
completeTask(ticketId: string, key: string): Promise<boolean>; // false when no open task with that key
countTickets(opts: { kind: TicketKind; since: string }): Promise<number>;
```
`getTicket` includes `commitments` and `tasks`.

- [ ] Failing memory-store tests for each method (duplicate tasks ignored, kept/missed stamp `closedAt`, `liveCommitments` order and filter, `countTickets` window).
- [ ] Implement both stores and the migration; run; commit `feat(coach): commitments and tasks tables and store`.

### Task 4: Hooks into the ticket flow

**Files:** Create `src/lib/coach/hooks.ts`, test `src/lib/coach/hooks.test.ts`. Modify `src/lib/notify/ticket.ts` (`notifyFor` calls `onTicketCreated`), `src/lib/brief/process.ts` (ticks `brief`), `src/server/admin.ts` (`send` calls `onReplySent`; `stage` calls `onStageEntered`).

```ts
export async function onTicketCreated(store: TicketStore, ticket: Ticket, now?: Date): Promise<void>;
// adds inbox tasks; first_bug → opens first_bug_video (due created + 24h) and, if this is the 6th+ first_bug since weekStartIst, posts a Coach card "Over the five-a-week cap"
export async function onReplySent(store: TicketStore, ticket: TicketDetail, messageKind: string, now?: Date): Promise<void>;
// first_reply → ticks first_reply, keeps first_bug_video if live (missed stays missed)
export async function onStageEntered(store: TicketStore, ticket: TicketDetail, stage: TicketStage, now?: Date): Promise<void>;
// adds the stage's tasks, opens its commitments (dueFrom now)
export async function onTaskDone(store: TicketStore, ticket: TicketDetail, key: string, now?: Date): Promise<void>;
// audit_report → keeps the audit_report commitment
export async function keepCommitment(store: TicketStore, ticket: TicketDetail, commitmentId: string, now?: Date): Promise<void>;
// daily_update kept while in fixing → opens the next one, due now + 24h
```
All hooks catch and log; a Coach failure never fails the request that triggered it.

- [ ] Failing tests (memory store) for each hook, including: the cap card on the sixth ticket and not the fifth; a missed `first_bug_video` stays missed after the reply; re-entering a stage adds no duplicate tasks.
- [ ] Wire the call sites, run all tests, commit `feat(coach): open, keep and tick commitments and tasks from ticket events`.

### Task 5: Heartbeat cron

**Files:** Create `src/server/cron/heartbeat.ts`, test `src/server/cron/heartbeat.test.ts`. Modify `src/server/routes.ts` (`CRON_ROUTES.heartbeat`), `vercel.json` (cron `0 5 * * *` as the floor), `src/lib/notify/email.ts` (template `promise_at_risk` to Anadi's inbox), `src/lib/tickets/policy.ts` (`promise_at_risk: 'auto'`).

`GET /api/cron/heartbeat`, `Authorization: Bearer $CRON_SECRET`, fail closed. For each live commitment: `statusAt(now)`; if it changed, `updateCommitment`. If the new status differs from `alertedStatus`:
- `at_risk` → urgent Coach card (`kind: 'promise_at_risk'`, `action: 'open'`, title `<number> · <promise> due in <h>h`), one `promise_at_risk` email, `alertedStatus = 'at_risk'`.
- `missed` → urgent Coach card (`kind: 'promise_missed'`, title `<number> · missed: <promise>`, body "Write a reason on the ticket before it can move on."), `alertedStatus = 'missed'`; no email (the at-risk email already went).
Scorecard: if `latestScorecard()` is older than 26 h (or none after the first week of launch — skip when none), post one Coach card per day (`kind: 'scorecard_stale'`, deduped by checking open cards of that kind). Returns `{ ok, checked, atRisk, missed }`.

- [ ] Failing tests: 13 h old first-bug commitment → nothing; 19 h → at_risk card + one email; second run → nothing new; 25 h → missed card, no email; kept → ignored; no secret → 401; stale scorecard card posted once.
- [ ] Implement, run, commit `feat(coach): hourly heartbeat recomputes commitments and alerts Anadi`.

### Task 6: Gates and Coach ops in `/api/admin`

**Files:** Modify `src/server/admin.ts`, `src/server/admin.test.ts`, `src/lib/admin/client.ts` (+ tests).

- `stage { id, stage }`: build `GateInput` from the ticket; if `!gate.ok` → 409 `{ error: 'gate closed', blockers }` and nothing changes.
- `taskDone { id, key }` → `completeTask` + `onTaskDone`; 404 when no open task.
- `keep { id, commitmentId }` → `keepCommitment`; refuses a `missed` one (409).
- `missReason { id, commitmentId, reason }` (1–1000 chars) → only for `missed`; adds event `miss_reason`.

- [ ] Failing tests for each op and the 409 gate.
- [ ] Implement, run, commit `feat(admin): stage gates and Coach operations`.

### Task 7: Coach on `/admin`

**Files:** Modify `src/pages/Admin.tsx`; `src/lib/admin/view.ts` (+ tests: `promiseLabel(id)`, `dueLabel(dueAt, now)`).

- Ticket view: a "Coach" box (green Coach sprite) listing the stage's tasks with owner and "done when", a Done button on Anadi's open tasks, and the ticket's commitments with status, due time (IST) and, for `missed`, the reason or a reason form. `kept` commitments of `daily_update` get a "Logged today's update" button (`keep`).
- Stage picker: on 409 show the blockers in the error box.
- Feed: Coach cards already render green; urgent cards keep the red border.

- [ ] Client and view tests; implement; `npm run build`; browser check on the dev server without a database (layout only, as in Phase 3); commit `feat(admin): Coach box, tasks, commitments and gate blockers`.

### Task 8: Docs

- [ ] `docs/data-map.md` rows for `commitments` and `tasks` (no personal data; follow the ticket); `/privacy` needs no change (internal records only, covered by "tickets") unless the data map shows otherwise.
- [ ] `docs/launch-checklist.md`: apply `20261020000000_coach.sql` once after the feed migration; create the cron-job.org job (hourly, `GET https://anadithakur.in/api/cron/heartbeat`, header `Authorization: Bearer <CRON_SECRET>`); smoke test: a first-bug test ticket shows its commitment and tasks, the heartbeat curl returns `{ ok: true }`.
- [ ] `docs/master-plan.md`: tick Phase 4. Commit `docs: Coach tables, heartbeat cron and launch steps`.

---

## Not in this plan

The weekly cap's reply to the client (a draft only, later), WhatsApp or push for urgent alerts (needs a Meta template; Phase 5), "promises kept" on screen (Phase 5 Numbers), deletion-request commitments (needs a request intake; noted for Phase 5), Care monthly review (Phase 7).
