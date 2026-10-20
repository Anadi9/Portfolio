/**
 * Bit's price guard: the published price list, an extractor that finds every
 * money amount in a piece of text, and a check that rejects any amount that
 * isn't on the list.
 *
 * The AI prompt tells the model the prices; this is what makes that true. An
 * answer that names `$2,000–$5,000`, `$1.5k`, `1500 dollars` or any rupee,
 * euro or pound amount that isn't published is thrown away and the chat falls
 * back to its scripted reply.
 */
import { PRICE_GROUPS, SERVICES } from '../../data/bitsQuestFacts.js';

/** One amount as written: a single price or a range, one-off or monthly. In US dollars. */
export type Amount = { raw: string; min: number; max?: number; monthly: boolean };

/**
 * Prices published outside the pricing table. The audit is the only price the
 * site publishes; every other package is quoted per project.
 */
export const EXTRA_PRICES = ['$349'] as const;

const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const MUL = String.raw`(?:\s?(?:k|thousand|mn|m|million)\b)?`;
const PRE = String.raw`(?:US\s?\$|USD\s?\$?|\$)`;
const DASH = String.raw`\s*(?:-|–|—|to)\s*`;

/** `$1,500`, `$1.5k`, `USD 349`, with an optional second amount after a dash or "to". */
const PREFIXED = String.raw`${PRE}\s*(${NUM})(${MUL})(?:${DASH}(?:${PRE})?\s*(${NUM})(${MUL}))?`;
/** `1500 dollars`, `1,500–2,500 USD`, `500$` (a `$` after the number, unless another amount follows it). */
const SUFFIXED = String.raw`(?:(${NUM})(${MUL})${DASH})?(${NUM})(${MUL})(?:\s?(?:dollars?|bucks|usd)\b|\s*\$(?!\s*\d))`;
const MONEY = new RegExp(`${PREFIXED}|${SUFFIXED}`, 'gi');

const MONTHLY = /^\s*(?:\/\s?mo(?:nth)?\b|per\s+month\b|a\s+month\b|each\s+month\b|every\s+month\b|monthly\b)/i;

/**
 * Amounts in any other currency. Bit only quotes US dollars, so every one of
 * these is unpublished by definition.
 */
const FOREIGN = new RegExp(
  [
    String.raw`[₹€£¥]\s?\d`,
    String.raw`\d\s?[₹€£¥]`,
    String.raw`\b(?:A|AU|C|CA|S|NZ|HK)\$\s?\d`,
    String.raw`\b(?:INR|EUR|GBP|AUD|CAD|SGD|Rs\.?)\s?\d`,
    String.raw`\d[\d,.]*\s?(?:k\s)?(?:INR|EUR|GBP|AUD|CAD|SGD|rupees?|euros?|pounds?|lakhs?|lacs?|crores?)\b`,
  ].join('|'),
  'i',
);

function value(num: string, mul: string): number {
  const n = Number(num.replace(/,/g, ''));
  const m = mul.trim().toLowerCase();
  if (m === 'k' || m === 'thousand') return n * 1000;
  if (m === 'm' || m === 'mn' || m === 'million') return n * 1_000_000;
  return n;
}

/** Every US-dollar amount in `text`, in order. */
/** The full-width dollar sign (U+FF04) reads as `$`. */
const normalise = (text: string) => text.replace(/\uFF04/g, '$');

export function extractAmounts(input: string): Amount[] {
  const text = normalise(input);
  const out: Amount[] = [];
  for (const m of text.matchAll(MONEY)) {
    const [raw, a, am = '', b, bm = '', c, cm = '', d, dm = ''] = m;
    // Prefixed form fills a/b; suffixed fills c (range start, optional) and d.
    let first: [string, string] | undefined;
    let second: [string, string] | undefined;
    if (a !== undefined) {
      first = [a, am];
      if (b !== undefined) second = [b, bm];
    } else if (d !== undefined) {
      if (c !== undefined) {
        first = [c, cm];
        second = [d, dm];
      } else first = [d, dm];
    }
    if (!first) continue;
    let min = value(...first);
    let max = second ? value(...second) : undefined;
    // "$1.5–2.5k": the multiplier on the second number applies to the first.
    if (second && !first[1].trim() && second[1].trim() && min < 1000) min = value(first[0], second[1]);
    if (max !== undefined && max === min) max = undefined;
    const monthly = MONTHLY.test(text.slice((m.index ?? 0) + raw.length));
    out.push({ raw: raw.trim(), min, ...(max === undefined ? {} : { max }), monthly });
  }
  return out;
}

