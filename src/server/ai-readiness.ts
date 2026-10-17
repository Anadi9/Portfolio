import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runCheck } from '../lib/readiness/check.js';
import { checkUrl } from '../lib/readiness/url.js';
import { clientIp, createRateLimiter } from '../lib/scan/rate-limit.js';

/**
 * POST /api/ai-readiness
 *
 * The `/ai-readiness` checker. Takes `{ url }`, fetches the page and its
 * robots.txt, llms.txt and sitemap as a crawler would, and returns a score,
 * per-check findings and the AI crawlers robots.txt blocks. The raw page is
 * never returned, stored or logged; see `check.ts` for the SSRF guard.
 *
 * Same-origin only (no CORS headers) and rate limited per IP, like `/api/scan`.
 */

const limiter = createRateLimiter(6, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  if (!limiter.allow(clientIp(req.headers ?? {}))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many checks from here. Give it a minute and try again.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const checked = checkUrl((body as { url?: unknown } | null)?.url);
  if (checked.ok === false) return res.status(400).json({ error: checked.error, field: 'url' });

  try {
    const result = await runCheck(checked.url);
    if (result.ok === false) return res.status(result.status).json({ error: result.error, field: 'url' });
    return res.status(200).json({ ok: true, report: result.report });
  } catch (err) {
    console.error('[ai-readiness] failed', err instanceof Error ? err.name : 'unknown');
    return res.status(500).json({ error: 'The check failed on my end. Try again in a moment.' });
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
