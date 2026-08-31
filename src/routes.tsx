import type { RouteRecord } from 'vite-react-ssg';

/**
 * The route table, as an array rather than JSX.
 *
 * `vite-react-ssg` needs a data structure it can walk at build time to know
 * what to prerender, which is why the old declarative `<BrowserRouter>` /
 * `<Routes>` tree in `App.tsx` had to go. Nothing else in Phase 1 matters until
 * this exists: without prerendered HTML, a notes page is an empty `<div id=
 * "root">` to every crawler that reaches it.
 *
 * Every route is `lazy`, and the notes routes deliberately share one module.
 * The front page carries GSAP, Lenis and the intro loader; the notes routes
 * carry the MDX corpus. Neither should pay for the other, and someone arriving
 * from Google on a two-minute read must not download a scroll-animation engine
 * to get there.
 */
export const routes: RouteRecord[] = [
  {
    path: '/',
    lazy: () => import('./pages/Home').then((m) => ({ Component: m.default })),
    entry: 'src/pages/Home.tsx',
  },
  // Deliberately absent from every nav. It is shared by link, not browsed to —
  // but it still has to prerender, or the link someone opens from a DM resolves
  // to an empty root div.
  {
    path: '/work-with-me',
    lazy: () => import('./pages/WorkWithMe').then((m) => ({ Component: m.default })),
    entry: 'src/pages/WorkWithMe.tsx',
  },
  {
    path: '/notes',
    lazy: () => import('./pages/NotesIndex').then((m) => ({ Component: m.default })),
    entry: 'src/pages/NotesIndex.tsx',
  },

  // One dynamic route per stream, each resolved against the content index at
  // build time. `getStaticPaths` imports the corpus dynamically so it stays out
  // of the client entry chunk — it only ever runs in Node, during prerender.
  // It returns whole paths, not bare slugs: the prerenderer treats each returned
  // string as a URL to render, so a slug alone lands the page at `/system`.
  {
    path: '/drops/:slug',
    lazy: () => import('./pages/NoteRoute'),
    entry: 'src/pages/NoteRoute.tsx',
    getStaticPaths: async () => (await import('./content')).postsByStream('drop').map((p) => p.path),
  },
  {
    path: '/wisdom/:slug',
    lazy: () => import('./pages/NoteRoute'),
    entry: 'src/pages/NoteRoute.tsx',
    getStaticPaths: async () => (await import('./content')).postsByStream('wisdom').map((p) => p.path),
  },
  {
    path: '/dispatch/:slug',
    lazy: () => import('./pages/NoteRoute'),
    entry: 'src/pages/NoteRoute.tsx',
    getStaticPaths: async () => (await import('./content')).postsByStream('dispatch').map((p) => p.path),
  },

  // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
  {
    path: '*',
    lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.default })),
    entry: 'src/pages/NotFound.tsx',
  },
];
