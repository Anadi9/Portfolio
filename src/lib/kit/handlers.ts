import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LATEST, isPackId, pack, releasesOf, type PackId } from '../../data/kit/index.js';
import { clientIp, createRateLimiter } from '../scan/rate-limit.js';
import { accessToken, upgradeOffer, type UpgradeOffer } from './fulfil.js';
import { visitorCountry } from './geo.js';
import { maskEmail, owned, parseCheckoutBody, visible } from './packs.js';
import { currencyFor, type KitCurrency } from './product.js';
import { kitStore } from './store.js';
import { createPacksCheckout, createUpgradeCheckout, fetchCatalog, getSession, isSessionId, isSettled, type Catalog } from './stripe.js';
import { hashToken, isToken } from './tokens.js';

/**
 * The `/api/kit/*` routes, served by the one function in `api/kit/[action].ts`.
 *
 * Every price and every amount is worked out here from Stripe and the order
 * table; the browser sends pack ids and a token, nothing else. Rate limits are
 * in memory per function instance (the same limiter as `/api/scan`): they stop
 * one visitor or script hammering a route, which is what they're for.
 */

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

const perMinute = (n: number) => createRateLimiter(n, 60_000);
const limits = {
  checkout: perMinute(10),
  order: perMinute(60),
  library: perMinute(30),
  upgrade: perMinute(5),
  ping: perMinute(5),
  download: createRateLimiter(30, 60 * 60_000),
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function origin(req: VercelRequest) {
  const host = one(req.headers['x-forwarded-host']) ?? req.headers.host;
  const proto = one(req.headers['x-forwarded-proto']) ?? 'https';
  return `${proto}://${host}`;
}

const visitorCurrency = (req: VercelRequest): KitCurrency => currencyFor(visitorCountry(req.headers));

function only(method: 'GET' | 'POST', req: VercelRequest, res: VercelResponse) {
  if (req.method === method || (method === 'GET' && req.method === 'HEAD')) return true;
  res.setHeader('Allow', method);
  res.status(405).json({ error: 'method not allowed' });
  return false;
}

function jsonBody(req: VercelRequest): unknown {
  if (typeof req.body !== 'string') return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return null;
  }
}

const fullPriceFrom = (key: string) => {
  let catalog: Promise<Catalog> | undefined;
  return async (currency: KitCurrency) => (await (catalog ??= fetchCatalog(key))).prices[currency].full;
};

const offerJson = (o: UpgradeOffer | null) => o && { due: o.due, currency: o.currency, label: o.label };

/** GET /api/kit/prices: what the page shows. Cached at the edge for an hour; the checkout never uses this cache. */
const prices: Handler = async (req, res) => {
  if (!only('GET', req, res)) return;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(501).json({ error: 'prices not configured' });
  try {
    const { prices } = await fetchCatalog(key);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(prices);
  } catch (err) {
    console.error('[kit] prices failed', err);
    return res.status(502).json({ error: 'prices unavailable' });
  }
};

/** POST /api/kit/checkout `{ packIds }` → `{ url }` of a Stripe Checkout Session. */
const checkout: Handler = async (req, res) => {
  if (!only('POST', req, res)) return;
  if (!limits.checkout.allow(clientIp(req.headers))) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many tries from here. Give it a minute.' });
  }
  const parsed = parseCheckoutBody(jsonBody(req));
  if (parsed.ok === false) return res.status(400).json({ error: parsed.error });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[kit] STRIPE_SECRET_KEY not set: checkout unavailable');
    return res.status(501).json({ error: 'checkout not configured' });
  }

  try {
    const catalog = await fetchCatalog(key);
    const currency = visitorCurrency(req);
    const missing = parsed.packIds.filter((id) => !catalog.priceIds[id] || catalog.prices[currency][id] === undefined);
    if (missing.length) {
      console.error('[kit] no Stripe price for', missing, currency);
      return res.status(503).json({ error: 'That pack can’t be bought right now. Email me and I’ll sort it out.' });
    }
    const { url } = await createPacksCheckout(key, { origin: origin(req), currency, packIds: parsed.packIds, priceIds: catalog.priceIds, version: LATEST.version });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[kit] checkout failed', err);
    return res.status(502).json({ error: 'checkout failed' });
  }
};

const packJson = (id: PackId) => {
  const latest = releasesOf(id)[0];
  return { id, name: pack(id).name, version: latest.version, bytes: latest.pack.bytes };
};

