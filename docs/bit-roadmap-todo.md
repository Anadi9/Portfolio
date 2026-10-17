# Bit + operations roadmap — todo

Written 15 Oct 2026, from the gap analysis of the Bit's Quest prototype
(`design/bits-quest/source/FullArcadeLight.dc.html`) against the live homepage
(`src/pages/Hub.tsx` + `src/components/home/sections.tsx`).

Where things stand (updated 17 Oct 2026): Phase 0 and Phase 1 are delivered on the
`repositioning` branch (Bit's chat, package builder, tickets, alerts, live board,
AI answers, scorecard), pending the launch steps in `docs/launch-checklist.md`.
Phases 2 to 5 are not started.

**The idea behind the order:** one audit engine (scan + AI readiness + DPDP +
teardown scoring) runs in three places: weekly on this site (public proof), on
every new lead (pre-check for the brief) and monthly on Care clients
(monitoring). Automation does the detection and paperwork; Anadi does the
judgment and puts his name on everything that reaches a client.

**Budget:** close to $0 a month. Vercel AI Gateway (free $5 credit every 30 days)
with a small model, Groq free tier as fallback, the existing Supabase and Resend,
Vercel cron. Avoid Gemini's free tier and xAI's data-sharing credits: both can
train on visitors' messages, which is wrong for a privacy-audit business.

Process: each phase gets a spec in `docs/superpowers/specs/`, a plan in
`docs/superpowers/plans/`, then build → test → check in the browser → commit.

---

## Decisions (answered by Anadi, 16 Oct 2026)

- [x] **Phase 0 first?** Answer: yes. Recommended yes: the privacy groundwork has to exist
      before Bit collects personal data.
- [x] **What may Bit send without approval?** Answer: transactional messages are automatic (ticket receipt; stage-change email only when Anadi moves the stage); anything about price, scope, findings, fit or follow-up nudges is a draft for approval. Options were: A) drafts only, except automatic
      receipts and stage emails (recommended); B) routine nudges and info
      requests automatic, anything about price, scope or findings waits;
      C) fully automatic, Anadi copied.
- [x] **New-ticket alerts:** Answer: email (Resend) and WhatsApp via Meta's official Cloud API (template message); no Telegram, no unofficial bridges; env-gated. Was: email only, or also Telegram or WhatsApp?
- [x] **Ticket number format:** Answer: `A-1001` upwards from a Postgres sequence; UUID primary key; the number is a label and grants no access. Was: `A-1048` style, counting up?
- [x] **Public tracking board:** Answer: real tickets only, anonymised (category, stack, stage, updated date), only when the client opted in; under 3 visible tickets shows an honest empty state; sample tickets removed. Was: keep sample tickets, or real ones anonymised?
- [x] **Pricing:** Answer: Bit only states published prices (and builder sums) and says Anadi confirms the fixed price after the free first-bug video; no custom quotes or discounts; optional budget question, never answered with a price. Was: Bit always says "Anadi confirms the final price", or may it
      quote custom prices?
- [x] **Theme:** Answer: ship the dark toggle (done in phase 2). Was: light only, or ship a dark toggle? (Colour presets from the
      design tool are not needed.)

## Phase 0 — pass our own audit (~1 week)

Reliability & security
- [x] Site-wide security headers in `vercel.json` (CSP, HSTS,
      X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame
      ancestors). Only `/kit/*` sets headers today.
- [x] Error monitoring for the frontend and `/api/*`.
- [x] Uptime checks and alerts on `/` and the API routes.

Privacy & compliance
- [x] Data map: what each form, Bit and Stripe collect, where it is stored and
      who can access it.
- [x] Retention rule and a deletion-request process.
- [x] Update `/privacy` for Bit and the AI processing (which providers, no
      training, retention).

Search & AI visibility
- [ ] Finish the open items in `docs/seo-geo-aeo-todo.md`.
- [ ] Monthly check: ask the AI assistants the questions buyers ask and record
      whether they mention us.

