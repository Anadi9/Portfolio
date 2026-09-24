# Project instructions (Production Kit)

These rules apply to every change in this repo. The stack is a Vite + React or Next.js frontend with Supabase (Postgres, Auth, Storage), usually deployed on Vercel. If something here conflicts with what you see in the code, ask before changing direction.

Before you start: read `package.json`, the router setup, the Supabase client file(s), and `supabase/migrations/` if it exists. Match the patterns already in use.

---

## 1. Security (non-negotiable)

### Keys
- The browser may only ever see the Supabase **publishable/anon** key (`sb_publishable_...` or the legacy `anon` JWT). It is safe to expose **only because** RLS protects the data.
- The **secret/service_role** key (`sb_secret_...` or the legacy `service_role` JWT) bypasses RLS completely. It must never appear in:
  - any variable prefixed `VITE_`, `NEXT_PUBLIC_`, `PUBLIC_` or `EXPO_PUBLIC_`
  - any file under `src/` in a Vite app, or any file marked `"use client"` / imported by a client component in Next.js
  - git history, logs, error messages, or screenshots
- Use the secret key only in server code: Next.js route handlers / server actions, Vercel functions (`api/`), or Supabase Edge Functions. In Next.js, add `import "server-only"` at the top of modules that read it.
- Never hardcode any key or password in source. If you find one, stop and tell the user; it must be rotated, not just deleted.

### Row Level Security
- Every table in an exposed schema (`public` by default) has RLS enabled. No exceptions, including "internal" or "temporary" tables.
- Enabling RLS with no policies denies everything to anon/authenticated. That is the correct starting point; then add the specific policies needed.
- Policies reference the user as `(select auth.uid())`, not bare `auth.uid()`. The subselect lets Postgres evaluate it once per query instead of once per row.
- Always add `to authenticated` (or `to anon`) so the policy doesn't run for roles it doesn't apply to.
- `update` policies need both `using` (which rows can be targeted) and `with check` (what the row may look like after). Without `with check`, a user can reassign a row's `user_id` to someone else.
- `insert` policies use `with check ((select auth.uid()) = user_id)`. Never trust a `user_id` sent from the client; default the column to `auth.uid()` where possible.
- Never use `using (true)` for write operations. `using (true)` for `select` only when the data is genuinely public.
- Do not base authorization on `auth.jwt() -> 'user_metadata'`. Users can edit their own `user_metadata`. Use `app_metadata` or a table you control.
- Views bypass RLS by default (they run as their owner). On Postgres 15+ create them `with (security_invoker = true)`, or don't put them in `public`.
- `security definer` functions bypass RLS. Put them in a non-exposed schema (e.g. `private`), set `set search_path = ''`, and fully qualify every table name.
- Every new table migration must include `alter table ... enable row level security;` and its policies in the same file.

### Storage
- Buckets are private unless the files are meant to be world-readable (e.g. public marketing images). User uploads default to private + signed URLs.
- Write policies on `storage.objects` scoped by bucket and folder, e.g. `bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text`.
- Upload paths start with the user's id: `${user.id}/${filename}`.
- Set allowed MIME types and a max file size on the bucket.

### Server-side validation
- Anything the client sends is untrusted. Validate shape and size on the server (zod or equivalent) in route handlers, server actions and edge functions.
- Client-side validation is for UX only. Business rules (prices, quotas, roles, ownership) are enforced in the database (constraints, RLS) or on the server.
- Never compute a price, discount or permission on the client and send it to the server as truth.
- Webhooks (Stripe etc.) must verify signatures before doing anything.

---

## 2. Auth (Supabase)

- **Site URL** (Supabase Dashboard > Authentication > URL Configuration) is the production URL. **Redirect URLs** list every environment: `http://localhost:5173/**` (Vite) or `http://localhost:3000/**` (Next), the production domain, and the preview pattern (e.g. `https://*-<team-slug>.vercel.app/**`).
- Always pass an explicit redirect: `signUp({ email, password, options: { emailRedirectTo } })`, `signInWithOtp({ email, options: { emailRedirectTo } })`, `resetPasswordForEmail(email, { redirectTo })`, `signInWithOAuth({ provider, options: { redirectTo } })`. Build it from `window.location.origin` (client) or a configured site URL env var (server). If the URL isn't in the allow-list, Supabase silently falls back to the Site URL.
- With email confirmation on, `signUp` returns a user but **no session**. The UI must say "check your email", not navigate to a protected page.
- Supabase's built-in email sender is for testing only and heavily rate-limited. Production needs custom SMTP (Resend, Postmark, SES, etc.).
- Password reset: the link lands the user on the `redirectTo` page with a recovery session; listen for the `PASSWORD_RECOVERY` event (or just check for a session on that page) and call `supabase.auth.updateUser({ password })`.
- Session handling:
  - Vite/SPA: one Supabase client (singleton module). Subscribe to `onAuthStateChange` once at the app root and unsubscribe on unmount. Do not `await` other Supabase calls inside the callback (it can deadlock); defer them with `setTimeout(..., 0)` or move them out.
  - Next.js: use `@supabase/ssr` with separate browser and server clients, and the cookie-refreshing middleware (`middleware.ts`, named `proxy.ts` in Next.js 16+).
  - On the server, trust `supabase.auth.getUser()` (or `getClaims()`), never `getSession()`; `getSession()` reads the cookie without validating it.
- Protected routes: render a loading state until the initial session check resolves. Don't redirect to /login while the session is still loading.
- Handle the `?error=...&error_description=...` params Supabase appends on failed confirm/reset links and show a human message.
- Profile rows: create them with a database trigger on `auth.users` (a `security definer` function with `set search_path = ''`), not from the client after sign-up.

---

## 3. Environment variables

