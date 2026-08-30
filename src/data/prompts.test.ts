import { describe, expect, it } from 'vitest';
import { AUDIENCE_LABEL, CATEGORIES, PROMPTS, type Audience } from './prompts';

const countBy = <T extends string | number>(values: T[]) =>
  values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[String(v)] ?? 0) + 1 }), {});

/**
 * These numbers are the extraction receipt.
 *
 * The data file was parsed out of `prompts.mdx`, not retyped, and these are the
 * counts the markdown itself greps to. If a future edit drops a record or
 * retags one, this is what says so — the page claims a hundred prompts in its
 * title, its summary and its OG card.
 */
describe('the prompt library', () => {
  it('has exactly 100 prompts', () => {
    expect(PROMPTS).toHaveLength(100);
  });

  it('has five categories, twenty prompts each', () => {
    expect(CATEGORIES).toHaveLength(5);
    expect(countBy(PROMPTS.map((p) => p.categoryId))).toEqual({ 1: 20, 2: 20, 3: 20, 4: 20, 5: 20 });
  });

  it('keeps the audience split the markdown had', () => {
    expect(countBy(PROMPTS.map((p) => p.audience))).toEqual({
      both: 49,
      professionals: 30,
      students: 21,
    });
  });

  it('gives every prompt a unique id matching its category', () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(100);
    for (const p of PROMPTS) {
      expect(p.id, `${p.id} does not start with its category number`).toMatch(
        new RegExp(`^${p.categoryId}\\.\\d+$`),
      );
    }
  });

  it('leaves no field empty', () => {
    for (const p of PROMPTS) {
      for (const key of ['category', 'title', 'prompt', 'why'] as const) {
        expect(p[key].trim(), `${p.id} has an empty ${key}`).not.toBe('');
      }
    }
  });

  it('names every category the prompts refer to', () => {
    const named = new Map(CATEGORIES.map((c) => [c.id, c.name]));
    for (const p of PROMPTS) {
      expect(named.get(p.categoryId), `${p.id} has an unknown category`).toBe(p.category);
    }
    for (const c of CATEGORIES) expect(c.intro.trim()).not.toBe('');
  });

  it("keeps the anchor ids the markdown headings had", () => {
    // The page's intro links to all five. These were rehype-slug's output when
    // the categories were `##` headings, and the component has to keep them or
    // those links die silently.
    expect(CATEGORIES.map((c) => c.anchor)).toEqual([
      '1-engineering--coding',
      '2-learning-anything',
      '3-design-product-uiux--visual',
      '4-content--growth',
      '5-ai-image-video--animation-generation',
    ]);
  });

  it('labels every audience it can hold', () => {
    for (const audience of Object.keys(AUDIENCE_LABEL) as Audience[]) {
      expect(AUDIENCE_LABEL[audience]).toBeTruthy();
    }
  });

  it('carries no leftover markdown in the prompt bodies', () => {
    for (const p of PROMPTS) {
      expect(p.prompt.startsWith('>'), `${p.id} kept its blockquote marker`).toBe(false);
      expect(p.why.startsWith('**'), `${p.id} kept its bold lead-in`).toBe(false);
    }
  });
});