/** GET /api/kit/order?session_id=cs_… → the thanks page's state. */
const order: Handler = async (req, res) => {
  if (!only('GET', req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  if (!limits.order.allow(clientIp(req.headers))) return res.status(429).json({ error: 'too many requests' });
  const id = one(req.query.session_id);
  if (!isSessionId(id)) return res.status(400).json({ status: 'unknown' });

  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.KIT_TOKEN_SECRET;
  const store = kitStore();
  if (!key || !secret || !store) return res.status(501).json({ error: 'not configured' });

  try {
    const session = await getSession(key, id);
    if (!session) return res.status(404).json({ status: 'unknown' });
    if (!isSettled(session)) return res.status(200).json({ status: 'unpaid' });
    const found = await store.orderForSession(id);
    // Paid, but the webhook hasn't landed yet: the page polls.
    if (!found) return res.status(200).json({ status: 'pending' });

    const token = await accessToken(store, found.email, secret);
    const offer = await upgradeOffer(await store.ordersFor(found.email), visitorCurrency(req), fullPriceFrom(key));
    const bought = visible(new Set(found.items.map((i) => i.pack_id)));
    return res.status(200).json({
      status: found.status === 'refunded' ? 'refunded' : 'ready',
      token,
      packs: bought.map(packJson),
      upgrade: offerJson(offer),
    });
  } catch (err) {
    console.error('[kit] order lookup failed', err);
    return res.status(502).json({ error: 'lookup failed' });
  }
};

/** GET /api/kit/library?token=… → everything that email owns. */
const library: Handler = async (req, res) => {
  if (!only('GET', req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  const token = one(req.query.token);
  if (!isToken(token)) return res.status(400).json({ error: 'bad token' });
  if (!limits.library.allow(token)) return res.status(429).json({ error: 'too many requests' });

  const secret = process.env.KIT_TOKEN_SECRET;
  const store = kitStore();
  if (!secret || !store) return res.status(501).json({ error: 'not configured' });

  try {
    const email = await store.emailForTokenHash(hashToken(token));
    if (!email) return res.status(404).json({ error: 'unknown token' });
    const orders = await store.ordersFor(email);
    const key = process.env.STRIPE_SECRET_KEY;
    const offer = key ? await upgradeOffer(orders, visitorCurrency(req), fullPriceFrom(key)) : null;
    const packs = visible(owned(orders)).map((id) => ({
      id,
      name: pack(id).name,
      versions: releasesOf(id).map((r) => ({ version: r.version, bytes: r.pack.bytes })),
    }));
    return res.status(200).json({ email: maskEmail(email), packs, upgrade: offerJson(offer) });
  } catch (err) {
    console.error('[kit] library failed', err);
    return res.status(502).json({ error: 'lookup failed' });
  }
};

/**
 * GET /api/kit/download?token=…&pack=…[&version=…] → 302 to a 60-second signed
 * URL. Ownership is checked again here, and the storage path comes from the
 * catalog, never from the query string.
 */
const download: Handler = async (req, res) => {
  if (!only('GET', req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex');
  const token = one(req.query.token);
  const id = one(req.query.pack);
  if (!isToken(token) || !isPackId(id)) return res.status(400).send('That download link is incomplete. Use the buttons on your downloads page.');
  const versions = releasesOf(id);
  const wanted = one(req.query.version) ?? versions[0]?.version;
  const release = versions.find((r) => r.version === wanted);
  if (!release) return res.status(404).send('There is no such version of that pack.');
  if (!limits.download.allow(token)) {
    res.setHeader('Retry-After', '3600');
    return res.status(429).send('Too many downloads in a short time. Try again in an hour.');
  }

  const store = kitStore();
  if (!store) return res.status(501).send('Downloads are not configured yet.');

  try {
    const email = await store.emailForTokenHash(hashToken(token));
    if (!email) return res.status(404).send('This download link isn’t valid. Use the link from your email.');
    const packs = owned(await store.ordersFor(email));
    if (!packs.has(id) && !packs.has('full')) return res.status(403).send('This link doesn’t include that pack.');
    const url = await store.signedZipUrl(release.version, release.pack.zip, 60);
    res.setHeader('Location', url);
    return res.status(302).send('');
  } catch (err) {
    console.error('[kit] download failed', err);
    return res.status(502).send('Couldn’t start the download just now. Try again in a minute.');
  }
};

/**
 * POST /api/kit/upgrade `{ token }` → `{ url }` of a Checkout Session for the
 * difference, or `{ granted: true }` when what they've paid already covers it.
 */
const upgrade: Handler = async (req, res) => {
  if (!only('POST', req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store');
  const body = jsonBody(req) as { token?: unknown } | null;
  const token = body?.token;
  if (!isToken(token)) return res.status(400).json({ error: 'Send { "token": "…" } from your downloads link.' });
  if (!limits.upgrade.allow(token)) return res.status(429).json({ error: 'Too many tries. Give it a minute.' });

  const key = process.env.STRIPE_SECRET_KEY;
  const store = kitStore();
  if (!key || !store) return res.status(501).json({ error: 'upgrade not configured' });

  try {
    const email = await store.emailForTokenHash(hashToken(token));
    if (!email) return res.status(404).json({ error: 'This link isn’t valid.' });
    const orders = await store.ordersFor(email);
    if (owned(orders).has('full')) return res.status(409).json({ error: 'You already have everything.' });

    const catalog = await fetchCatalog(key);
    const offer = await upgradeOffer(orders, visitorCurrency(req), async (c) => catalog.prices[c].full);
    if (!offer || !catalog.products.full) return res.status(409).json({ error: 'There’s nothing on this link to upgrade from.' });

    if (offer.due === 0) {
      await store.saveOrder({
        stripe_session_id: null,
        stripe_payment_intent: null,
        email,
        amount_total: 0,
        currency: offer.currency,
        kind: 'upgrade',
        items: [{ pack_id: 'full', amount: 0 }],
      });
      return res.status(200).json({ granted: true });
    }

    const { url } = await createUpgradeCheckout(key, {
      origin: origin(req),
      currency: offer.currency,
      amount: offer.due,
      product: catalog.products.full,
      email,
      token,
    });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[kit] upgrade failed', err);
    return res.status(502).json({ error: 'The upgrade didn’t open. Try again in a moment.' });
  }
};

/** GET /api/kit/ping: the daily cron's query, so a free-tier Supabase project isn't paused for inactivity. */
const ping: Handler = async (req, res) => {
  if (!only('GET', req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.authorization !== `Bearer ${cron}`) return res.status(401).json({ error: 'unauthorized' });
  if (!limits.ping.allow(clientIp(req.headers))) return res.status(429).json({ error: 'too many requests' });
  const store = kitStore();
  if (!store) return res.status(501).json({ error: 'not configured' });
  try {
    await store.ping();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[kit] ping failed', err);
    return res.status(502).json({ ok: false });
  }
};

export const KIT_ROUTES: Record<string, Handler> = { prices, checkout, order, library, download, upgrade, ping };