- Vite: only `VITE_*` vars reach the browser. Next.js: only `NEXT_PUBLIC_*`. **Anything with those prefixes is public**, it's inlined into the JavaScript bundle at build time.
- Public: Supabase URL, publishable/anon key, analytics IDs, Stripe publishable key. Everything else is server-only.
- Because public vars are inlined at build time, changing them on Vercel requires a **redeploy**.
- Keep `.env*` files (except `.env.example`) in `.gitignore`. Maintain `.env.example` with every variable name and no real values.
- Read env vars in one place (e.g. `src/lib/env.ts`) and fail loudly if a required one is missing, rather than letting `undefined` flow into a client constructor.

---

## 4. Deployment (Vercel)

- Client-side routed SPAs (Vite + React Router) need a rewrite so deep links don't 404 on refresh. `vercel.json`:
  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
  Static files and `/api/*` functions are served before rewrites apply. Next.js does not need this.
- Set env vars in Vercel for each environment (Production, Preview, Development) separately. Preview deploys that talk to the production database are a risk; prefer a separate Supabase project or branch for previews.
- `npm run build` must pass locally before pushing. Type errors and lint errors are not "fine because it runs in dev".
- Have a real 404 page (a catch-all route in the SPA; `not-found.tsx` in Next.js) and an error boundary around the app.
- Custom domain: add it in Vercel, then update Supabase Site URL, Redirect URLs, and OAuth provider callback settings to match.

---

## 5. Data and migrations

- Schema changes go in migration files (`supabase migration new <name>`, then edit the SQL), committed to git. Do not tell the user to click around the dashboard for schema changes unless they have no CLI setup, and then give them the exact SQL to run in the SQL editor and save it to a migration file too.
- Never edit a migration that has already been applied. Write a new one.
- Destructive changes (drop column/table, change type) require the user's explicit confirmation and a note on data loss.
- Index every foreign key column and every column used in `where`, `order by` or RLS policies (e.g. `user_id`, `team_id`, `created_at` for feeds). Postgres does not index foreign keys automatically.
- Use `timestamptz` not `timestamp`; `uuid` primary keys with `default gen_random_uuid()`; `not null` wherever a value is required; `check` constraints for enums/ranges.
- After schema changes, regenerate types: `supabase gen types typescript --linked > src/types/database.ts` (adjust path).
- Select only the columns you need. Paginate lists (`.range()`); never load an unbounded table into the browser.

---

## 6. Error handling

- Every Supabase call returns `{ data, error }`. Check `error` every time. Never destructure only `data`.
- Show the user a clear, non-technical message; log the technical detail (console in dev, an error tracker like Sentry in production).
- Never swallow errors with an empty `catch {}`.
- Every async UI has three states: loading, error, and empty. Handle all three.
- Disable submit buttons while a request is in flight to prevent double submits.
- Do not expose raw database errors, stack traces or secrets in API responses.

---

## 7. Performance

- Lazy-load routes: `React.lazy(() => import("./pages/Settings"))` with `<Suspense>` (Vite), or rely on Next.js route splitting plus `next/dynamic` for heavy client-only widgets.
- Don't import a whole library for one function (lodash, date libraries, icon packs: import named icons only).
- Images: serve at the size they're displayed, in WebP/AVIF, with explicit `width` and `height` (prevents layout shift). `loading="lazy"` for below-the-fold images; the main above-the-fold image is eager with `fetchpriority="high"`. In Next.js use `next/image`.
- Avoid request waterfalls: fetch independent data in parallel (`Promise.all`), and don't fetch in a child what the parent already has.
- Don't put `select *` queries inside loops (N+1). Use joins via Supabase's embedded selects: `.select("id, title, author:profiles(name)")`.

---

## 8. SEO basics (especially client-rendered SPAs)

- A Vite SPA ships an almost empty `index.html`; crawlers that don't run JavaScript (most AI crawlers, social preview bots) see nothing. For pages that must be found (landing, pricing, blog, docs), prerender them at build time or use SSR/SSG (Next.js, Astro).
- Every public route has a unique `<title>` (under ~60 chars), `<meta name="description">`, a canonical URL, and Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`).
- Ship `robots.txt` and `sitemap.xml` at the site root. Don't block `/assets` or JS/CSS in robots.
- One `<h1>` per page, real `<a href>` links for navigation (not `onClick` on divs), `alt` text on meaningful images.
- Logged-in app pages should be `noindex`.
- Verify with `curl -s https://yoursite.com/page | grep -i "<title>"`. If the title and content aren't in the raw HTML, crawlers without JS don't see them.

---

## 9. How to change code safely

- **Reproduce first.** Before fixing a bug, state how to reproduce it and what the expected behavior is. If you can't reproduce it, say so rather than guessing.
- **Smallest diff that solves the problem.** Don't rewrite, restructure, rename or "clean up" working code that isn't part of the task. Don't swap libraries, change styling systems, or upgrade dependencies unless asked.
- **One concern per change.** If you notice other problems, list them at the end; don't fix them silently.
- **Don't delete code you don't understand.** Ask, or leave it and flag it.
- **Preserve behavior.** When refactoring is required, keep inputs, outputs and UI identical unless the task says otherwise.
- **Verify before claiming done.** Run the project's checks (`npm run build`, `npm run lint`, `npm test` / typecheck, whichever exist) and report the actual result. "It should work" is not verification. If you can't run something, say exactly what the user should check by hand.
- **Say what changed.** End every task with: files changed, what each change does, how to test it, and anything the user must do outside the code (dashboard settings, env vars, migrations to run, redeploys).
- **Suggest a git commit checkpoint** after each working step so a bad next step can be reverted.
- **Never** run destructive commands (`git reset --hard`, `git push --force`, `supabase db reset` against a linked project, `drop table`) without explicit permission.
