# Client portal (`/portal`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client signs in with a link emailed to them and sees only their own tickets: where each one is on the journey (enquiry → first-bug video → audit → fix → live → Care), what has happened, and the messages Anadi has sent them.

**Architecture:** Same shape as `/admin`: a JSON-only `POST /api/portal` registered in `src/server/routes.ts`, reading through the server's secret key; the browser never touches Supabase. Sign-in is our own emailed link, not Supabase Auth. Supabase Auth would need the anon key in the browser and per-client RLS policies, which breaks the master plan's "database locked, reads only through authenticated server routes" rule. The link carries a signed, 15-minute, single-use token (nonce recorded in `portal_links`). Opening it sets a 7-day `portal_session` cookie (HttpOnly, Secure, SameSite=Lax, Path=/api/portal) naming the client id. Every read is filtered by that client id in code. A pure `clientView()` strips everything internal (brief, drafts, Coach tasks and commitments, internal events, other clients) before anything leaves the server.

**Tech Stack:** as `/admin`.

**Spec:** `docs/master-plan.md` Phase 6.

## Global Constraints

- No new files under `api/`.
- `requestLink` answers the same 200 whether or not the email has tickets (no account enumeration), is rate-limited per IP (5/min) and per email (3/hour, in memory per instance), and sends only when the client exists.
- The client never sees: briefs, scan results, drafts or unsent messages, Coach tasks or commitments, feed cards, internal events (`brief_ready`, `miss_reason`, `overdue_*`), budget, or anything from another client.
- The admin session and the portal session are different cookie names, paths and token kinds; neither works for the other.
- `/portal` is noindex, Disallow in robots.txt, not in the sitemap, and its static HTML holds no client data.
- Privacy page: the site now sets one strictly necessary cookie for signed-in clients; "No cookies" must become accurate.

---

### Task 1: Client view (pure)
`src/lib/portal/view.ts`: `JOURNEY` (stage → client label and one-line explanation), `CLIENT_EVENTS` (`created`, `stage`, `reply_sent`), `clientView(detail: TicketDetail)` → `{ id, number, kind, stage, appUrl, createdAt, updatedAt, timeline: { at, label }[], messages: { at, subject, body }[] }` (sent outgoing only, split with `splitDraft`). Tests: a detail with a brief, drafts, a failed message, tasks, commitments and internal events comes out with none of them; stage events read "Moved to Audit".

### Task 2: Tokens, links table and store
- `src/lib/admin/session.ts` gains kinds `portal_link` and `portal`.
- Migration `20261022000000_portal.sql`: `portal_links (nonce text pk, email text, created_at, used_at)`, RLS on, no policies.
- Store: `clientByEmail(email)`, `ticketsForClient(clientId)` (TicketRow-like, newest first), `createPortalLink(nonce, email)`, `usePortalLink(nonce)` → boolean (true once; false if missing or used).
- Tests (memory store).

### Task 3: `/api/portal`
Ops: `requestLink { email }`, `verify { token }` (single use, sets the session), `tickets`, `ticket { id }` (404 unless it belongs to the session's client), `logout`. Email template `portal_link` (transactional, automatic: the client asked for it): subject "Your sign-in link", the link `https://anadithakur.in/portal#token=<token>` (in the fragment so it never reaches server logs or referrers), "expires in 15 minutes", "if you didn't ask, ignore this". Env: `PORTAL_SESSION_SECRET` (missing → 501). Tests include the isolation test: two clients, each can list and open only their own, a guessed id from the other answers 404, and the admin cookie is refused.

### Task 4: `/portal` page
Request-link form, "check your email" state, token read from `location.hash` then the hash is cleared, ticket list, ticket view with a journey stepper (the six steps, current one highlighted, red Bit), timeline and Anadi's messages. Route lazy, prerendered as an empty shell, noindex header and meta, Disallow, not in the sitemap. Browser check of the empty states without a database.

### Task 5: Docs and links
- Ticket receipt email gains "Track it any time at anadithakur.in/portal".
- `/privacy`: the portal (emailed sign-in link, one strictly necessary cookie while signed in, what a client can see); data map rows; launch checklist (migration, `PORTAL_SESSION_SECRET`, smoke test with two test clients); tick Phase 6; `npm run build`.

---

## Not in this plan

Messages from the client inside the portal (they reply by email), audit reports in the portal (Phase 7 engine), Care monitoring results (Phase 7).
