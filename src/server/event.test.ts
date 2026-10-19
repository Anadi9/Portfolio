import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it, vi } from 'vitest';
import { createEventHandler, parseEvent } from './event';

function call(handler: ReturnType<typeof createEventHandler>, req: Partial<VercelRequest>) {
  const out = { status: 0, body: undefined as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader: (k: string, v: string) => ((out.headers[k] = v), res),
    status: (c: number) => ((out.status = c), res),
    json: (b: unknown) => ((out.body = b), res),
    end: () => res,
  } as unknown as VercelResponse;
  return Promise.resolve(handler({ method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4', 'x-vercel-ip-country': 'IN' }, ...req } as VercelRequest, res)).then(() => out);
}

describe('parseEvent', () => {
  it('accepts a named event with small props', () => {
    expect(parseEvent({ name: 'kit_download', props: { pack: 'auth', n: 2, ok: true }, path: '/kit' })).toEqual({
      ok: true,
      event: { name: 'kit_download', props: { pack: 'auth', n: 2, ok: true }, path: '/kit' },
    });
  });

  it('rejects a bad name', () => {
    expect(parseEvent({ name: 'Drop Table' }).ok).toBe(false);
    expect(parseEvent({ name: 'x' }).ok).toBe(false);
    expect(parseEvent({}).ok).toBe(false);
  });

  it('rejects nine props, a long value, or a nested value', () => {
    const nine = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, 'v']));
    expect(parseEvent({ name: 'cta_click', props: nine }).ok).toBe(false);
    expect(parseEvent({ name: 'cta_click', props: { a: 'x'.repeat(81) } }).ok).toBe(false);
    expect(parseEvent({ name: 'cta_click', props: { a: { b: 1 } } }).ok).toBe(false);
  });

  it('drops a path that is not a site path', () => {
    expect(parseEvent({ name: 'cta_click', path: 'https://evil.example/' })).toEqual({ ok: true, event: { name: 'cta_click', props: {}, path: null } });
  });
});

describe('POST /api/event', () => {
  it('405 on GET', async () => {
    const h = createEventHandler({ insert: vi.fn() });
    expect((await call(h, { method: 'GET' })).status).toBe(405);
  });

  it('501 without a database', async () => {
    const h = createEventHandler({ insert: null });
    expect((await call(h, { body: { name: 'cta_click' } })).status).toBe(501);
  });

  it('400 on a bad body', async () => {
    const h = createEventHandler({ insert: vi.fn() });
    expect((await call(h, { body: { name: 'BAD NAME' } })).status).toBe(400);
    expect((await call(h, { body: 'not json' })).status).toBe(400);
  });

  it('204 and stores the event with the country and no IP', async () => {
    const insert = vi.fn().mockResolvedValue(undefined);
    const h = createEventHandler({ insert });
    const out = await call(h, { body: JSON.stringify({ name: 'audit_submitted', props: { tool: 'lovable', symptoms: 3 }, path: '/audit' }) });
    expect(out.status).toBe(204);
    expect(insert).toHaveBeenCalledWith({ name: 'audit_submitted', props: { tool: 'lovable', symptoms: 3 }, path: '/audit', country: 'IN' });
    expect(JSON.stringify(insert.mock.calls[0][0])).not.toContain('1.2.3.4');
  });

  it('429 past 60 a minute from one IP', async () => {
    const h = createEventHandler({ insert: vi.fn().mockResolvedValue(undefined) });
    for (let i = 0; i < 60; i++) await call(h, { body: { name: 'cta_click' }, headers: { 'x-forwarded-for': '5.5.5.5' } });
    expect((await call(h, { body: { name: 'cta_click' }, headers: { 'x-forwarded-for': '5.5.5.5' } })).status).toBe(429);
  });

  it('204 even when the insert fails (analytics never costs the visitor)', async () => {
    const h = createEventHandler({ insert: vi.fn().mockRejectedValue(new Error('db down')) });
    expect((await call(h, { body: { name: 'cta_click' } })).status).toBe(204);
  });
});