export const hasForeignAmount = (text: string): boolean => FOREIGN.test(text);

/** The published list: every package and service-card price, plus the extras. */
export function publishedAmounts(): Amount[] {
  const texts = [
    ...PRICE_GROUPS.flatMap((g) => g.packages.map((p) => p.price)),
    ...SERVICES.flatMap((s) => s.stats.map(([, v]) => v)),
    ...EXTRA_PRICES,
  ];
  const seen = new Set<string>();
  const out: Amount[] = [];
  for (const a of texts.flatMap(extractAmounts)) {
    const key = `${a.min}-${a.max ?? ''}-${a.monthly}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

const PUBLISHED = publishedAmounts();

/**
 * Whether one amount is on the list. A range must be a published range exactly
 * ("$1,500–$8,000" is not, even though both ends appear somewhere). A single
 * amount may be a published price or either end of a published range ("from
 * $1,500", "up to $20,000"). Monthly and one-off amounts never stand in for
 * each other: "$299" alone is not the Care plan.
 */
export function isPublished(a: Amount, published: Amount[] = PUBLISHED): boolean {
  return published.some((p) => {
    if (p.monthly !== a.monthly) return false;
    if (a.max !== undefined) return p.min === a.min && p.max === a.max;
    return p.min === a.min || p.max === a.min;
  });
}

export type GuardResult =
  | { ok: true }
  | { ok: false; reason: 'foreign_currency' | 'unpublished_price' | 'stray_dollar' | 'discount' | 'spelled_amount'; amount?: string };

/** Bit never offers a discount: "20% off", "a discount", "% off". */
const DISCOUNT = /\d+(?:\.\d+)?\s?%\s*(?:off|discount)|%\s*off\b|\bdiscount(?:s|ed)?\b/i;

const NUMBER_WORD = String.raw`(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|grand|few|several)`;
/** "fifty dollars", "two thousand dollars", "a few hundred bucks". */
const SPELLED = new RegExp(String.raw`\b${NUMBER_WORD}(?:[\s-]+(?:${NUMBER_WORD}|and))*\s+(?:dollars?|bucks)\b`, 'i');

const dollars = (s: string) => (s.match(/\$/g) ?? []).length;

/**
 * Pass only text whose every money amount is a published US-dollar price.
 * Backstop: every `$` in the text must belong to a recognised amount, so an
 * odd spelling the extractor misses fails closed instead of slipping through.
 */
export function guardPrices(input: string): GuardResult {
  const text = normalise(input);
  if (hasForeignAmount(text)) return { ok: false, reason: 'foreign_currency' };
  if (DISCOUNT.test(text)) return { ok: false, reason: 'discount' };
  if (SPELLED.test(text)) return { ok: false, reason: 'spelled_amount' };
  const found = extractAmounts(text);
  const bad = found.find((a) => !isPublished(a));
  if (bad) return { ok: false, reason: 'unpublished_price', amount: bad.raw };
  if (dollars(text) > found.reduce((n, a) => n + dollars(a.raw), 0)) return { ok: false, reason: 'stray_dollar' };
  return { ok: true };
}

/** The price table injected into Bit's prompt, built from the same facts the page shows. */
export function priceTable(): string {
  const rows = PRICE_GROUPS.flatMap((g) => g.packages.map((p) => `- ${p.name} (${g.title}): ${p.price}, ${p.duration}. ${p.detail}`));
  rows.push('- Free first-bug video: free, a short video of the biggest risk in your app, within 24 hours.');
  rows.push('- The Production audit ($349) is the only published price. Every other package gets one fixed quote from Anadi for the project: never state, estimate or hint at an amount for it.');
  return rows.join('\n');
}
