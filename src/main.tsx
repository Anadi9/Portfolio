import { ViteReactSSG } from 'vite-react-ssg';
import { inject } from '@vercel/analytics';
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

/**
 * SSG entry.
 *
 * `ViteReactSSG` renders every route in `routes` to static HTML at build time
 * and hydrates the same tree in the browser, so there is one router definition
 * and no separate server file.
 */
export const createRoot = ViteReactSSG({ routes });

/**
 * Vercel Web Analytics.
 *
 * This module also runs in Node during the prerender pass, where there is no
 * `document` to attach a script to, so the call is guarded on `window`. There
 * is no root layout route to hang an `<Analytics />` component off (every
 * entry in `routes` is top-level), so the script is injected here instead.
 * `inject` patches `pushState`, which is how react-router navigates, so
 * client-side route changes are counted without any per-page wiring.
 */
if (typeof window !== 'undefined') {
  inject();
  // Main-site host only; the reporter skips the portfolio host itself.
  installErrorReporter();
}