Proof
- [x] Public "We audit ourselves" scorecard page, refreshed weekly by cron.

## Phase 1 — Bit's chat and the ticket foundation

Data and privacy (first, because it can't be added later)
- [x] Supabase tables: `clients`, `tickets`, `ticket_events` (timeline),
      `messages`, `briefs`.
- [x] Row-level security: RLS on every table, no anon/authenticated policies; all access through server API routes (per-client read policies come with the Phase 4 portal).

Scripted chat ($0, no AI)
- [x] Port the conversation tree, the 4 qualifying questions and the
      recommendation rules from the prototype into typed data next to
      `src/data/bitsQuest.ts`.
- [x] Chat panel in the hero: menu board turns into chat, mood sprites, typing
      dots, option menus, recommendation cards, keyboard shortcuts,
      "◀ All options".
- [ ] Service picker (← → with the hopping Bit).
- [x] Package builder with running total and audit credit.
- [x] Point the hero menu and "Talk to Bit" at the chat.

Ticket creation
- [x] `/api/bit/ticket`: save the ticket, email Anadi, email the visitor a
      confirmation with the ticket number (Resend).
- [x] Send the existing `/audit` form into the same tickets table.
- [x] The visitor's own card on the tracking board.

AI for typed questions
- [x] `/api/bit/ask` on the AI SDK: Gateway main, Groq fallback.
- [x] Answers only from services, prices and FAQ; prices come from a function
      that reads `bitsQuest.ts`, never from the model.
- [x] Rate limit (reuse `src/lib/scan/rate-limit.ts`), message length cap,
      capped AI replies per conversation.
- [x] If both providers fail, fall back to the prototype's keyword routing.

## Phase 2 — lead processing (the brief)

- [ ] On a new ticket, run the scanner and AI-readiness check on the app URL and
      attach the results.
- [ ] AI-written brief: requirements, stack and situation, risks and red flags,
      suggested approach, likely package and price range, missing information,
      questions to ask. Falls back to the visitor's raw answers if AI fails.
- [ ] Drafted client messages, pre-filled with the client's details: first
      reply, follow-up questions, audit kickoff, mid-audit question, status
      update.

## Phase 3 — admin dashboard (`/admin`, Anadi only)

- [ ] Ticket list with stage, filters and search.
- [ ] Ticket view: brief, scan results, timeline, transcript.
- [ ] Change the stage (triggers the client's stage email).
- [ ] Approve, edit and send drafted messages.

## Phase 4 — client portal (`/portal`)

- [ ] Login with an emailed link (Supabase Auth).
- [ ] The client sees only their own tickets: status, timeline, audit report,
      messages with Anadi.
- [ ] Covers the whole journey: enquiry → first-bug video → audit → fix → live
      → Care.
- [ ] Test that one client can never read another's data.

## Phase 5 — one audit engine and automation

- [ ] Combine scan, AI readiness, DPDP and teardown scoring into one engine.
- [ ] Draft the report skeleton from the engine's findings.
- [ ] Monthly Care monitoring by cron, with the results in the client's portal.
- [ ] Follow-up nudges for leads that go quiet (within the rule chosen above).
- [ ] Stripe invoices linked to tickets.

## Phase 6 — finish the homepage and scale the products

- [ ] Carry the visitor's chat answers across the page: "BIT'S PICK" on the
      matching service and pricing card, "YOURS" on the matching bug and
      checklist column, blog filtered to their topic.
- [x] Mini-Bit dock with a hint per section; Bit's tour. (done in phase 2)
- [x] Playable process run (Bit carries the ticket, stamps, coins, live log). (done in phase 2)
- [ ] Boot screen, scanlines, scroll reveals. (Dark toggle done in phase 2.)
- [ ] Paid self-serve scans; keep the Production Kit updated.
