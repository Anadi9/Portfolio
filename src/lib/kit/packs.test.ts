import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LATEST, LOOKUP_KEYS, PACK_IDS, RELEASES, isPackId, packForLookupKey, releasesOf } from '@/data/kit';
import {
  collapse,
  maskEmail,
  nudge,
  owned,
  parseCheckoutBody,
  parsePageParams,
  toggle,
  total,
  upgradeCredit,
  upgradeCurrency,
  upgradeDue,
  visible,
  type OrderLike,
  type PriceTable,
} from './packs';

const USD: PriceTable = { full: 1900, 'data-security': 900, auth: 700, launch: 700, 'ai-discipline': 700, 'lovable-bolt': 500 };

describe('catalog', () => {
  it('has a lookup key for every pack in every release, and maps each key back', () => {
    for (const r of RELEASES) for (const p of r.packs) expect(packForLookupKey(LOOKUP_KEYS[p.id])).toBe(p.id);
    expect(packForLookupKey('kit_unknown')).toBeUndefined();
    expect(packForLookupKey(null)).toBeUndefined();
  });

  it('lists the same lookup keys as the build-time price script', () => {
    const script = readFileSync(join(import.meta.dirname, '../../../scripts/fetch-kit-prices.mjs'), 'utf8');
    for (const [id, key] of Object.entries(LOOKUP_KEYS)) expect(script).toContain(`${id.includes('-') ? `'${id}'` : id}: '${key}'`);
  });

  it('puts the full kit first and names each zip after its version', () => {
    expect(PACK_IDS[0]).toBe('full');
    for (const r of RELEASES) for (const p of r.packs) expect(p.zip).toBe(`production-kit-${p.id}-v${r.version}.zip`);
    expect(releasesOf('auth')[0].version).toBe(LATEST.version);
  });

  it('only accepts real pack ids, including against prototype keys', () => {
    expect(isPackId('auth')).toBe(true);
    expect(isPackId('constructor')).toBe(false);
    expect(isPackId('__proto__')).toBe(false);
    expect(isPackId(3)).toBe(false);
  });
});

describe('parseCheckoutBody', () => {
  it('dedupes and keeps display order', () => {
    expect(parseCheckoutBody({ packIds: ['launch', 'auth', 'launch'] })).toEqual({ ok: true, packIds: ['auth', 'launch'] });
  });

  it('collapses to the full kit when it is included', () => {
    expect(parseCheckoutBody({ packIds: ['auth', 'full', 'launch'] })).toEqual({ ok: true, packIds: ['full'] });
  });

  it('refuses empty, unknown, malformed and oversized input with a message', () => {
    expect(parseCheckoutBody({ packIds: [] })).toEqual({ ok: false, error: 'Pick at least one pack.' });
    expect(parseCheckoutBody({ packIds: ['auth', 'free-stuff'] })).toEqual({ ok: false, error: 'There is no pack called "free-stuff".' });
    expect(parseCheckoutBody({ packIds: 'auth' }).ok).toBe(false);
    expect(parseCheckoutBody(null).ok).toBe(false);
    expect(parseCheckoutBody({ packIds: Array(13).fill('auth') }).ok).toBe(false);
    expect(parseCheckoutBody({ packIds: ['auth'], amount: 1 })).toEqual({ ok: true, packIds: ['auth'] });
  });
});

describe('parsePageParams', () => {
  it('restores a shared or cancelled selection', () => {
    expect(parsePageParams('?packs=auth,launch')).toEqual({ selected: ['auth', 'launch'], focus: false, upgrade: false });
  });

  it('preselects one pack and asks for focus with ?pack=', () => {
    expect(parsePageParams('?pack=auth')).toEqual({ selected: ['auth'], focus: true, upgrade: false });
  });

  it('drops junk and lets the full kit win', () => {
    expect(parsePageParams('?packs=auth,nope,,full').selected).toEqual(['full']);
    expect(parsePageParams('?pack=nope')).toEqual({ selected: [], focus: false, upgrade: false });
    expect(parsePageParams('?upgrade=1').upgrade).toBe(true);
  });
});

