# Launch checklist

## Security headers (Task 2)

Site-wide headers are in `vercel.json` (`source: "/(.*)"`). The CSP ships as `Content-Security-Policy-Report-Only`, so nothing can break yet. It applies to `portfolio.anadithakur.in` too.

1. Deploy a preview and run it through https://securityheaders.com (use the preview URL). Expect HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and X-Frame-Options present.
2. Open the preview in a browser on both hosts (main site and the portfolio host) and click through home, Bit, /audit, /kit, checkout redirect, and the portfolio. Read the DevTools console for "Content Security Policy" report-only violations. There is no report endpoint; the console is the source.
3. Add any legitimate blocked origin to the matching directive in `vercel.json`, redeploy, repeat until the console is clean.
4. Switch to enforcing: rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `vercel.json` (and update `src/lib/security/headers.test.ts`), deploy to preview, re-check, then promote.
5. Optional later: remove `'unsafe-inline'` from `script-src` (needed today for SSG inline data and JSON-LD) using nonces or hashes.
6. HSTS has `preload`: submit at https://hstspreload.org only when every subdomain is HTTPS-only.

## Monitoring (Task 3)

1. Create a free uptime monitor (UptimeRobot or Better Stack) on `https://anadithakur.in/` and on `https://anadithakur.in/api/health`, alerting by email. `/api/health` returns 200 with `{ ok, checks }`, and 503 (`ok: false`) when Supabase is configured but unreachable. A `missing` check is informational and stays 200, so alert on HTTP status, not on a `missing` value.
2. Browser errors go to `/api/client-error` and appear in Vercel logs as `[client-error]` lines; API handler crashes appear as `[api-error]`. Search the project's Vercel logs for those tags. The portfolio host is not reported.
3. Optional upgrades: Vercel Log Drains to a log service, or Sentry for grouping and alerts. Not needed to launch.

## Privacy & SEO (Task 4)

1. Privacy copy is live in `src/pages/Legal.tsx` and `docs/data-map.md` describes the full pipeline (Bit, tickets, WhatsApp, AI answers, public board). Do not deploy before Tasks 5 to 8 land, since the copy describes tickets, WhatsApp alerts and AI answers as already running. If any of those is dropped, edit the Privacy page and the form lines first.
2. Retention: tickets and leads are deleted 24 months after last activity. This is a manual clean-up until automated. Put a recurring reminder (quarterly) to delete `tickets` and `clients` with no activity for 24 months.
3. Verify `https://anadithakur.in` in Google Search Console (DNS TXT record) and Bing Webmaster Tools, then submit `https://anadithakur.in/sitemap.xml` to both. Bing also feeds ChatGPT search.
4. IndexNow (optional): generate a key (any 8 to 128 hex chars), add `public/<key>.txt` containing just the key, then POST changed URLs to `https://api.indexnow.org/indexnow` after each deploy. Not wired into the build yet.
5. After deploy, check `https://anadithakur.in/rss.xml` in a feed reader (full content) and view-source the sitemap for the trailing-slash root and `<image:image>` entries.

## Database (Task 5)

