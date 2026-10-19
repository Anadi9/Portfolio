import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Keep work running after the response has gone, on whichever host serves the
 * request. The Worker wraps each request in `runWithContext(ctx, …)`, so code
 * deep in a handler can reach the request's `ctx.waitUntil` without having it
 * passed down. On Vercel it uses the request context Vercel's runtime puts on
 * `globalThis` (what `@vercel/functions` reads). With neither (`npm run dev`,
 * tests) the promise just runs, and a rejection is caught here so it never
 * crashes the process.
 */

type Ctx = { waitUntil(p: Promise<unknown>): void };

const store = new AsyncLocalStorage<Ctx>();

const VERCEL_CONTEXT = Symbol.for('@vercel/request-context');

function vercelCtx(): Ctx | undefined {
  const holder = (globalThis as Record<symbol, { get?: () => Partial<Ctx> | undefined } | undefined>)[VERCEL_CONTEXT];
  const ctx = holder?.get?.();
  return typeof ctx?.waitUntil === 'function' ? (ctx as Ctx) : undefined;
}

export function runWithContext<T>(ctx: Ctx, fn: () => T): T {
  return store.run(ctx, fn);
}

export function waitUntil(p: Promise<unknown>): void {
  const ctx = store.getStore() ?? vercelCtx();
  if (ctx) ctx.waitUntil(p);
  else p.catch(() => {});
}
