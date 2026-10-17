import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_ROUTES, dispatch } from '../src/server/routes.js';

/**
 * /api/<route>: scan, audit, review, health and the rest of the single-segment
 * endpoints, in one function. The table is in src/server/routes.ts.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return dispatch(API_ROUTES, req.query.route, req, res);
}
