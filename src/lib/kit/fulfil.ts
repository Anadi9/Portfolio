import { pack, packForLookupKey, type PackId } from '../../data/kit/index.js';
import { renderPacksEmail } from './email.js';
import { owned, upgradeCredit, upgradeCurrency, upgradeDue, type OrderLike } from './packs.js';
import { downloadsUrl, formatMoney, isCurrency, KIT, type KitCurrency } from './product.js';
import type { KitStore, NewOrder } from './store.js';
import { isSettled, type KitSession, type LineItem } from './stripe.js';
import { deriveToken, hashToken, newSalt } from './tokens.js';

/**
 * What the Stripe webhook does once the signature checks out, with Stripe, the
 * database and email passed in so it can be tested without any of them.
 *
 * The shape follows the kit's own template (templates/next/app/api/stripe/
 * webhook/route.ts): record the event id first and do nothing for a repeat;
 * if handling throws, forget the event so Stripe's retry gets a clean run.
 * Every write below is idempotent on the session id, so a retry that follows a
 * half-finished attempt completes it rather than doubling it.
 */

export type KitEvent = { id: string; type: string; data: { object: unknown } };

type Mail = { to: string; subject: string; html: string; text: string };

export type FulfilDeps = {
  store: KitStore;
  tokenSecret: string;
  lineItems: (sessionId: string) => Promise<LineItem[]>;
  /** The full kit's price in a currency, from Stripe; `undefined` if it has none. */
  fullPrice: (currency: KitCurrency) => Promise<number | undefined>;
  /** Must throw on failure: a delivery that didn't send is a retry. */
  send: (mail: Mail, idempotencyKey: string) => Promise<void>;
  /** A note to Anadi. Best effort: never throws. */
  notify: (subject: string, text: string, idempotencyKey: string) => Promise<void>;
};

export async function processEvent(event: KitEvent, deps: FulfilDeps): Promise<'handled' | 'duplicate'> {
  if (!(await deps.store.recordEvent(event.id, event.type))) return 'duplicate';
  try {
    await handle(event, deps);
  } catch (err) {
    await deps.store.forgetEvent(event.id);
    throw err;
  }
  return 'handled';
}

async function handle(event: KitEvent, deps: FulfilDeps) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as KitSession;
      // Unpaid means a bank payment still settling: `async_payment_succeeded` follows.
      if (isSettled(session)) await fulfil(session, deps);
      return;
    }
    case 'charge.refunded': {
      const charge = event.data.object as { id: string; payment_intent: string | null; amount: number; amount_refunded: number };
      if (!charge.payment_intent) return;
      if (charge.amount_refunded < charge.amount) {
        await deps.notify('Kit: partial refund', `Charge ${charge.id} was partly refunded. Access is unchanged.`, `kit-partial/${event.id}`);
        return;
      }
      if (!(await deps.store.markRefunded(charge.payment_intent))) {
        console.warn('[kit] refund for a payment with no order (a sale from before packs?)', charge.payment_intent);
      }
      return;
    }
    default:
      return;
  }
}

const normEmail = (v: string | null | undefined) => {
  const email = v?.trim().toLowerCase();
  return email && email.indexOf('@') > 0 ? email : null;
};

async function fulfil(session: KitSession, deps: FulfilDeps) {
  const meta = session.metadata ?? {};
  const currency = session.currency;
  const amountTotal = session.amount_total ?? 0;

  let kind: NewOrder['kind'] = 'purchase';
  let email: string | null;
  let items: NewOrder['items'];

  if (meta.upgrade === 'true') {
    // The address the upgrade was priced for, not whatever was typed into Checkout.
    kind = 'upgrade';
    email = normEmail(meta.email);
    items = [{ pack_id: 'full', amount: amountTotal }];
  } else if (meta.product === KIT.id) {
    // A checkout opened on the old single-product page and paid after the switch.
    email = normEmail(session.customer_details?.email);
    items = [{ pack_id: 'full', amount: amountTotal }];
  } else if (meta.pack_ids !== undefined) {
    // What was bought is what Stripe charged for, read from the Prices' lookup keys, not from metadata.
    email = normEmail(session.customer_details?.email);
    items = (await deps.lineItems(session.id)).map((li) => {
      const id = packForLookupKey(li.price?.lookup_key);
      if (!id) throw new Error(`[kit] ${session.id} has a line item with no pack lookup key: ${li.price?.lookup_key}`);
      return { pack_id: id, amount: li.amount_total };
    });
  } else {
    return; // Not a kit sale (another product on the same account, or `stripe trigger`).
  }

  if (!isCurrency(currency)) throw new Error(`[kit] ${session.id} is in an unexpected currency: ${currency}`);
  if (!email || !session.success_url) {
    console.error('[kit] paid session without email or success_url', session.id);
    return;
  }

  await deps.store.saveOrder({
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent ?? null,
    email,
    amount_total: amountTotal,
    currency,
    kind,
    items,
  });

  const token = await accessToken(deps.store, email, deps.tokenSecret);
  const link = downloadsUrl(new URL(session.success_url).origin, token);
  const offer = await upgradeOffer(await deps.store.ordersFor(email), currency, deps.fullPrice);
  const names = items.map((i) => pack(i.pack_id).name);

  await deps.send({ to: email, ...renderPacksEmail({ packNames: names, link, upgrade: offer && offer.label }) }, `kit-delivery/${session.id}`);
  await deps.notify(
    `Kit ${kind}: ${email}`,
    `${email} bought ${names.join(', ')} for ${formatMoney(currency, amountTotal)}.\nSession: ${session.id}`,
    `kit-sale/${session.id}`,
  );
}

/** The buyer's token, creating their access row the first time. */
export async function accessToken(store: KitStore, email: string, secret: string): Promise<string> {
  const salt = await store.accessSalt(email, () => {
    const salt = newSalt();
    return { salt, hash: hashToken(deriveToken(secret, salt)) };
  });
  return deriveToken(secret, salt);
}

export type UpgradeOffer = { currency: KitCurrency; full: number; credit: number; due: number; label: string };

/**
 * What upgrading to the full kit costs this buyer, worked out on the server
 * from what they actually paid. `null` if they already own it, or bought
 * nothing that counts.
 */
export async function upgradeOffer(
  orders: readonly OrderLike[],
  visitor: KitCurrency,
  fullPrice: (currency: KitCurrency) => Promise<number | undefined>,
): Promise<UpgradeOffer | null> {
  const packs: Set<PackId> = owned(orders);
  if (packs.size === 0 || packs.has('full')) return null;
  const currency = upgradeCurrency(orders, visitor);
  const full = await fullPrice(currency);
  if (full === undefined) return null;
  const credit = upgradeCredit(orders, currency);
  const due = upgradeDue(full, credit, currency);
  return { currency, full, credit, due, label: due === 0 ? 'free' : formatMoney(currency, due) };
}
