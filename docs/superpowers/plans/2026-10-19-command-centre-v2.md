# Command centre v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin` becomes the one place Anadi runs the business from his phone. It opens with what happened while he was away and at most three things to do today. It shows the numbers that matter and pushes only urgent things to his phone. Routine news waits for one morning email. Login is his email, his password and a passkey.

**Architecture:** Pure functions in `src/lib/command/` (numbers, today, away, plan parsing), exposed through new `/api/admin` ops. A daily `summary` cron sends the morning email. The heartbeat gains web push for urgent cards and Coach's weekly and monthly cards. New tables in one migration: `push_subscriptions`, `admin_passkeys`, plus `feed_items.assignee`. The PWA is a scoped manifest and service worker for `/admin` only. Passkeys use `@simplewebauthn/server` and `@simplewebauthn/browser`. The challenge travels in a short-lived signed cookie, so no challenge table is needed.

**Tech Stack:** as before, plus `web-push` (VAPID, free) and `@simplewebauthn/*`.

**Spec:** `docs/master-plan.md` Phase 5.

## Global Constraints

- Still Anadi only; every new op sits behind the session cookie, except the two passkey-login steps, which sit behind the signed "password ok" cookie.
- No new files under `api/`. The summary cron is `CRON_ROUTES.summary`.
- Push payloads carry no client contact details: the card title and a link only.
- Nothing here messages a client.
- Realtime is **not** used: it would need anon-key access with RLS policies, which the "database locked" rule forbids. `/admin` polls `feed` every 60 s while the tab is visible, plus on focus.

---

### Task 1: Numbers
`src/lib/command/numbers.ts`: `computeNumbers({ tickets: TicketRow[], commitments: Commitment[], now })` → `{ promisesKept: { kept, missed, rate }, pipeline: Record<TicketStage, number>, avgFirstReplyHours: number | null, ticketsLast7: number, ticketsLast30: number }`. Store: `allCommitments(since?)`. Op `numbers`. Tests for each figure, including no data. "Chats" and "paid" are not tracked yet (no server-side chat log; payments are Phase 7) and are shown as "not tracked yet".

### Task 2: Today and "While you were away"
`src/lib/command/today.ts`: `pickToday({ feed, tickets, commitments, now })` returns at most 3 items, ranked: missed promises without a reason, at-risk promises (soonest due), unsent first replies (oldest), then urgent cards. `awaySummary({ since, tickets, commitments, feed })` → counts of new tickets, briefs ready, promises kept, missed and at risk since `since`. Ops `today` and `away { since }`. The page keeps `lastSeen` in localStorage (a per-viewer convenience); the away card shows when there is anything since then.

### Task 3: Fewer emails and the morning summary
- `brief_ready` stops emailing per ticket; the card in the feed is the notice. The new-ticket email stays (email is the record of every enquiry), and the at-risk email stays (urgent).
- `/api/cron/summary` (daily `0 3 * * *` = 08:30 IST): one `daily_summary` email to Anadi with the away summary for the last 24 h, today's three, open card count and the numbers, linking to `/admin`. Skips sending when there's nothing at all. A `notifications` row needs a ticket, so it sends through Resend directly (`sendEmailNotification`-style helper), logged.

### Task 4: Plan as data, weekly review, monthly AI check
- `scripts/generate-plan.mjs` (run in `prebuild` and `predev`) parses `docs/master-plan.md` checkboxes into `src/data/plan.generated.ts` (`{ phase, text, done }[]`); `src/lib/command/plan.ts` parses (pure, tested) and summarises: per phase done/total and the next three open items.
- Heartbeat, on Mondays (IST) once: Coach card `weekly_review` with promises kept last week, tickets, and the plan's next three items. On the 1st of the month once: Coach card `ai_visibility_check` ("Ask ChatGPT, Claude and Perplexity the buyers' questions; note whether the site is cited"). Deduped by open card of that kind plus the date in the title.
- Op `plan` and a Plan tab on `/admin`.

### Task 5: Give to helper
Migration column `feed_items.assignee text check (assignee in ('helper'))`. Op `helper { feedId }` sets it; the card shows "With helper" and stays in the feed (a label until there is a helper).

### Task 6: PWA
`public/admin.webmanifest` (scope and start_url `/admin`, Bit icons, `display: standalone`), `public/admin-sw.js` (push → `showNotification(title, { body, data: { url } })`; notificationclick → focus or open the url). `/admin` links the manifest and registers the worker with scope `/admin`. `vercel.json`: `Service-Worker-Allowed` not needed (same scope); `Cache-Control: no-cache` on the worker.

### Task 7: Web push
- Table `push_subscriptions (id, endpoint unique, p256dh, auth, created_at)`.
- Ops `pushKey` (returns `VAPID_PUBLIC_KEY`), `pushSubscribe { endpoint, keys }`, `pushUnsubscribe { endpoint }`.
- `src/lib/command/push.ts`: `sendPush(store, { title, url }, deps)` via `web-push`, deletes subscriptions answering 404/410.
- Heartbeat sends a push with every at-risk and missed card. Env `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` address); missing → push skipped.
- `/admin` has an "Enable phone alerts" button.

### Task 8: Email check and passkey
- `ADMIN_EMAIL` env. `login { email, password }`: both must match (constant time). With no passkey registered, it sets the session as today. With passkeys, it answers `{ passkey: true, options }` and sets a 5-minute signed `admin_pending` cookie holding the challenge. Then `passkeyLogin { response }` verifies the assertion against `admin_passkeys` and sets the session.
- While logged in: `passkeyOptions` → registration options (challenge in `admin_pending`), `passkeyRegister { response }` stores the credential (`id, public_key, counter, transports, created_at`), `passkeys` lists them, `passkeyRemove { id }`.
- Table `admin_passkeys`. RP id `anadithakur.in` (env `ADMIN_RP_ID` for previews/local, default from the request host), origin from the request.
- Login form gains an email field and the passkey step; a "Passkeys" section on a Settings tab registers one.

### Task 9: Polling and docs
`/admin` refetches the feed every 60 s while visible. Data map rows for the new tables; launch checklist rows for `ADMIN_EMAIL`, VAPID keys, the migration, the summary cron and the passkey setup; tick Phase 5; `npm run build`.

---

## Not in this plan

Supabase Realtime (see constraints), WhatsApp for urgent alerts (needs a second Meta template; push covers the phone), tracking chats server-side (a privacy decision: the site promises chats aren't stored), "paid" numbers (Phase 7).
