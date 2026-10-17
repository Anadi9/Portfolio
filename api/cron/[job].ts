import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CRON_ROUTES, dispatch } from '../../src/server/routes.js';

/** /api/cron/<job>: notify, scorecard. The table is in src/server/routes.ts. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return dispatch(CRON_ROUTES, req.query.job, req, res);
}
