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
