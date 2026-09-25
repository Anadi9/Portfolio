#!/usr/bin/env node
/**
 * Writes the kit's Stripe prices to `src/generated/kit-prices.json` before
 * `dev` and `build`, so the prerendered pages (and their JSON-LD offers) carry
 * the prices the checkout will charge. The page refreshes them from
 * `/api/kit/prices` after load, so a price changed in Stripe shows within the
 * hour without a redeploy.
 *
 * On a production build a missing key, a Stripe error or a pack without a
 * dollar price fails the build: better no deploy than a page quoting a price
 * the checkout won't charge. Anywhere else it writes `{ "source": "manifest" }`
 * and the page falls back to the manifest's suggested prices, marked as such.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Same keys as LOOKUP_KEYS in src/data/kit/index.ts; kit.test.ts checks they match. */
const LOOKUP_KEYS = {
  full: 'kit_full',
  'data-security': 'kit_data_security',
  auth: 'kit_auth',
  launch: 'kit_launch',
  'ai-discipline': 'kit_ai_discipline',
  'lovable-bolt': 'kit_lovable_bolt',
};

const root = join(import.meta.dirname, '..');
for (const f of ['.env.local', '.env']) {
  const path = join(root, f);
  if (existsSync(path)) process.loadEnvFile(path); // never overrides what's already set
}

const production = process.env.VERCEL_ENV === 'production';
const out = join(root, 'src', 'generated', 'kit-prices.json');
mkdirSync(join(root, 'src', 'generated'), { recursive: true });

function fallback(reason) {
  if (production) {
    console.error(`[kit-prices] ${reason}. Refusing to build production without Stripe prices.`);
    process.exit(1);
  }
  console.warn(`[kit-prices] ${reason}; the page will show the manifest's suggested prices, marked as dev.`);
  writeFileSync(out, JSON.stringify({ source: 'manifest' }) + '\n');
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  fallback('STRIPE_SECRET_KEY not set');
} else {
  try {
    const q = new URLSearchParams({ active: 'true', limit: '20', 'expand[]': 'data.currency_options' });
    for (const lk of Object.values(LOOKUP_KEYS)) q.append('lookup_keys[]', lk);
    const res = await fetch(`https://api.stripe.com/v1/prices?${q}`, { headers: { Authorization: `Bearer ${key}` } });
    const body = await res.json();
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${body.error?.message}`);

    const prices = { source: 'stripe', usd: {}, inr: {} };
    for (const price of body.data) {
      const id = Object.keys(LOOKUP_KEYS).find((k) => LOOKUP_KEYS[k] === price.lookup_key);
      if (!id) continue;
      for (const currency of ['usd', 'inr']) {
        const amount = price.currency === currency ? price.unit_amount : price.currency_options?.[currency]?.unit_amount;
        if (typeof amount === 'number') prices[currency][id] = amount;
      }
    }
    const missing = Object.keys(LOOKUP_KEYS).filter((id) => prices.usd[id] === undefined);
    if (missing.length === Object.keys(LOOKUP_KEYS).length) {
      fallback('no Stripe Prices with the kit lookup keys yet');
    } else {
      if (missing.length) {
        const msg = `no USD price for ${missing.join(', ')}`;
        if (production) throw new Error(msg);
        console.warn(`[kit-prices] ${msg}; those packs will show as unavailable.`);
      }
      writeFileSync(out, JSON.stringify(prices, null, 2) + '\n');
      console.log(`[kit-prices] wrote ${Object.keys(prices.usd).length} USD and ${Object.keys(prices.inr).length} INR prices from Stripe`);
    }
  } catch (err) {
    fallback(`couldn't read prices from Stripe (${err.message})`);
  }
}
