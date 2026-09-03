import { describe, expect, it } from 'vitest';
import { FONT } from '../banner-art.mjs';
import { MAX_RAW, QUESTIONS } from './questions';
import { band, score } from './score';
import {
  CARD_COLS,
  CARD_ROWS,
  MAX_RAW as MAX_RAW_MJS,
  PLATES,
  cardArt,
  cardLines,
  placements,
  plateFor,
  reachableScores,
} from './share-card-art.mjs';

describe('share-card-art: MAX_RAW', () => {
  // Restated here for the same reason the band thresholds are: the build script
  // is plain Node and cannot import the question bank's TypeScript.
  it('agrees with the question bank', () => {
    expect(MAX_RAW_MJS).toBe(MAX_RAW);
  });
});

describe('share-card-art: PLATES', () => {
  /**
   * The reason this test exists. `band()` lives in `score.ts`, which the
   * serverless function imports, and `serverless-imports.test.ts` requires every
   * relative import in that graph to carry a `.js` extension — so this `.mjs`,
   * which the build script must be able to import without a TypeScript loader,
   * cannot be pulled in there. The thresholds are therefore stated twice, and
   * this is what makes the second copy safe.
   */
  it('agrees with the scorer on the band of every possible score', () => {
    // The plate drops what a hand-authored bitmap font cannot draw — the emoji
    // and the comma — so the comparison is on the words alone.
    const words = (verdict: string) =>
      verdict
        .replace(/[^A-Z ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    for (let s = 0; s <= 100; s++) {
      expect(plateFor(s).lines.join(' '), `score ${s}`).toBe(words(band(s)));
    }
  });

  it('has a plate for each of the four bands and no more', () => {
    expect(PLATES).toHaveLength(4);
    expect(new Set(PLATES.map((p) => p.lines.join(' '))).size).toBe(4);
    const verdicts = new Set<string>();
    for (let s = 0; s <= 100; s++) verdicts.add(band(s));
    expect(verdicts.size).toBe(4);
  });
});

describe('share-card-art: reachableScores', () => {
  it('covers every score the scorer can actually produce', () => {
    const covered = new Set(reachableScores(MAX_RAW));

    // Weights are 3 / 1 / 0 / 0, so a run of `threes` best answers and `ones`
    // second-best answers is the general shape of a raw total.
    for (let threes = 0; threes <= QUESTIONS.length; threes++) {
      for (let ones = 0; ones + threes <= QUESTIONS.length; ones++) {
        const answers = QUESTIONS.map((_, i) => (i < threes ? 0 : i < threes + ones ? 1 : 2));
        expect(covered, `${threes} best, ${ones} second-best`).toContain(score(answers).score);
      }
    }
  });

  it('is 40 ascending scores from 0 to 100', () => {
    const scores = reachableScores(MAX_RAW);
    expect(scores).toHaveLength(MAX_RAW + 1);
    expect(scores[0]).toBe(0);
    expect(scores[scores.length - 1]).toBe(100);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    expect(new Set(scores).size).toBe(scores.length);
  });
});

describe('share-card-art: cardLines', () => {
  it('sets only characters the font can draw', () => {
    for (const s of reachableScores(MAX_RAW)) {
      for (const line of cardLines(s)) {
        for (const ch of line) {
          if (ch === ' ') continue;
          expect(FONT[ch], `score ${s}: "${line}" needs a glyph for "${ch}"`).toBeDefined();
        }
      }
    }
  });

  it('sets the score itself', () => {
    expect(cardLines(31)).toContain('31');
    expect(cardLines(100)).toContain('100');
    expect(cardLines(0)).toContain('0');
  });
});

describe('share-card-art: placements', () => {
  /** The cell rectangle a placed string occupies. */
  const box = (p: { text: string; x: number; y: number; scale: number }) => ({
    text: p.text,
    x0: p.x,
    x1: p.x + p.text.length * 6 * p.scale - p.scale,
    y0: p.y,
    y1: p.y + 7 * p.scale,
  });

  it('never overlaps two strings', () => {
    for (const s of reachableScores(MAX_RAW)) {
      const boxes = placements(s).map(box);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          const collides = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
          expect(collides, `score ${s}: "${a.text}" overlaps "${b.text}"`).toBe(false);
        }
      }
    }
  });

  it('keeps every string inside the card', () => {
    for (const s of reachableScores(MAX_RAW)) {
      for (const p of placements(s).map(box)) {
        expect(p.x0, `score ${s}: "${p.text}"`).toBeGreaterThanOrEqual(0);
        expect(p.x1, `score ${s}: "${p.text}"`).toBeLessThanOrEqual(CARD_COLS);
        expect(p.y0, `score ${s}: "${p.text}"`).toBeGreaterThanOrEqual(0);
        expect(p.y1, `score ${s}: "${p.text}"`).toBeLessThanOrEqual(CARD_ROWS);
      }
    }
  });
});

describe('share-card-art: cardArt', () => {
  it('is a full grid of palette indices', () => {
    const art = cardArt(31);
    expect(art.width).toBe(CARD_COLS);
    expect(art.height).toBe(CARD_ROWS);
    expect(art.cells).toHaveLength(CARD_COLS * CARD_ROWS);
    for (const cell of art.cells) {
      expect(Number.isInteger(cell)).toBe(true);
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(art.palette.length);
    }
  });

  it('is deterministic: the same score draws the same card', () => {
    expect(cardArt(31).cells).toEqual(cardArt(31).cells);
  });

  it('draws a different card for a different score', () => {
    expect(cardArt(31).cells).not.toEqual(cardArt(92).cells);
  });

  it('renders every reachable score without throwing', () => {
    for (const s of reachableScores(MAX_RAW)) expect(() => cardArt(s)).not.toThrow();
  });
});
