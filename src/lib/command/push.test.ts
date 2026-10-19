import { describe, expect, it, vi } from 'vitest';
import { memoryTicketStore } from '../tickets/memory';
import { pushConfigured, sendPush } from './push';

const env = { VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:me@example.com' };
const sub = (n: number) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });

describe('sendPush', () => {
  it('needs all three VAPID values', () => {
    expect(pushConfigured(env)).toBe(true);
    expect(pushConfigured({ ...env, VAPID_SUBJECT: '' })).toBe(false);
  });

  it('skips without VAPID keys', async () => {
    const m = memoryTicketStore();
    await m.store.savePushSubscription(sub(1));
    const wp = { generateRequestDetails: vi.fn() };
    const fetch = vi.fn();
    expect(await sendPush(m.store, { title: 't', url: '/admin' }, { env: {}, webpush: wp, fetch })).toEqual({ sent: 0, removed: 0, skipped: true });
    expect(wp.generateRequestDetails).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends to every subscription and drops the gone ones', async () => {
    const m = memoryTicketStore();
    await m.store.savePushSubscription(sub(1));
    await m.store.savePushSubscription(sub(2));
    await m.store.savePushSubscription(sub(1)); // same endpoint again: one row
    const wp = {
      generateRequestDetails: vi.fn().mockImplementation((s: { endpoint: string }) => ({
        endpoint: s.endpoint,
        method: 'POST',
        headers: { TTL: '3600', 'Content-Encoding': 'aes128gcm' },
        body: Buffer.from('cipher'),
      })),
    };
    const fetch = vi.fn().mockImplementation(async (url: string) => ({ status: url.endsWith('/2') ? 410 : 201 }));
    const r = await sendPush(m.store, { title: 'A-1001 · at risk', body: 'Due 18:00 IST', url: '/admin#card-x' }, { env, webpush: wp, fetch });
    expect(r).toEqual({ sent: 1, removed: 1, skipped: false });
    const [subscription, payload, options] = wp.generateRequestDetails.mock.calls[0];
    expect(subscription).toEqual(sub(1));
    expect(JSON.parse(payload)).toEqual({ title: 'A-1001 · at risk', body: 'Due 18:00 IST', url: '/admin#card-x' });
    expect(options).toEqual({ TTL: 3600, vapidDetails: { subject: 'mailto:me@example.com', publicKey: 'pub', privateKey: 'priv' } });
    expect(fetch).toHaveBeenCalledWith('https://push.example/1', { method: 'POST', headers: { TTL: '3600', 'Content-Encoding': 'aes128gcm' }, body: Buffer.from('cipher') });
    expect((await m.store.pushSubscriptions()).map((s) => s.endpoint)).toEqual(['https://push.example/1']);
  });

  it('keeps the subscription on other failures, and carries on', async () => {
    const m = memoryTicketStore();
    await m.store.savePushSubscription(sub(1));
    await m.store.savePushSubscription(sub(2));
    const wp = {
      generateRequestDetails: vi.fn().mockImplementation((s: { endpoint: string }) => {
        if (s.endpoint.endsWith('/1')) throw new Error('bad key');
        return { endpoint: s.endpoint, method: 'POST', headers: {}, body: Buffer.from('x') };
      }),
    };
    const fetch = vi.fn().mockResolvedValue({ status: 500 });
    expect(await sendPush(m.store, { title: 't', url: '/admin' }, { env, webpush: wp, fetch })).toEqual({ sent: 0, removed: 0, skipped: false });
    expect((await m.store.pushSubscriptions()).length).toBe(2);
  });
});
