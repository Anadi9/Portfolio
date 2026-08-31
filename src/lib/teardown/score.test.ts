import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { band, isValidAnswers, score } from './score';

/** 13 answers, all at the given option index. */
const all = (i: number) => QUESTIONS.map(() => i);

describe('band', () => {
  it('places every boundary exactly', () => {
    expect(band(0)).toBe('THIN WRAPPER');
    expect(band(39)).toBe('THIN WRAPPER');
    expect(band(40)).toBe('WRAPPER WITH FOUNDATIONS');
    expect(band(64)).toBe('WRAPPER WITH FOUNDATIONS');
    expect(band(65)).toBe('REAL PRODUCT, THIN IN PLACES');
    expect(band(84)).toBe('REAL PRODUCT, THIN IN PLACES');
    expect(band(85)).toBe('REAL PRODUCT');
    expect(band(100)).toBe('REAL PRODUCT');
  });
});

describe('score — extremes', () => {
  it('scores a perfect run 100 and REAL PRODUCT', () => {
    const r = score(all(0));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('REAL PRODUCT');
    expect(Object.values(r.axes)).toEqual([100, 100, 100, 100]);
    expect(r.undecidedCount).toBe(0);
  });

  it('scores the worst run 0 and THIN WRAPPER', () => {
    const r = score(all(2));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('THIN WRAPPER');
    expect(r.undecidedCount).toBe(0);
  });

  it('scores an all-unknown run 0 but counts all 13 as undecided', () => {
    const r = score(all(3));
    expect(r.score).toBe(0);
    expect(r.undecidedCount).toBe(13);
  });
});

describe('score — axes are independent', () => {
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

describe('score — weakest', () => {
  it('returns exactly three sections, worst first', () => {
    const r = score(all(0));
    expect(r.weakest).toHaveLength(3);
  });

  it('breaks ties by ascending section id, so output is deterministic', () => {
    // Every section scores 100 — the tie-break alone decides the order.
    expect(score(all(0)).weakest).toEqual([1, 2, 3]);
  });

  it('puts a genuinely weak section first regardless of id', () => {
    // Section 9 is questions 12 and 13; answer both at index 2 (weight 0).
    const answers = QUESTIONS.map((q) => (q.section === 9 ? 2 : 0));
    const r = score(answers);
    expect(r.weakest[0]).toBe(9);
    expect(r.sectionScores[9]).toBe(0);
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
