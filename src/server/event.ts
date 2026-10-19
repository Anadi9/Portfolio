import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clientIp, createRateLimiter } from '../lib/scan/rate-limit.js';

/**
 * POST /api/event
 *
 * The funnel events (`track()` in `src/lib/analytics/track.ts`), counted in our
 * own `events` table rather than a paid analytics plan. A row is the event
 * name, up to 8 small props, the page path and the rough country. No IP, no
 * cookie, no visitor id. Page views are Cloudflare Web Analytics' job.
 *
 * Always 204 once the body is valid, even if the insert fails: analytics is
 * best-effort and must never cost a lead.
 */

export type EventRow = { name: string; props: Record<string, string | number | boolean>; path: string | null; country: string | null };
type Insert = (row: EventRow) => Promise<void>;

const NAME = /^[a-z][a-z0-9_:-]{1,48}$/;
const MAX_PROPS = 8;
const MAX_VALUE = 80;

export function parseEvent(body: unknown): { ok: true; event: Omit<EventRow, 'country'> } | { ok: false; error: string } {
  const b = (body ?? {}) as { name?: unknown; props?: unknown; path?: unknown };
  if (typeof b.name !== 'string' || !NAME.test(b.name)) return { ok: false, error: 'bad name' };
  const raw = b.props ?? {};
  if (typeof raw !== 'object' || Array.isArray(raw) || raw === null) return { ok: false, error: 'bad props' };
  const entries = Object.entries(raw);
  if (entries.length > MAX_PROPS) return { ok: false, error: 'too many props' };
  const props: EventRow['props'] = {};
  for (const [k, v] of entries) {
    if (k.length > 40) return { ok: false, error: 'bad prop name' };
    if (typeof v === 'number' || typeof v === 'boolean') props[k] = v;
    else if (typeof v === 'string' && v.length <= MAX_VALUE) props[k] = v;
    else return { ok: false, error: 'bad prop value' };
  }
  const path = typeof b.path === 'string' && b.path.startsWith('/') && !b.path.startsWith('//') ? b.path.slice(0, 200) : null;
  return { ok: true, event: { name: b.name, props, path } };
}

export function createEventHandler(deps: { insert: Insert | null }) {
  const limiter = createRateLimiter(60, 60_000);
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }
    if (!deps.insert) return res.status(501).json({ error: 'not configured' });
    if (!limiter.allow(clientIp(req.headers ?? {}))) return res.status(429).json({ error: 'too many events' });

    const parsed = parseEvent(typeof req.body === 'string' ? safeParse(req.body) : req.body);
    if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

    const c = req.headers['x-vercel-ip-country'];
    const country = (Array.isArray(c) ? c[0] : c)?.slice(0, 2).toUpperCase() || null;
    try {
      await deps.insert({ ...parsed.event, country });
    } catch (err) {
      console.warn('[event] insert failed', (err as Error).message);
    }
    return res.status(204).end();
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function supabaseInsert(): Insert | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return async (row) => {
    const { error } = await db.from('events').insert(row);
    if (error) throw new Error(error.message);
  };
}

let handler: ReturnType<typeof createEventHandler> | undefined;

/** Built on first request, so env read at module load (before the Worker fills it) doesn't matter. */
export default function event(req: VercelRequest, res: VercelResponse) {
  handler ??= createEventHandler({ insert: supabaseInsert() });
  return handler(req, res);
}
