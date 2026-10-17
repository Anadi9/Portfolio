import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../scan/rate-limit';
import type { Attempt } from './ai';
import { createAskHandler } from './ask-handler';
import { failing, hanging, replying } from './mock-models';

const ON = { BIT_AI: 'on', AI_GATEWAY_API_KEY: 'k' };

function fakeRes() {
  const r = { statusCode: 0, body: undefined as unknown, headers: {} as Record<string, string>, headersSent: false };
  const res = {
    status(c: number) {
      r.statusCode = c;
      return res;
    },
    json(b: unknown) {
      r.body = b;
      r.headersSent = true;
      return res;
    },
    setHeader(k: string, v: string) {
      r.headers[k] = v;
      return res;
    },
  };
  return { r, res: res as unknown as VercelResponse };
}

const req = (body: unknown, method = 'POST', ip = '1.2.3.4') => ({ method, body, headers: { 'x-forwarded-for': ip } }) as unknown as VercelRequest;

function setup(opts: { env?: Record<string, string>; models?: Attempt['model'][]; perMinute?: number; perHour?: number } = {}) {
  const logs: string[] = [];
  const handler = createAskHandler({
    env: opts.env ?? ON,
    attempts: () => (opts.models ?? [replying({ answer: 'Anadi fixes login bugs. Start with the free first-bug video.', route: 'prod' })]).map((model, i) => ({ label: `m${i}`, model })),
    timing: { totalMs: 200, primaryMs: 50 },
    perMinute: createRateLimiter(opts.perMinute ?? 10, 60_000),
    perHour: createRateLimiter(opts.perHour ?? 30, 3_600_000),
    log: (l) => logs.push(l),
  });
  const call = async (body: unknown, method?: string, ip?: string) => {
    const { r, res } = fakeRes();
    await handler(req(body, method, ip), res);
    return r;
  };
  return { call, logs };
}

const Q = { question: 'my login is broken, email me at jo@example.com', node: 'start', answers: {}, count: 0, hp: '' };

describe('POST /api/bit/ask', () => {
  it('answers with { answer, route } and logs route, model, latency — never the question', async () => {
    const { call, logs } = setup();
    const r = await call(Q);
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual({ answer: 'Anadi fixes login bugs. Start with the free first-bug video.', route: 'prod' });
    expect(r.headers['Cache-Control']).toBe('no-store');
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0].replace('[bit-ask] ', ''))).toEqual({ outcome: 'answer', route: 'prod', routeFrom: 'model', model: 'm0', ms: expect.any(Number) });
    expect(logs[0]).not.toMatch(/login|jo@example/);
  });

  it('accepts a JSON string body', async () => {
    const { call } = setup();
    expect((await call(JSON.stringify(Q))).statusCode).toBe(200);
  });

  it('is 501 when BIT_AI is not on, or there is no gateway auth', async () => {
    for (const env of [{}, { BIT_AI: 'off', AI_GATEWAY_API_KEY: 'k' }, { BIT_AI: 'on' }]) {
      const r = await setup({ env }).call(Q);
      expect(r.statusCode, JSON.stringify(env)).toBe(501);
      expect(r.body).toEqual({ error: 'ai answers not configured' });
    }
  });

  it('is 405 for anything but POST', async () => {
    const r = await setup().call(undefined, 'GET');
    expect(r.statusCode).toBe(405);
    expect(r.headers.Allow).toBe('POST');
  });

  it('answers a filled honeypot with a silent fallback and never calls the model', async () => {
    const model = replying({ answer: 'x', route: 'start' });
    const r = await setup({ models: [model] }).call({ ...Q, hp: 'bot' });
    expect(r).toMatchObject({ statusCode: 200, body: { fallback: 'hp' } });
    expect(model.doGenerateCalls).toHaveLength(0);
  });

  it('validates the body', async () => {
    const { call } = setup();
    expect(await call({ ...Q, question: '' })).toMatchObject({ statusCode: 400, body: { field: 'question' } });
    expect(await call({ ...Q, question: 'x'.repeat(501) })).toMatchObject({ statusCode: 400, body: { field: 'question' } });
    expect(await call({ ...Q, node: 'admin' })).toMatchObject({ statusCode: 400, body: { field: 'node' } });
    expect(await call(null)).toMatchObject({ statusCode: 400 });
  });

  it('refuses the 7th AI answer in a conversation', async () => {
    const model = replying({ answer: 'Hi.', route: 'start' });
    const { call } = setup({ models: [model] });
    expect((await call({ ...Q, count: 5 })).statusCode).toBe(200);
    expect(await call({ ...Q, count: 6 })).toMatchObject({ statusCode: 429 });
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('limits each IP per minute and per hour', async () => {
    const minute = setup({ perMinute: 2 });
    expect((await minute.call(Q)).statusCode).toBe(200);
    expect((await minute.call(Q)).statusCode).toBe(200);
    expect((await minute.call(Q)).statusCode).toBe(429);
    expect((await minute.call(Q, 'POST', '5.6.7.8')).statusCode).toBe(200);

    const hour = setup({ perHour: 1 });
    expect((await hour.call(Q)).statusCode).toBe(200);
    expect(await hour.call(Q)).toMatchObject({ statusCode: 429, body: { error: 'AI answer limit reached for now.' } });
  });

  it('returns { fallback } and logs the outcome when the price guard rejects the answer', async () => {
    const { call, logs } = setup({ models: [replying({ answer: 'That is $999.', route: 'prod' })] });
    expect(await call(Q)).toMatchObject({ statusCode: 200, body: { fallback: 'guard' } });
    expect(JSON.parse(logs[0].replace('[bit-ask] ', ''))).toMatchObject({ outcome: 'guard', model: 'm0' });
    expect(logs[0]).not.toContain('$999');
  });

  it('uses the fallback model on a provider error, and returns { fallback } when both fail or time out', async () => {
    expect(await setup({ models: [failing(), replying({ answer: 'Hi.', route: 'start' })] }).call(Q)).toMatchObject({ statusCode: 200, body: { answer: 'Hi.' } });
    expect(await setup({ models: [failing(), failing()] }).call(Q)).toMatchObject({ statusCode: 200, body: { fallback: 'error' } });
    expect(await setup({ models: [hanging(), hanging()] }).call(Q)).toMatchObject({ statusCode: 200, body: { fallback: 'timeout' } });
  });
});
