import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseScanInput } from '../src/lib/scan/validate.js';
import { runScan } from '../src/lib/scan/scan.js';
import { clientIp, createRateLimiter } from '../src/lib/scan/rate-limit.js';

/**
 * POST /api/scan
 *
 * The `/scan` Supabase security check. Takes `{ url, key }`: a project URL and
 * its anon (public) key, the same key that already ships in the project's
 * frontend bundle. It probes the project as an anonymous visitor would and
 * returns table names, row counts and bucket names with a severity each.
 *
 * What it never does: follow a URL that isn't `https://<ref>.supabase.co`
 * (validate.ts is the SSRF guard), accept a service_role or secret key, write
 * anything, read a row's content, store the request, or log the key.
 *
 * Same-origin only: no CORS headers, so browsers won't let another site call it.
 * Imports carry explicit `.js` extensions; see serverless-imports.test.ts.
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
  const parsed = parseScanInput(body);
  if (parsed.ok === false) {
    return res.status(400).json({ error: parsed.error, field: parsed.field, code: parsed.code });
  }

  try {
    const result = await runScan(parsed.input);
    if (result.ok === false) return res.status(result.status).json({ error: result.error, field: result.field });
    return res.status(200).json({ ok: true, report: result.report });
  } catch (err) {
    // The error's name only: its message or cause could carry the request, and the request carries the key.
    console.error('[scan] failed', err instanceof Error ? err.name : 'unknown');
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
