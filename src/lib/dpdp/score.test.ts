import { describe, expect, it } from 'vitest';
import { QUESTIONS } from './questions';
import { scoreAnswers } from './score';

const all = (a: 'yes' | 'partly' | 'no' | 'unsure') => Object.fromEntries(QUESTIONS.map((q) => [q.id, a]));

describe('DPDP questions', () => {
  it('has thirteen questions with unique ids, each with a basis and a fix', () => {
    expect(QUESTIONS).toHaveLength(13);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(13);
    QUESTIONS.forEach((q) => {
      expect(q.basis.length, q.id).toBeGreaterThan(20);
      expect(q.fix.length, q.id).toBeGreaterThan(20);
    });
  });
});

describe('scoreAnswers', () => {
  it('scores all-yes 100, nearly ready, with no gaps', () => {
    const r = scoreAnswers(all('yes'));
    expect(r).toMatchObject({ score: 100, answered: 13, gaps: [] });
    expect(r.band.label).toBe('Nearly ready');
  });

  it('scores all-partly 50 and all-no or unsure 0', () => {
    expect(scoreAnswers(all('partly')).score).toBe(50);
    expect(scoreAnswers(all('no')).score).toBe(0);
    expect(scoreAnswers(all('unsure')).band.label).toBe('Not ready yet');
  });

  it('ignores unanswered questions instead of counting them as failures', () => {
    const r = scoreAnswers({ notice: 'yes', consent: 'yes' });
    expect(r).toMatchObject({ score: 100, answered: 2 });
  });

  it('orders gaps by weight, then question order', () => {
    const r = scoreAnswers({ ...all('yes'), correct: 'no', breach: 'unsure', withdraw: 'partly', notice: 'no' });
    expect(r.gaps.map((g) => g.id)).toEqual(['notice', 'breach', 'withdraw', 'correct']);
  });
});
