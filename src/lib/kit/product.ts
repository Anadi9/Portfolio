/**
 * The Production Kit: names and paths the page, the checkout and the delivery
 * all have to agree on. Prices are not here: they live in Stripe, one Price per
 * pack found by lookup key (`src/data/kit`), with a rupee amount alongside the
 * dollar one.
 */
export const KIT = {
  /** Stamped on the old single-product sessions as `metadata.product`. */
  id: 'production-kit',
  name: 'The Production Kit',
  path: '/products/production-kit',
  /** Where the old single-product checkout returned buyers. Kept for their links. */
  thanksPath: '/products/production-kit/thanks',
  /** Name of the old on-request archive, and the folder inside it. */
  archive: 'production-kit',
  /** Where a pack checkout returns buyers. */
  packsThanksPath: '/kit/thanks',
  downloadsPath: '/kit/downloads',
} as const;

/**
 * Visitors from India pay in rupees; everyone else pays in dollars. USD is the
 * default: it is what the prerendered HTML says and what a request with no
 * country gets.
 */
export type KitCurrency = 'usd' | 'inr';
export const CURRENCIES: readonly KitCurrency[] = ['usd', 'inr'];
export const isCurrency = (v: unknown): v is KitCurrency => v === 'usd' || v === 'inr';

/** ISO 3166 alpha-2 country, as Vercel's `x-vercel-ip-country` sends it. */
export const currencyFor = (country: string | null | undefined): KitCurrency => (country?.toUpperCase() === 'IN' ? 'inr' : 'usd');

const SYMBOL: Record<KitCurrency, string> = { usd: '$', inr: '₹' };

/** `$19`, `₹1,599`, `$4.50`: no trailing zeros, grouped the way each currency's readers expect. */
export const formatMoney = (currency: KitCurrency, minor: number) => {
  const digits = minor % 100 ? 2 : 0;
  const locale = currency === 'inr' ? 'en-IN' : 'en-US';
  return `${SYMBOL[currency]}${(minor / 100).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

/** The old single-product download link, still in earlier buyers' inboxes. */
export const downloadUrl = (origin: string, sessionId: string) =>
  `${origin}/api/production-kit-download?session_id=${encodeURIComponent(sessionId)}`;

/** A buyer's downloads page. The token is the credential; see `tokens.ts`. */
export const downloadsUrl = (origin: string, token: string) => `${origin}${KIT.downloadsPath}/${token}`;
