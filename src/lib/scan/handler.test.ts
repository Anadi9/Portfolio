import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/scan';

/**
 * `api/scan.ts` against a fake Supabase, via a stubbed global `fetch`. Lives
 * here rather than in `api/` because everything under `api/` deploys.
 */

type FakeRes = {
  statusCode?: number;
  headers: Record<string, string>;
  body?: unknown;
  status: (code: number) => FakeRes;
  json: (body: unknown) => FakeRes;
  setHeader: (key: string, value: string) => FakeRes;
};

function makeRes(): FakeRes {
  const res = { headers: {} } as FakeRes;
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.setHeader = (k, v) => ((res.headers[k] = v), res);
  return res;
}

let ipSeq = 0;
const call = async (method: string, body: unknown, ip = `10.0.0.${++ipSeq}`) => {
  const res = makeRes();
  await handler({ method, body, headers: { 'x-forwarded-for': ip } } as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
};

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload: unknown) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2ln`;

const ORIGIN = 'https://abcd.supabase.co';
const ANON = jwt({ ref: 'abcd', role: 'anon' });
const valid = { url: ORIGIN, key: ANON };

/** A row the fake would return if the body were read. It must never surface. */
const SECRET_ROW = JSON.stringify([{ email: 'victim@example.com', ssn: '000-00-0000' }]);

type Route = { status: number; body?: string; headers?: Record<string, string> };

function fakeSupabase(routes: Record<string, Route>) {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const u = new URL(String(input));
    const key = u.pathname;
    const r = routes[key];
    if (!r) return new Response('not found', { status: 404 });
    return new Response(r.body ?? '', { status: r.status, headers: r.headers });
  });
}

const spec = { paths: { '/': {}, '/profiles': {}, '/orders': {}, '/admin': {}, '/rpc/fn': {} } };

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    fakeSupabase({
      '/rest/v1/': { status: 200, body: JSON.stringify(spec) },
      '/rest/v1/profiles': { status: 206, body: SECRET_ROW, headers: { 'content-range': '0-0/42' } },
      '/rest/v1/orders': { status: 200, body: '[]', headers: { 'content-range': '*/0' } },
      '/rest/v1/admin': { status: 401, body: '{"message":"permission denied"}' },
      '/storage/v1/bucket': { status: 200, body: JSON.stringify([{ id: 'avatars', name: 'avatars', public: true }]) },
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api/scan', () => {
  it('rejects anything but POST', async () => {
    const res = await call('GET', null);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  it('refuses a non-Supabase host without fetching anything', async () => {
    const res = await call('POST', { url: 'https://abcd.supabase.co.evil.com', key: ANON });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: 'url' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a service_role key without fetching anything', async () => {
    const res = await call('POST', { url: ORIGIN, key: jwt({ ref: 'abcd', role: 'service_role' }) });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: 'key', code: 'service_role' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('scans: reports counts and names, never row content', async () => {
    const res = await call('POST', JSON.stringify(valid));
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');

    const { report } = res.body as { report: { counts: Record<string, number>; findings: { subject: string; severity: string }[] } };
    expect(report.counts).toEqual({ critical: 1, warning: 1, ok: 2 });
    expect(report.findings.map((f) => [f.subject, f.severity])).toEqual([
      ['profiles', 'critical'],
      ['avatars', 'warning'],
      ['admin', 'ok'],
      ['orders', 'ok'],
    ]);

    const out = JSON.stringify(res.body);
    expect(out).not.toContain('victim@example.com');
    expect(out).not.toContain('000-00-0000');
    expect(out).not.toContain(ANON);
  });

  it('only ever calls the validated origin, with the anon key, as GET', async () => {
    await call('POST', valid);
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.length).toBe(5);
    for (const [input, init] of calls) {
      expect(String(input).startsWith(`${ORIGIN}/`)).toBe(true);
      expect(init).toMatchObject({ method: 'GET', redirect: 'manual' });
      expect((init!.headers as Record<string, string>).apikey).toBe(ANON);
      expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${ANON}`);
    }
    const probe = calls.find(([u]) => String(u).includes('/rest/v1/profiles'))!;
    expect(String(probe[0])).toBe(`${ORIGIN}/rest/v1/profiles?select=*&limit=1`);
    expect((probe[1]!.headers as Record<string, string>).Prefer).toBe('count=exact');
  });

  it('turns a rejected key into a 400 on the key field', async () => {
    vi.stubGlobal('fetch', fakeSupabase({ '/rest/v1/': { status: 401, body: '{"message":"Invalid API key"}' } }));
    const res = await call('POST', valid);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: 'key' });
  });

  it('502s when the project is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ENOTFOUND')));
    const res = await call('POST', valid);
    expect(res.statusCode).toBe(502);
  });

  it('marks a timed-out table unknown rather than safe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init: RequestInit) => {
        const path = new URL(input).pathname;
        if (path === '/rest/v1/') return new Response(JSON.stringify({ paths: { '/slow': {} } }), { status: 200 });
        if (path === '/rest/v1/slow') {
          return new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))));
        }
        return new Response('', { status: 403 });
      }),
    );
    const { runScan } = await import('./scan');
    const r = await runScan({ origin: ORIGIN, ref: 'abcd', key: ANON, kind: 'jwt' }, { requestTimeoutMs: 20 });
    expect(r.ok && r.report.findings).toEqual([expect.objectContaining({ subject: 'slow', severity: 'warning' })]);
  });

  it('caps the number of tables probed', async () => {
    const paths = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`/t${i}`, {}]));
    const fetchMock = vi.fn(async (input: string) =>
      new URL(input).pathname === '/rest/v1/'
        ? new Response(JSON.stringify({ paths }), { status: 200 })
        : new Response('', { status: 401 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const res = await call('POST', valid);
    const { report } = res.body as { report: { tables: { found: number; checked: number; truncated: boolean } } };
    expect(report.tables).toEqual({ found: 60, checked: 40, truncated: true });
    expect(fetchMock).toHaveBeenCalledTimes(1 + 40 + 1);
  });

  it('rate-limits one IP', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await call('POST', { url: 'bad', key: '' }, '9.9.9.9')).statusCode!);
    expect(codes.slice(0, 6).every((c) => c === 400)).toBe(true);
    expect(codes[6]).toBe(429);
  });
});

/**
 * `serverless-imports.test.ts` guards the other functions' graphs. Until it
 * lists this one, the same check runs here: Node's ESM resolver needs `.js`
 * on every relative import the function loads.
 */
describe('api/scan import graph', () => {
  const ROOT = join(import.meta.dirname, '../../..');
  it.each(['api/scan.ts', 'src/lib/scan/validate.ts', 'src/lib/scan/report.ts', 'src/lib/scan/scan.ts', 'src/lib/scan/rate-limit.ts'])(
    '%s gives every relative import a .js extension',
    (file) => {
      const source = readFileSync(join(ROOT, file), 'utf8');
      for (const [, spec] of source.matchAll(/\bfrom\s+'(\.[^']*)'/g)) expect(spec).toMatch(/\.js$/);
    },
  );
});
