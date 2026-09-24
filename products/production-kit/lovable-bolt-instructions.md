# Production rules (Supabase + React)

## Security
- Never use the Supabase service_role/secret key in frontend code or in VITE_/NEXT_PUBLIC_ variables. Only the anon/publishable key goes in the browser. Secrets go in Edge Functions or server routes.
- Every new table: enable RLS in the same migration, with policies using (select auth.uid()). Name the role (to authenticated). Update policies need both using and with check. Never use true for insert/update/delete.
- Never authorize with user_metadata. Never trust user_id, prices or roles sent from the browser; set them on the server or in the database.
- Storage: private buckets for user files, paths start with the user id, policies check the folder.

## Auth
- Pass emailRedirectTo/redirectTo using window.location.origin on every sign-up, magic link, reset and OAuth call.
- With email confirmation on, sign-up has no session: show "check your email".
- One Supabase client for the whole app. Wait for the initial session before redirecting to login.
- Password reset page calls supabase.auth.updateUser({ password }) and must not be redirected away.

## Data
- Schema changes as migrations. Never drop or rename columns or tables without asking me first.
- Index foreign keys and columns used in filters and policies.
- Check error on every Supabase call. Show loading, error and empty states.
- Select only needed columns; paginate lists.

## Deploy
- For Vercel, keep vercel.json with a rewrite of /(.*) to /index.html so refreshes don't 404.
- Changing VITE_ variables needs a rebuild.

## Performance and SEO
- Lazy-load routes. Size images for display, WebP, with width and height.
- Unique title and meta description per public page; robots.txt and sitemap.xml; noindex on logged-in pages.

## How to change code
- Make the smallest change that solves the request. Don't rewrite, restyle, rename or restructure working code I didn't ask about.
- Don't remove existing features or code you don't understand.
- If a fix needs a bigger change, explain why and ask first.
- After each change, tell me: what changed, what to test, and anything I must do in Supabase or Vercel settings.
