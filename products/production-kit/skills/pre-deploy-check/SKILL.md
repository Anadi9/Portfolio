---
name: pre-deploy-check
description: Run a pre-deployment check on a web app before it goes live or before a significant release. Use when the user says they are about to deploy, launch, go live, ship to production, publish, share with real users, or asks "is this ready?". Covers env vars, build, SPA routing, Supabase auth redirect URLs, error pages, console errors and Lighthouse basics.
---

# Pre-deploy check

Work through each section in order. For every item, report PASS, FAIL (with the fix) or CAN'T CHECK (with exactly what the user should check by hand). Don't mark something PASS without having actually checked it.

Start by identifying: framework (Vite SPA, Next.js, other), host (Vercel, Netlify, other), backend (Supabase, other), and the production URL.

## 1. Build

- Run a clean install and production build: `npm ci && npm run build` (or the pnpm/yarn/bun equivalent from the lockfile). It must succeed with no errors. Report warnings about chunk size.
- Run `npm run lint` and a type check (`npx tsc --noEmit`) if configured. Report errors; don't silently disable rules to make them pass.
- Run tests if they exist.
- Serve the production build locally (`npm run preview` for Vite, `npm run start` after build for Next.js) and click through the main flows. Dev mode hides some production-only failures.

## 2. Environment variables

- List every env var the code reads: search for `import.meta.env.`, `process.env.`, `Deno.env.get(`.
- Compare against `.env.example` and against what's set on the host (Vercel: `vercel env ls` if the CLI is available, otherwise ask the user to check Project > Settings > Environment Variables for the Production environment).
- FAIL if any `VITE_*` / `NEXT_PUBLIC_*` variable holds a secret: service_role/secret key, Stripe secret key (`sk_live_`/`sk_test_`), OpenAI/Anthropic keys, database URLs, SMTP passwords.
- FAIL if a secret is hardcoded in source or committed in a `.env` file. Check `git log --all -- .env .env.local` too; a secret in history must be rotated.
- Check the build output for leaked secrets: `grep -rE "sb_secret_|service_role|sk_live_|sk-ant-|sk-proj-" dist .next/static 2>/dev/null`.
- Remind the user: public env vars are baked in at build time, so changing them on Vercel needs a redeploy.
- Production should point at the production Supabase project, not a dev one. Confirm the URL.

## 3. Routing

- Vite/React Router on Vercel: `vercel.json` must contain a rewrite to `/index.html` or deep links 404 on refresh:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
  Netlify: `public/_redirects` with `/*  /index.html  200`.
- After deploying (or on a preview deploy), open a nested route directly in a new tab and refresh. It must load.
- A catch-all 404 route exists and renders something useful (SPA: `path="*"`; Next.js: `app/not-found.tsx`).
- Protected routes redirect logged-out users to login, and don't flash protected content first.

## 4. Supabase auth configuration

Ask the user to confirm in Dashboard > Authentication > URL Configuration (or check `supabase/config.toml` if they manage config in code):
- Site URL = the production URL (not `localhost`).
- Redirect URLs include the production domain (`https://yourdomain.com/**`), preview deploys if used, and localhost for dev.
- Every `emailRedirectTo` / `redirectTo` in the code is built from the current origin or a configured site URL, not hardcoded to localhost.
- Custom SMTP is configured for production. The built-in email service is for testing: it's rate-limited and restricted, so real users may never receive confirmation or reset emails.
- OAuth providers (Google, GitHub, etc.): the provider console lists `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI, and production is not using test credentials.
- Test the full flows on the deployed URL: sign up, confirm email, log in, log out, reset password. See the `auth-flow-fix` skill if any fail.

## 5. Database security

- Every table in `public` has RLS enabled with appropriate policies. Run the `supabase-rls-audit` skill if this hasn't been done.
- Storage buckets holding user files are private.
- All pending migrations have been applied to the production database.

## 6. Errors and resilience

- An error boundary wraps the app (React: an ErrorBoundary component or `react-error-boundary`; Next.js: `app/error.tsx` and `app/global-error.tsx`). Throw a test error to confirm it renders a fallback, not a white screen.
- Every Supabase call checks `error`. Search for `const { data } = await supabase` (destructuring only `data`) and flag each one.
- Loading and empty states exist on every page that fetches data.
- There's some production error visibility: Sentry or similar, or at minimum the user knows where to find Vercel function logs.

## 7. Browser console and network

On the deployed (or `preview`) build, open DevTools on each main page:
- Console: no errors. Warnings about React keys or failed prop types should be fixed; they often indicate real bugs.
- Network: no 4xx/5xx requests on normal use; no requests to `localhost`; no mixed-content (http on https) warnings.
- Remove debug `console.log` statements that print user data or tokens.

## 8. Lighthouse basics

Run Lighthouse in Chrome DevTools (incognito, Mobile preset) on the home page and one key logged-in page, or `npx lighthouse <url> --view`. Look at:
- Performance: LCP under 2.5s, CLS under 0.1. Common fixes: oversized images (resize, WebP/AVIF, `width`/`height` attributes), a giant JS bundle (lazy-load routes), render-blocking fonts (`font-display: swap`).
- Accessibility: form inputs have labels, images have alt text, colour contrast passes, buttons have accessible names.
- Best Practices: no console errors, HTTPS, no deprecated APIs.
- SEO (public pages): title, meta description, crawlable links, `robots.txt` valid. For client-rendered apps see the `ai-visibility` skill.

Scores are guides, not goals. Report the specific failing audits, not just the numbers.

## 9. Basics people forget

- Favicon, page `<title>`, and social preview image set.
- Legal: privacy policy and terms pages if collecting personal data or taking payments.
- Payments: live keys in production, webhook endpoint registered for the production URL, webhook signature verified.
- Custom domain has HTTPS and `www` redirects to the apex domain (or vice versa), not both serving separately.
- Analytics installed if the user wants it.

## Report

Group results by section. Put every FAIL at the top as a numbered fix list, most severe first (security, then broken flows, then everything else). End with what the user must do outside the code (dashboard settings, env vars, redeploy).
