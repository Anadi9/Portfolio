import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * GET /api/cron/ping
 *
 * One tiny query a day, so a free-tier Supabase project isn't paused for
 * inactivity. Called by the daily cron with `Authorization: Bearer $CRON_SECRET`
 * (checked when the secret is set). It reads one ticket id and nothing else.
 */

type Query = () => Promise<void>;

export function createPing(deps: { query: Query | null; secret: string | undefined }) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method not allowed' });
    }
    if (deps.secret && req.headers.authorization !== `Bearer ${deps.secret}`) return res.status(401).json({ error: 'unauthorized' });
    if (!deps.query) return res.status(501).json({ error: 'not configured' });
    try {
      await deps.query();
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[ping] failed', err);
      return res.status(502).json({ ok: false });
    }
  };
}

function supabaseQuery(): Query | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return async () => {
    const { error } = await db.from('tickets').select('id').limit(1);
    if (error) throw new Error(error.message);
  };
}

/** Env read per request, so the Worker's secrets are in place by the time it runs. */
export default function ping(req: VercelRequest, res: VercelResponse) {
  return createPing({ query: supabaseQuery(), secret: process.env.CRON_SECRET })(req, res);
}
