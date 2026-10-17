import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';
import { runCheck } from '../../lib/readiness/check.js';
import { withTimeout } from '../../lib/notify/timeout.js';
import { checkHeaders, summarise, type HeaderCheck } from '../../lib/scorecard/summary.js';
import { ticketStore } from '../../lib/tickets/store.js';

const SITE = 'https://anadithakur.in/';

/** Response headers of the live homepage, or null if it can't be reached. */
async function liveHeaders(): Promise<HeaderCheck | null> {
  const res = await fetch(SITE, { redirect: 'follow', credentials: 'omit', signal: AbortSignal.timeout(8000) });
  await res.body?.cancel();
  return checkHeaders(res.headers);
}

/**
 * GET /api/cron/scorecard
 *
 * Daily: runs the AI-readiness analysis against our own homepage, checks the
 * site-wide security headers, and stores a compact summary. Vercel Cron calls
 * it with `Authorization: Bearer $CRON_SECRET`; with no CRON_SECRET it refuses.
 */
export default withErrorLog('cron-scorecard', async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });

  const store = ticketStore();
  if (!store) return res.status(501).json({ error: 'tickets not configured' });

  const [check, headers] = await Promise.all([withTimeout(runCheck(SITE), 25_000, 'scorecard readiness'), withTimeout(liveHeaders(), 12_000, 'scorecard headers')]);
  const report = check?.ok ? check.report : null;
  if (!report && !headers) return res.status(502).json({ error: 'nothing could be checked' });

  const summary = summarise({
    ranAt: new Date(),
    site: SITE,
    report,
    readinessError: report ? undefined : check && check.ok === false ? check.error : 'readiness check did not finish',
    headers: headers ?? null,
    headersError: headers ? undefined : 'the site’s headers could not be read',
  });
  await store.saveScorecard(summary as unknown as Record<string, unknown>);
  return res.status(200).json({ ok: true, score: summary.readiness?.score ?? null, headersMissing: summary.headers?.missing ?? null });
});
