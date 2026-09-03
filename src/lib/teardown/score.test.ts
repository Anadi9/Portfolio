import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { BANDS, band, isValidAnswers, score } from './score';

/** 13 answers, all at the given option index. */
const all = (i: number) => QUESTIONS.map(() => i);

describe('band', () => {
  it('places every boundary exactly', () => {
    expect(band(0)).toBe('🚨 THIN WRAPPER');
    expect(band(39)).toBe('🚨 THIN WRAPPER');
    expect(band(40)).toBe('⚠️ WRAPPER WITH FOUNDATIONS');
    expect(band(64)).toBe('⚠️ WRAPPER WITH FOUNDATIONS');
    expect(band(65)).toBe('🧩 REAL PRODUCT, THIN IN PLACES');
    expect(band(84)).toBe('🧩 REAL PRODUCT, THIN IN PLACES');
    expect(band(85)).toBe('🎯 REAL PRODUCT');
    expect(band(100)).toBe('🎯 REAL PRODUCT');
  });
});

describe('score: extremes', () => {
  it('scores a perfect run 100 and REAL PRODUCT', () => {
    const r = score(all(0));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('🎯 REAL PRODUCT');
    expect(Object.values(r.axes)).toEqual([100, 100, 100, 100]);
    expect(r.undecidedCount).toBe(0);
  });

  it('scores the worst run 0 and THIN WRAPPER', () => {
    const r = score(all(2));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('🚨 THIN WRAPPER');
    expect(r.undecidedCount).toBe(0);
  });

  it('scores an all-unknown run 0 but counts all 13 as undecided', () => {
    const r = score(all(3));
    expect(r.score).toBe(0);
    expect(r.undecidedCount).toBe(13);
  });
});

describe('score: axes are independent', () => {
  it('drops only the axis whose questions were answered badly', () => {
    // Answer every `cost` question at index 2 (weight 0), everything else at 0 (weight 3).
    const answers = QUESTIONS.map((q) => (q.axis === 'cost' ? 2 : 0));
    const r = score(answers);
    expect(r.axes.cost).toBe(0);
    expect(r.axes.defensibility).toBe(100);
    expect(r.axes.failure).toBe(100);
    expect(r.axes.evaluation).toBe(100);
  });
});

describe('BANDS', () => {
  it('is the table `band` reads, so a drawn ladder cannot disagree with a verdict', () => {
    for (let n = 0; n <= 100; n += 1) {
      const row = BANDS.find((b) => n >= b.min)!;
      expect(band(n)).toBe(row.verdict);
    }
  });

  it('descends and reaches 0, so every score lands in exactly one band', () => {
    const mins = BANDS.map((b) => b.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(new Set(mins).size).toBe(mins.length);
    expect(mins.at(-1)).toBe(0);
  });

  it('names every band exactly once', () => {
    expect(new Set(BANDS.map((b) => b.verdict)).size).toBe(BANDS.length);
  });
});

describe('score: thinnest', () => {
  it('names three when three are genuinely the thinnest', () => {
    // Sections 7, 8 and 9 answered at weight 0; everything else at its best.
    const answers = QUESTIONS.map((q) => (q.section >= 7 ? 2 : 0));
    const t = score(answers).thinnest;
    expect(t.ranked).toEqual([7, 8, 9]);
    expect(t.tied).toEqual([]);
  });

  it('claims no thinnest section when every section scores the same', () => {
    // `all(0)` scores every section 100, so nothing is thinner than anything.
    const t = score(all(0)).thinnest;
    expect(t.ranked).toEqual([]);
    expect(t.tied).toHaveLength(9);
    expect(t.tiedScore).toBe(100);
  });

  it('separates the genuinely thin from a tie at the cut', () => {
    // Section 9 alone is thin; the other eight tie, so a "thinnest three"
    // would be section 9 plus two arbitrary ids.
    const answers = QUESTIONS.map((q) => (q.section === 9 ? 2 : 0));
    const t = score(answers).thinnest;
    expect(t.ranked).toEqual([9]);
    expect(t.tied).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(t.tiedScore).toBe(100);
  });

  it('orders a ranked list worst first', () => {
    const answers = QUESTIONS.map((q) => (q.section === 9 ? 2 : q.section === 8 ? 1 : 0));
    const t = score(answers).thinnest;
    expect(t.ranked[0]).toBe(9);
  });
});

describe('isValidAnswers', () => {
  it('accepts exactly 13 in-range integers', () => {
    expect(isValidAnswers(all(0))).toBe(true);
    expect(isValidAnswers(all(3))).toBe(true);
  });

  it('rejects the wrong length', () => {
    expect(isValidAnswers(all(0).slice(0, 12))).toBe(false);
    expect(isValidAnswers([...all(0), 0])).toBe(false);
  });

  it('rejects out-of-range, non-integer and non-numeric entries', () => {
    expect(isValidAnswers(all(4))).toBe(false);
    expect(isValidAnswers(all(-1))).toBe(false);
    expect(isValidAnswers(QUESTIONS.map(() => 1.5))).toBe(false);
    expect(isValidAnswers(QUESTIONS.map(() => '0'))).toBe(false);
  });

  it('rejects anything that is not an array', () => {
    expect(isValidAnswers(null)).toBe(false);
    expect(isValidAnswers(undefined)).toBe(false);
    expect(isValidAnswers({ 0: 1 })).toBe(false);
  });
});
