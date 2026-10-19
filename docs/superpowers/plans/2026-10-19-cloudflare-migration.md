# Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan runs in a `/loop`: each iteration takes the first unticked task, does it, ticks it, appends a line to `docs/loop-progress.md` under "Cloudflare migration", and commits.

**Goal:** Serve anadithakur.in and portfolio.anadithakur.in from Cloudflare Workers (free plan, commercial use allowed). Keep every URL, redirect, header, API route and cron the site has on Vercel today, so nothing changes for visitors, Stripe or search engines.

**Architecture:** One Worker with static assets. `dist/` is served as assets; `/api/*`, `/` and `/portfolio` run the Worker first. A small adapter turns a Fetch `Request` into the `VercelRequest`/`VercelResponse` slice the handlers already use (the same slice `scripts/vite-api-dev.ts` fills for `npm run dev`). So the 30 handlers and their tests stay as they are, and `api/*.ts` keeps working on Vercel until the DNS cutover, which is the rollback path. Static redirects and headers are generated from `vercel.json` into `dist/_redirects` and `dist/_headers`, so there's a single source of truth while both hosts exist. Crons become one hourly trigger that dispatches by UTC hour.

**Tech Stack:** Cloudflare Workers + static assets, Wrangler 4, `nodejs_compat`, existing React/Vite SSG build, Supabase, Resend, Stripe (fetch), Vercel AI Gateway (API key).

**Spec:** the conversation of 2026-10-19 (hosting audit → "move to Cloudflare, free for commercial use, same engineering, good for SEO"), plus the rules in `docs/master-plan.md` ("Budget close to $0", "Privacy docs move with the code", send policy).

## Global Constraints

- $0/month: Workers Free (100,000 Worker requests/day, 10 ms CPU per invocation, 5 cron triggers, 3 MB gzipped Worker). Static asset requests are free and don't count toward the limit, so the Worker runs only for `/api/*`, `/` and `/portfolio` in production.
- URLs are unchanged. `/about` is served at `/about` with no trailing slash and no redirect (`html_handling: "drop-trailing-slash"`); unknown paths return 404, not the homepage (`not_found_handling: "none"`).
- Live keys only in production. The preview Worker (`anadi-site-preview`) uses test keys, runs no crons, and sends `X-Robots-Tag: noindex` on every response. The production Worker's `workers.dev` and preview URLs are off, so there is no duplicate-content host.
- No change to handler behaviour, prices, copy or the send policy. The portfolio files listed in `docs/rebrand-progress.md` stay off limits; only the hosting of `portfolio.anadithakur.in` changes.
- No visitor IP stored by the new analytics endpoint. Privacy docs (`/privacy` in `src/pages/Legal.tsx`, `docs/data-map.md`) change in this branch.
- Vercel config (`vercel.json`, `api/`, `scripts/vite-api-dev.ts`) stays working until Anadi cuts over; `npm run dev` is unchanged.
- No manual dashboard step is done by the loop. Every step that only Anadi can do goes in `docs/cloudflare-migration-guide.md`.

## Review Focus

1. Several `Set-Cookie` headers in one response (admin and portal sessions): the adapter must emit each one, or login breaks. → Task 1 test `emits every Set-Cookie value`.
2. The Stripe webhook body must reach `verifyStripeSignature` byte-for-byte, including non-ASCII text, or no sale is delivered. → Task 1 test `raw mode yields the exact bytes`.
3. A client-sent `X-Forwarded-For` or `CF-IPCountry` must not override Cloudflare's own values (rate limits, currency). → Task 1 test `overwrites forwarded headers from the trusted values`.
4. Trailing-slash and redirect behaviour must match today's canonical URLs. → Task 6 smoke checks `/about`, `/about/`, `/work-with-me`, `/rescue/audit`.
5. A handler that returns without responding, or throws, must give a 500 response rather than hang. → Task 1 tests `500 when the handler never responds`, `500 when the handler throws`.

---

### Task 1: Fetch ↔ Vercel adapter

