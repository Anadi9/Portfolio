import webpushLib from 'web-push';
import type { TicketStore } from '../tickets/store.js';

/**
 * Phone alerts for urgent Coach cards, through the browser's own push service
 * (free, VAPID). The payload is a card title and a link: no client details.
 * Subscriptions the push service reports gone (404/410) are deleted.
 */

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushPayload = { title: string; body?: string; url: string };
type WebPushLike = Pick<typeof webpushLib, 'setVapidDetails' | 'sendNotification'>;

type Env = Record<string, string | undefined>;

export const pushConfigured = (env: Env) => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

export async function sendPush(
  store: TicketStore,
  payload: PushPayload,
  deps: { env?: Env; webpush?: WebPushLike } = {},
): Promise<{ sent: number; removed: number; skipped: boolean }> {
  const env = deps.env ?? process.env;
  if (!pushConfigured(env)) return { sent: 0, removed: 0, skipped: true };
  const wp = deps.webpush ?? webpushLib;
  wp.setVapidDetails(env.VAPID_SUBJECT as string, env.VAPID_PUBLIC_KEY as string, env.VAPID_PRIVATE_KEY as string);
  const body = JSON.stringify({ title: payload.title.slice(0, 120), body: (payload.body ?? '').slice(0, 200), url: payload.url });
  let sent = 0;
  let removed = 0;
  for (const s of await store.pushSubscriptions()) {
    try {
      await wp.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 3600 });
      sent += 1;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await store.removePushSubscription(s.endpoint);
        removed += 1;
      } else console.error('[push] send failed', code, (err as Error).message);
    }
  }
  return { sent, removed, skipped: false };
}
