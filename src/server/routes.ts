import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from './admin.js';
import aiReadiness from './ai-readiness.js';
import audit from './audit.js';
import board from './board.js';
import clientError from './client-error.js';
import health from './health.js';
import kitPrice from './kit-price.js';
import productionKitCheckout from './production-kit-checkout.js';
import rescueAudit from './rescue-audit.js';
import review from './review.js';
import scan from './scan.js';
import scorecard from './scorecard.js';
import teardownReport from './teardown-report.js';
import bitAsk from './bit/ask.js';
import bitTicket from './bit/ticket.js';
import cronNotify from './cron/notify.js';
import cronScorecard from './cron/scorecard.js';
import cronHeartbeat from './cron/heartbeat.js';
import cronSummary from './cron/summary.js';

/**
 * The handlers behind the three dispatchers in `api/`.
 *
 * The Hobby plan caps a deployment at 12 functions, and Vercel makes one per
 * file under `api/`. So the handlers live here, outside it, and `api/[route].ts`,
 * `api/bit/[action].ts` and `api/cron/[job].ts` pick one by path segment. The
 * public URLs are unchanged: `/api/scan` still answers at `/api/scan`.
 */

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type Routes = Record<string, Handler>;

/** `/api/<route>`. Static files in `api/` (the webhook, the download) win over this. */
export const API_ROUTES: Routes = {
  admin,
  'ai-readiness': aiReadiness,
  audit,
  board,
  'client-error': clientError,
  health,
  'kit-price': kitPrice,
  'production-kit-checkout': productionKitCheckout,
  'rescue-audit': rescueAudit,
  review,
  scan,
  scorecard,
  'teardown-report': teardownReport,
};

/** `/api/bit/<action>`. */
export const BIT_ROUTES: Routes = { ask: bitAsk, ticket: bitTicket };

/** `/api/cron/<job>`, the paths `vercel.json` schedules. */
export const CRON_ROUTES: Routes = { heartbeat: cronHeartbeat, notify: cronNotify, scorecard: cronScorecard, summary: cronSummary };

/** Runs the handler `routes[segment]`, or 404s. Own keys only, so `/api/constructor` is not a route. */
export function dispatch(routes: Routes, segment: unknown, req: VercelRequest, res: VercelResponse) {
  const route = typeof segment === 'string' && Object.prototype.hasOwnProperty.call(routes, segment) ? routes[segment] : undefined;
  if (!route) return res.status(404).json({ error: 'not found' });
  return route(req, res);
}
