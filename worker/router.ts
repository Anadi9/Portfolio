import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as route from '../api/[route]';
import * as kit from '../api/kit/[action]';
import * as bit from '../api/bit/[action]';
import * as cron from '../api/cron/[job]';
import * as stripeWebhook from '../api/stripe-webhook';
import * as kitDownload from '../api/production-kit-download';

/**
 * `/api/...` → the `api/` file Vercel would run, and the params it would pass.
 *
 * Mirrors Vercel's file routing (and `resolveFunction` in
 * `scripts/vite-api-dev.ts`): an exact file wins, else the folder's `[param]`
 * file gets the segment as that param. One folder deep is all the site uses.
 * The `api/` files stay the source, so both hosts run the same code.
 */

export type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type Mod = { default: Handler; config?: { api?: { bodyParser?: boolean } } };

const EXACT: Record<string, Mod> = {
  'stripe-webhook': stripeWebhook,
  'production-kit-download': kitDownload,
};

const FOLDERS: Record<string, { param: string; mod: Mod }> = {
  kit: { param: 'action', mod: kit },
  bit: { param: 'action', mod: bit },
  cron: { param: 'job', mod: cron },
};

const own = <T>(o: Record<string, T>, k: string) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);

const hit = (mod: Mod, query: Record<string, string>) => ({ handler: mod.default, query, raw: mod.config?.api?.bodyParser === false });

export function resolveApi(pathname: string): { handler: Handler; query: Record<string, string>; raw: boolean } | null {
  const m = /^\/api\/([\w-]+)(?:\/([\w-]+))?\/?$/.exec(pathname);
  if (!m) return null;
  const [, first, second] = m;
  if (second) {
    const folder = own(FOLDERS, first);
    return folder ? hit(folder.mod, { [folder.param]: second }) : null;
  }
  const exact = own(EXACT, first);
  if (exact) return hit(exact, {});
  if (own(FOLDERS, first)) return null;
  return hit(route, { route: first });
}
