import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const { runCheck } = vi.hoisted(() => ({ runCheck: vi.fn() }));
vi.mock('./check.js', () => ({ runCheck }));
vi.mock('./check', () => ({ runCheck }));

import handler from '../../../api/ai-readiness';

type FakeRes = { statusCode?: number; headers: Record<string, string>; body?: unknown; status: (c: number) => FakeRes; json: (b: unknown) => FakeRes; setHeader: (k: string, v: string) => FakeRes };
const makeRes = () => {
  const res = { headers: {} } as FakeRes;
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => ((res.headers[k] = v), res);
  return res;
};
let ip = 0;
const call = async (method: string, body: unknown) => {
  const res = makeRes();
  // A fresh IP per call, so the rate limiter only bites in the test that means it to.
  await handler({ method, body, headers: { 'x-forwarded-for': `203.0.113.${++ip}` } } as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
};

beforeEach(() => runCheck.mockReset());

describe('ai-readiness', () => {
  it('rejects anything but POST', async () => {
    expect((await call('GET', null)).statusCode).toBe(405);
  });

  it('400s on a private address without fetching anything', async () => {
    const res = await call('POST', { url: 'http://169.254.169.254' });
    expect(res.statusCode).toBe(400);
    expect(runCheck).not.toHaveBeenCalled();
  });

  it('returns the report for a public URL', async () => {
    runCheck.mockResolvedValue({ ok: true, report: { score: 80 } });
    const res = await call('POST', JSON.stringify({ url: 'leaf.co' }));
    expect(res.statusCode).toBe(200);
    expect(runCheck).toHaveBeenCalledWith('https://leaf.co/');
    expect(res.body).toMatchObject({ ok: true, report: { score: 80 } });
  });

  it('passes a check failure through with its status', async () => {
    runCheck.mockResolvedValue({ ok: false, status: 502, error: 'unreachable' });
    expect((await call('POST', { url: 'leaf.co' })).statusCode).toBe(502);
  });

  it('rate limits one IP after six checks a minute', async () => {
    runCheck.mockResolvedValue({ ok: true, report: {} });
    const res = makeRes();
    const req = { method: 'POST', body: { url: 'leaf.co' }, headers: { 'x-forwarded-for': '198.51.100.7' } } as unknown as VercelRequest;
    for (let i = 0; i < 6; i++) await handler(req, makeRes() as unknown as VercelResponse);
    await handler(req, res as unknown as VercelResponse);
    expect(res.statusCode).toBe(429);
  });
});
