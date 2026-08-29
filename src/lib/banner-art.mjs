/**
 * The banner art system: a deterministic pixel plate per post.
 *
 * Pure. No filesystem, no rasteriser, no React — it returns a cell array and
 * nothing else. That is what lets the same code run inside Vitest, inside the
 * Vite build, and inside the plain-Node generator script without any of them
 * needing the others' environment.
 *
 * Everything is a function of the slug. A post's banner is fixed the moment its
 * file is named and never changes on rebuild, which is the whole reason this is
 * seeded rather than random.
 */

export const BANNER_W = 360;
export const BANNER_H = 60;

/**
 * Six indexed colours.
 *
 * Cream and gold are the site's own (`c.accent`, `c.mark`), carried in so the
 * plate is recognisably this site's rather than any neon plate. The three neon
 * hues exist nowhere else on the site — see the spec's §3. The lime is
 * yellow-green rather than emerald specifically so a banner pixel can never be
 * mistaken for the reserved status light `c.signal`.
 */
export const PALETTE = ['#0a0a0a', '#E4DED0', '#C9A24B', '#FF2E88', '#2EE6FF', '#B8FF2E'];

export const GROUND = 0;
export const CREAM = 1;
export const GOLD = 2;
export const MAGENTA = 3;
export const CYAN = 4;
export const LIME = 5;

const NEON = [MAGENTA, CYAN, LIME];

const fnv1a = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32. Small, fast, and identical across Node versions. */
export const rngFor = (slug) => {
  let a = fnv1a(slug);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * One word, uppercase, A–Z.
 *
 * Deliberately not `streamLabel` from `src/data/notes.ts`: that is a label
 * ("BUILDER WISDOM"), and this is a display constraint. Coupling them would let
 * a future label change silently break the typography or ask for a glyph the
 * bitmap font does not have.
 */
export const bannerWord = ({ stream, keyword }) => {
  if (stream === 'drop') {
    if (!keyword) throw new Error('banner: a drop needs a `keyword` in its frontmatter.');
    return String(keyword).toUpperCase();
  }
  if (stream === 'wisdom') return 'WISDOM';
  if (stream === 'dispatch') return 'DISPATCH';
  throw new Error(`banner: unknown stream \`${stream}\`.`);
};

/**
 * Two of the three neon hues, never all three.
 *
 * Two is what makes twelve banners read as one system. Three per plate is a
 * rainbow, which is the failure mode this whole palette is guarding against.
 */
export const neonFor = (rng) => {
  const pool = [...NEON];
  const primary = pool.splice(Math.floor(rng() * pool.length), 1)[0];
  const secondary = pool[Math.floor(rng() * pool.length)];
  return [primary, secondary];
};

/**
 * A 5 × 7 uppercase bitmap font, A–Z.
 *
 * Hand-authored rather than rasterised from a font file, and that is the point:
 * scaling vector type down to a 60-cell plate produces anti-aliased edges that
 * the `image-rendering: pixelated` upscale then magnifies into mush. Bitmap
 * glyphs scale by integer replication and stay hard.
 *
 * It also means advance width is exact rather than measured, which is what lets
 * this run in a build script with no text-measurement API anywhere in reach.
 */
export const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
};

const GLYPH_COLS = 5;
const GLYPH_ROWS = 7;
/** Cap height as a fraction of the plate. */
const CAP = 0.9;
/** How far past the right edge the string runs. */
const OVERSPAN = 1.15;
const INSET = 3;

/**
 * Constant cap height, variable tracking.
 *
 * The obvious approach — vary the type size until the string hits a target
 * width — does not work on a 6:1 plate: sizing `SWIPE` to span 360 cells needs
 * glyphs several times taller than the 60 available. Tracking is the only free
 * variable, so every word is set at the same size and the *gaps* do the work.
 * The result is that all twelve plates share a baseline, a cap height, and an
 * overspan, and differ only in how airy the letters are.
 *
 * The scale steps down if a word is ever long enough that its advance would be
 * narrower than a glyph — which the corpus (5 to 10 characters) never triggers,
 * but a future `CHEATSHEETS` would.
 */
export const layoutWord = (word) => {
  const span = Math.round(BANNER_W * OVERSPAN);
  let scale = Math.floor((BANNER_H * CAP) / GLYPH_ROWS);
  let advance = Math.floor(span / word.length);
  while (scale > 1 && advance <= GLYPH_COLS * scale) scale -= 1;
  const glyphW = GLYPH_COLS * scale;
  const glyphH = GLYPH_ROWS * scale;
  return {
    scale,
    advance,
    glyphW,
    glyphH,
    x0: INSET,
    y0: Math.floor((BANNER_H - glyphH) / 2),
  };
};

/** Paint one glyph as `scale × scale` blocks. Out-of-plate cells are dropped. */
const stamp = (cells, mask, ch, ox, oy, scale, value, marks) => {
  const rows = FONT[ch];
  if (!rows) throw new Error(`banner: no glyph for \`${ch}\`.`);
  for (let r = 0; r < GLYPH_ROWS; r++) {
    for (let c = 0; c < GLYPH_COLS; c++) {
      if (rows[r][c] !== '#') continue;
      for (let dy = 0; dy < scale; dy++) {
        const y = oy + r * scale + dy;
        if (y < 0 || y >= BANNER_H) continue;
        for (let dx = 0; dx < scale; dx++) {
          const x = ox + c * scale + dx;
          if (x < 0 || x >= BANNER_W) continue;
          const i = y * BANNER_W + x;
          cells[i] = value;
          if (marks) mask[i] = 1;
        }
      }
    }
  }
};

/**
 * The plate.
 *
 * Layers land back to front; later layers overwrite earlier ones. The word is
 * drawn last of the coloured layers so the field can never eat it, and its
 * cells are recorded in `wordMask` so the scanline pass can leave them alone —
 * scanning the word would halve its contrast at exactly the size where it is
 * meant to be the loudest thing on the page.
 */
export const bannerArt = ({ slug, stream, keyword }) => {
  const rng = rngFor(slug);
  const cells = new Uint8Array(BANNER_W * BANNER_H).fill(GROUND);
  const wordMask = new Uint8Array(BANNER_W * BANNER_H);
  const [primary, secondary] = neonFor(rng);

  const word = bannerWord({ stream, keyword });
  const { scale, advance, x0, y0 } = layoutWord(word);
  for (let i = 0; i < word.length; i++) {
    const x = x0 + i * advance;
    // The fringe first, so the cream face sits on top of both offsets.
    stamp(cells, wordMask, word[i], x - scale, y0, scale, CYAN, true);
    stamp(cells, wordMask, word[i], x + scale, y0, scale, MAGENTA, true);
    stamp(cells, wordMask, word[i], x, y0, scale, CREAM, true);
  }

  return { width: BANNER_W, height: BANNER_H, palette: PALETTE, cells, wordMask, primary, secondary };
};
