import { describe, expect, it, vi } from 'vitest';
import { processEvent, upgradeOffer, type FulfilDeps, type KitEvent } from './fulfil';
import type { LineItem } from './stripe';
import { memoryStore } from './testing';
import { hashToken } from './tokens';

const LINE = (key: string, amount: number): LineItem => ({ amount_total: amount, price: { lookup_key: key } });

function setup(lineItems: Record<string, LineItem[]> = {}) {
  const mem = memoryStore();
  const sent: { to: string; subject: string; text: string; key: string }[] = [];
  const notes: string[] = [];
  const deps: FulfilDeps = {
    store: mem.store,
    tokenSecret: 'test-secret',
    lineItems: vi.fn(async (id: string) => {
      if (!lineItems[id]) throw new Error(`no line items for ${id}`);
      return lineItems[id];
    }),
    fullPrice: async (c) => (c === 'usd' ? 1900 : 159900),
    send: async (mail, key) => {
      sent.push({ to: mail.to, subject: mail.subject, text: mail.text, key });
    },
    notify: async (subject) => {
      notes.push(subject);
    },
  };
  return { ...mem, deps, sent, notes };
}

const session = (id: string, extra: Record<string, unknown> = {}): KitEvent => ({
  id: `evt_${id}`,
  type: 'checkout.session.completed',
  data: {
    object: {
      id,
      payment_status: 'paid',
      success_url: 'https://anadithakur.in/kit/thanks?session_id={CHECKOUT_SESSION_ID}',
      customer_details: { email: 'Buyer@Example.com ' },
      currency: 'usd',
      amount_total: 1600,
      payment_intent: `pi_${id}`,
      metadata: { pack_ids: 'data-security,auth', kit_version: '1.2.0' },
      ...extra,
    },
  },
});

const linkIn = (text: string) => /https:\/\/anadithakur\.in\/kit\/downloads\/([A-Za-z0-9_-]{43})/.exec(text)?.[1];

describe('processEvent: purchases', () => {
  it('records the packs Stripe charged for, by lookup key, and emails the downloads link', async () => {
    const t = setup({ cs_1: [LINE('kit_data_security', 900), LINE('kit_auth', 700)] });
    expect(await processEvent(session('cs_1'), t.deps)).toBe('handled');

    expect(t.orders).toHaveLength(1);
    expect(t.orders[0]).toMatchObject({ email: 'buyer@example.com', amount_total: 1600, currency: 'usd', kind: 'purchase' });
    expect(t.orders[0].items).toEqual([
      { pack_id: 'data-security', amount: 900 },
      { pack_id: 'auth', amount: 700 },
    ]);

    expect(t.sent).toHaveLength(1);
    expect(t.sent[0].to).toBe('buyer@example.com');
    expect(t.sent[0].key).toBe('kit-delivery/cs_1');
    expect(t.sent[0].text).toContain('Lock Down Your Data and Fix Sign-up and Login');
    expect(t.sent[0].text).toContain('Upgrade to the full kit for $3');
    const token = linkIn(t.sent[0].text)!;
    expect(await t.store.emailForTokenHash(hashToken(token))).toBe('buyer@example.com');
  });

  it('ignores metadata when it disagrees with the line items', async () => {
    const t = setup({ cs_2: [LINE('kit_lovable_bolt', 500)] });
    await processEvent(session('cs_2', { metadata: { pack_ids: 'full' }, amount_total: 500 }), t.deps);
    expect(t.orders[0].items).toEqual([{ pack_id: 'lovable-bolt', amount: 500 }]);
  });

  it('does nothing for a repeated event: one order, one email', async () => {
    const t = setup({ cs_1: [LINE('kit_auth', 700)] });
    expect(await processEvent(session('cs_1'), t.deps)).toBe('handled');
    expect(await processEvent(session('cs_1'), t.deps)).toBe('duplicate');
    expect(t.orders).toHaveLength(1);
    expect(t.sent).toHaveLength(1);
  });

  it('forgets the event when handling fails, so Stripe’s retry is processed', async () => {
    const t = setup({ cs_3: [LINE('kit_someone_elses_product', 100)] });
    await expect(processEvent(session('cs_3'), t.deps)).rejects.toThrow(/no pack lookup key/);
    expect(t.events.has('evt_cs_3')).toBe(false);
    expect(t.orders).toHaveLength(0);
  });

  it('a retry after a failed send completes the delivery without a second order', async () => {
    const t = setup({ cs_4: [LINE('kit_auth', 700)] });
    const send = t.deps.send;
    t.deps.send = async () => {
      throw new Error('resend down');
    };
    await expect(processEvent(session('cs_4'), t.deps)).rejects.toThrow('resend down');
    t.deps.send = send;
    expect(await processEvent(session('cs_4'), t.deps)).toBe('handled');
    expect(t.orders).toHaveLength(1);
    expect(t.sent).toHaveLength(1);
  });

  it('waits for an unpaid (still settling) session, then delivers on async_payment_succeeded', async () => {
    const t = setup({ cs_5: [LINE('kit_auth', 700)] });
    await processEvent(session('cs_5', { payment_status: 'unpaid' }), t.deps);
    expect(t.orders).toHaveLength(0);
    await processEvent({ ...session('cs_5'), id: 'evt_cs_5_async', type: 'checkout.session.async_payment_succeeded' }, t.deps);
    expect(t.orders).toHaveLength(1);
  });

  it('delivers a 100%-off promo session', async () => {
    const t = setup({ cs_6: [LINE('kit_full', 0)] });
    await processEvent(session('cs_6', { payment_status: 'no_payment_required', amount_total: 0 }), t.deps);
    expect(t.orders[0].items).toEqual([{ pack_id: 'full', amount: 0 }]);
  });

  it('reuses one access link per email across purchases', async () => {
    const t = setup({ cs_a: [LINE('kit_auth', 700)], cs_b: [LINE('kit_launch', 700)] });
    await processEvent(session('cs_a'), t.deps);
    await processEvent(session('cs_b'), t.deps);
    expect(linkIn(t.sent[0].text)).toBe(linkIn(t.sent[1].text));
    expect(t.access.size).toBe(1);
  });

  it('grants the full kit for an old single-product session paid after the switch', async () => {
    const t = setup();
    await processEvent(session('cs_old', { metadata: { product: 'production-kit' }, amount_total: 1900 }), t.deps);
    expect(t.orders[0].items).toEqual([{ pack_id: 'full', amount: 1900 }]);
    expect(t.deps.lineItems).not.toHaveBeenCalled();
  });

  it('ignores sessions that aren’t kit sales', async () => {
    const t = setup();
    await processEvent(session('cs_other', { metadata: {} }), t.deps);
    expect(t.orders).toHaveLength(0);
    expect(t.sent).toHaveLength(0);
  });
});

