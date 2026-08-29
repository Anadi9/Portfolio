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