describe('toggle', () => {
  it('ticking the full kit clears the packs', () => {
    expect(toggle(['auth', 'launch'], 'full', true)).toEqual(['full']);
  });

  it('ticking a pack while the full kit is ticked switches to that pack', () => {
    expect(toggle(['full'], 'auth', true)).toEqual(['auth']);
  });

  it('adds and removes packs', () => {
    expect(toggle(['launch'], 'auth', true)).toEqual(['auth', 'launch']);
    expect(toggle(['auth', 'launch'], 'auth', false)).toEqual(['launch']);
  });
});

describe('total and nudge', () => {
  it('adds up, or says it can’t when a price is missing', () => {
    expect(total(['auth', 'launch'], USD)).toBe(1400);
    expect(total(['auth'], { full: 1900 })).toBeNull();
  });

  it('stays quiet until the picks are within $5 of the full kit', () => {
    expect(nudge(['data-security'], USD, 'usd')).toBeNull(); // $9
    expect(nudge(['auth', 'lovable-bolt'], USD, 'usd')).toBeNull(); // $12
    expect(nudge([], USD, 'usd')).toBeNull();
    expect(nudge(['full'], USD, 'usd')).toBeNull();
  });

  it('offers everything for the honest difference when the picks cost less', () => {
    expect(nudge(['data-security', 'auth'], USD, 'usd')).toEqual({ kind: 'more', picks: 1600, full: 1900, diff: 300 });
    expect(nudge(['auth', 'launch'], USD, 'usd')).toEqual({ kind: 'more', picks: 1400, full: 1900, diff: 500 });
  });

  it('shows the saving when the picks cost more, and says so when they cost the same', () => {
    expect(nudge(['data-security', 'auth', 'launch'], USD, 'usd')).toEqual({ kind: 'save', picks: 2300, full: 1900, diff: 400 });
    expect(nudge(['auth', 'launch', 'lovable-bolt'], USD, 'usd')).toEqual({ kind: 'same', picks: 1900, full: 1900, diff: 0 });
  });
});

const order = (o: Partial<OrderLike> & Pick<OrderLike, 'items'>): OrderLike => ({ kind: 'purchase', status: 'paid', currency: 'usd', ...o });

describe('ownership and upgrade', () => {
  it('owns what is on paid orders, and a refund takes it away', () => {
    const orders = [order({ items: [{ pack_id: 'auth', amount: 700 }] }), order({ status: 'refunded', items: [{ pack_id: 'launch', amount: 700 }] })];
    expect([...owned(orders)]).toEqual(['auth']);
  });

  it('shows only the full kit once it is owned', () => {
    expect(visible(new Set(['auth', 'full']))).toEqual(['full']);
    expect(visible(new Set(['launch', 'auth']))).toEqual(['auth', 'launch']);
  });

  it('credits what was paid for packs in that currency, refunds and other currencies excluded', () => {
    const orders = [
      order({ items: [{ pack_id: 'data-security', amount: 900 }, { pack_id: 'auth', amount: 700 }] }),
      order({ status: 'refunded', items: [{ pack_id: 'launch', amount: 700 }] }),
      order({ currency: 'inr', items: [{ pack_id: 'lovable-bolt', amount: 39900 }] }),
    ];
    expect(upgradeCredit(orders, 'usd')).toBe(1600);
    expect(upgradeCredit(orders, 'inr')).toBe(39900);
  });

  it('charges the difference, and nothing when the credit covers it or leaves less than Stripe can charge', () => {
    expect(upgradeDue(1900, 1600, 'usd')).toBe(300);
    expect(upgradeDue(1900, 3500, 'usd')).toBe(0);
    expect(upgradeDue(1900, 1870, 'usd')).toBe(0);
  });

  it('upgrades in the currency the packs were paid in, or the visitor’s if mixed', () => {
    expect(upgradeCurrency([order({ currency: 'inr', items: [] })], 'usd')).toBe('inr');
    expect(upgradeCurrency([order({ items: [] }), order({ currency: 'inr', items: [] })], 'inr')).toBe('inr');
  });

  it('masks an email enough to recognise, not enough to read off', () => {
    expect(maskEmail('anadi@example.com')).toBe('a•••@example.com');
  });

  it('collapse keeps display order', () => {
    expect(collapse(['lovable-bolt', 'auth'])).toEqual(['auth', 'lovable-bolt']);
  });
});
