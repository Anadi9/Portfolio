import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseClientError } from '../src/lib/monitoring/validate.js';
import { withErrorLog } from '../src/lib/monitoring/with-error-log.js';
import { clientIp, createRateLimiter } from '../src/lib/scan/rate-limit.js';

/**
 * POST /api/client-error
 *
 * Receives browser error reports from `src/lib/monitoring/report.ts` and writes
 * one structured log line; Vercel logs are the store. No PII fields accepted.
 */

const limiter = createRateLimiter(20, 60_000);

export default withErrorLog('client-error', (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!limiter.allow(clientIp(req.headers ?? {}))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'too many reports' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const hp = (body as { hp?: unknown } | null)?.hp;
  if (typeof hp === 'string' && hp.length > 0) return res.status(204).end();

  const parsed = parseClientError(body);
  if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

  console.error('[client-error]', JSON.stringify(parsed.report));
  return res.status(204).end();
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
