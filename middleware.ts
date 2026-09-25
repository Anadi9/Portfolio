/**
 * Serves the portfolio as the root of portfolio.anadithakur.in.
 *
 * This can't be a `vercel.json` rewrite: rewrites only run when no static file
 * matches, and `/` always matches the prerendered front page (`index.html`).
 * Middleware runs before the filesystem, so it wins. Setting
 * `x-middleware-rewrite` is what `rewrite()` from `@vercel/functions` does,
 * without pulling in the package for one header.
 */
export const config = { matcher: '/' };

export default function middleware(request: Request) {
  const url = new URL(request.url);
  if (url.hostname !== 'portfolio.anadithakur.in') return;
  url.pathname = '/portfolio';
  return new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });
}
