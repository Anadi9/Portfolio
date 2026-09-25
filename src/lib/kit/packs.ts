import { z } from 'zod';
import { isPackId, PACK_IDS, type PackId } from '../../data/kit/index.js';
import type { KitCurrency } from './product.js';

/**
 * The rules of buying packs, with no I/O: which selections are valid, what the
 * picker shows, and what an upgrade costs. The page, the checkout and the
 * webhook all call these, so there is one answer to each question.
 */

/** Minor units per pack. A pack Stripe has no price for (in that currency) is missing. */
export type PriceTable = Partial<Record<PackId, number>>;
export type KitPrices = { source: 'stripe' | 'manifest'; usd: PriceTable; inr: PriceTable };

/** Dedupe, and let the full kit swallow the packs: it contains every one of them. Display order. */
export function collapse(ids: readonly PackId[]): PackId[] {
  const set = new Set(ids);
  if (set.has('full')) return ['full'];
  return PACK_IDS.filter((id) => set.has(id));
}

const CheckoutBody = z.object({ packIds: z.array(z.string().max(40)).max(12) });

/** The checkout's input: `{ packIds }`, every id known, at least one. */
export function parseCheckoutBody(body: unknown): { ok: true; packIds: PackId[] } | { ok: false; error: string } {
  const parsed = CheckoutBody.safeParse(body);
  if (!parsed.success) return { ok: false, error: 'Send { "packIds": [...] } with the ids of the packs you want.' };
  const unknown = parsed.data.packIds.find((id) => !isPackId(id));
  if (unknown !== undefined) return { ok: false, error: `There is no pack called "${unknown}".` };
  const packIds = collapse(parsed.data.packIds as PackId[]);
  if (packIds.length === 0) return { ok: false, error: 'Pick at least one pack.' };
  return { ok: true, packIds };
}

/**
 * What the product page's URL asks for. `?packs=auth,launch` is the selection
 * (shared links, back button, a cancelled checkout); `?pack=auth` adds one pack
 * and asks for the picker to be scrolled to; `?upgrade=1` shows the upgrade note.
 * Anything unknown is dropped rather than refused: it's a URL someone typed.
 */
export function parsePageParams(search: string): { selected: PackId[]; focus: boolean; upgrade: boolean } {
  const q = new URLSearchParams(search);
  const listed = (q.get('packs') ?? '').split(',').filter(isPackId);
  const single = q.get('pack');
  const one = isPackId(single) ? [single] : [];
  return { selected: collapse([...listed, ...one]), focus: one.length > 0, upgrade: q.get('upgrade') === '1' };
}

/** Ticking the full kit clears the packs; ticking a pack while the full kit is ticked switches to that pack. */
export function toggle(selected: readonly PackId[], id: PackId, on: boolean): PackId[] {
  if (!on) return selected.filter((x) => x !== id);
  if (id === 'full') return ['full'];
  return collapse([...selected.filter((x) => x !== 'full'), id]);
}

/** Total in minor units, or `null` if any selected pack has no price. */
export function total(selected: readonly PackId[], prices: PriceTable): number | null {
  let sum = 0;
  for (const id of selected) {
    const amount = prices[id];
    if (amount === undefined) return null;
    sum += amount;
  }
  return sum;
}

/** How close the packs have to get to the full kit's price before the picker suggests it. */
export const NUDGE_THRESHOLD: Record<KitCurrency, number> = { usd: 500, inr: 40000 };

export type Nudge = { kind: 'save' | 'more' | 'same'; picks: number; full: number; diff: number };

/** The "get everything" suggestion, or `null` when it would not be honest or useful. */
export function nudge(selected: readonly PackId[], prices: PriceTable, currency: KitCurrency): Nudge | null {
  if (selected.length === 0 || selected.includes('full')) return null;
  const picks = total(selected, prices);
  const full = prices.full;
  if (picks === null || full === undefined || picks < full - NUDGE_THRESHOLD[currency]) return null;
  if (picks > full) return { kind: 'save', picks, full, diff: picks - full };
  if (picks < full) return { kind: 'more', picks, full, diff: full - picks };
  return { kind: 'same', picks, full, diff: 0 };
}

/** An order as ownership and upgrade credit see it. */
export type OrderLike = {
  kind: 'purchase' | 'upgrade';
  status: 'paid' | 'refunded';
  currency: KitCurrency;
  items: { pack_id: PackId; amount: number }[];
};

/** Every pack on a paid (not refunded) order. */
export function owned(orders: readonly OrderLike[]): Set<PackId> {
  return new Set(orders.filter((o) => o.status === 'paid').flatMap((o) => o.items.map((i) => i.pack_id)));
}

/** What a downloads page lists: the full kit alone if it's owned (it contains every pack). */
export const visible = (packs: Set<PackId>): PackId[] => (packs.has('full') ? ['full'] : PACK_IDS.filter((id) => packs.has(id)));

/** The currency an upgrade is charged in: the one their packs were paid in, or the visitor's if they paid in both. */
export function upgradeCurrency(orders: readonly OrderLike[], visitor: KitCurrency): KitCurrency {
  const paid = new Set(orders.filter((o) => o.status === 'paid' && o.kind === 'purchase').map((o) => o.currency));
  return paid.size === 1 ? [...paid][0] : visitor;
}

/** What they've paid for packs in that currency, after discounts, refunds excluded. */
export function upgradeCredit(orders: readonly OrderLike[], currency: KitCurrency): number {
  return orders
    .filter((o) => o.status === 'paid' && o.kind === 'purchase' && o.currency === currency)
    .flatMap((o) => o.items)
    .filter((i) => i.pack_id !== 'full')
    .reduce((sum, i) => sum + i.amount, 0);
}

/** Stripe's smallest charge. Below it, the upgrade is granted without a payment. */
export const MIN_CHARGE: Record<KitCurrency, number> = { usd: 50, inr: 50 };

/** The upgrade's price: the full kit minus the credit, or 0 when the credit covers it (or leaves less than Stripe can charge). */
export function upgradeDue(fullPrice: number, credit: number, currency: KitCurrency): number {
  const due = fullPrice - credit;
  return due < MIN_CHARGE[currency] ? 0 : due;
}

/** `a•••@gmail.com`: enough for someone to recognise their own link, not enough to read an address off a screenshot. */
export function maskEmail(email: string): string {
  const [user, host] = email.split('@');
  return host ? `${user.slice(0, 1)}•••@${host}` : '•••';
}
