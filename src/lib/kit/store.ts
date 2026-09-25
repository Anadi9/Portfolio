import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKET, storagePath, type PackId } from '../../data/kit/index.js';
import type { OrderLike } from './packs.js';

/**
 * Everything the kit keeps: orders, the packs on them, one access link per
 * buyer, and the Stripe events already handled. Supabase, reached with the
 * secret key from server functions only; the tables have RLS on and no
 * policies (see supabase/migrations/…_kit_packs.sql).
 *
 * Callers depend on `KitStore`, not on Supabase, so the webhook's logic can be
 * tested against a map in memory.
 */

export type Order = OrderLike & {
  id: string;
  stripe_session_id: string | null;
  email: string;
  amount_total: number;
};

export type NewOrder = Omit<Order, 'id' | 'status'> & { stripe_payment_intent: string | null };

export interface KitStore {
  /** `false` when the event was already recorded: a retry of one handled before. */
  recordEvent(id: string, type: string): Promise<boolean>;
  /** Undo `recordEvent` after a failed handle, so Stripe's retry is processed. */
  forgetEvent(id: string): Promise<void>;
  /** Idempotent on the session id: a second save of the same session changes nothing. */
  saveOrder(order: NewOrder): Promise<void>;
  ordersFor(email: string): Promise<Order[]>;
  orderForSession(sessionId: string): Promise<Order | null>;
  /** `false` when no order has that PaymentIntent (a sale from before the packs). */
  markRefunded(paymentIntent: string): Promise<boolean>;
  /** The buyer's salt, creating their access row with `create()` if there is none. */
  accessSalt(email: string, create: () => { salt: string; hash: string }): Promise<string>;
  emailForTokenHash(hash: string): Promise<string | null>;
  /** A signed URL for a zip, valid for `seconds`. */
  signedZipUrl(version: string, zip: string, seconds: number): Promise<string>;
  ping(): Promise<void>;
}

const UNIQUE_VIOLATION = '23505';

/** `null` when Supabase isn't configured, so a route can answer 501 instead of crashing. */
export function kitStore(): KitStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return supabaseStore(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

type OrderRow = Omit<Order, 'items'> & { kit_order_items: { pack_id: PackId; amount: number }[] };
const ORDER_COLUMNS = 'id, stripe_session_id, email, amount_total, currency, kind, status, kit_order_items(pack_id, amount)';
const toOrder = ({ kit_order_items, ...o }: OrderRow): Order => ({ ...o, items: kit_order_items });

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`[kit] ${what}: ${error?.message ?? 'no row'}`);
}

function supabaseStore(db: SupabaseClient): KitStore {
  return {
    async recordEvent(id, type) {
      const { error } = await db.from('stripe_events').insert({ id, type });
      if (error?.code === UNIQUE_VIOLATION) return false;
      if (error) fail('record event', error);
      return true;
    },

    async forgetEvent(id) {
      const { error } = await db.from('stripe_events').delete().eq('id', id);
      if (error) fail('forget event', error);
    },

    async saveOrder({ items, ...order }) {
      let orderId: string | undefined;
      if (order.stripe_session_id) {
        const { data, error } = await db
          .from('kit_orders')
          .upsert({ ...order, status: 'paid' }, { onConflict: 'stripe_session_id', ignoreDuplicates: true })
          .select('id');
        if (error) fail('save order', error);
        orderId = data?.[0]?.id;
        // Already saved by an earlier attempt: find it, so any items that attempt missed still get written.
        if (!orderId) {
          const found = await db.from('kit_orders').select('id').eq('stripe_session_id', order.stripe_session_id).single();
          if (found.error) fail('find order', found.error);
          orderId = found.data.id;
        }
      } else {
        const { data, error } = await db.from('kit_orders').insert({ ...order, status: 'paid' }).select('id').single();
        if (error) fail('save order', error);
        orderId = data.id;
      }
      const { error } = await db
        .from('kit_order_items')
        .upsert(items.map((i) => ({ order_id: orderId, ...i })), { onConflict: 'order_id,pack_id', ignoreDuplicates: true });
      if (error) fail('save order items', error);
    },

    async ordersFor(email) {
      const { data, error } = await db.from('kit_orders').select(ORDER_COLUMNS).eq('email', email).order('created_at');
      if (error) fail('orders for email', error);
      return (data as unknown as OrderRow[]).map(toOrder);
    },

    async orderForSession(sessionId) {
      const { data, error } = await db.from('kit_orders').select(ORDER_COLUMNS).eq('stripe_session_id', sessionId).maybeSingle();
      if (error) fail('order for session', error);
      return data ? toOrder(data as unknown as OrderRow) : null;
    },

    async markRefunded(paymentIntent) {
      const { data, error } = await db
        .from('kit_orders')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('stripe_payment_intent', paymentIntent)
        .eq('status', 'paid')
        .select('id');
      if (error) fail('mark refunded', error);
      if (data.length > 0) return true;
      // Already refunded counts as found; only a missing order is "no".
      const { data: rows, error: e2 } = await db.from('kit_orders').select('id').eq('stripe_payment_intent', paymentIntent).limit(1);
      if (e2) fail('find refunded order', e2);
      return rows.length > 0;
    },

    async accessSalt(email, create) {
      const read = async () => {
        const { data, error } = await db.from('kit_access').select('token_salt').eq('email', email).maybeSingle();
        if (error) fail('read access', error);
        return data?.token_salt as string | undefined;
      };
      const existing = await read();
      if (existing) return existing;
      const { salt, hash } = create();
      const { error } = await db.from('kit_access').insert({ email, token_salt: salt, token_hash: hash });
      if (!error) return salt;
      // Two deliveries for one new buyer at once: the other one's row wins.
      if (error.code === UNIQUE_VIOLATION) return (await read()) ?? fail('read access after conflict', null);
      fail('create access', error);
    },

    async emailForTokenHash(hash) {
      const { data, error } = await db.from('kit_access').select('email').eq('token_hash', hash).maybeSingle();
      if (error) fail('email for token', error);
      return (data?.email as string | undefined) ?? null;
    },

    async signedZipUrl(version, zip, seconds) {
      const { data, error } = await db.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath(version, zip), seconds, { download: zip });
      if (error || !data) fail('sign zip url', error);
      return data.signedUrl;
    },

    async ping() {
      const { error } = await db.from('stripe_events').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) fail('ping', error);
    },
  };
}
