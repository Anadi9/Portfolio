import type { VercelRequest, VercelResponse } from '@vercel/node';
import { healthReport } from '../src/lib/monitoring/health.js';
import { withErrorLog } from '../src/lib/monitoring/with-error-log.js';

/**
 * GET /api/health
 *
 * Uptime-monitor target. Reports env presence and Supabase reachability only,
 * never values or errors.
 */
export default withErrorLog('health', async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const report = await healthReport(process.env, fetch);
  return res.status(report.ok ? 200 : 503).json(report);
});
