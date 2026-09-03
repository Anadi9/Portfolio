import { CREAM, CYAN, FONT, GOLD, GROUND, LIME, MAGENTA, PALETTE } from '../banner-art.mjs';

/**
 * The OG card for a shared Wrapper Test result, as a grid of palette indices.
 *
 * `.mjs` and pure, in the shape of `banner-art.mjs` and for the same reason:
 * `scripts/generate-share-cards.mjs` has to import it from plain Node, with no
 * TypeScript loader in reach, and the same module has to be testable from
 * vitest.
 *
 * It draws with the banner's hand-authored 5 × 7 bitmap font, which decides more
 * of this file than it looks. There is no font file to hand a rasteriser, so
 * there is nothing to measure and nothing to fall back on: every advance here
 * is arithmetic, the plate spells the verdict in words because a colour emoji
 * has no glyph, and "OUT OF 100" is lettered rather than written `/100` because
 * the font has no solidus.
 *
 * The grid is 200 × 105 cells painted at 6 px, not 1200 × 630 pixels. The card
 * is meant to look like the rest of the site — hard-edged and plainly drawn —
 * and an integer upscale is what keeps the glyph edges square.
 */

/**
 * Highest achievable raw score, restated from the question bank for the same
 * reason the band thresholds are: `questions.ts` is TypeScript in the
 * serverless import graph, and the build script is plain Node. Guarded by
 * `share-card-art.test.ts`.
 */
export const MAX_RAW = 39;

export const CARD_COLS = 200;
export const CARD_ROWS = 105;
/** 200 × 105 at 6 px is 1200 × 630, which is what Facebook and X crop to. */
export const CELL = 6;

export { PALETTE };

const GLYPH_COLS = 5;
const GLYPH_ROWS = 7;
/** One blank cell of tracking at scale 1, scaled with the type. */
const TRACKING = 1;
const MARGIN = 12;

/**
 * The four bands, highest first, as words the font can draw.
 *
 * These thresholds are a second copy of the ones in `score.ts`. That is
 * deliberate and it is guarded: `score.ts` is in the serverless import graph,
 * where `serverless-imports.test.ts` requires every relative specifier to end
 * in `.js`, so this `.mjs` cannot be imported from there — and a `.mjs` that
 * imports a `.ts` is not loadable by the build script either. Rather than
 * relax the guard on the one deployed function, the table is stated twice and
 * `share-card-art.test.ts` asserts the two agree on all 101 scores.
 */
export const PLATES = [
  { min: 85, lines: ['REAL', 'PRODUCT'], ink: LIME },
  { min: 65, lines: ['REAL PRODUCT', 'THIN IN PLACES'], ink: CYAN },
  { min: 40, lines: ['WRAPPER WITH', 'FOUNDATIONS'], ink: GOLD },
  { min: 0, lines: ['THIN', 'WRAPPER'], ink: MAGENTA },
];

export const plateFor = (score) => PLATES.find((p) => score >= p.min);

/**
 * Every score a run can land on, ascending.
 *
 * A superset, and knowingly: it enumerates one score per raw total, but the
 * 3 / 1 / 0 / 0 weights cannot actually produce every raw total (38 needs
 * thirteen answers summing to 38, which 3s and 1s cannot reach). Erring wide
 * costs one unreachable card and one unreachable page, both `noindex`; erring
 * narrow would 404 somebody's shared result, so wide is the safe direction.
 */
export const reachableScores = (maxRaw) => {
  const scores = new Set();
  for (let raw = 0; raw <= maxRaw; raw++) scores.add(Math.round((raw / maxRaw) * 100));
  return [...scores].sort((a, b) => a - b);
};

/** Every string the card sets, so a test can prove the font can draw them all. */
export const cardLines = (score) => [
  'THE WRAPPER TEST',
  'ANADITHAKUR IN',
  ...plateFor(score).lines,
  String(score),
  'OUT OF 100',
];

/** Paint one glyph as `scale × scale` blocks. Cells outside the card are dropped. */
const stamp = (cells, ch, ox, oy, scale, value) => {
  const rows = FONT[ch];
  if (!rows) throw new Error(`share card: no glyph for \`${ch}\`.`);
  for (let r = 0; r < GLYPH_ROWS; r++) {
    for (let c = 0; c < GLYPH_COLS; c++) {
      if (rows[r][c] !== '#') continue;
      for (let dy = 0; dy < scale; dy++) {
        const y = oy + r * scale + dy;
        if (y < 0 || y >= CARD_ROWS) continue;
        for (let dx = 0; dx < scale; dx++) {
          const x = ox + c * scale + dx;
          if (x < 0 || x >= CARD_COLS) continue;
          cells[y * CARD_COLS + x] = value;
        }
      }
    }
  }
};

const advanceOf = (scale) => (GLYPH_COLS + TRACKING) * scale;

/** Advance width of a string, less the tracking that trails the last glyph. */
const widthOf = (text, scale) => text.length * advanceOf(scale) - TRACKING * scale;

const text = (cells, str, x, y, scale, value) => {
  let cursor = x;
  for (const ch of str) {
    if (ch !== ' ') stamp(cells, ch, cursor, y, scale, value);
    cursor += advanceOf(scale);
  }
};

const rect = (cells, x, y, w, h, value) => {
  for (let dy = 0; dy < h; dy++) {
    const row = y + dy;
    if (row < 0 || row >= CARD_ROWS) continue;
    for (let dx = 0; dx < w; dx++) {
      const col = x + dx;
      if (col < 0 || col >= CARD_COLS) continue;
      cells[row * CARD_COLS + col] = value;
    }
  }
};

/**
 * Where every string sits, in cells, separate from the painting of it.
 *
 * Split out because the first version of this card overlapped its own header
 * with its byline, and an overlap is a property of the layout that a test can
 * check — which `share-card-art.test.ts` now does for every reachable score,
 * rather than leaving it to whoever looks at the PNG.
 */
export const placements = (score) => {
  const plate = plateFor(score);
  const right = CARD_COLS - MARGIN;
  const digits = String(score);
  const byline = 'ANADITHAKUR IN';

  return [
    { text: 'THE WRAPPER TEST', x: MARGIN, y: 8, scale: 1, ink: CREAM },
    { text: plate.lines[0], x: MARGIN, y: 27, scale: 2, ink: plate.ink },
    { text: plate.lines[1], x: MARGIN, y: 45, scale: 2, ink: plate.ink },
    { text: digits, x: MARGIN, y: 66, scale: 3, ink: CREAM },
    { text: 'OUT OF 100', x: MARGIN + widthOf(digits, 3) + 8, y: 80, scale: 1, ink: CREAM },
    { text: byline, x: right - widthOf(byline, 1), y: 97, scale: 1, ink: plate.ink },
  ];
};

export function cardArt(score) {
  const plate = plateFor(score);
  const cells = new Array(CARD_COLS * CARD_ROWS).fill(GROUND);
  const right = CARD_COLS - MARGIN;
  const track = right - MARGIN;

  for (const p of placements(score)) text(cells, p.text, p.x, p.y, p.scale, p.ink);

  // A rule under the header, and the score again as a bar: the one thing a
  // reader takes in from a timeline thumbnail before they read a word of it.
  rect(cells, MARGIN, 19, track, 1, plate.ink);
  rect(cells, MARGIN, 92, track, 1, CREAM);
  rect(cells, MARGIN, 90, Math.round((track * score) / 100), 4, plate.ink);

  return { width: CARD_COLS, height: CARD_ROWS, palette: PALETTE, cells };
}
