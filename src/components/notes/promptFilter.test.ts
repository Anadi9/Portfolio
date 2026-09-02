import { describe, expect, it } from 'vitest';
import { PROMPTS } from '@/data/prompts';
import { EMPTY_QUERY, audienceCounts, categoryCounts, filterPrompts } from './promptFilter';

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe('filterPrompts', () => {
  it('returns everything for an empty query', () => {
    expect(filterPrompts(PROMPTS, EMPTY_QUERY)).toHaveLength(100);
  });

  it('narrows to one category', () => {
    const result = filterPrompts(PROMPTS, { ...EMPTY_QUERY, categoryId: 1 });
    expect(result).toHaveLength(20);
    expect(result.every((p) => p.categoryId === 1)).toBe(true);
  });

  it('narrows to one audience', () => {
    expect(filterPrompts(PROMPTS, { ...EMPTY_QUERY, audience: 'students' })).toHaveLength(21);
  });

  it('ANDs category and audience', () => {
    const result = filterPrompts(PROMPTS, { ...EMPTY_QUERY, categoryId: 1, audience: 'students' });
    expect(result.every((p) => p.categoryId === 1 && p.audience === 'students')).toBe(true);
    expect(result.length).toBeLessThan(20);
  });

  it('matches text in the prompt body, not just the title', () => {
    // "devil's advocate" appears only inside 1.2's prompt text.
    const result = filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: "devil's advocate" });
    expect(ids(result)).toContain('1.2');
  });

  it('matches the title', () => {
    expect(ids(filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'pre-mortem' }))).toContain('1.2');
  });

  it('is case insensitive', () => {
    const lower = filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'refactor' });
    const upper = filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'REFACTOR' });
    expect(ids(lower)).toEqual(ids(upper));
    expect(lower.length).toBeGreaterThan(0);
  });

  it('requires every term, in any order', () => {
    const forward = filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'code review' });
    const reversed = filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'review code' });
    expect(ids(forward)).toEqual(ids(reversed));
    expect(ids(forward)).toContain('1.3');
  });

  it('returns nothing for a term that appears nowhere', () => {
    expect(filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: 'zzzznotathing' })).toEqual([]);
  });

  it('ignores surrounding whitespace', () => {
    expect(filterPrompts(PROMPTS, { ...EMPTY_QUERY, q: '   ' })).toHaveLength(100);
  });

  it('preserves the curated order', () => {
    const result = filterPrompts(PROMPTS, { ...EMPTY_QUERY, categoryId: 2 });
    expect(ids(result)).toEqual(ids(PROMPTS.filter((p) => p.categoryId === 2)));
  });
});

describe('chip counts', () => {
  it('counts every audience against the unfiltered set', () => {
    expect(audienceCounts(PROMPTS, EMPTY_QUERY)).toEqual({
      all: 100,
      both: 49,
      professionals: 30,
      students: 21,
    });
  });

  it('respects the other filters but not its own', () => {
    const counts = audienceCounts(PROMPTS, { ...EMPTY_QUERY, categoryId: 1, audience: 'students' });
    // Scoped to category 1, but NOT to the selected audience, otherwise every
    // unselected chip would read zero.
    expect(counts.all).toBe(20);
    expect(counts.both + counts.professionals + counts.students).toBe(20);
  });

  it('never advertises a count that leads to an empty result', () => {
    const query = { ...EMPTY_QUERY, q: 'code' };
    const counts = audienceCounts(PROMPTS, query);
    for (const audience of ['both', 'professionals', 'students'] as const) {
      expect(filterPrompts(PROMPTS, { ...query, audience })).toHaveLength(counts[audience]);
    }
  });

  it('counts categories the same way', () => {
    expect(categoryCounts(PROMPTS, EMPTY_QUERY)).toEqual({
      all: 100,
      1: 20,
      2: 20,
      3: 20,
      4: 20,
      5: 20,
    });
  });

  it('drops a category entirely when the search excludes it', () => {
    const counts = categoryCounts(PROMPTS, { ...EMPTY_QUERY, q: 'zzzznotathing' });
    expect(counts.all).toBe(0);
  });
});
