import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitStore } from './store';
import { memoryStore } from './testing';
import { LATEST, RELEASES } from '@/data/kit';

/**
 * The `/api/kit/*` routes and the webhook's front door, with Stripe and the
 * store swapped for fakes. What these pin down is what the browser can and
 * can't make the server do.
 */

let mem: ReturnType<typeof memoryStore>;
vi.mock('./store.js', () => ({ kitStore: () => mem.store as KitStore }));

const createUpgradeCheckout = vi.fn(async () => ({ url: 'https://checkout.stripe.test/upgrade' }));
const createPacksCheckout = vi.fn(async () => ({ url: 'https://checkout.stripe.test/packs' }));
vi.mock('./stripe.js', async (orig) => ({
  ...(await orig<typeof import('./stripe')>()),
  fetchCatalog: async () => ({
    prices: { source: 'stripe', usd: { full: 1900, 'data-security': 900, auth: 700, launch: 700, 'ai-discipline': 700, 'lovable-bolt': 500 }, inr: {} },
    priceIds: { full: 'price_full', 'data-security': 'price_ds', auth: 'price_auth', launch: 'price_launch', 'ai-discipline': 'price_ai', 'lovable-bolt': 'price_lb' },
    products: { full: 'prod_full' },
  }),
  createPacksCheckout,
  createUpgradeCheckout,
}));

const { KIT_ROUTES } = await import('./handlers');
const { accessToken } = await import('./fulfil');

function call(action: string, req: Partial<VercelRequest>) {
  const out = { status: 0, body: undefined as unknown, headers: {} as Record<string, string> };
  const res = {
    setHeader(k: string, v: string) {
      out.headers[k.toLowerCase()] = v;
      return res;
    },
    status(code: number) {
      out.status = code;
      return res;
    },
    json(b: unknown) {
      out.body = b;
      return res;
    },
    send(b: unknown) {
      out.body = b;
      return res;
    },
  } as unknown as VercelResponse;
  const full = { method: 'GET', headers: { 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }, query: {}, ...req } as VercelRequest;
  return KIT_ROUTES[action](full, res).then(() => out);
}

const SECRET = 'test-token-secret';

async function buyer(email: string, items: { pack_id: 'full' | 'auth' | 'launch' | 'data-security'; amount: number }[], session = `cs_test_${email.replace(/\W/g, '')}000000`) {
  await mem.store.saveOrder({ stripe_session_id: session, stripe_payment_intent: `pi_${session}`, email, amount_total: 0, currency: 'usd', kind: 'purchase', items });
  return accessToken(mem.store, email, SECRET);
}

beforeEach(() => {
  mem = memoryStore();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
  vi.stubEnv('KIT_TOKEN_SECRET', SECRET);
  // `.env.local` may set this for trying rupees locally; requests here carry no geo header.
  vi.stubEnv('KIT_DEV_COUNTRY', 'US');
  createUpgradeCheckout.mockClear();
  createPacksCheckout.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/kit/checkout', () => {
  it('is closed now the kit is free: 410, and no Stripe session is made', async () => {
    const r = await call('checkout', { method: 'POST', body: { packIds: ['full'] } });
    expect(r.status).toBe(410);
    expect(createPacksCheckout).not.toHaveBeenCalled();
  });

  it('refuses GET', async () => {
    expect((await call('checkout', { method: 'GET' })).status).toBe(405);
  });
});

describe('GET /api/kit/download', () => {
  it('redirects the owner to a 60-second signed URL for the latest version', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'auth', amount: 700 }]);
    const r = await call('download', { query: { token, pack: 'auth' } });
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe(`https://storage.test/kit/${LATEST.version}/production-kit-auth-v${LATEST.version}.zip?expires=60`);
    expect(r.headers['referrer-policy']).toBe('no-referrer');
  });

  it('refuses a pack the token’s owner didn’t buy, even if another buyer did', async () => {
    await buyer('b@example.com', [{ pack_id: 'launch', amount: 700 }]);
    const token = await buyer('a@example.com', [{ pack_id: 'auth', amount: 700 }]);
    expect((await call('download', { query: { token, pack: 'launch' } })).status).toBe(403);
  });

  it('refuses packs from a refunded order', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'auth', amount: 700 }], 'cs_test_refundme000000');
    await mem.store.markRefunded('pi_cs_test_refundme000000');
    expect((await call('download', { query: { token, pack: 'auth' } })).status).toBe(403);
  });

  it('refuses an unknown token, a bad pack and a version that doesn’t exist', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'full', amount: 1900 }]);
    expect((await call('download', { query: { token: 'x'.repeat(43), pack: 'auth' } })).status).toBe(404);
    expect((await call('download', { query: { token, pack: '../../etc' } })).status).toBe(400);
    expect((await call('download', { query: { token, pack: 'auth', version: '../0.0.1' } })).status).toBe(404);
  });

  it('lets a full kit owner download any pack', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'full', amount: 1900 }]);
    expect((await call('download', { query: { token, pack: 'auth' } })).status).toBe(302);
  });
});

describe('GET /api/kit/library', () => {
  it('lists only the full kit for someone who owns it', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'auth', amount: 700 }]);
    await mem.store.saveOrder({ stripe_session_id: null, stripe_payment_intent: null, email: 'a@example.com', amount_total: 1200, currency: 'usd', kind: 'upgrade', items: [{ pack_id: 'full', amount: 1200 }] });
    const r = await call('library', { query: { token } });
    expect(r.body).toMatchObject({ email: 'a•••@example.com', packs: [{ id: 'full', versions: RELEASES.map((r) => ({ version: r.version })) }], upgrade: null });
  });
});

describe('POST /api/kit/upgrade', () => {
  it('is closed now the kit is free: 410, no charge and no order written', async () => {
    const token = await buyer('a@example.com', [{ pack_id: 'data-security', amount: 900 }, { pack_id: 'auth', amount: 700 }]);
    const r = await call('upgrade', { method: 'POST', body: { token } });
    expect(r.status).toBe(410);
    expect(createUpgradeCheckout).not.toHaveBeenCalled();
    const lib = await call('library', { query: { token } });
    expect(lib.body).toMatchObject({ packs: [{ id: 'data-security' }, { id: 'auth' }] });
  });
});

describe('POST /api/stripe-webhook', () => {
  const post = async (body: string, signature: string) => {
    const { default: webhook } = await import('../../../api/stripe-webhook');
    const req = Object.assign(Readable.from([Buffer.from(body)]), { method: 'POST', headers: { 'stripe-signature': signature } }) as unknown as VercelRequest;
    const out = { status: 0 };
    const res = { status: (c: number) => ((out.status = c), res), json: () => res, setHeader: () => res } as unknown as VercelResponse;
    await webhook(req, res);
    return out.status;
  };

  it('answers 400 to a bad signature', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    expect(await post('{"id":"evt_1","type":"charge.refunded"}', 't=1,v1=00')).toBe(400);
  });

  it('accepts a correctly signed event', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const body = '{"id":"evt_ok","type":"customer.created","data":{"object":{}}}';
    const t = Math.floor(Date.now() / 1000);
    const sig = `t=${t},v1=${createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex')}`;
    expect(await post(body, sig)).toBe(200);
    expect(mem.events.has('evt_ok')).toBe(true);
  });
});
