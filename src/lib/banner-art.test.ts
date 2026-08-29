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
