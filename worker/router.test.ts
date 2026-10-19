import { describe, expect, it } from 'vitest';
import routeFn from '../api/[route]';
import bitFn from '../api/bit/[action]';
import cronFn from '../api/cron/[job]';
import { resolveApi } from './router';

describe('resolveApi', () => {
  it('sends a single segment to api/[route] with route=<segment>', () => {
    expect(resolveApi('/api/scan')).toEqual({ handler: routeFn, query: { route: 'scan' }, raw: false });
  });

  it('resolves the folders by their param name', () => {
    expect(resolveApi('/api/bit/ask')).toEqual({ handler: bitFn, query: { action: 'ask' }, raw: false });
    expect(resolveApi('/api/cron/heartbeat')).toEqual({ handler: cronFn, query: { job: 'heartbeat' }, raw: false });
  });

  it('sends the removed kit and Stripe paths nowhere a handler would answer', () => {
    expect(resolveApi('/api/kit/prices')).toBeNull();
    expect(resolveApi('/api/stripe-webhook')?.query).toEqual({ route: 'stripe-webhook' });
  });

  it('allows one trailing slash, as Vercel does', () => {
    expect(resolveApi('/api/health/')?.query).toEqual({ route: 'health' });
  });

  it('is null for anything else', () => {
    expect(resolveApi('/api/a/b/c')).toBeNull();
    expect(resolveApi('/api/')).toBeNull();
    expect(resolveApi('/api')).toBeNull();
    expect(resolveApi('/api/nope/x')).toBeNull();
    expect(resolveApi('/api/%2e%2e')).toBeNull();
    expect(resolveApi('/about')).toBeNull();
  });
});