1. Apply `supabase/migrations/20261016000000_tickets.sql`: either paste it into the Supabase SQL editor and run it once, or run `supabase db push` from the repo (linked project). It creates the tickets tables, the `ticket_number_seq` sequence (first number `A-1001`), the `public_board` view, and turns RLS on with no policies. Run it once only; it is not idempotent.
2. Confirm `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set in Vercel (Production and Preview). Without them the ticket store is off and the UI falls back to the first-bug form and email.
3. Check in the SQL editor: `select * from public.public_board;` returns no rows, and as the anon key `select` on `tickets` is denied.

## Tickets & alerts (Task 6)

New endpoints: `POST /api/bit/ticket` (Bit's form; answers 501 `tickets not configured` until Supabase is set) and `GET /api/cron/notify` (daily retry). The audit forms (`/audit`, `/audit?type=app`) also save a ticket after their own emails go; if the store is missing they behave exactly as before.

### Environment variables (Vercel, Production and Preview)

| Name | Value | Notes |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | from Task 5 | Required for any ticket to be saved |
| `RESEND_API_KEY` | existing | Without it, emails are skipped and logged |
| `TICKETS_INBOX` | where new-ticket emails go | Optional. Defaults to `RESCUE_INBOX`, then `anadithakur99@gmail.com` |
| `CRON_SECRET` | any long random string | Required for the retry cron. `/api/cron/notify` returns 401 without it (it fails closed). Vercel sends it as `Authorization: Bearer <value>` automatically |
| `WHATSAPP_TOKEN` | Meta permanent access token | WhatsApp alert is skipped (and logged) if any of the four WhatsApp vars is missing |
| `WHATSAPP_PHONE_NUMBER_ID` | the sender's Phone number ID (not the number) | |
| `WHATSAPP_ALERT_TO` | your number, digits only with country code, e.g. `919876543210` | The alert recipient |
| `WHATSAPP_TEMPLATE_NEW_TICKET` | the approved template name, e.g. `new_ticket_alert` | |

`/api/health` already reports whether the WhatsApp vars are present.

### Meta WhatsApp Business setup (once)

1. Go to https://business.facebook.com, create or pick a Meta Business account, and verify the business (needed for higher limits; not for the first test messages).
2. At https://developers.facebook.com create an app (type Business), add the **WhatsApp** product, and attach the business account.
3. Add a sender phone number. It must **not** be registered on the WhatsApp or WhatsApp Business app (a number can be either on the app or on the Cloud API, not both). A spare SIM or a Meta test number works. Copy its **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
4. Create a **System User** in Business settings, give it the app and `whatsapp_business_messaging` + `whatsapp_business_management`, and generate a token with no expiry. That is `WHATSAPP_TOKEN`. Do not use the 24-hour test token in production.
5. Add your own number as the recipient (`WHATSAPP_ALERT_TO`). Business-initiated messages only work through an approved template, which is what the code sends.
6. In WhatsApp Manager, Message templates, create a template:
   - Category: **Utility**
   - Name: `new_ticket_alert` (lowercase, underscores; this is `WHATSAPP_TEMPLATE_NEW_TICKET`)
   - Language: English (`en`)
   - Body, exactly: `New ticket {{1}} · {{2}} · {{3}}`
   - Parameter order: `{{1}}` = ticket number (e.g. A-1001), `{{2}}` = kind (e.g. first_bug), `{{3}}` = short summary (app host or name, at most 60 characters)
   - Sample values when asked: `A-1001`, `first_bug`, `myapp.lovable.app`
   - No header, footer or buttons.
   Approval usually takes minutes to a day. Until it is approved the API returns an error, the row is retried by the cron, and after 3 tries it stays `failed` in the `notifications` table.
7. Test: submit a ticket from a Preview deploy and check the WhatsApp message and the `notifications` row (`status = sent`).

### Resend

The sender is `Anadi Thakur <tickets@anadithakur.in>`. The `anadithakur.in` domain is already verified for `audit@` and `rescue@`; any address on a verified domain works, so no new DNS is needed. Check in Resend that the domain still shows Verified.

### Cron

`vercel.json` adds `/api/cron/notify` daily at 07:00 UTC. On the Hobby plan crons run at most once a day, so a failed email or WhatsApp is retried the next morning, up to 3 attempts in total (the inline send counts as the first). On Pro you can shorten the schedule (for example `*/15 * * * *`). Rows that exhaust their attempts stay `failed` with `last_error` in Supabase.

### Manual follow-ups

- Stage-change emails (`stage_change` template) are built but not triggered by anything yet; they go out when a later admin action moves a stage.
- Messages about price, scope, findings, fit or follow-ups are saved as drafts in `messages`, never sent. Review them in Supabase.

## Chat tickets and live board (Task 7)

No new env vars. Both features need the Task 5/6 setup (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, the tickets migration applied). Until then the chat form says it could not save the request and offers the first-bug form and email, and the homepage board shows its empty state.
- After applying the migration, submit one test request in Bit's chat with "Show my request on the public board" ticked. The board stays on its empty state until 3 opted-in tickets exist (`GET /api/board` returns the count in `total`).
- `/api/board` is cached for 5 minutes (`s-maxage=300`), so a new ticket can take up to that long to appear.
