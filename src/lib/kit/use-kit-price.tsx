import { useEffect, useState } from 'react';
import { LATEST, type PackId } from '@/data/kit';
import type { KitPrices, PriceTable } from './packs';
import { formatMoney, isCurrency, type KitCurrency } from './product';

/**
 * The visitor's currency and the kit's prices, filled in after hydration.
 *
 * Every page is prerendered, so the HTML carries the dollar prices Stripe had
 * at build time (`scripts/fetch-kit-prices.mjs`), and the first client render
 * must match them. Effects then ask `/api/kit-price` which currency this
 * visitor pays in and `/api/kit/prices` for the current prices, once per tab:
 * every component shares the one request of each. Any failure leaves what the
 * build baked in.
 */

const KEY = 'kit-currency';
let pendingCurrency: Promise<KitCurrency> | undefined;
let pendingPrices: Promise<KitPrices | null> | undefined;

function detectCurrency(): Promise<KitCurrency> {
  pendingCurrency ??= (async () => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (isCurrency(saved)) return saved;
    } catch {
      // Storage blocked: just ask.
    }
    const res = await fetch('/api/kit-price');
    const { currency } = (await res.json()) as { currency?: unknown };
    const found = isCurrency(currency) ? currency : 'usd';
    try {
      sessionStorage.setItem(KEY, found);
    } catch {
      // Not remembered; the next page asks again.
    }
    return found;
  })().catch(() => 'usd' as const);
  return pendingCurrency;
}

/** Stripe's answer, if it has any prices at all; an empty one (no Prices created yet) keeps what the build had. */
const isPrices = (v: unknown): v is KitPrices =>
  typeof v === 'object' && v !== null && (v as KitPrices).source === 'stripe' && Object.keys((v as KitPrices).usd ?? {}).length > 0;

function fetchPrices(): Promise<KitPrices | null> {
  pendingPrices ??= fetch('/api/kit/prices')
    .then((res) => (res.ok ? res.json() : null))
    .then((body: unknown) => (isPrices(body) ? body : null))
    .catch(() => null);
  return pendingPrices;
}

/** The manifest's suggestions: only ever shown when the build couldn't reach Stripe, which production refuses to do. */
const MANIFEST_PRICES: KitPrices = {
  source: 'manifest',
  usd: Object.fromEntries(LATEST.packs.map((p) => [p.id, p.priceUsdCents])),
  inr: {},
};

const generated = import.meta.glob<KitPrices>('/src/generated/kit-prices.json', { eager: true, import: 'default' });

/** What the build baked in: Stripe's prices, or the manifest's in local development. */
export const BUILD_PRICES: KitPrices = (() => {
  const found = Object.values(generated)[0];
  return found?.source === 'stripe' ? found : MANIFEST_PRICES;
})();

export function useKitCurrency(): KitCurrency {
  const [currency, setCurrency] = useState<KitCurrency>('usd');
  useEffect(() => {
    let live = true;
    detectCurrency().then((c) => live && setCurrency(c));
    return () => {
      live = false;
    };
  }, []);
  return currency;
}

export function useKitPrices(): KitPrices {
  const [prices, setPrices] = useState<KitPrices>(BUILD_PRICES);
  useEffect(() => {
    let live = true;
    fetchPrices().then((p) => live && p && setPrices(p));
    return () => {
      live = false;
    };
  }, []);
  return prices;
}

/**
 * This visitor's price table. Rupees for India; if there are no rupee prices
 * (only when the build fell back to the manifest), dollars.
 */
export function usePriceTable(): { currency: KitCurrency; table: PriceTable; source: KitPrices['source'] } {
  const wanted = useKitCurrency();
  const prices = useKitPrices();
  const currency = wanted === 'inr' && prices.inr.full === undefined ? 'usd' : wanted;
  return { currency, table: prices[currency], source: prices.source };
}

/** The full kit's price in this visitor's currency. */
export const useKitPrice = () => {
  const { currency, table } = usePriceTable();
  return table.full === undefined ? '' : formatMoney(currency, table.full);
};

/** The price inline in running text: `The <KitPrice /> Production Kit`. */
export function KitPrice() {
  return <>{useKitPrice()}</>;
}

/** One pack's price inline, in this visitor's currency: `Lock Down Your Data (<PackPrice id="data-security" />)`. */
export function PackPrice({ id }: { id: PackId }) {
  const { currency, table } = usePriceTable();
  return <>{table[id] === undefined ? '' : formatMoney(currency, table[id]!)}</>;
}
