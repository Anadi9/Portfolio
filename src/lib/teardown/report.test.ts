import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS } from './questions';
import { report } from './report';

const all = (i: number) => QUESTIONS.map(() => i);

describe('report: completeness', () => {
  it('always returns all nine sections in ascending order', () => {
    for (const i of [0, 1, 2, 3]) {
      const m = report(all(i));
      expect(m.sections.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    }
  });

  it('titles every section from SECTIONS', () => {
    for (const s of report(all(0)).sections) {
      expect(s.title).toBe(SECTIONS[s.id]);
    }
  });

  it('carries the full Result alongside the sections', () => {
    const m = report(all(0));
    expect(m.result.score).toBe(100);
    expect(m.result.verdict).toBe('🎯 REAL PRODUCT');
  });

  it('gives each section one finding per question in that section', () => {
    const m = report(all(0));
    const bySection = (id: number) => QUESTIONS.filter((q) => q.section === id).length;
    for (const s of m.sections) {
      expect(s.findings).toHaveLength(bySection(s.id));
    }
  });
});

describe('report: decided / undecided / mixed', () => {
  it('marks every section undecided when every answer is unknown', () => {
    for (const s of report(all(3)).sections) {
      expect(s.state).toBe('undecided');
    }
  });

  it('marks every section decided when no answer is unknown', () => {
    for (const s of report(all(2)).sections) {
      expect(s.state).toBe('decided');
    }
  });

  it('marks a multi-question section mixed when only some answers are unknown', () => {
    // Section 4 is questions 4 and 5 (indices 3 and 4). Unknown one, answer the other.
    const answers = QUESTIONS.map((_, i) => (i === 3 ? 3 : 0));
    const s4 = report(answers).sections.find((s) => s.id === 4);
    expect(s4?.state).toBe('mixed');
  });

  it('never marks a single-question section mixed', () => {
    const answers = QUESTIONS.map((q, i) => (q.section === 1 ? 3 : 0));
    const s1 = report(answers).sections.find((s) => s.id === 1);
    expect(s1?.state).toBe('undecided');
  });
});

describe('report: decision 3: diagnose, never prescribe', () => {
  it('has no field on any section that could hold a fix', () => {
    // Every section across all four `all(i)` answer patterns, plus the mixed
    // case below, not just `sections[0]`, which is always a single-question,
    // always-`decided` section and would miss a field reachable only via
    // `'mixed'` state or a multi-question section.
    for (const i of [0, 1, 2, 3]) {
      for (const s of report(all(i)).sections) {
        const keys = Object.keys(s).sort();
        expect(keys).toEqual(['findings', 'id', 'score', 'state', 'title']);
      }
    }
    const mixedAnswers = QUESTIONS.map((_, i) => (i === 3 ? 3 : 0));
    for (const s of report(mixedAnswers).sections) {
      const keys = Object.keys(s).sort();
      expect(keys).toEqual(['findings', 'id', 'score', 'state', 'title']);
    }
  });

  it('renders no finding that was not authored in questions.ts', () => {
    // The guard. A sentence cannot reach a reader without first being written
    // into the question bank, where it is reviewable.
    const authored = new Set(QUESTIONS.flatMap((q) => q.findings));
    for (const i of [0, 1, 2, 3]) {
      for (const s of report(all(i)).sections) {
        for (const f of s.findings) {
          expect(authored.has(f), `unauthored finding: ${f}`).toBe(true);
        }
      }
    }
  });
});
