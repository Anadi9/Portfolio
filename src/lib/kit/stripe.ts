import { createHmac, timingSafeEqual } from 'node:crypto';
import { LOOKUP_KEYS, packForLookupKey, type PackId } from '../../data/kit/index.js';
import type { KitPrices } from './packs.js';
import { CURRENCIES, KIT, type KitCurrency } from './product.js';

/**
 * The Stripe calls the kit needs, over plain `fetch`.
 *
 * Look up the pack Prices, create a Checkout Session, read one back with its
 * line items, and verify a webhook signature. That is small enough that the SDK would be a dependency for its own sake, and the
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
  customer_email?: string | null;
  currency?: string | null;
  amount_total?: number | null;
  payment_intent?: string | null;
};

/** Only a paid session that the old single-product checkout created unlocks the old download. */
export const isPaidKitSession = (s: Pick<KitSession, 'payment_status' | 'metadata'>) =>
  s.payment_status === 'paid' && s.metadata?.product === KIT.id;

/** Session ids are `cs_live_…` / `cs_test_…`; anything else is not worth a round trip. */
export const isSessionId = (v: unknown): v is string => typeof v === 'string' && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(v);

/** One call to Stripe's form-encoded API. Throws with Stripe's message on anything but 2xx. */
async function stripe<T>(key: string, path: string, form?: URLSearchParams): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${key}`, ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' }) },
    body: form,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`stripe ${path.split('?')[0]} ${res.status}: ${data.error?.message ?? 'no message'}`);
  return data;
}

type StripePrice = {
  id: string;
  lookup_key: string | null;
  currency: string;
  unit_amount: number | null;
  product: string;
  currency_options?: Record<string, { unit_amount: number | null }>;
};

export type Catalog = {
  prices: KitPrices;
  /** Price id per pack, for checkout line items. */
  priceIds: Partial<Record<PackId, string>>;
  /** Product id per pack; the upgrade charges against the full kit's. */
  products: Partial<Record<PackId, string>>;
};

/**
 * The six Prices, found by lookup key, with each one's amount in every currency
 * it has. A pack whose Price is missing (or has no amount in a currency) is left
 * out of that table, and the page and the checkout both refuse to sell it.
 */
export async function fetchCatalog(key: string): Promise<Catalog> {
  const q = new URLSearchParams({ active: 'true', limit: '20', 'expand[]': 'data.currency_options' });
  for (const lk of Object.values(LOOKUP_KEYS)) q.append('lookup_keys[]', lk);
  const { data } = await stripe<{ data: StripePrice[] }>(key, `/prices?${q}`);

  const catalog: Catalog = { prices: { source: 'stripe', usd: {}, inr: {} }, priceIds: {}, products: {} };
  for (const price of data) {
    const id = packForLookupKey(price.lookup_key);
    if (!id) continue;
    catalog.priceIds[id] = price.id;
    catalog.products[id] = price.product;
    for (const currency of CURRENCIES) {
      const amount = price.currency === currency ? price.unit_amount : price.currency_options?.[currency]?.unit_amount;
      if (typeof amount === 'number') catalog.prices[currency][id] = amount;
    }
  }
  return catalog;
}

/** A Checkout Session for one or more packs, one line item each, at Stripe's prices. */
export async function createPacksCheckout(
  key: string,
  opts: { origin: string; currency: KitCurrency; packIds: PackId[]; priceIds: Catalog['priceIds']; version: string },
): Promise<{ url: string }> {
  const form = new URLSearchParams({
    mode: 'payment',
    currency: opts.currency,
    allow_promotion_codes: 'true',
    // Stripe India needs the buyer's name and address on export sales.
    billing_address_collection: 'required',
    'metadata[pack_ids]': opts.packIds.join(','),
    'metadata[kit_version]': opts.version,
    // Stripe substitutes the literal placeholder; it must not be URL-encoded.
    success_url: `${opts.origin}${KIT.packsThanksPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origin}${KIT.path}?packs=${opts.packIds.join(',')}#picker`,
  });
  opts.packIds.forEach((id, i) => {
    form.set(`line_items[${i}][price]`, opts.priceIds[id]!);
    form.set(`line_items[${i}][quantity]`, '1');
  });
  const data = await stripe<{ url?: string }>(key, '/checkout/sessions', form);
  if (!data.url) throw new Error('stripe checkout: no url');
  return { url: data.url };
}

/**
 * The upgrade: the full kit's Product at the difference the server worked out.
 * The email rides in metadata because that, not whatever is typed into Checkout,
 * is whose access the webhook upgrades.
 */
export async function createUpgradeCheckout(
  key: string,
  opts: { origin: string; currency: KitCurrency; amount: number; product: string; email: string; token: string },
): Promise<{ url: string }> {
  const back = `${opts.origin}${KIT.downloadsPath}/${opts.token}`;
  const form = new URLSearchParams({
    mode: 'payment',
    customer_email: opts.email,
    billing_address_collection: 'required',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': opts.currency,
    'line_items[0][price_data][unit_amount]': String(opts.amount),
    'line_items[0][price_data][product]': opts.product,
    'metadata[upgrade]': 'true',
    'metadata[email]': opts.email,
    success_url: `${opts.origin}${KIT.packsThanksPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: back,
  });
  const data = await stripe<{ url?: string }>(key, '/checkout/sessions', form);
  if (!data.url) throw new Error('stripe upgrade checkout: no url');
  return { url: data.url };
}

export type LineItem = { amount_total: number; price: { lookup_key: string | null } | null };

/** A session's line items with their Prices, which is where the lookup keys are. */
export async function listLineItems(key: string, sessionId: string): Promise<LineItem[]> {
  const q = new URLSearchParams({ limit: '20', 'expand[]': 'data.price' });
  const { data } = await stripe<{ data: LineItem[] }>(key, `/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?${q}`);
  return data;
}

/** Paid, or free through a 100%-off code only the seller can make. */
export const isSettled = (s: Pick<KitSession, 'payment_status'>) => s.payment_status === 'paid' || s.payment_status === 'no_payment_required';

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
