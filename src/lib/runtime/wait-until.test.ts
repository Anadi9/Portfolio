import { describe, expect, it } from 'vitest';
import { runWithContext, waitUntil } from './wait-until';

describe('waitUntil', () => {
  it('hands the promise to the context', async () => {
    const seen: Promise<unknown>[] = [];
    const p = Promise.resolve(1);
    await runWithContext({ waitUntil: (x) => seen.push(x) }, async () => {
      await Promise.resolve();
      waitUntil(p);
    });
    expect(seen).toEqual([p]);
  });

  it('runs without a context', async () => {
    let ran = false;
    waitUntil(
      (async () => {
        ran = true;
      })(),
    );
    await Promise.resolve();
    expect(ran).toBe(true);
  });

  it('does not leak a rejection without a context', async () => {
    waitUntil(Promise.reject(new Error('x')));
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe('waitUntil on Vercel', () => {
  it('uses the request context Vercel puts on globalThis', () => {
    const seen: Promise<unknown>[] = [];
    const key = Symbol.for('@vercel/request-context');
    const g = globalThis as Record<symbol, unknown>;
    g[key] = { get: () => ({ waitUntil: (p: Promise<unknown>) => seen.push(p) }) };
    try {
      const p = Promise.resolve();
      waitUntil(p);
      expect(seen).toEqual([p]);
    } finally {
      delete g[key];
    }
  });
});
