import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import { createPing } from './ping';

function call(handler: ReturnType<typeof createPing>, req: Partial<VercelRequest>) {
  const out = { status: 0, body: undefined as unknown };
  const res = {
    setHeader: () => res,
    status: (c: number) => ((out.status = c), res),
    json: (b: unknown) => ((out.body = b), res),
  } as unknown as VercelResponse;
  return Promise.resolve(handler({ method: 'GET', headers: {}, ...req } as VercelRequest, res)).then(() => out);
}

describe('GET /api/cron/ping', () => {
  it('runs one query and answers ok', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const out = await call(createPing({ query, secret: 's' }), { headers: { authorization: 'Bearer s' } });
    expect(out).toEqual({ status: 200, body: { ok: true } });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('401 with the wrong bearer when a secret is set', async () => {
    const query = vi.fn();
    expect((await call(createPing({ query, secret: 's' }), { headers: { authorization: 'Bearer x' } })).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it('405 on POST', async () => {
    expect((await call(createPing({ query: vi.fn(), secret: undefined }), { method: 'POST' })).status).toBe(405);
  });

  it('501 without a database', async () => {
    expect((await call(createPing({ query: null, secret: undefined }), {})).status).toBe(501);
  });

  it('502 when the query fails', async () => {
    const query = vi.fn().mockRejectedValue(new Error('down'));
    expect((await call(createPing({ query, secret: undefined }), {})).status).toBe(502);
  });
});
