import type { VercelRequest, VercelResponse } from '@vercel/node';
import { KIT_ROUTES } from '../../src/lib/kit/handlers.js';

/**
 * /api/kit/<action>: prices, checkout, order, library, download, upgrade, ping.
 *
 * One function for all of them, dispatched on the path segment. The handlers
 * and what each one checks are in src/lib/kit/handlers.ts.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action;
  const route = typeof action === 'string' ? KIT_ROUTES[action] : undefined;
  if (!route || !Object.prototype.hasOwnProperty.call(KIT_ROUTES, action as string)) return res.status(404).json({ error: 'not found' });
  return route(req, res);
}
