import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractFaq, faqModule } from '../../../scripts/lib/faq.mjs';
import { FAQ } from '../../data/faq.generated';
import { articleJsonLd } from '../../components/notes/postSeo';
import type { Post } from '../../data/notes';

const src = `---
title: X
---
## What is SEO?

Search engine optimisation is **the old one**: ranking in [Google](/notes).

More detail that is not the answer.

## What do they share?

All three fail the same way:

- No readable HTML that a crawler
  can parse.
- No structured data.

## A heading that is not a question

Text.

\`\`\`md
## Is this a question inside code?
\`\`\`
`;

describe('extractFaq', () => {
  it('takes question headings and the paragraph (and list) under them', () => {
    expect(extractFaq(src)).toEqual([
      { q: 'What is SEO?', a: 'Search engine optimisation is the old one: ranking in Google.' },
      { q: 'What do they share?', a: 'All three fail the same way: No readable HTML that a crawler can parse. No structured data.' },
    ]);
  });

  it('skips a colon answer with no list, and strips numbering', () => {
    expect(extractFaq('## 1. First?\n\nOne.\n\n## Second?\n\nIt starts:\n\n| a | b |\n\n## Table?\n\n| x | y |\n\n## 3. Third?\n\nThree.\n')).toEqual([
      { q: 'First?', a: 'One.' },
      { q: 'Third?', a: 'Three.' },
    ]);
  });

  it('needs at least two questions', () => {
    expect(extractFaq('## Only one?\n\nYes.\n')).toEqual([]);
  });
});

describe('faq.generated.ts', () => {
  it('matches the posts (run node scripts/generate-faq.mjs)', () => {
    expect(faqModule()).toBe(readFileSync('src/data/faq.generated.ts', 'utf8'));
  });

  it('covers the Q&A-shaped posts', () => {
    expect(FAQ['/wisdom/geo-vs-seo-vs-aeo']?.[0].q).toBe('What is SEO?');
  });
});

describe('article JSON-LD', () => {
  const post = (path: string) => ({ path, title: 't', summary: 's', date: '2026-10-13', stream: 'wisdom', slug: path.split('/').pop(), cover: false }) as unknown as Post;
  const types = (p: Post) => (articleJsonLd(p, 'Article')['@graph'] as { '@type': string; mainEntity?: { name: string }[] }[]);

  it('adds FAQPage only to Q&A-shaped posts', () => {
    const faq = types(post('/wisdom/geo-vs-seo-vs-aeo')).find((n) => n['@type'] === 'FAQPage')!;
    expect(faq.mainEntity![0].name).toBe('What is SEO?');
    expect(types(post('/wisdom/not-a-qa-post')).some((n) => n['@type'] === 'FAQPage')).toBe(false);
  });
});
