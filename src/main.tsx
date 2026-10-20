import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import { installErrorReporter } from './lib/monitoring/report';
import './index.css';
import './styles/portfolio.css';
import './styles/notes.css';
// Bit's Quest fonts, self-hosted (woff2, latin subsets first). Browsers fetch a file only
// when a page uses the family, so the portfolio downloads none of them.
import '@fontsource-variable/space-grotesk';
import '@fontsource/press-start-2p';
import '@fontsource/jersey-10';
import './styles/brand.css';
import './styles/nav.css';

/**
 * SSG entry.
 *
 * `ViteReactSSG` renders every route in `routes` to static HTML at build time
 * and hydrates the same tree in the browser, so there is one router definition
 * and no separate server file.
 */
export const createRoot = ViteReactSSG({ routes });

/**
 * Page views: Cloudflare Web Analytics, cookieless, free.
 *
 * The beacon is added only in the browser (this module also runs in Node for
 * the prerender pass) and only when the build has a site token
 * (`VITE_CF_BEACON_TOKEN`, see docs/cloudflare-migration-guide.md). `spa: true`
 * makes it count react-router's client-side navigations too. Funnel events are
 * our own: `src/lib/analytics/track.ts`.
 */
function loadPageViewBeacon(token: string | undefined) {
  if (!token || document.querySelector('script[data-cf-beacon]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token, spa: true });
  document.head.appendChild(s);
}

if (typeof window !== 'undefined') {
  loadPageViewBeacon(import.meta.env.VITE_CF_BEACON_TOKEN);
  // Main-site host only; the reporter skips the portfolio host itself.
  installErrorReporter();
}
