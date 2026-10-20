import { describe, expect, it } from 'vitest';
import { offers } from '@/data/bitsQuest';
import { extractAmounts, guardPrices, hasForeignAmount, isPublished, priceTable, publishedAmounts } from './prices';

const amounts = (t: string) => extractAmounts(t).map(({ min, max, monthly }) => ({ min, max, monthly }));

describe('extractAmounts', () => {
  it('reads plain, comma and decimal dollar amounts', () => {
    expect(amounts('The audit is $349.')).toEqual([{ min: 349, max: undefined, monthly: false }]);
    expect(amounts('$1,500 or $1500 or $20,000.')).toEqual([
      { min: 1500, max: undefined, monthly: false },
      { min: 1500, max: undefined, monthly: false },
      { min: 20000, max: undefined, monthly: false },
    ]);
  });

  it('reads ranges with en dash, em dash, hyphen and "to", with or without the second $', () => {
    for (const t of ['$1,500–$2,500', '$1,500—$2,500', '$1,500-$2,500', '$1,500 - 2,500', '$1,500 to $2,500', '$1,500–2,500']) {
      expect(amounts(t), t).toEqual([{ min: 1500, max: 2500, monthly: false }]);
    }
  });

  it('reads k, thousand and million shorthands, carrying a trailing k to the range start', () => {
    expect(amounts('about $1.5k')).toEqual([{ min: 1500, max: undefined, monthly: false }]);
    expect(amounts('$1.5k–$2.5k')).toEqual([{ min: 1500, max: 2500, monthly: false }]);
    expect(amounts('$1.5–2.5k')).toEqual([{ min: 1500, max: 2500, monthly: false }]);
    expect(amounts('$20 thousand')).toEqual([{ min: 20000, max: undefined, monthly: false }]);
    expect(amounts('$2 million')).toEqual([{ min: 2000000, max: undefined, monthly: false }]);
  });

  it('reads US$ / USD prefixes and dollars / USD suffixes', () => {
    expect(amounts('US$349')[0].min).toBe(349);
    expect(amounts('USD 349')[0].min).toBe(349);
    expect(amounts('1500 dollars')).toEqual([{ min: 1500, max: undefined, monthly: false }]);
    expect(amounts('1,500–2,500 USD')).toEqual([{ min: 1500, max: 2500, monthly: false }]);
    expect(amounts('around 3000 bucks')[0].min).toBe(3000);
  });

  it('marks monthly amounts', () => {
    for (const t of ['$299/mo', '$299 / month', '$299 per month', '$299 a month', '$299 monthly']) {
      expect(amounts(t), t).toEqual([{ min: 299, max: undefined, monthly: true }]);
    }
  });

  it('ignores numbers that are not money', () => {
    expect(amounts('Five slots a week, 24 hours, 2–3 weeks, 100+ users, 13 questions, React 18')).toEqual([]);
    expect(amounts('$ is the only currency, no amount here')).toEqual([]);
  });
});

describe('hasForeignAmount', () => {
  it('flags rupee, euro, pound and other-dollar amounts', () => {
    for (const t of ['₹29,000', '29,000₹', 'Rs. 5000', 'Rs 5000', 'INR 25000', '25,000 rupees', '2 lakh', '€300', '300 euros', '£250', 'GBP 250', 'A$500', 'CA$500', '1 crore']) {
      expect(hasForeignAmount(t), t).toBe(true);
    }
  });

  it('leaves dollar amounts and plain words alone', () => {
    expect(hasForeignAmount('$349 and $299/mo')).toBe(false);
    expect(hasForeignAmount('Prices are in US dollars, not rupees.')).toBe(false);
  });
});

describe('publishedAmounts', () => {
  it('is the audit alone: every other package is quoted per project', () => {
    const list = publishedAmounts().map(({ min, max, monthly }) => [min, max ?? null, monthly]);
    expect(list).toEqual([[349, null, false]]);
  });

  it('covers every structured-data offer on the homepage', () => {
    for (const o of Object.values(offers).flat()) {
      expect(isPublished({ raw: o.name, min: o.min, ...(o.max ? { max: o.max } : {}), monthly: Boolean(o.monthly) }), o.name).toBe(true);
    }
  });

  it('feeds the prompt table the audit price and "Fixed quote" for every other package', () => {
    const t = priceTable();
    expect(t).toContain('Production audit (Start here): $349');
    for (const p of ['Launch-ready sprint', 'Full rescue', 'AI build', 'MVP build']) expect(t).toContain(`${p} (`);
    expect(t).toMatch(/Launch-ready sprint \(Fix\): Fixed quote/);
    expect(t).toMatch(/Care plan \(Keep it running\): Quoted monthly/);
    expect(guardPrices(t)).toEqual({ ok: true });
  });
});

