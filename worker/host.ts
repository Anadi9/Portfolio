/**
 * The host rules `vercel.json` and `middleware.ts` express with `has: host`,
 * which Cloudflare's `_redirects` can't. The Worker runs first for `/` and
 * `/portfolio` (`run_worker_first` in `wrangler.jsonc`), which is all these need.
 * The third rule (any other page path on the portfolio host → the main site) is
 * a Cloudflare Redirect Rule, so asset requests never have to wake the Worker;
 * see `docs/cloudflare-migration-guide.md`.
 */

export const PORTFOLIO_HOST = 'portfolio.anadithakur.in';
const MAIN_HOSTS = new Set(['anadithakur.in', 'www.anadithakur.in']);

export type HostAction = { kind: 'portfolio-root' } | { kind: 'redirect'; location: string } | { kind: 'pass' };

export function hostAction(host: string, pathname: string, search = ''): HostAction {
  const h = host.toLowerCase().replace(/:\d+$/, '');
  if (h === PORTFOLIO_HOST && pathname === '/') return { kind: 'portfolio-root' };
  if (MAIN_HOSTS.has(h) && (pathname === '/portfolio' || pathname === '/portfolio/')) {
    return { kind: 'redirect', location: `https://${PORTFOLIO_HOST}/${search}` };
  }
  return { kind: 'pass' };
}
