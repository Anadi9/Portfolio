# Data map

Where personal data enters anadithakur.in, what is collected, where it lives, who can see it, how long it is kept and on what basis. Keep this in step with `src/data/legal.ts` and `src/pages/Legal.tsx` (the public privacy page). Last updated 16 October 2026.

Controller: Anadi Thakur (sole proprietor, India). Contact and deletion requests: anadithakur99@gmail.com. Replying "delete" to any email from the site works.

## Retention rule (applies everywhere unless a row says otherwise)

- Leads and tickets (audit requests, Bit tickets, the clients behind them): kept **24 months after the last activity**, then deleted.
- Chat transcripts used to get an AI answer from Bit: **not stored** beyond the ticket. Only what the visitor chooses to send as a ticket is kept.
- Deletion on request within **30 days** (email Anadi, or reply "delete").
- Order records (Stripe, `kit_orders`): kept as long as Indian tax and accounting law requires, and long enough to re-download.

## Entry points

| Entry point | What is collected | Stored where | Who can access | Retention | Basis / consent |
|---|---|---|---|---|---|
| `/audit` form (AI visibility, DPDP) via `api/audit.ts` | Name, email, site URL, free-text answers | Email to Anadi and a confirmation to the visitor (Resend). From the ticket work (Tasks 5 and 6) also a ticket in Supabase (`clients`, `tickets`, `ticket_events`) | Anadi only. Resend and Supabase as processors | 24 months after last activity, then deleted. Deleted on request | Contract steps at the visitor's request (they asked for the report). Form states what is kept and links to the privacy page |
| `/audit?type=app` form via `api/rescue-audit.ts` (`AppAuditForm`) | Name, email, app URL, stack, description, optional WhatsApp number | Same as above | Same | Same | Same |
| Bit chat (scripted flows) + `POST /api/bit/ticket` (Task 5) | Only what the visitor submits at the end: name, email, optional company and WhatsApp, app URL, stack, answers, optional budget, category, opt-in flags. Scripted flows run in the browser and send nothing until then | Supabase: `clients`, `tickets` (number A-1001+), `ticket_events`, `messages`, `briefs`. Email via Resend | Anadi only (server-side secret key; RLS on, no public policies) | 24 months after last activity | Contract steps at the visitor's request. Public board and WhatsApp updates are separate explicit opt-ins (tick boxes, off by default) |
| Bit AI answers, `POST /api/bit/ask` (Task 8) | The typed question (≤ 500 chars, emails and phone numbers masked), the chat node and the button answers so far. No name, no email, no app link, nothing from the ticket form | Sent to Vercel AI Gateway, with Groq as fallback. Not stored by this site; logs keep only route, latency, model and guard outcome. Gateway routing set to providers that do not train on prompts (`disallowPromptTraining`) | Anadi does not see it after the answer. Processors per their terms | Not stored beyond the ticket. Nothing persists on the site | Legitimate interest in answering the question the visitor asked. The widget says AI answers are used and what is sent |
| New-ticket alerts to Anadi (Task 6) | Ticket summary | Email (Resend) and WhatsApp to Anadi's own number via Meta WhatsApp Cloud API. Env-gated | Anadi | Messages live in his inbox and phone. `notifications` outbox rows follow the ticket's retention | Legitimate interest (running the business) |
| WhatsApp updates to clients (Task 6) | Client WhatsApp number, update text | Meta WhatsApp Cloud API. `notifications` outbox in Supabase | Anadi, Meta as processor | Follows the ticket | Consent: only if the client ticks the opt-in. Can opt out by replying or emailing |
| Public tracking board (Task 7) | Shown publicly: ticket number, anonymised category, stack, stage, date. Never name, email, URL, company | Read from `tickets` through an API route that selects safe columns | Anyone, for opted-in tickets only | While the ticket exists | Consent: `board_opt_in` tick box, off by default |
| `/api/rescue-audit` and `/api/audit` ticket creation (Task 6) | Same as the form | Supabase tickets after the emails are sent | Anadi | 24 months after last activity | As above |
| `/teardown` (Wrapper Test) via `api/teardown-report.ts` | Thirteen answers and the email address, only if the visitor asks for the emailed report | Email via Resend. Not stored by the site | Anadi sees the send in Resend logs | Per Resend retention | Contract steps at the visitor's request |
| `/review` via `api/review.ts` | Name, title, company (optional), rating, review text, optional photo | Supabase `reviews` table (`approved = false` until Anadi approves) and the `review-photos` storage bucket (public). Email to Anadi | Anadi. Approved reviews and photos are public | Until the reviewer asks for removal | Consent: the visitor submits it to be shown. Photo is optional |
| Production Kit checkout (`api/production-kit-checkout.ts`, `api/kit/*`, `api/stripe-webhook.ts`, `api/production-kit-download.ts`) | Email, name and country (Stripe), what was bought. Card details go to Stripe only | Stripe. Supabase `kit_orders`, `kit_order_items`, `kit_access` (hashed download token), `stripe_events`. Resend delivery email | Anadi. Stripe, Supabase and Resend as processors | Tax and accounting period, and while re-download may be needed | Contract (the purchase) and legal obligation (tax) |
| `/scan` (Supabase check) via `api/scan.ts` | The project URL and public anon key typed in, used for the one check | **Stores nothing.** Not logged | Nobody | None | Visitor-initiated; no persistence |
| `/ai-readiness` via `api/ai-readiness.ts` | A public URL to analyse | Not stored | Nobody | None | Visitor-initiated |
| `scorecard_runs` (Task 5) | Scorecard answers/score with no direct identifier unless the visitor attaches it to a ticket | Supabase | Anadi | 24 months | Legitimate interest |
| Error reports, `POST /api/client-error` (Task 3) | Browser error message, source file, line, page path. No personal data | Vercel logs (`[client-error]`) | Anadi | Vercel log retention | Legitimate interest (keeping the site working) |
| Analytics (Vercel Analytics) | Page views and events, rough country, device type. No cookies, not personally identifying | Vercel | Anadi | Per Vercel | Legitimate interest |
| Email to the address on the site | Whatever the sender writes | Anadi's mailbox | Anadi | 24 months after last contact, then deleted | Legitimate interest / contract |

## Processors

Stripe (payments), Supabase (database, review photos), Resend (email), Vercel (hosting, analytics, AI Gateway), Groq (AI fallback, question text only), Meta WhatsApp Cloud API (alerts to Anadi; clients only if they opt in). Some store data outside India. No data is sold or used for advertising.

## Deletion procedure

1. Request arrives by email (including a reply of "delete").
2. Within 30 days: delete the client and their tickets/events/messages/briefs/notifications in Supabase (the `clients` row cascades), remove review rows and photos if requested, and ask Stripe/Resend to erase where applicable. Order records needed for tax are kept and the requester is told so.
3. Reply to confirm.
4. Anything older than 24 months with no activity is deleted on the periodic clean-up (manual until automated; see `docs/launch-checklist.md`).
