import { SECURITY_HEADERS } from '../scripts/lib/cf-static.mjs';
import { runWithContext } from '../src/lib/runtime/wait-until';
import { runVercelHandler } from './adapter';
import { jobsForHour } from './cron';
import { hostAction } from './host';
import { resolveApi } from './router';

/**
 * The Cloudflare Worker for anadithakur.in and portfolio.anadithakur.in.
 *
 * Static files come straight from the assets binding (`dist/`, with the
 * generated `_headers` and `_redirects`) and never wake this code. It runs for
 * `/api/*`, `/` and `/portfolio` (`run_worker_first` in `wrangler.jsonc`):
 * the API through the same `api/` handlers Vercel runs, and the two host
 * rules from `worker/host.ts`. Off production (`SITE_ENV`), every response is
 * marked noindex, the way Vercel treats preview deployments.
 */

const SITE = 'https://anadithakur.in';

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const action = hostAction(url.host, url.pathname, url.search);
    let response: Response;
    if (action.kind === 'redirect') {
      response = new Response(null, { status: 301, headers: { Location: action.location } });
    } else if (action.kind === 'portfolio-root') {
      response = await env.ASSETS.fetch(new Request(new URL('/portfolio', url), request));
    } else if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      response = withHeaders(await api(request, ctx), SECURITY_HEADERS);
    } else {
      response = await env.ASSETS.fetch(request);
    }
    return env.SITE_ENV === 'production' ? response : withHeaders(response, { 'X-Robots-Tag': 'noindex, nofollow' }, true);
  },

  async scheduled(controller, env, ctx): Promise<void> {
    if (env.SITE_ENV !== 'production') return;
    const jobs = jobsForHour(new Date(controller.scheduledTime).getUTCHours());
    ctx.waitUntil(
      (async () => {
        for (const path of jobs) {
          const secret = process.env.CRON_SECRET;
          const req = new Request(SITE + path, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
          const res = await api(req, ctx).catch((err) => {
            console.error('[cron]', path, 'threw', err);
            return null;
          });
          console.log('[cron]', path, res?.status ?? 'error');
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;

function api(request: Request, ctx: ExecutionContext): Promise<Response> {
  const hit = resolveApi(new URL(request.url).pathname);
  if (!hit) return Promise.resolve(Response.json({ error: 'not found' }, { status: 404 }));
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  return runWithContext(ctx, () =>
    runVercelHandler(hit.handler, request, {
      query: hit.query,
      raw: hit.raw,
      clientIp: request.headers.get('cf-connecting-ip') ?? undefined,
      country: cf?.country,
    }),
  );
}

/** A copy with these headers added; set ones win only when `override`. */
function withHeaders(res: Response, headers: Record<string, string>, override = false): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) if (override || !out.headers.has(k)) out.headers.set(k, v);
  return out;
}
