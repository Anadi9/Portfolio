import type { KitStore, NewOrder, Order } from './store';

/**
 * An in-memory `KitStore` for the kit's tests: the same contract as the
 * Supabase one (idempotent on session id, one access row per email), with
 * everything inspectable. Not imported by any page or function.
 */
export function memoryStore() {
  const events = new Set<string>();
  const orders: Order[] = [];
  const access = new Map<string, { salt: string; hash: string }>();
  const store: KitStore = {
    async recordEvent(id) {
      if (events.has(id)) return false;
      events.add(id);
      return true;
    },
    async forgetEvent(id) {
      events.delete(id);
    },
    async saveOrder(o: NewOrder) {
      if (o.stripe_session_id && orders.some((x) => x.stripe_session_id === o.stripe_session_id)) return;
      orders.push({ ...o, id: `order_${orders.length + 1}`, status: 'paid', items: [...o.items], payment_intent: o.stripe_payment_intent } as Order);
    },
    async ordersFor(email) {
      return orders.filter((o) => o.email === email);
    },
    async orderForSession(id) {
      return orders.find((o) => o.stripe_session_id === id) ?? null;
    },
    async markRefunded(pi) {
      const found = orders.filter((o) => (o as Order & { payment_intent?: string }).payment_intent === pi);
      for (const o of found) o.status = 'refunded';
      return found.length > 0;
    },
    async accessSalt(email, create) {
      if (!access.has(email)) access.set(email, create());
      return access.get(email)!.salt;
    },
    async emailForTokenHash(hash) {
      for (const [email, a] of access) if (a.hash === hash) return email;
      return null;
    },
    async signedZipUrl(version, zip, seconds) {
      return `https://storage.test/kit/${version}/${zip}?expires=${seconds}`;
    },
    async ping() {},
  };
  return { store, events, orders, access };
}
