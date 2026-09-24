/**
 * The artefact each generated cover shows: the few lines of code, output or
 * error the post is actually about, lifted from the post itself.
 *
 * Keyed by the post's path. A line starting with `!` is the one that matters and
 * is set in gold; everything else is context. Keep it short: seven lines at
 * most, under sixty-five characters each, and never anything the post doesn't say.
 *
 * A post with no entry here still gets a cover, headline only.
 */
export const evidence = {
  '/fixes/lovable-supabase-rls': [
    'create policy "Enable read access for all users"',
    'on public.orders',
    'for select',
    '!using (true);',
  ],
  '/fixes/supabase-service-role-key-leaked': [
    "const key = 'PASTE-THE-KEY-HERE';",
    "JSON.parse(atob(key.split('.')[1]));",
    '',
    '!{ iss: "supabase", role: "service_role", ... }',
  ],
  '/fixes/supabase-auth-signup-login-broken': [
    'await supabase.auth.signUp({ email, password });',
    '// the user appears in Supabase',
    '',
    'await supabase.auth.signInWithPassword({ email, password });',
    '!Email not confirmed',
  ],
  '/fixes/works-locally-breaks-on-vercel': [
    'VITE_SUPABASE_URL=https://your-project.supabase.co',
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOi...',
    '',
    'Could not resolve "./components/navbar" from "src/App.tsx"',
    '!404: NOT_FOUND',
  ],
  '/fixes/lovable-app-invisible-to-google-and-chatgpt': [
    '<title>My App</title>',
    '<body>',
    '!  <div id="root"></div>',
    '</body>',
  ],
  '/fixes/ai-prompt-breaks-other-things': [
    'The checkout is broken and the dashboard looks weird,',
    '!can you fix everything and also make the buttons',
    '!more modern?',
  ],
  '/wisdom/ai-built-app-production-checklist': [
    '![ ] Row-level security is on for every table.',
    '[ ] No service_role key anywhere in the frontend.',
    '[ ] The confirmation email arrives.',
    '[ ] Every environment variable exists on the host.',
    '[ ] Deep links survive a refresh.',
  ],
};
