import type { RouteRecord } from 'vite-react-ssg';
import RouteTransition from './components/RouteTransition';
import { STREAMS, streamPath } from './data/notes';

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
    // A pathless-in-effect layout: it owns no UI of its own beyond the route
    // chrome (the mini loader and the fade every non-`/` route enters on), and
    // renders the matched page through an `Outlet`. It exists because that
    // chrome has to survive the navigation it is reporting on — mounted inside
    // a page it would unmount the moment the new page arrived, which is exactly
    // when the bar has to finish. Children carry absolute paths: the
    // prerenderer joins a relative child onto its parent prefix, and with `/`
    // as the parent that produces `work-with-me` rather than `/work-with-me`.
    path: '/',
    element: <RouteTransition />,
    children: [
      // The domain sells one thing: the rescue offer is the front page. The
      // portfolio moved to `/portfolio`, which `vercel.json` serves as the root
      // of portfolio.anadithakur.in and 301s to from the main host, so the
      // path itself is never the URL anyone sees.
      {
        index: true,
        lazy: () => import('./pages/Rescue').then((m) => ({ Component: m.default })),
        entry: 'src/pages/Rescue.tsx',
      },
      {
        path: '/portfolio',
        lazy: () => import('./pages/Home').then((m) => ({ Component: m.default })),
        entry: 'src/pages/Home.tsx',
      },
      // Deliberately absent from every nav. It is shared by link, not browsed to,
      // but it still has to prerender, or the link someone opens from a DM resolves
      // to an empty root div.
      {
        path: '/work-with-me',
        lazy: () => import('./pages/WorkWithMe').then((m) => ({ Component: m.default })),
        entry: 'src/pages/WorkWithMe.tsx',
      },
      // Unlike `/work-with-me`, this one is meant to be found: it is the entry
      // point above the paid offers, so it carries full `Seo` and prerenders its
      // intro and first question rather than a Start button.
      {
        path: '/teardown',
        lazy: () => import('./pages/Teardown').then((m) => ({ Component: m.default })),
        entry: 'src/pages/Teardown.tsx',
      },
      // Forty prerendered pages, one per reachable score, resolved from the
      // scorer rather than listed here — see `resultPaths`. A shared result
      // carries its answers in `?a=`, which the prerenderer neither sees nor
      // needs: the score in the path is what sets the title and the OG card,
      // and that is the whole of what a crawler reads.
      {
        path: '/teardown/r/:score',
        lazy: () => import('./pages/TeardownResult').then((m) => ({ Component: m.default })),
        entry: 'src/pages/TeardownResult.tsx',
        getStaticPaths: async () => (await import('./lib/teardown/share')).resultPaths(),
      },
      // The intake for the free audit every CTA on the front page points at.
      // `/rescue` itself is now `/` and 301s there from `vercel.json`.
      {
        path: '/rescue/audit',
        lazy: () => import('./pages/RescueAudit').then((m) => ({ Component: m.default })),
        entry: 'src/pages/RescueAudit.tsx',
      },
      // The free Supabase security check: a lead magnet for the rescue offer.
      // Its findings CTA deep-links into `/rescue/audit?s=1`.
      {
        path: '/scan',
        lazy: () => import('./pages/Scan').then((m) => ({ Component: m.default })),
        entry: 'src/pages/Scan.tsx',
      },
      // The kit's sales page and where Stripe returns a buyer. Delivery itself
      // is `/api/production-kit-download`, which checks the payment with Stripe.
      {
        path: '/products/production-kit',
        lazy: () => import('./pages/ProductionKit').then((m) => ({ Component: m.default })),
        entry: 'src/pages/ProductionKit.tsx',
      },
      {
        path: '/products/production-kit/thanks',
        lazy: () => import('./pages/ProductionKitThanks').then((m) => ({ Component: m.default })),
        entry: 'src/pages/ProductionKitThanks.tsx',
      },
      {
        path: '/notes',
        lazy: () => import('./pages/NotesIndex').then((m) => ({ Component: m.default })),
        entry: 'src/pages/NotesIndex.tsx',
      },
      // The bare stream paths: the /notes feed with that stream's chip pressed.
      ...STREAMS.map((stream) => ({
        path: `/${streamPath[stream]}`,
        lazy: () =>
          import('./pages/NotesIndex').then((m) => ({ Component: () => <m.default stream={stream} /> })),
        entry: 'src/pages/NotesIndex.tsx',
      })),

      // One dynamic route per stream, each resolved against the content index at
      // build time. `getStaticPaths` imports the corpus dynamically so it stays out
      // of the client entry chunk; it only ever runs in Node, during prerender.
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
      {
        path: '/fixes/:slug',
        lazy: () => import('./pages/NoteRoute'),
        entry: 'src/pages/NoteRoute.tsx',
        getStaticPaths: async () => (await import('./content')).postsByStream('fix').map((p) => p.path),
      },

      // ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE
      {
        path: '*',
        lazy: () => import('./pages/NotFound').then((m) => ({ Component: m.default })),
        entry: 'src/pages/NotFound.tsx',
      },
    ],
  },
];
