import { createHmac, timingSafeEqual } from 'node:crypto';
import { KIT } from './product.js';

/**
 * The three Stripe calls the kit needs, over plain `fetch`.
 *
 * Create a Checkout Session, read one back, and verify a webhook signature. That
 * is small enough that the SDK would be a dependency for its own sake, and the
 * webhook check in particular is worth being able to read: it is the only thing
 * standing between a forged POST and a free download email.
 */

const API = 'https://api.stripe.com/v1';

export type KitSession = {
  id: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  success_url: string | null;
  metadata: Record<string, string> | null;
  customer_details: { email: string | null } | null;
};

/** Only a paid session that this checkout created unlocks the download. */
export const isPaidKitSession = (s: Pick<KitSession, 'payment_status' | 'metadata'>) =>
  s.payment_status === 'paid' && s.metadata?.product === KIT.id;

/** Session ids are `cs_live_…` / `cs_test_…`; anything else is not worth a round trip. */
export const isSessionId = (v: unknown): v is string => typeof v === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(v);

export async function createKitCheckout(key: string, origin: string): Promise<{ url: string }> {
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': KIT.currency,
    'line_items[0][price_data][unit_amount]': String(KIT.amount),
    'line_items[0][price_data][product_data][name]': KIT.name,
    'metadata[product]': KIT.id,
    // Stripe substitutes the literal placeholder; it must not be URL-encoded.
    success_url: `${origin}${KIT.thanksPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${KIT.path}`,
    allow_promotion_codes: 'true',
  });
  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) throw new Error(`stripe checkout ${res.status}: ${data.error?.message ?? 'no url'}`);
  return { url: data.url };
}

/** `null` for a session Stripe doesn't know; throws on anything else going wrong. */
export async function getSession(key: string, id: string): Promise<KitSession | null> {
  const res = await fetch(`${API}/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`stripe session ${res.status}`);
  return (await res.json()) as KitSession;
}

/**
 * Stripe's `Stripe-Signature` scheme: `t=<unix>,v1=<hex>[,v1=…]`, where each v1
 * is HMAC-SHA256 over `${t}.${rawBody}` with the endpoint secret. The raw body,
 * byte for byte: a re-serialised JSON object will not match. Five minutes of
 * tolerance, Stripe's own default, so a captured request can't be replayed later.
 */
export function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string, nowSec = Date.now() / 1000): boolean {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.split('=') as [string, string]);
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!Number.isFinite(t) || sigs.length === 0 || Math.abs(nowSec - t) > 300) return false;

  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex'));
  return sigs.some((sig) => {
    const got = Buffer.from(sig ?? '');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
