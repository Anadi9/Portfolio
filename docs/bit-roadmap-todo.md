# Bit + operations roadmap — todo

Written 15 Oct 2026, from the gap analysis of the Bit's Quest prototype
(`design/bits-quest/source/FullArcadeLight.dc.html`) against the live homepage
(`src/pages/Hub.tsx` + `src/components/home/sections.tsx`).

Where things stand: the light theme and all twelve homepage sections are ported.
Not built: Bit's chat, the package builder, the dock, the tour, the playable
process run, and any personalisation. The hero menu and "Talk to Bit" still go
to `/audit` or email. Overall about 55–60% of the prototype.

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

## Open decisions (answer before the phase that needs them)

- [ ] **Phase 0 first?** Recommended yes: the privacy groundwork has to exist
      before Bit collects personal data.
- [ ] **What may Bit send without approval?** A) drafts only, except automatic
      receipts and stage emails (recommended); B) routine nudges and info
      requests automatic, anything about price, scope or findings waits;
      C) fully automatic, Anadi copied.
- [ ] **New-ticket alerts:** email only, or also Telegram or WhatsApp?
- [ ] **Ticket number format:** `A-1048` style, counting up?
- [ ] **Public tracking board:** keep sample tickets, or real ones anonymised?
- [ ] **Pricing:** Bit always says "Anadi confirms the final price", or may it
      quote custom prices?
- [ ] **Theme:** light only, or ship a dark toggle? (Colour presets from the
      design tool are not needed.)

## Phase 0 — pass our own audit (~1 week)

Reliability & security
- [ ] Site-wide security headers in `vercel.json` (CSP, HSTS,
      X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame
      ancestors). Only `/kit/*` sets headers today.
- [ ] Error monitoring for the frontend and `/api/*`.
- [ ] Uptime checks and alerts on `/` and the API routes.

Privacy & compliance
- [ ] Data map: what each form, Bit and Stripe collect, where it is stored and
      who can access it.
- [ ] Retention rule and a deletion-request process.
- [ ] Update `/privacy` for Bit and the AI processing (which providers, no
      training, retention).

Search & AI visibility
- [ ] Finish the open items in `docs/seo-geo-aeo-todo.md`.
- [ ] Monthly check: ask the AI assistants the questions buyers ask and record
      whether they mention us.

Proof
- [ ] Public "We audit ourselves" scorecard page, refreshed weekly by cron.

## Phase 1 — Bit's chat and the ticket foundation

Data and privacy (first, because it can't be added later)
- [ ] Supabase tables: `clients`, `tickets`, `ticket_events` (timeline),
      `messages`, `briefs`.
- [ ] Row-level security: a client reads only their own rows; admin reads all.

Scripted chat ($0, no AI)
- [ ] Port the conversation tree, the 4 qualifying questions and the
      recommendation rules from the prototype into typed data next to
      `src/data/bitsQuest.ts`.
- [ ] Chat panel in the hero: menu board turns into chat, mood sprites, typing
      dots, option menus, recommendation cards, keyboard shortcuts,
      "◀ All options".
- [ ] Service picker (← → with the hopping Bit).
- [ ] Package builder with running total and audit credit.
- [ ] Point the hero menu and "Talk to Bit" at the chat.

Ticket creation
- [ ] `/api/bit/ticket`: save the ticket, email Anadi, email the visitor a
      confirmation with the ticket number (Resend).
- [ ] Send the existing `/audit` form into the same tickets table.
- [ ] The visitor's own card on the tracking board.

AI for typed questions
- [ ] `/api/bit/ask` on the AI SDK: Gateway main, Groq fallback.
- [ ] Answers only from services, prices and FAQ; prices come from a function
      that reads `bitsQuest.ts`, never from the model.
- [ ] Rate limit (reuse `src/lib/scan/rate-limit.ts`), message length cap,
      capped AI replies per conversation.
- [ ] If both providers fail, fall back to the prototype's keyword routing.

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
- [ ] Mini-Bit dock with a hint per section; Bit's tour.
- [ ] Playable process run (Bit carries the ticket, stamps, coins, live log).
- [ ] Boot screen, scanlines, scroll reveals; dark toggle if decided.
- [ ] Paid self-serve scans; keep the Production Kit updated.
