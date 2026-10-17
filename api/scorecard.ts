import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorLog } from '../src/lib/monitoring/with-error-log.js';
import { asSummary } from '../src/lib/scorecard/summary.js';
import { ticketStore } from '../src/lib/tickets/store.js';

/**
 * GET /api/scorecard
 *
 * The latest "we audit ourselves" run: readiness score and checks, security
 * headers present/missing. Public by design; it holds no personal data.
 *
 * 200 { run: ScorecardSummary | null } (cached 1 h) | 405 | 501 (store not configured)
 */
export default withErrorLog('scorecard', async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const store = ticketStore();
  if (!store) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(501).json({ error: 'scorecard not configured' });
  }
  const latest = await store.latestScorecard();
  const run = latest ? asSummary(latest.results) : null;
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ run });
});
