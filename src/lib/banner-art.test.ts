import { describe, expect, it } from 'vitest';
import { BANNER_H, BANNER_W, PALETTE, bannerWord, neonFor, rngFor } from './banner-art.mjs';

describe('banner-art — constants', () => {
  it('is a 6:1 grid', () => {
    expect(BANNER_W).toBe(360);
    expect(BANNER_H).toBe(60);
    expect(BANNER_W / BANNER_H).toBe(6);
  });

  it('never includes the reserved status greens', () => {
    expect(PALETTE).toHaveLength(6);
    expect(PALETTE).not.toContain('#0E7A45');
    expect(PALETTE).not.toContain('#35D48A');
  });
});

describe('banner-art — rngFor', () => {
  it('is deterministic for the same slug', () => {
    const a = Array.from({ length: 8 }, rngFor('automate'));
    const b = Array.from({ length: 8 }, rngFor('automate'));
    expect(a).toEqual(b);
  });

  it('differs between slugs', () => {
    const a = Array.from({ length: 8 }, rngFor('automate'));
    const b = Array.from({ length: 8 }, rngFor('cheatsheet'));
    expect(a).not.toEqual(b);
  });

  it('stays in [0, 1)', () => {
    const rng = rngFor('workflow');
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('banner-art — bannerWord', () => {
  it('uses the drop keyword, not the stream name', () => {
    expect(bannerWord({ stream: 'drop', keyword: 'AUTOMATE' })).toBe('AUTOMATE');
  });

  it('uppercases a lowercase keyword', () => {
    expect(bannerWord({ stream: 'drop', keyword: 'swipe' })).toBe('SWIPE');
  });

  it('gives the other streams one word, not their two-word label', () => {
    expect(bannerWord({ stream: 'wisdom' })).toBe('WISDOM');
    expect(bannerWord({ stream: 'dispatch' })).toBe('DISPATCH');
  });

  it('throws on an unknown stream rather than rendering an empty plate', () => {
    expect(() => bannerWord({ stream: 'essay' })).toThrow(/essay/);
  });

  it('throws on a drop with no keyword', () => {
    expect(() => bannerWord({ stream: 'drop' })).toThrow(/keyword/);
  });
});

describe('banner-art — neonFor', () => {
  it('picks exactly two distinct neon indices', () => {
    for (const slug of ['automate', 'cheatsheet', 'swipe', 'system', 'workflow', 'prompts']) {
      const [primary, secondary] = neonFor(rngFor(slug));
      expect([3, 4, 5]).toContain(primary);
      expect([3, 4, 5]).toContain(secondary);
      expect(primary).not.toBe(secondary);
    }
  });
});

import { BANNER_H as H, BANNER_W as W, CREAM, CYAN, FONT, GROUND, MAGENTA, bannerArt, layoutWord } from './banner-art.mjs';

/** Every word this corpus can ever ask the font for. */
const CORPUS_WORDS = ['SWIPE', 'SYSTEM', 'PROMPTS', 'AUTOMATE', 'WORKFLOW', 'CHEATSHEET', 'WISDOM', 'DISPATCH'];

describe('banner-art — FONT', () => {
  it('covers A-Z and nothing else', () => {
    const keys = Object.keys(FONT).sort();
    expect(keys).toHaveLength(26);
    expect(keys[0]).toBe('A');
    expect(keys[25]).toBe('Z');
  });

  it('is uniformly 7 rows of 5 cells', () => {
    for (const [ch, rows] of Object.entries(FONT)) {
      expect(rows, ch).toHaveLength(7);
      for (const row of rows) {
        expect(row, ch).toHaveLength(5);
        expect(row, ch).toMatch(/^[#.]{5}$/);
      }
    }
  });

  it('has a glyph for every character the corpus uses', () => {
    for (const word of CORPUS_WORDS) {
      for (const ch of word) expect(FONT[ch], `${word}: ${ch}`).toBeDefined();
    }
  });

  it('draws something for every glyph', () => {
    for (const [ch, rows] of Object.entries(FONT)) {
      expect(rows.join('').includes('#'), ch).toBe(true);
    }
  });
});

describe('banner-art — layoutWord', () => {
  it('always overspans the plate so the word is clipped', () => {
    for (const word of CORPUS_WORDS) {
      const { advance, x0 } = layoutWord(word);
      expect(x0 + advance * word.length, word).toBeGreaterThan(W);
    }
  });

  it('never lets two letters collide', () => {
    for (const word of CORPUS_WORDS) {
      const { advance, glyphW } = layoutWord(word);
      expect(advance, word).toBeGreaterThan(glyphW);
    }
  });

  it('sets every word at the same cap height', () => {
    const heights = new Set(CORPUS_WORDS.map((w) => layoutWord(w).glyphH));
    expect(heights.size).toBe(1);
  });

  it('keeps the word inside the plate vertically', () => {
    const { y0, glyphH } = layoutWord('AUTOMATE');
    expect(y0).toBeGreaterThanOrEqual(0);
    expect(y0 + glyphH).toBeLessThanOrEqual(H);
  });
});

describe('banner-art — bannerArt word layer', () => {
  const art = () => bannerArt({ slug: 'automate', stream: 'drop', keyword: 'AUTOMATE' });

  it('returns a full grid', () => {
    const a = art();
    expect(a.width).toBe(W);
    expect(a.height).toBe(H);
    expect(a.cells).toHaveLength(W * H);
    expect(a.wordMask).toHaveLength(W * H);
  });

  it('is byte-identical between runs', () => {
    expect(Array.from(art().cells)).toEqual(Array.from(art().cells));
  });

  it('differs between slugs', () => {
    const other = bannerArt({ slug: 'workflow', stream: 'drop', keyword: 'WORKFLOW' });
    expect(Array.from(art().cells)).not.toEqual(Array.from(other.cells));
  });

  it('draws the word in cream with a chromatic fringe', () => {
    const a = art();
    const has = (v) => a.cells.includes(v);
    expect(has(CREAM)).toBe(true);
    expect(has(CYAN)).toBe(true);
    expect(has(MAGENTA)).toBe(true);
  });

  it('marks only word cells in the mask', () => {
    const a = art();
    for (let i = 0; i < a.cells.length; i++) {
      if (a.wordMask[i]) expect(a.cells[i]).not.toBe(GROUND);
    }
    expect(a.wordMask.some((v) => v === 1)).toBe(true);
  });

  it('uses every cell value from the palette only', () => {
    const a = art();
    for (const v of a.cells) expect(v).toBeLessThan(a.palette.length);
  });
});