describe('guardPrices', () => {
  it('passes the audit price and answers with no amount', () => {
    for (const t of [
      'The audit is $349.',
      'Start with the $349 audit; the fix gets one fixed quote.',
      'No prices here, just a friendly answer.',
    ]) {
      expect(guardPrices(t), t).toEqual({ ok: true });
    }
  });

  it('rejects the package prices the site no longer publishes', () => {
    for (const [t, amount] of [
      ['A Launch-ready sprint is $1,500–$2,500.', '$1,500–$2,500'],
      ['A Full rescue is $3,000 to $6,000.', '$3,000 to $6,000'],
      ['AI builds run $2,000–$8,000.', '$2,000–$8,000'],
      ['MVPs go up to $20,000.', '$20,000'],
      ['The recorded teardown is $149.', '$149'],
    ]) {
      expect(guardPrices(t), t).toEqual({ ok: false, reason: 'unpublished_price', amount });
    }
    expect(guardPrices('Care is $299/mo.').ok).toBe(false);
  });

  it('rejects invented amounts, invented ranges and budget buckets', () => {
    for (const [t, amount] of [
      ['That would be about $500.', '$500'],
      ['Roughly $1,500–$8,000.', '$1,500–$8,000'],
      ['Budgets of $2,000–$5,000 work.', '$2,000–$5,000'],
      ['Maybe $1.8k.', '$1.8k'],
      ['About $1.5k–$3k for that.', '$1.5k–$3k'],
      ['It costs 1800 dollars.', '1800 dollars'],
      ['Usually $0.', '$0'],
    ]) {
      expect(guardPrices(t), t).toEqual({ ok: false, reason: 'unpublished_price', amount });
    }
  });

  it('rejects trailing, spaced and full-width dollar signs, spelled-out dollars and discounts (review round 1)', () => {
    for (const [t, reason] of [
      ['That would be 500$.', 'unpublished_price'],
      ['That would be 500 $.', 'unpublished_price'],
      ['That is $  50.', 'unpublished_price'],
      ['That would be ＄50.', 'unpublished_price'],
      ['Anadi can do it for fifty dollars.', 'spelled_amount'],
      ['About two thousand dollars.', 'spelled_amount'],
      ['A few hundred bucks.', 'spelled_amount'],
      ['You get 50% off the audit.', 'discount'],
      ['There is a 10 % discount this week.', 'discount'],
      ['We can discount the sprint.', 'discount'],
      ['Prices are in $ but ask Anadi.', 'stray_dollar'],
      ['It costs $ fifty.', 'stray_dollar'],
    ]) {
      expect(guardPrices(t), t).toMatchObject({ ok: false, reason });
    }
  });

  it('still passes published prices written with trailing, spaced or full-width signs', () => {
    for (const t of [
      'The audit is 349$.',
      'The audit is $ 349.',
      'The audit is ＄349.',
      'Step 2 $349 audit, then the fix.',
    ]) {
      expect(guardPrices(t), t).toEqual({ ok: true });
    }
  });

  it('reads shorthand the same as the full amount', () => {
    expect(guardPrices('The audit is 349 dollars.')).toEqual({ ok: true });
    expect(guardPrices('Sprints start at $1.5k.')).toMatchObject({ ok: false, reason: 'unpublished_price' });
    expect(guardPrices('1500 dollars to start.')).toMatchObject({ ok: false, reason: 'unpublished_price' });
  });

  it('never lets monthly and one-off stand in for each other', () => {
    expect(guardPrices('Care is $299.').ok).toBe(false);
    expect(guardPrices('The audit is $349/mo.').ok).toBe(false);
    expect(guardPrices('Sprints are $1,500–$2,500 a month.').ok).toBe(false);
  });

  it('rejects any non-dollar amount, even a correct conversion', () => {
    expect(guardPrices('The audit is about ₹29,000.')).toEqual({ ok: false, reason: 'foreign_currency' });
    expect(guardPrices('Roughly €320.')).toEqual({ ok: false, reason: 'foreign_currency' });
    expect(guardPrices('$349, roughly 29,000 rupees.')).toEqual({ ok: false, reason: 'foreign_currency' });
  });
});
