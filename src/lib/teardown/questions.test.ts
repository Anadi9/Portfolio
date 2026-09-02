import { describe, expect, it } from 'vitest';
import { MAX_RAW, QUESTIONS, SECTIONS } from './questions';

describe('question bank: shape', () => {
  it('has exactly 13 questions', () => {
    expect(QUESTIONS).toHaveLength(13);
  });

  it('gives every question 4 options with findings parallel to them', () => {
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      expect(q.findings).toHaveLength(4);
    }
  });

  it("ends every question with a single unknown option labelled \"I'm not sure\"", () => {
    for (const q of QUESTIONS) {
      const unknowns = q.options.filter((o) => o.unknown);
      expect(unknowns).toHaveLength(1);
      expect(q.options[3].unknown).toBe(true);
      expect(q.options[3].label).toBe("I'm not sure");
      expect(q.options[3].weight).toBe(0);
    }
  });

  it('weights every question 3 / 1 / 0 / 0', () => {
    for (const q of QUESTIONS) {
      expect(q.options.map((o) => o.weight)).toEqual([3, 1, 0, 0]);
    }
  });

  it('sums to a maximum raw score of 39', () => {
    const max = QUESTIONS.reduce((n, q) => n + Math.max(...q.options.map((o) => o.weight)), 0);
    expect(max).toBe(MAX_RAW);
    expect(MAX_RAW).toBe(39);
  });

  it('gives every question a unique id', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(13);
  });
});

describe('question bank: coverage', () => {
  it('covers all nine sections', () => {
    expect(new Set(QUESTIONS.map((q) => q.section))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    expect(Object.keys(SECTIONS)).toHaveLength(9);
  });

  it('covers all four axes', () => {
    expect(new Set(QUESTIONS.map((q) => q.axis))).toEqual(
      new Set(['defensibility', 'failure', 'cost', 'evaluation']),
    );
  });

  it('distributes questions per axis as 4 / 3 / 3 / 3', () => {
    const count = (a: string) => QUESTIONS.filter((q) => q.axis === a).length;
    expect(count('defensibility')).toBe(4);
    expect(count('failure')).toBe(3);
    expect(count('cost')).toBe(3);
    expect(count('evaluation')).toBe(3);
  });
});

describe('question bank: no prescriptions', () => {
  // Decision 3 of the spec, checked at the source. A finding observes; it never
  // instructs. These are the verbs that turn an observation into advice.
  const PRESCRIPTIVE = /\b(you should|you need to|make sure|consider|try|start by|we recommend|fix|add a|build a)\b/i;

  it('has no finding that tells the reader what to do', () => {
    for (const q of QUESTIONS) {
      for (const f of q.findings) {
        expect(f, `${q.id}: ${f}`).not.toMatch(PRESCRIPTIVE);
      }
    }
  });
});
