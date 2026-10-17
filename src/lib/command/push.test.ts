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
    const wp = { setVapidDetails: vi.fn(), sendNotification: vi.fn() };
    expect(await sendPush(m.store, { title: 't', url: '/admin' }, { env: {}, webpush: wp })).toEqual({ sent: 0, removed: 0, skipped: true });
    expect(wp.sendNotification).not.toHaveBeenCalled();
  });

  it('sends to every subscription and drops the gone ones', async () => {
    const m = memoryTicketStore();
    await m.store.savePushSubscription(sub(1));
    await m.store.savePushSubscription(sub(2));
    await m.store.savePushSubscription(sub(1)); // same endpoint again: one row
    const wp = {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn().mockImplementation(async (s: { endpoint: string }) => {
        if (s.endpoint.endsWith('/2')) throw Object.assign(new Error('gone'), { statusCode: 410 });
        return {};
      }),
    };
    const r = await sendPush(m.store, { title: 'A-1001 · at risk', body: 'Due 18:00 IST', url: '/admin#card-x' }, { env, webpush: wp });
    expect(r).toEqual({ sent: 1, removed: 1, skipped: false });
    expect(wp.setVapidDetails).toHaveBeenCalledWith('mailto:me@example.com', 'pub', 'priv');
    expect(JSON.parse(wp.sendNotification.mock.calls[0][1])).toEqual({ title: 'A-1001 · at risk', body: 'Due 18:00 IST', url: '/admin#card-x' });
    expect((await m.store.pushSubscriptions()).map((s) => s.endpoint)).toEqual(['https://push.example/1']);
  });
});
