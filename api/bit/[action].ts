import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BIT_ROUTES, dispatch } from '../../src/server/routes.js';

/** /api/bit/<action>: ask, ticket. The table is in src/server/routes.ts. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return dispatch(BIT_ROUTES, req.query.action, req, res);
}
