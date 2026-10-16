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
