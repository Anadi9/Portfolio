---
name: auth-flow-fix
description: Diagnose and fix Supabase Auth problems. Use when sign-up, login, email confirmation, magic links, password reset, OAuth (Google/GitHub) login, or sessions don't work - e.g. confirmation emails not arriving, links redirecting to localhost, "Email link is invalid or has expired", "Email not confirmed", users logged out on refresh, redirect loops, or "Invalid Refresh Token".
---

# Supabase auth flow fix

Diagnose before changing code. Most auth bugs are configuration, not code, and rewriting the auth module usually makes things worse.

## Step 1: Pin down the failure

Ask for or find:
1. Which flow: sign-up, email confirmation, login, magic link/OTP, password reset, OAuth, session persistence, logout.
2. The exact error text (UI, browser console, and the URL after a failed redirect: Supabase appends `?error=...&error_code=...&error_description=...` or the same in the `#` fragment).
3. Where: localhost, preview deploy, production. Which browser/device, and whether the email link was opened on the same device.
4. Supabase Dashboard > Logs > Auth logs for the time of the failure. These usually name the cause directly.

Then read the code: the Supabase client setup, every `supabase.auth.*` call, the auth callback/confirm route, and the route guard.

## Step 2: Check configuration (most common causes)

Dashboard > Authentication > URL Configuration:
- **Site URL** must be the production URL. If it's `http://localhost:3000`, every email link sends users to localhost.
- **Redirect URLs** must include each origin used: `http://localhost:5173/**`, `https://yourdomain.com/**`, preview pattern like `https://*-<team>.vercel.app/**`. If a `redirectTo` isn't in this list, Supabase silently uses the Site URL instead.

Email delivery (Dashboard > Authentication > Emails / SMTP settings):
- The default email service is for development only. It is heavily rate-limited and may only deliver to addresses of your project's team members. Real users need custom SMTP (Resend, Postmark, AWS SES, SendGrid...). Symptom: "I never got the email" for everyone except you.
- Check the rate limits under Authentication > Rate Limits.
- Custom SMTP set up but still no email: check the provider's logs, and that the sender domain is verified (SPF/DKIM).

Providers (Authentication > Sign In / Providers):
- "Confirm email" on: `signUp` returns a user but `session` is `null` until the user clicks the link. The UI must show "check your inbox" and not redirect into the app.
- OAuth: the provider's console (Google Cloud, GitHub) must list `https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI (or your custom auth domain). Client ID/secret must be the production ones.

## Step 3: Flow-specific diagnosis

### Sign-up
- User already exists: with confirmation on, Supabase returns a user object with an empty `identities` array instead of an error (to avoid revealing registered emails). Check `data.user?.identities?.length === 0` and show "check your email or log in".
- Always pass `options: { emailRedirectTo: \`${window.location.origin}/auth/callback\` }` (or your confirm route).
- Profile row missing after sign-up: create it with a trigger on `auth.users` (see `sql/example-policies.sql`), not a client insert that runs before the user has a session. If sign-up fails with "Database error saving new user", the trigger function is erroring: check it uses `set search_path = ''` and fully qualified table names, and that the insert satisfies constraints.

### Email confirmation / magic link
- **"Email link is invalid or has expired"** when the user clicks once: often an email security scanner (Outlook Safe Links, corporate gateways) opened the link first and used up the one-time token. Fix: switch the email template to a token-hash link to your own page, e.g. `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`, and have that page call `supabase.auth.verifyOtp({ token_hash, type })`, ideally after the user clicks a button. Or send a 6-digit code (`{{ .Token }}`) instead of a link.
- **PKCE flow** (default in `@supabase/ssr`): the link comes back with `?code=...`, and the app must call `supabase.auth.exchangeCodeForSession(code)` in the callback route. This needs the code verifier stored when the flow started, so it fails when the link is opened in a different browser or device ("both auth code and code verifier should be non-empty"). Tell users to open it on the same device, or use the token-hash approach above, which doesn't depend on the verifier.
- **Implicit flow** (supabase-js default in the browser): tokens arrive in the URL `#` fragment and the client picks them up automatically (`detectSessionInUrl`). If the router redirects before the client initialises, the tokens are lost. Make sure the Supabase client is created at app start and the landing route doesn't redirect immediately.
- Link lands on localhost in production: Site URL / Redirect URLs (Step 2) or a hardcoded `emailRedirectTo`.

### Login
- "Invalid login credentials": wrong password, or the user signed up via OAuth/magic link and has no password.
- "Email not confirmed": the user hasn't clicked the confirmation link. Offer a resend: `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`.
- Login succeeds but the app still shows logged-out: see Session handling.

### Password reset
1. Request: `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${origin}/reset-password\` })`. `/reset-password` must be in Redirect URLs.
2. The link signs the user in with a recovery session and lands on `/reset-password`. In the SPA, `onAuthStateChange` fires `PASSWORD_RECOVERY`. With PKCE/SSR, exchange the code first (or use `verifyOtp` with `type: 'recovery'`).
3. The page shows a new-password form and calls `supabase.auth.updateUser({ password })`. This requires the session from step 2; if it errors with "Auth session missing", the session was never established.
- Common bug: the route guard sees a session and redirects `/reset-password` to the dashboard before the form renders. Exempt that route.

### OAuth
- Redirect goes to the wrong place: `signInWithOAuth({ provider, options: { redirectTo } })` plus Redirect URLs allow-list.
- "redirect_uri_mismatch" on Google: the Supabase callback URL isn't in the Google Cloud console.
- With PKCE (SSR), the callback route must exchange the code: `app/auth/callback/route.ts` calling `exchangeCodeForSession`.

### Session handling
Vite / SPA:
- Exactly one Supabase client instance, created once in a module (`src/lib/supabase.ts`) and imported everywhere. Multiple clients cause lost sessions and "Multiple GoTrueClient instances" warnings.
- Subscribe to `onAuthStateChange` once at the root; return the unsubscribe in the effect cleanup. The callback fires `INITIAL_SESSION` first; use that to end the loading state.
- Do not `await` other Supabase calls inside the `onAuthStateChange` callback; it can deadlock. Wrap them in `setTimeout(() => { ... }, 0)` or trigger them from state changes outside the callback.
- Route guard waits for the initial session check before redirecting to /login. Redirecting while `loading` is true causes "logged out on refresh" and redirect loops.

Next.js (App Router):
- Use `@supabase/ssr`: `createBrowserClient` in client components, `createServerClient` with the cookie adapter in server components/route handlers/actions.
- The middleware (`middleware.ts`; `proxy.ts` in Next.js 16+) must call `supabase.auth.getUser()` (or `getClaims()`) to refresh the session and must return the response object whose cookies it set. Returning a new `NextResponse` without copying cookies logs users out randomly.
- On the server, trust `getUser()`/`getClaims()`, not `getSession()` (it doesn't validate the token).
- Auth-dependent pages must not be statically cached.

"Invalid Refresh Token: Refresh Token Not Found": usually two clients/tabs racing to refresh, a stale session after the user was deleted, or cookies being dropped. Clear the site storage to confirm, then fix the underlying cause (single client, correct middleware cookie handling).

## Step 4: Fix and verify

- Change only what the diagnosis points to. If it's configuration, give the user the exact dashboard steps; don't change code to work around config.
- Test every affected flow end to end on the environment where it failed, in a private window, with a fresh email address (a `+tag` alias works): sign up, confirm, log out, log in, refresh, reset password.
- Report: root cause, what was changed (code and dashboard), and the test results.
