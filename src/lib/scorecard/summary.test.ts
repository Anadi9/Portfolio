import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EXPECTED_HEADERS } from './headers';
import { asSummary, cardState, checkHeaders, summarise } from './summary';
import { memoryTicketStore } from '../tickets/memory';

const { holder } = vi.hoisted(() => ({ holder: { store: null as unknown } }));
vi.mock('../tickets/store.js', async (orig) => ({ ...(await orig<typeof import('../tickets/store')>()), ticketStore: () => holder.store }));

import scorecard from '../../../api/scorecard';
import cron from '../../../api/cron/scorecard';

const call = async (h: (a: VercelRequest, b: VercelResponse) => unknown, headers: Record<string, string> = {}, method = 'GET') => {
  const res: { statusCode?: number; body?: any; headers: Record<string, string> } = { headers: {} }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = {
    status: (c: number) => ((res.statusCode = c), r),
    json: (b: unknown) => ((res.body = b), r),
    setHeader: (k: string, v: string) => ((res.headers[k] = v), r),
  };
  await h({ method, headers } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
};

afterEach(() => {
  holder.store = null;
  delete process.env.CRON_SECRET;
  vi.restoreAllMocks();
});

describe('EXPECTED_HEADERS', () => {
  it('matches the site-wide headers in vercel.json', () => {
    const cfg = JSON.parse(readFileSync(join(import.meta.dirname, '../../../vercel.json'), 'utf8'));
    const site = cfg.headers.find((h: { source: string }) => h.source === '/(.*)');
    const names = site.headers.map((h: { key: string }) => h.key.replace(/-Report-Only$/, ''));
    expect([...EXPECTED_HEADERS].sort()).toEqual([...names].sort());
  });
});

describe('checkHeaders', () => {
  it('splits present and missing, case-insensitively', () => {
    const r = checkHeaders({ 'strict-transport-security': 'x', 'X-Frame-Options': 'DENY' });
    expect(r.present).toEqual(['Strict-Transport-Security', 'X-Frame-Options']);
    expect(r.missing).toContain('Content-Security-Policy');
  });
  it('counts report-only CSP as present, from a Headers object too', () => {
    const r = checkHeaders(new Headers({ 'Content-Security-Policy-Report-Only': "default-src 'self'" }));
    expect(r.present).toEqual(['Content-Security-Policy']);
  });
});

describe('summarise', () => {
  const report = {
    score: 82,
    findings: [
      { id: 'a', label: 'Content in the HTML', status: 'pass' as const },
      { id: 'b', label: 'llms.txt', status: 'warn' as const },
      { id: 'c', label: 'Sitemap', status: 'fail' as const },
    ],
  };
  it('is compact and JSON-safe', () => {
    const s = summarise({ ranAt: new Date('2026-10-17T08:00:00Z'), site: 'https://anadithakur.in/', report, headers: { present: ['X-Frame-Options'], missing: [] } });
    expect(s.readiness).toEqual({ score: 82, passed: ['Content in the HTML'], warned: ['llms.txt'], failed: ['Sitemap'] });
    expect(s.ranAt).toBe('2026-10-17T08:00:00.000Z');
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
  it('records an honest null when a half did not run', () => {
    const s = summarise({ ranAt: '2026-10-17T08:00:00Z', site: 's', report: null, readinessError: 'down', headers: null });
    expect(s.readiness).toBeNull();
    expect(s.readinessError).toBe('down');
    expect(s.headers).toBeNull();
  });
  it('asSummary rejects anything else', () => {
    expect(asSummary({})).toBeNull();
    expect(asSummary(null)).toBeNull();
    expect(asSummary(summarise({ ranAt: '2026-10-17T08:00:00Z', site: 's', report, headers: null }))).not.toBeNull();
  });
});

describe('headersError and cardState', () => {
  const base = { ranAt: '2026-10-17T08:00:00Z', site: 's' };
  it('stores headersError', () => {
    const s = summarise({ ...base, report: { score: 1, findings: [] }, headers: null, headersError: 'down' });
    expect(s.headersError).toBe('down');
  });
  it('no run / partial / full', () => {
    expect(cardState(null, 'headers')).toEqual({ kind: 'none' });
    const partial = summarise({ ...base, report: { score: 1, findings: [] }, headers: null, headersError: 'down' });
    expect(cardState(partial, 'headers')).toMatchObject({ kind: 'missing' });
    expect(cardState(partial, 'readiness')).toEqual({ kind: 'ok' });
    const noErr = summarise({ ...base, report: null, headers: { present: [], missing: [] } });
    expect(cardState(noErr, 'readiness')).toMatchObject({ kind: 'missing', reason: 'The last scan could not run this check.' });
  });
});

describe('GET /api/scorecard', () => {
  it('501 and no-store when the store is not configured', async () => {
    const r = await call(scorecard);
    expect(r.statusCode).toBe(501);
    expect(r.headers['Cache-Control']).toBe('no-store');
  });
  it('200 { run: null } when configured but empty', async () => {
    holder.store = memoryTicketStore().store;
    const r = await call(scorecard);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ run: null });
    expect(r.headers['Cache-Control']).toBe('s-maxage=3600, stale-while-revalidate=86400');
  });
  it('returns the latest summary', async () => {
    const { store } = memoryTicketStore();
    holder.store = store;
    const s = summarise({ ranAt: '2026-10-17T08:00:00Z', site: 's', report: { score: 90, findings: [] }, headers: null });
    await store.saveScorecard(s as unknown as Record<string, unknown>);
    const r = await call(scorecard);
    expect(r.body.run.readiness.score).toBe(90);
  });
  it('405 on POST', async () => {
    expect((await call(scorecard, {}, 'POST')).statusCode).toBe(405);
  });
});

describe('GET /api/cron/scorecard auth', () => {
  it('fails closed with no CRON_SECRET, even for a matching-looking header', async () => {
    holder.store = memoryTicketStore().store;
    expect((await call(cron, { authorization: 'Bearer undefined' })).statusCode).toBe(401);
    expect((await call(cron)).statusCode).toBe(401);
  });
  it('rejects a wrong secret', async () => {
    process.env.CRON_SECRET = 's3cret';
    holder.store = memoryTicketStore().store;
    expect((await call(cron, { authorization: 'Bearer nope' })).statusCode).toBe(401);
  });
  it('501 with the right secret but no store', async () => {
    process.env.CRON_SECRET = 's3cret';
    expect((await call(cron, { authorization: 'Bearer s3cret' })).statusCode).toBe(501);
  });
});