**Files:**
- Create: `worker/adapter.ts`
- Test: `worker/adapter.test.ts`
- Modify: `vitest.config.ts` (include `worker/**/*.test.ts` if it isn't matched already)

**Interfaces:**
- Produces: `runVercelHandler(handler: (req: VercelRequest, res: VercelResponse) => unknown, request: Request, opts: { query?: Record<string, string>; raw?: boolean; clientIp?: string; country?: string }): Promise<Response>`

- [x] Step 1: Write the tests, using Node 22's global `Request`/`Response`:
  - `parses a JSON body` (`req.body` deep-equals the object)
  - `parses a urlencoded body`
  - `raw mode yields the exact bytes` (`for await` over `req` gives a Buffer equal to the UTF-8 of `'{"a":"₹1,599"}'`; `req.body` undefined)
  - `merges search params with route params` (route params win)
  - `lowercases header names`
  - `overwrites forwarded headers from the trusted values` (incoming `x-forwarded-for: 1.1.1.1`, `cf-ipcountry: XX`, `clientIp: '9.9.9.9'`, `country: 'IN'` → handler sees `x-forwarded-for` and `x-real-ip` `9.9.9.9`, `x-vercel-ip-country` and `cf-ipcountry` `IN`, `x-forwarded-host` = URL host, `x-forwarded-proto` = `https`)
  - `status + json`
  - `send(Buffer) is octet-stream and byte-exact`
  - `send(string) is text/html`
  - `emits every Set-Cookie value` (`setHeader('Set-Cookie', ['a=1', 'b=2'])` → `response.headers.getSetCookie()` equals both)
  - `500 when the handler never responds`
  - `500 when the handler throws`
  - `HEAD has no body`
- [x] Step 2: `npx vitest run worker/adapter.test.ts` → FAIL (module missing).
- [x] Step 3: Implement `worker/adapter.ts`. The req is a plain object with `method`, `url`, `headers`, `query`, `cookies: {}`, `body` (JSON / urlencoded / text, mirroring `parseBody` in `scripts/vite-api-dev.ts`) and `[Symbol.asyncIterator]` over the raw bytes. The res supports `status`, `json`, `send`, `end`, `setHeader`, `getHeader`, `hasHeader`, `removeHeader`, `statusCode`, `headersSent`, and resolves a deferred `Response` on the first `json`/`send`/`end`.
- [x] Step 4: the tests pass.
- [x] Step 5: Commit `feat(cf): adapter from Fetch requests to the Vercel handler shape`.

### Task 2: API router, request-scoped waitUntil and country header

**Files:**
- Create: `worker/router.ts`, `worker/router.test.ts`, `src/lib/runtime/wait-until.ts`, `src/lib/runtime/wait-until.test.ts`
- Modify: `src/lib/brief/background.ts` (import `waitUntil` from `../runtime/wait-until.js`), `src/lib/kit/geo.ts` (doc comment names both headers; logic unchanged because the adapter sets `x-vercel-ip-country`), `package.json` (drop `@vercel/functions`)

**Interfaces:**
- Produces: `resolveApi(pathname: string): { handler: Handler; query: Record<string, string>; raw: boolean } | null`. It imports the default exports of `api/[route].ts`, `api/kit/[action].ts`, `api/bit/[action].ts`, `api/cron/[job].ts`, `api/stripe-webhook.ts` and `api/production-kit-download.ts`, and resolves exactly like `resolveFunction` in `scripts/vite-api-dev.ts`: exact file first, then the folder's `[param]`. `raw` is true when the module exports `config.api.bodyParser === false`.
- Produces: `runWithContext<T>(ctx: { waitUntil(p: Promise<unknown>): void }, fn: () => T): T` and `waitUntil(p: Promise<unknown>): void` (uses `AsyncLocalStorage` from `node:async_hooks`; with no context the promise just runs, as in dev and tests).

- [x] Step 1: Tests:
  - router: `/api/scan` → route `scan`; `/api/kit/prices` → action `prices`; `/api/bit/ask`; `/api/cron/heartbeat`; `/api/stripe-webhook` has `raw: true`; `/api/production-kit-download`; `/api/a/b/c` → null; `/api/` → null
  - wait-until: `hands the promise to the context`; `runs without a context`
- [x] Step 2: FAIL.
- [x] Step 3: Implement both, and switch `background.ts`.
- [x] Step 4: `npm test` all green (the existing brief tests still pass).
- [x] Step 5: Commit `feat(cf): API router and request-scoped waitUntil`.

### Task 3: Static config generated from vercel.json, analytics CSP

**Files:**
- Create: `scripts/lib/cf-static.mjs`, `scripts/lib/cf-static.test.ts`, `scripts/generate-cf-static.mjs`
- Modify: `vercel.json` (CSP: `va.vercel-scripts.com` → `static.cloudflareinsights.com` in script-src, `cloudflareinsights.com` in connect-src)

**Interfaces:**
- Produces: `toCloudflareStatic(vercelJson): { headers: string; redirects: string; skipped: string[] }`, and `SECURITY_HEADERS: Record<string, string>` (the `/(.*)` header set, which the Worker reuses for its own responses).

- [x] Step 1: Tests:
  - `/work-with-me /  301`
  - `/rescue/audit /audit?type=app 301`
  - `/rescue /production-ready 301`
  - rewrite → `/kit/downloads/:token /kit/downloads/_ 200`
  - every `has: host` rule lands in `skipped` (those are handled by the Worker and a Redirect Rule)
  - `/(.*)` → `/*` block with all six headers
  - `/kit/(.*)` → `/kit/*`
  - `/admin`, `/portal`, `/admin-sw.js` blocks
- [x] Step 2: FAIL.
- [x] Step 3: Implement. `generate-cf-static.mjs` reads `vercel.json` and writes `dist/_headers` and `dist/_redirects`; it fails if either exceeds Cloudflare's limits (100 header rules, 2,100 redirects).
- [x] Step 4: Pass. Commit `feat(cf): _headers and _redirects generated from vercel.json`.

### Task 4: Kit archive built at build time; web push without node:https

**Files:**
- Create: `scripts/build-kit-archive.ts` (run with `vite-node`; writes `worker/generated/production-kit.zip` via `buildKitArchive`), `src/lib/kit/archive-source.ts`, `src/lib/kit/archive-source.test.ts`
- Modify: `api/production-kit-download.ts` (use `kitArchive()`), `.gitignore` (`worker/generated/`), `src/lib/command/push.ts` + its test

**Interfaces:**
- Produces: `setKitArchive(bytes: Uint8Array): void` and `kitArchive(): Uint8Array` (the injected bytes, else `buildKitArchive(join(process.cwd(), 'products', KIT.archive))`).
- `push.ts`: the send goes through `webpush.generateRequestDetails(...)` plus an injectable `fetch`, so it no longer needs `node:https`. Same public signature, same results for 404/410 (expired subscription).

- [x] Step 1: Spike (scratchpad, not committed): a throwaway Worker that calls `webpush.generateRequestDetails` with a generated P-256 subscription under `wrangler dev` with `nodejs_compat`. If it throws, replace `web-push` with a WebCrypto implementation (RFC 8291 aes128gcm + RFC 8292 VAPID ES256), keeping `push.ts`'s exported signature, and note it in loop-progress.
- [x] Step 2: Tests: `kitArchive returns injected bytes`; `falls back to the folder` (the zip's entries equal those from `buildKitArchive`, without `SALES-PAGE.md`); push `posts the encrypted payload to the endpoint`; `drops the subscription on 410`.
- [x] Step 3: Implement. Commit `feat(cf): prebuilt kit zip and fetch-based web push`.

### Task 5: Worker entry, cron dispatch, wrangler config, analytics endpoint

**Files:**
- Create: `worker/index.ts`, `worker/cron.ts`, `worker/cron.test.ts`, `worker/host.ts`, `worker/host.test.ts`, `worker/env.d.ts`, `wrangler.jsonc`, `src/server/event.ts`, `src/server/event.test.ts`, `src/lib/analytics/track.ts`, `supabase/migrations/20261024000000_events.sql`
- Modify: `src/server/routes.ts` (add `event`), `src/main.tsx` (drop `inject()`), every `import { track } from '@vercel/analytics'` (→ `@/lib/analytics/track`), `package.json` (drop `@vercel/analytics`; add devDeps `wrangler`, `@cloudflare/workers-types`; scripts below), `tsconfig` for `worker/`

**Interfaces:**
- `jobsForHour(hour: number): string[]` returns API paths. Every hour: `/api/cron/heartbeat`. Plus: 02 → `/api/cron/care`, 03 → `/api/cron/summary`, 06 → `/api/kit/ping`, 07 → `/api/cron/notify`, 08 → `/api/cron/scorecard` (the `vercel.json` times; heartbeat becomes hourly, which the plan intended and cron-job.org was standing in for).
- `hostAction(host: string, pathname: string): { kind: 'portfolio-root' } | { kind: 'redirect'; location: string } | { kind: 'pass' }`: `portfolio.anadithakur.in` + `/` → portfolio-root (serve the asset `/portfolio`); `anadithakur.in` or `www.anadithakur.in` + `/portfolio` → 301 `https://portfolio.anadithakur.in/`.
- `track(name: string, props?: Record<string, string | number | boolean>): void`, browser only: `navigator.sendBeacon('/api/event', JSON)`, inside try/catch.
- `POST /api/event`: name must match `/^[a-z][a-z0-9_:-]{1,48}$/`; at most 8 props, each value ≤ 80 characters; 60/min per IP; inserts `{ name, props, path, country }` into `events`; 204 on success, 400 on a bad body, 405 on other methods, 501 without Supabase. The migration enables RLS with no policies (service key only).
- Worker `fetch`: host logic → `/api/*` via `resolveApi` + `runVercelHandler` (with `cf-connecting-ip` and `request.cf.country`) inside `runWithContext(ctx)`, adding `SECURITY_HEADERS` → otherwise `env.ASSETS.fetch`. When `SITE_ENV !== 'production'`, every response gets `X-Robots-Tag: noindex, nofollow`. Unknown `/api/*` → 404 JSON. At module load, call `setKitArchive(new Uint8Array(kitZip))` (`import kitZip from './generated/production-kit.zip'`, a Data rule).
- Worker `scheduled`: production only; for each job, `ctx.waitUntil` on a synthetic `GET https://anadithakur.in<path>` carrying `Authorization: Bearer ${CRON_SECRET}`; logs the status of each.
- `wrangler.jsonc`:
  - `name: "anadi-site"`, `main: "worker/index.ts"`, `compatibility_date` the newest the installed wrangler accepts, no later than `2026-10-01`, `compatibility_flags: ["nodejs_compat"]`
  - `assets: { directory: "./dist", binding: "ASSETS", html_handling: "drop-trailing-slash", not_found_handling: "none", run_worker_first: ["/api/*", "/", "/portfolio"] }`
  - `workers_dev: false`, `preview_urls: false`, `triggers.crons: ["0 * * * *"]`
  - `rules: [{ type: "Data", globs: ["**/*.zip"] }]`, `vars.SITE_ENV: "production"`, `observability.enabled: true`
  - `env.preview`: `name: "anadi-site-preview"`, `workers_dev: true`, `vars.SITE_ENV: "preview"`, `triggers.crons: []`, assets with `run_worker_first: true`
- Scripts:
  - `build`: append `&& node scripts/generate-cf-static.mjs`
  - `prebuild`: append `&& vite-node scripts/build-kit-archive.ts`
  - `cf:dev`: `npm run build && wrangler dev`
  - `cf:deploy`: `wrangler deploy`
  - `cf:deploy:preview`: `wrangler deploy --env preview`

- [x] Step 1: Tests: cron (hour 5 → heartbeat only; hour 2 → heartbeat + care; hour 6 includes kit ping; every hour includes heartbeat); host (the three cases plus `pass`); event (400 on a bad name, 400 on 9 props, 400 on a long value, 405 on GET, 501 without a DB, 204 + insert called with no IP field).
- [x] Step 2: FAIL → implement → `npm test`, `npm run lint`, `npx tsc --noEmit -p .` green.
- [x] Step 3: Commit `feat(cf): Worker entry, hourly cron dispatch, first-party events`.

### Task 6: Build, bundle size and local smoke on workerd

- [x] Step 1: `npm run build` green; `dist/_headers`, `dist/_redirects` present; `worker/generated/production-kit.zip` present.
- [x] Step 2: `npx wrangler deploy --dry-run --outdir .wrangler/dry` → gzipped size under 3 MB (record it). If it's over, find the heavy imports and lazy-load them per route.
- [x] Step 3: `npx wrangler dev --test-scheduled` with `.dev.vars` copied from `.env.local` (git-ignored). curl checks, results recorded in loop-progress:
  - `/` 200, `/about` 200 with no redirect, `/about/` → redirect to `/about`
  - `/work-with-me` 301 `/`, `/rescue/audit` 301, `/kit/downloads/abc` 200
  - HSTS and CSP-Report-Only present on a page and on `/api/health`
  - `/api/health` 200 JSON, `/api/constructor` 404, `/api/nope/x/y` 404
  - `POST /api/stripe-webhook` with a bad signature → 400
  - `-H 'Host: portfolio.anadithakur.in' /` → the portfolio page; `/portfolio` on the main host → 301
  - `/cdn-cgi/handler/scheduled?cron=0+*+*+*+*` → the heartbeat runs
  - `/api/event` POST → 204 or 501
- [x] Step 4: Browser check through `wrangler dev`: home, a note, `/production-ready`, `/audit?type=app` form, Bit chat opens, `/admin` login page renders. No console errors from missing `/_vercel/insights`.
- [x] Step 5: Commit any fixes `fix(cf): …`.

### Task 7: Privacy, docs and the manual guide

**Files:**
- Modify: `src/pages/Legal.tsx` (processors: Cloudflare for hosting, CDN, anonymous analytics and logs; Vercel for the AI Gateway only; new first-party event counts with no IP), `docs/data-map.md` (analytics row, error-logs row, new `events` row, processor list), `src/components/Seo.tsx` comment, `docs/stripe-setup.md` (where secrets live now), `docs/launch-checklist.md` (pointer to the guide)
- Create: `docs/cloudflare-migration-guide.md`, Anadi's step-by-step guide:
  - Cloudflare account and the zone on the Free plan
  - copying the DNS records from GoDaddy, including email MX, SPF, DKIM and the Resend records, set to DNS only (grey cloud)
  - GoDaddy nameserver switch
  - Workers Builds connected to `Anadi9/Portfolio`, with the build command `npm run build`, deploy command `npx wrangler deploy`, non-production deploy `npx wrangler deploy --env preview`, and Node 22
  - every secret and build variable, live for production and test for preview, including the Vercel AI Gateway API key
  - the Supabase `events` migration
  - testing the preview
  - cutover: Custom Domains for `anadithakur.in` and `portfolio.anadithakur.in`, `www` AAAA `100::` proxied, and two Redirect Rules with exact expressions
  - SSL Full (strict) and Always Use HTTPS
  - AI-crawler blocking and managed robots.txt off, Bot Fight Mode off
  - Web Analytics on
  - Stripe test event
  - cron-job.org job off
  - Search Console and Bing sitemap resubmit
  - Vercel kept as rollback for 7 days, then disconnected
  - rollback steps
- [ ] Step 1: Write them. `npm test` and `npm run build` green.
- [ ] Step 2: Commit `docs(cf): privacy, data map and the migration guide`.
- [ ] Step 3: Append "Cloudflare migration complete" to loop-progress, with the manual steps pointer. Stop the loop.
