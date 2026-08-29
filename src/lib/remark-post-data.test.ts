import { compile } from '@mdx-js/mdx';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import remarkPostData from './remark-post-data.mjs';

const build = (mdx: string) =>
  compile(mdx, {
    remarkPlugins: [remarkGfm, remarkPostData],
    rehypePlugins: [rehypeSlug],
  }).then((f) => String(f));

/** Pull the exported array back out of the compiled module source. */
const exported = (code: string) => {
  const match = /export const headings = (\[[\s\S]*?\]);/.exec(code);
  if (!match) throw new Error('no `headings` export in compiled output');
  return JSON.parse(match[1]) as { depth: number; id: string; text: string }[];
};

describe('remarkPostData — headings', () => {
  it('exports h2 and h3 in document order, ignoring h1 and h4', async () => {
    const code = await build(
      ['# Title', '## First section', '### A detail', '#### Ignored', '## Second section'].join('\n\n'),
    );

    expect(exported(code)).toEqual([
      { depth: 2, id: 'first-section', text: 'First section' },
      { depth: 3, id: 'a-detail', text: 'A detail' },
      { depth: 2, id: 'second-section', text: 'Second section' },
    ]);
  });

  it('disambiguates repeated headings the same way rehype-slug does', async () => {
    const code = await build(['## Trigger', '## Steps', '## Trigger', '## Trigger'].join('\n\n'));

    expect(exported(code).map((h) => h.id)).toEqual(['trigger', 'steps', 'trigger-1', 'trigger-2']);
  });

  it('agrees with rehype-slug on every id it exports', async () => {
    const code = await build(
      [
        '## Comment-to-DM lead capture',
        '### Trigger',
        '### Setup notes',
        '## Auto-repurpose new content',
        '### Trigger',
        '### Setup notes',
        '## `n8n` & Zapier — 100% parity?',
        '### Trigger',
      ].join('\n\n'),
    );

    for (const heading of exported(code)) {
      expect(code, `id ${heading.id} is missing from the compiled output`).toContain(
        `id: "${heading.id}"`,
      );
    }
  });

  it('flattens inline markup in the heading text', async () => {
    const code = await build('## The `useWhen` **line**');

    expect(exported(code)).toEqual([
      { depth: 2, id: 'the-usewhen-line', text: 'The useWhen line' },
    ]);
  });
});

const wordsOf = (code: string) => {
  const match = /export const words = (\d+);/.exec(code);
  if (!match) throw new Error('no `words` export in compiled output');
  return Number(match[1]);
};

describe('remarkPostData — words', () => {
  it('counts prose words', async () => {
    expect(wordsOf(await build('One two three four five.'))).toBe(5);
  });

  it('counts heading text too — a reader reads those', async () => {
    expect(wordsOf(await build(['## Two words', 'Three more words here.'].join('\n\n')))).toBe(6);
  });

  it('excludes fenced code, which nobody reads linearly', async () => {
    const withCode = await build(['One two three.', '```json', '{ "a": 1, "b": 2, "c": 3 }', '```'].join('\n\n'));
    expect(wordsOf(withCode)).toBe(3);
  });

  it('is zero for a body with no prose', async () => {
    expect(wordsOf(await build('```js\nconst a = 1;\n```'))).toBe(0);
  });
});
