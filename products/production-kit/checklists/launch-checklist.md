# Launch checklist

Everything to verify before real users touch your app. Work top to bottom; the sections are ordered by how badly a miss can hurt you. Test on the **deployed production URL**, in a private/incognito window, unless an item says otherwise.

Tip: in Claude Code, the `pre-deploy-check` skill walks through most of this for you. Use this list to confirm by hand.

---

## 1. Data security

- [ ] Every table in the `public` schema has RLS enabled (run `sql/rls-status.sql`; no row shows `rls_enabled = false`).
- [ ] Every table the app reads or writes has policies that match who should access it (owner only, team, public read).
- [ ] Logged in as user A, you cannot see or change user B's data (test with two accounts in two browsers).
- [ ] Logged out, protected data doesn't load, including via the API: `curl "https://<ref>.supabase.co/rest/v1/<table>?select=*" -H "apikey: <anon key>"` returns `[]`.
- [ ] The Supabase secret / service_role key is not in any `VITE_` or `NEXT_PUBLIC_` variable, not in client code, and not in git history.
- [ ] Storage buckets with user files are private; users can only access their own files.
- [ ] Supabase Dashboard > Advisors > Security Advisor shows no errors.
- [ ] Full checklist done: [security-checklist.md](security-checklist.md).

## 2. Accounts and auth

- [ ] Supabase Site URL is your production domain (not localhost).
- [ ] Redirect URLs include production, preview (if used) and localhost.
- [ ] Custom SMTP is set up; confirmation and reset emails arrive at a Gmail and an Outlook address, not in spam.
- [ ] Email templates mention your product name and link to your domain.
- [ ] Sign up with a new email → confirmation email → click link → logged in on the production domain.
- [ ] Log out → log back in.
- [ ] Refresh on a logged-in page: still logged in, no redirect loop, no flash of the login page.
- [ ] Forgot password → email → link → set new password → log in with it.
- [ ] Sign up with an email that already exists: sensible message, no crash.
- [ ] Each OAuth provider (Google, GitHub...) works on the production domain, using production credentials (Google consent screen published, not "testing").
- [ ] Logged-out users visiting a protected URL are sent to login, and back to that page after logging in (nice to have).

## 3. Core flows

- [ ] Write down your 3–5 most important user journeys (e.g. sign up → create project → invite teammate → pay). Complete each one end to end on production.
- [ ] Each form: submit valid data, submit invalid data (clear error shown), double-click submit (no duplicates).
- [ ] Every page has a loading state, an error state and an empty state (new account with no data).
- [ ] Deleting something asks for confirmation and actually deletes it (refresh to check).
- [ ] Data survives a refresh (it's really saved, not just in local state).

## 4. Payments (if you charge)

- [ ] Production uses live keys; test keys are only in Preview/Development.
- [ ] A real purchase with a real card works end to end (refund it afterwards).
- [ ] The webhook endpoint is registered for the production URL, verifies signatures, and handles retries without double-crediting.
- [ ] Failed payment, cancelled subscription and refund each update the user's access correctly.
- [ ] Prices and entitlements are decided on the server, not sent from the browser.

## 5. Deployment and configuration

- [ ] `npm run build` passes locally with no errors.
- [ ] All env vars are set in the host for the **Production** environment; redeployed after the last env change.
- [ ] Production points at the production Supabase project.
- [ ] Opening a deep link directly (e.g. `/settings/billing`) and refreshing works (SPA rewrite in place).
- [ ] Unknown URLs show a proper 404 page.
- [ ] Custom domain works with HTTPS; `www` and non-`www` redirect to one of them.
- [ ] All pending database migrations are applied to production.
- [ ] Supabase project is on a plan that won't pause for inactivity (free projects pause after a period of inactivity) and backups meet your needs.

## 6. Errors and monitoring

- [ ] A thrown error in a component shows a friendly fallback, not a white screen.
- [ ] Browser console on each main page: no errors.
- [ ] Network tab: no failing requests on normal use; nothing calling `localhost`.
- [ ] You'll find out when something breaks: error tracking (e.g. Sentry) or at least you know where the Vercel and Supabase logs are.
- [ ] Uptime monitor on the home page (optional but cheap).

## 7. Performance

- [ ] Lighthouse (mobile, incognito) on home and one key page: LCP under 2.5s, CLS under 0.1.
- [ ] Images are sized for display, in WebP/AVIF, with width/height set; none over ~200 KB without a reason.
- [ ] Routes are lazy-loaded; no single JS chunk is unusually large (check build output).
- [ ] App is usable on a real phone over mobile data.
- [ ] Lists are paginated; nothing loads an entire table.

## 8. Mobile and accessibility

- [ ] Every page works at 375px wide: no horizontal scroll, tappable buttons, readable text.
- [ ] Forms work with the phone keyboard (correct `type="email"`, etc.; nothing hidden behind the keyboard).
- [ ] You can tab through the main flows with a keyboard; focus is visible.
- [ ] Inputs have labels; images have alt text; colour contrast is readable.

## 9. SEO and sharing (public pages)

- [ ] Each public page has a unique title and meta description in the raw HTML (`curl -s <url> | grep "<title>"`).
- [ ] Sharing the home page link in Slack/LinkedIn/WhatsApp shows the right title and image.
- [ ] `robots.txt` and `sitemap.xml` exist and are correct; logged-in pages are `noindex`.
- [ ] Favicon and app name are set.
- [ ] Google Search Console is set up and the sitemap submitted.

## 10. Legal and support

- [ ] Privacy policy (required if you collect personal data; also required by Google OAuth and app stores).
- [ ] Terms of service if you charge or host user content.
- [ ] Cookie/analytics consent if you have users in regions that require it (e.g. EU/UK).
- [ ] A visible way to contact you, and a way for users to delete their account/data.
- [ ] Transactional emails come from your domain with SPF/DKIM set up.

## 11. Rollback plan

- [ ] Code is in git and the deployed commit is tagged or noted.
- [ ] You know how to roll back on your host (Vercel: Deployments → promote a previous deployment).
- [ ] You know how to restore the database (Supabase backups / point-in-time recovery on paid plans) and have tested exporting your data at least once.
