import { describe, expect, it } from 'vitest';
import type { DispatchPost, DropPost, WisdomPost } from '@/data/notes';
import { metaRowsOf } from './postMeta';

const base = {
  slug: 's',
  path: '/p/s',
  headings: [],
  Body: () => null,
  title: 't',
  summary: 'x',
  useWhen: 'w',
  date: '2026-08-29',
};

describe('metaRowsOf', () => {
  it('gives a drop its artifact, format and keyword', () => {
    const rows = metaRowsOf({
      ...base,
      stream: 'drop',
      artifact: '9-section template',
      format: 'both',
      keyword: 'SYSTEM',
    } as DropPost);

    expect(rows).toEqual([
      { tag: 'YOU GET', value: '9-section template' },
      { tag: 'FORMAT', value: 'ON PAGE + PDF' },
      { tag: 'DM KEYWORD', value: 'SYSTEM' },
    ]);
  });

  it('appends LAST VERIFIED when the post carries one', () => {
    const rows = metaRowsOf({
      ...base,
      stream: 'drop',
      artifact: 'a',
      format: 'inline',
      keyword: 'K',
      lastVerified: '2026-08-29',
    } as DropPost);

    expect(rows.at(-1)).toEqual({ tag: 'LAST VERIFIED', value: '29 AUG 2026' });
  });

  it('gives wisdom nothing — its tradeoff belongs in the body', () => {
    expect(metaRowsOf({ ...base, stream: 'wisdom', moves: [], tradeoff: 't' } as WisdomPost)).toEqual([]);
  });

  it('gives a dispatch its claim count', () => {
    const rows = metaRowsOf({
      ...base,
      stream: 'dispatch',
      dateline: 'd',
      items: [
        { headline: 'a', why: 'b' },
        { headline: 'c', why: 'd' },
      ],
    } as DispatchPost);

    expect(rows).toEqual([{ tag: 'IN THIS ONE', value: '2 claims' }]);
  });

  it('singularises a one-claim dispatch', () => {
    const rows = metaRowsOf({
      ...base,
      stream: 'dispatch',
      dateline: 'd',
      items: [{ headline: 'a', why: 'b' }],
    } as DispatchPost);

    expect(rows).toEqual([{ tag: 'IN THIS ONE', value: '1 claim' }]);
  });
});
