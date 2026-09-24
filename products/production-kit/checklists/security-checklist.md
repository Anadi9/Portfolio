# Security checklist

For a Vite/React or Next.js app on Supabase and Vercel. Each item says how to check it. "Anon key" means your Supabase publishable/anon key, which anyone can find in your site's JavaScript. Assume an attacker has it.

In Claude Code, the `supabase-rls-audit` skill does sections 2–4 with you.

---

## 1. Secrets and keys

- [ ] **No secret in a public env var.** Check every `VITE_*` / `NEXT_PUBLIC_*` variable in `.env*` files and in Vercel settings. Only the Supabase URL, anon/publishable key and other explicitly public IDs belong there.
- [ ] **No secret in the shipped JavaScript.** After `npm run build`: `grep -rE "sb_secret_|service_role|sk_live_|sk_test_|sk-ant-|sk-proj-" dist .next/static` finds nothing. (A legacy `service_role` key is a JWT starting `eyJ`; decode any `eyJ...` string in the bundle at jwt.io and check its `role` isn't `service_role`.)
- [ ] **No secret in git.** `git log --all -p -- .env .env.local .env.production` shows nothing sensitive; `.env*` is in `.gitignore`.
- [ ] **Any key that was ever exposed has been rotated**, not just deleted (Supabase Dashboard > Settings > API Keys; Stripe/OpenAI/Anthropic dashboards).
- [ ] **Secret keys used only on the server** (API routes, server actions, Edge Functions).

## 2. Row Level Security

- [ ] **RLS is enabled on every table in `public`.** Run `sql/rls-status.sql`, query 1.
- [ ] **No table is readable by anon unless it's meant to be public.** Test: `curl "https://<ref>.supabase.co/rest/v1/<table>?select=*" -H "apikey: <anon key>"` for each table.
- [ ] **No write policy uses `true`.** In `pg_policies`, no INSERT/UPDATE/DELETE policy has `qual` or `with_check` equal to `true`.
- [ ] **Insert policies check ownership:** `with check ((select auth.uid()) = user_id)`.
- [ ] **Update policies have `with check`**, so a user can't change `user_id` / `team_id` to someone else's.
- [ ] **No authorization based on `user_metadata`** (users can edit it via `supabase.auth.updateUser`).
- [ ] **Publicly readable tables contain no private columns** (email, phone, address, payment info). RLS hides rows, not columns.
- [ ] **Two-user test done:** as user B, try to read, update and delete user A's rows by ID (via the app and via the API with B's session). All fail.
- [ ] **Role/plan columns can't be self-edited.** If `profiles` has `role`, `is_admin`, `plan` or `credits`, a user's update policy must not let them change those (move them to a table users can't write, or restrict with a trigger/column privileges).

## 3. Views and functions

- [ ] **Views in `public` use `security_invoker = true`** (Postgres 15+), or they expose data regardless of RLS. `sql/rls-status.sql`, query 3.
- [ ] **`security definer` functions in `public` are intentional** and check `auth.uid()` themselves. `sql/rls-status.sql`, query 4. Helpers used only in policies live in a non-exposed schema.
- [ ] **All `security definer` functions set `search_path`** (`set search_path = ''`).
- [ ] **RPC functions validate their arguments** and don't build SQL from strings.

## 4. Storage

- [ ] **User-upload buckets are private** (`sql/rls-status.sql`, query 6). Files are served via signed URLs.
- [ ] **Storage policies check the owner folder**, not just the bucket.
- [ ] **Buckets set a max file size and allowed MIME types.**
- [ ] **Uploaded file names are not trusted**; paths are generated (`${user.id}/${uuid}.${ext}`).

## 5. Auth settings

- [ ] **Email confirmation is on** (unless you have a reason and understand the spam/abuse trade-off).
- [ ] **Minimum password length / strength** configured (Authentication > Providers > Email / password settings).
- [ ] **Redirect URLs allow-list** contains only your own domains. No wildcard that matches domains you don't control.
- [ ] **Rate limits** reviewed (Authentication > Rate Limits); CAPTCHA enabled on sign-up if you see bot sign-ups.
- [ ] **Server code verifies users with `getUser()` / `getClaims()`**, not `getSession()`.
- [ ] **Admin-only pages are protected on the server/database**, not only by hiding the link.

## 6. Server routes and functions

- [ ] **Every API route / server action / Edge Function checks the user** before doing anything user-specific.
- [ ] **Input is validated** (types, lengths, allowed values) on the server.
- [ ] **The user id comes from the session**, never from the request body.
- [ ] **Webhooks verify signatures** (Stripe `constructEvent`, etc.).
- [ ] **Errors returned to the client are generic**; details go to logs.
- [ ] **Expensive endpoints are rate-limited** (AI calls, email sending, anything that costs you money per request).
- [ ] **AI features**: API keys are server-side; user input can't make the model reveal system prompts or other users' data; spending caps are set with the provider.

## 7. Frontend

- [ ] **No `dangerouslySetInnerHTML` with user content**, or it's sanitized (DOMPurify).
- [ ] **User-supplied links** are validated (`https:` only; no `javascript:` URLs).
- [ ] **No sensitive data in `localStorage`** beyond the Supabase session the client manages itself.
- [ ] **No sensitive `console.log`** (tokens, user records) in production.

## 8. Dependencies and platform

- [ ] **`npm audit`** reviewed; critical issues in runtime dependencies fixed.
- [ ] **Framework is on a patched version** (check Next.js/React security advisories if you use SSR or server components).
- [ ] **Supabase account and Vercel account use 2FA.**
- [ ] **Team access** to Supabase/Vercel/GitHub is limited to people who need it.
- [ ] **Backups** exist and you know how to restore.
