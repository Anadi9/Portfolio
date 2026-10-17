# One audit engine, Care monitoring, nudges and invoices — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One engine turns every check the business runs into one ranked list of findings. It drafts the audit report skeleton, runs monthly on Care clients, and feeds the portal and the command centre. Quiet leads get a drafted nudge. Every paid stage gets a planned invoice with the audit and teardown credits applied.

**Architecture:** `src/lib/engine/`: adapters turn the lead scan (readiness + headers), the Supabase security scan, the DPDP self-check and the Wrapper Test into one `EngineFinding` shape (area, severity, title, detail, fix, source, weight). `combine()` ranks them by business impact and scores each area. `draftReport()` writes the plain-English skeleton with `[ANADI: …]` placeholders for judgment, saved as a draft message (`audit_report`). The send step already refuses `[` placeholders. A daily `care` cron runs the engine on Care tickets due their monthly check. It records a `care_check` event (shown in the portal), posts a card and drafts the monthly review. The same cron drafts one follow-up per quiet lead. Invoices are **planned** here (rows in `invoices` with line items and credits) and created in Stripe by Anadi. This build must not change Stripe, so the Stripe step stays manual and each row stores the Stripe invoice id once he adds it.

**Spec:** `docs/master-plan.md` Phase 7, the promise list (`audit_credit`, `teardown_credit`, `pay_when_live`, `care_review`).

## Global Constraints

- No AI in the engine; findings and scores are deterministic. The report skeleton is a draft; nothing about findings is sent automatically.
- No new files under `api/`; the cron is `CRON_ROUTES.care`, daily.
- No Stripe API calls. Prices in invoice plans come from Anadi's input (the fixed price he quoted) and the published audit/teardown prices.
- The Supabase scan needs the client's key and consent, so the engine accepts its report when Anadi runs it, never fetches it itself.

---

### Task 1: Engine (pure)
`src/lib/engine/types.ts`, `adapters.ts`, `combine.ts` + tests. Areas: `reliability`, `security`, `visibility`, `privacy`, `product`. Severity `critical`/`high`/`medium`/`low` with weights 8/4/2/1. Adapters: `fromLeadScan(LeadScan)` (readiness top fixes → visibility, missing headers → security), `fromSupabaseScan(ScanReport)` (critical → critical/security, warning → medium), `fromDpdp(Result)` (gaps by weight → privacy), `fromTeardown(Result)` (thinnest sections → product). `combine(findings)` → `{ findings (sorted by weight then area order), areas: Record<Area, { score: 0..100 | null, count }>, overall: number | null, top: EngineFinding[] (3) }`; an area with no input is `null`, not 100.

### Task 2: Report skeleton
`draftReport({ number, appUrl, result })` → `{ subject, body }`: summary line, the three things to fix first, a section per area with each finding (what, why it matters, fix), "What we didn't check" listing areas with no input, `[ANADI: confirm or remove]` under each section, `[PRICE]` for the fix quote, the 30-day audit credit sentence from the promise list. Admin op `draftReport { id }` runs `scanLead` fresh plus any stored DPDP/teardown answers on the ticket, combines, saves the draft (`audit_report`) and posts a card. Tests.

### Task 3: Care monitoring
- `onTicketCreated` for `care` tickets opens a `care_review` commitment (31 days).
- `/api/cron/care` (daily `0 2 * * *`, `CRON_SECRET`): for each non-closed `care` ticket whose last `care_check` event is 30+ days old (or none), run `scanLead` + `combine`, add event `care_check { overall, areas, count, delta }`, post a Bit card ("Care check A-1003: 72/100, down 5"), draft a `care_review` message. Sending a `care_review` keeps the commitment and opens the next one.
- Portal: `care_check` shows as "Monthly health check: 72/100".

### Task 4: Nudges for quiet leads
Same cron: tickets in `inbox` or `bug_review` whose latest outgoing sent message is 5+ days old, with no stage change since and no `followup` draft or `nudge_drafted` event for this stage → draft a short `followup` message (policy `draft`) and post a card. One per ticket per stage.

### Task 5: Invoice plans
- `planInvoices({ stage, fixPrice, currency, auditPaidAt, teardownPaidAt, now })` (pure): Fix work is split 50/50, "start" and "on live". The audit credit ($349) comes off the first invoice when the audit was paid within 30 days. The teardown credit ($149) applies the same way. Credits never take an invoice below zero. Tests for each rule.
- Migration `20261023000000_invoices.sql`: `invoices (id, ticket_id, label, lines jsonb, total_cents, currency, status planned/sent/paid/void, stripe_invoice_id, created_at, updated_at)`.
- Admin ops `planInvoices { id, fixPrice, currency, teardownPaidAt? }` (audit paid date from the `audit_paid` task), `invoiceStatus { invoiceId, status, stripeInvoiceId? }`. The "on live" invoice can't be marked `sent` until the `client_confirmed` task is done (the promise).
- `/admin` ticket view: Invoices box.

### Task 6: Docs
Data map, launch checklist (two migrations, the care cron, how to copy a planned invoice into Stripe), master plan ticks, build.

---

## Not in this plan

Creating invoices in Stripe automatically (needs a decision to let code write to Stripe; the hard rules for this build forbid it), paid self-serve scans (Phase 8).
