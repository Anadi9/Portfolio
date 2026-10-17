import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMISES, promiseHours } from './promises';
import { TURNAROUND_HOURS } from '@/lib/rescue/intake';
import { FREE_CARDS, GUARANTEES, PRICE_GROUPS } from './bitsQuestFacts';

describe('promise list', () => {
  it('holds the deadlines the site quotes', () => {
    expect(promiseHours('first_bug_video')).toBe(24);
    expect(promiseHours('audit_report')).toBe(48);
    expect(promiseHours('teardown')).toBe(48);
    expect(promiseHours('deletion')).toBe(720);
    expect(promiseHours('daily_update')).toBe(24);
  });

  it('throws for a promise with no deadline', () => {
    expect(() => promiseHours('pay_when_live')).toThrow(/no deadline/);
  });

  it('keys match ids', () => {
    for (const [k, p] of Object.entries(PROMISES)) expect(p.id).toBe(k);
  });

  it('every place a promise is made is a real file', () => {
    for (const p of Object.values(PROMISES)) {
      expect(p.where.length).toBeGreaterThan(0);
      for (const f of p.where) expect(existsSync(f), `${p.id}: ${f}`).toBe(true);
    }
  });

  it('the copy reads its numbers from the list', () => {
    expect(TURNAROUND_HOURS).toBe(promiseHours('first_bug_video'));
    const card = FREE_CARDS.find((c) => c.title === 'Free first-bug video')!;
    expect(card.body).toContain(`within ${promiseHours('first_bug_video')} hours`);
    const teardown = FREE_CARDS.find((c) => c.title === 'Recorded teardown')!;
    expect(teardown.body).toContain(`in ${promiseHours('teardown')} hours`);
    expect(GUARANTEES[0][1]).toContain(`in ${promiseHours('first_bug_video')}h`);
    expect(PRICE_GROUPS[0].packages[0].duration).toBe(`${promiseHours('audit_report')} hours`);
  });
});