describe('processEvent: upgrades and refunds', () => {
  it('grants the full kit to the email the upgrade was priced for, not the one typed at checkout', async () => {
    const t = setup();
    await processEvent(
      session('cs_up', { metadata: { upgrade: 'true', email: 'buyer@example.com' }, customer_details: { email: 'other@example.com' }, amount_total: 300 }),
      t.deps,
    );
    expect(t.orders[0]).toMatchObject({ email: 'buyer@example.com', kind: 'upgrade', items: [{ pack_id: 'full', amount: 300 }] });
    expect(t.sent[0].text).not.toContain('Upgrade to the full kit');
  });

  it('a full refund takes the order’s packs away; a partial one only notifies', async () => {
    const t = setup({ cs_r: [LINE('kit_auth', 700)] });
    await processEvent(session('cs_r'), t.deps);
    const refund = (id: string, refunded: number): KitEvent => ({
      id,
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', payment_intent: 'pi_cs_r', amount: 700, amount_refunded: refunded } },
    });
    await processEvent(refund('evt_partial', 200), t.deps);
    expect(t.orders[0].status).toBe('paid');
    expect(t.notes).toContain('Kit: partial refund');
    await processEvent(refund('evt_full', 700), t.deps);
    expect(t.orders[0].status).toBe('refunded');
  });
});

describe('upgradeOffer', () => {
  const full = async () => 1900;

  it('after two packs, charges the full kit minus what they paid', async () => {
    const offer = await upgradeOffer(
      [{ kind: 'purchase', status: 'paid', currency: 'usd', items: [{ pack_id: 'data-security', amount: 900 }, { pack_id: 'auth', amount: 700 }] }],
      'usd',
      full,
    );
    expect(offer).toMatchObject({ due: 300, label: '$3', credit: 1600 });
  });

  it('after all five packs, is free', async () => {
    const items = [
      { pack_id: 'data-security' as const, amount: 900 },
      { pack_id: 'auth' as const, amount: 700 },
      { pack_id: 'launch' as const, amount: 700 },
      { pack_id: 'ai-discipline' as const, amount: 700 },
      { pack_id: 'lovable-bolt' as const, amount: 500 },
    ];
    expect(await upgradeOffer([{ kind: 'purchase', status: 'paid', currency: 'usd', items }], 'usd', full)).toMatchObject({ due: 0, label: 'free' });
  });

  it('offers nothing to someone who owns the full kit or owns nothing', async () => {
    expect(await upgradeOffer([{ kind: 'purchase', status: 'paid', currency: 'usd', items: [{ pack_id: 'full', amount: 1900 }] }], 'usd', full)).toBeNull();
    expect(await upgradeOffer([], 'usd', full)).toBeNull();
  });
});
