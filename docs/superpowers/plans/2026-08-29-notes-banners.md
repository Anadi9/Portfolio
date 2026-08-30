# Notes Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every notes post a generated neon pixel banner, produced once at
build time from its slug and consumed by both the page header and the OG card.

**Architecture:** A pure art module computes a 360 × 60 indexed cell grid from
an FNV-1a hash of the slug. A prebuild script rasterises each grid to a PNG
with the `@resvg/resvg-js` dependency the OG cards already use, and writes a
`slug → data URI` map that both `Banner.tsx` and `generate-og.mjs` read. Nothing
is fetched at runtime and nothing is drawn by hand.

**Tech Stack:** Node ESM scripts, `@resvg/resvg-js` (existing devDependency),
Vite + `vite-react-ssg`, React 18, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-notes-banners-design.md`

## Global Constraints

- **Grid is exactly 360 × 60 cells.** 6:1, matching the plate's proportion.
- **Palette is exactly these six, in this index order:** `0` ground `#0a0a0a`,
  `1` cream `#E4DED0`, `2` gold `#C9A24B`, `3` magenta `#FF2E88`, `4` cyan
  `#2EE6FF`, `5` lime `#B8FF2E`.
- **`#0E7A45` and `#35D48A` must never appear.** Those are `c.signal` /
  `c.signalOnInk`, reserved for status. See spec §4.1.
- **Exactly two of the three neon indices (3, 4, 5) per banner's field.** Never
  three. The word's chromatic fringe is always cyan + magenta and sits outside
  this rule — it imitates a misconverged screen, which has fixed colours.
- **Neon appears nowhere outside the banner frame.** No neon in `notes.css`
  outside `.pf-banner`, none in `tokens.ts`, none in any component.
- **No new npm dependency.** `@resvg/resvg-js` and `satori` are already
  devDependencies; nothing else may be added.
- **Deterministic.** Same slug ⇒ byte-identical output, forever.
- **Static.** No animation anywhere in this feature.
- **One word per stream:** `drop` → its `keyword`, `wisdom` → `WISDOM`,
  `dispatch` → `DISPATCH`. Unknown stream throws.
- Vitest only collects `src/**/*.test.ts` (see `vitest.config.ts`). Tests for
  the art module therefore live in `src/`, not `scripts/`.
- Follow the existing precedent of `src/lib/remark-post-data.mjs` +
  `src/lib/remark-post-data.test.ts`: a plain `.mjs` module in `src/lib/`
  imported directly from a `.ts` test. No `.d.ts` is needed.

---

## File Structure

**Create:**

- `src/lib/banner-art.mjs` — the whole art system, pure. Hash, PRNG, palette
  selection, 5 × 7 bitmap font, word rule, and the five compositing layers.
  Returns a cell array. No filesystem, no rasteriser, no React. This is the
  only file that knows what a banner looks like.
- `src/lib/banner-art.test.ts` — unit tests for the above.
- `scripts/post-files.mjs` — the frontmatter parser and content walker,
  extracted from `generate-og.mjs` so the banner generator does not fork a
  second copy.
- `scripts/generate-banners.mjs` — I/O only. Walks posts, calls `bannerArt`,
  turns cells into an SVG, rasterises, base64s, writes the map.
- `src/components/notes/Banner.tsx` — the `<img>` and nothing else.
- `src/generated/banners.json` — build artefact, gitignored.

**Modify:**

- `scripts/generate-og.mjs` — import the shared parser; add the top band.
- `scripts/check-notes.mjs` — built-output assertions.
- `src/components/notes/PostHeader.tsx` — render `<Banner>`.
- `src/styles/notes.css` — `.pf-banner`.
- `package.json` — `predev` / `prebuild` steps.
- `tsconfig.app.json` — `resolveJsonModule`.
- `.gitignore` — `src/generated/`.

---

### Task 1: Share the frontmatter parser between generators

`generate-og.mjs` owns a frontmatter parser and a content walker. The banner
generator needs both. Extract before adding a second consumer, so there is
never a moment where two copies exist.

**Files:**
- Create: `scripts/post-files.mjs`
- Modify: `scripts/generate-og.mjs:39-68` (the `frontmatter` and `collect`
  functions and the constants they use)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `frontmatter(src: string, file: string): Record<string, string|boolean>`
  - `collect(): { slug: string, dir: string, [k: string]: any }[]` — every
    non-draft post, with `slug` and `dir` (the content subdirectory, e.g.
    `drops`) added to its frontmatter fields.
  - `streamPath: Record<string, string>` — `{ drop: 'drops', wisdom: 'wisdom', dispatch: 'dispatch' }`

- [ ] **Step 1: Create the shared module**

Create `scripts/post-files.mjs`:

```js
/**
 * Frontmatter reading for the build-time generators.
 *
 * Lives here rather than in `src/content/index.ts` because these scripts run in
 * plain Node, where `import.meta.glob` does not exist — the same reason
 * `generate-og.mjs` has always parsed frontmatter itself. It is shared between
 * the OG cards and the banners so the two cannot disagree about which posts
 * exist.
 *
 * Only flat scalar keys are read. Lists and continuation lines are skipped:
 * no generator needs them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(root, 'src', 'content');

// Kept in step with src/data/notes.ts. A stream added there without a line here
// throws below rather than silently shipping a post with no card.
export const streamPath = { drop: 'drops', wisdom: 'wisdom', dispatch: 'dispatch' };

/** The `---` block at the top of an MDX file, as flat scalars. */
export const frontmatter = (src, file) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) throw new Error(`${file}: no frontmatter block.`);
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) continue; // list items and continuation lines — not needed here
    let v = kv[2].trim();
    if (/^"(.*)"$/.test(v) || /^'(.*)'$/.test(v)) v = v.slice(1, -1);
    fm[kv[1]] = v === 'true' ? true : v === 'false' ? false : v;
  }
  return fm;
};

/** Every published post, newest-agnostic, with `slug` and `dir` attached. */
export const collect = () => {
  const posts = [];
  for (const dir of readdirSync(CONTENT, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of readdirSync(join(CONTENT, dir.name))) {
      if (!name.endsWith('.mdx')) continue;
      const file = join(CONTENT, dir.name, name);
      const fm = frontmatter(readFileSync(file, 'utf8'), file);
      if (fm.draft === true) continue;
      if (!streamPath[fm.stream]) throw new Error(`${file}: unknown stream \`${fm.stream}\`.`);
      posts.push({ ...fm, slug: name.replace(/\.mdx$/, ''), dir: dir.name });
    }
  }
  return posts;
};

/** The post's URL path, and the key both generators index banners by. */
export const pathOf = (post) => `/${post.dir}/${post.slug}`;
```

- [ ] **Step 2: Delete the duplicates from the OG script**

In `scripts/generate-og.mjs`, remove the local `frontmatter`, `collect`,
`streamPath` and the now-unused `CONTENT` constant and `readdirSync` import,
and import them instead. The file keeps `numbered`, `titleSize`, `card`, the
fonts and the render loop.

Add near the top, after the existing imports:

```js
import { collect } from './post-files.mjs';
```

Adjust the remaining `readFileSync`/`readdirSync` import so only what is still
used is imported:

```js
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
```

- [ ] **Step 3: Verify the OG cards are unchanged**

Run:

```bash
npm run build && ls dist/og/drops dist/og/wisdom dist/og/dispatch
```

Expected: the build succeeds and `[og] 12 cards rendered.` appears, with the
same twelve PNGs as before.

- [ ] **Step 4: Commit**

```bash
git add scripts/post-files.mjs scripts/generate-og.mjs
git commit -m "refactor: share the frontmatter parser between generators"
```

---

### Task 2: Seed, palette and word rule

The deterministic core, with no drawing yet. Everything downstream is a pure
function of these three.

**Files:**
- Create: `src/lib/banner-art.mjs`
- Test: `src/lib/banner-art.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BANNER_W = 360`, `BANNER_H = 60`
  - `PALETTE: string[]` — six hex strings, index order per Global Constraints
  - `GROUND = 0, CREAM = 1, GOLD = 2, MAGENTA = 3, CYAN = 4, LIME = 5`
  - `rngFor(slug: string): () => number` — mulberry32 seeded by FNV-1a
  - `bannerWord(post: { stream: string, keyword?: string }): string`
  - `neonFor(rng: () => number): [number, number]` — `[primary, secondary]`,
    two distinct indices drawn from `[3, 4, 5]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/banner-art.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: FAIL — cannot resolve `./banner-art.mjs`.

- [ ] **Step 3: Write the module**

Create `src/lib/banner-art.mjs`:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/banner-art.mjs src/lib/banner-art.test.ts
git commit -m "feat: seeded palette and word rule for post banners"
```

---

### Task 3: The bitmap font and the word layer

**Files:**
- Modify: `src/lib/banner-art.mjs`
- Test: `src/lib/banner-art.test.ts`

**Interfaces:**
- Consumes: `BANNER_W`, `BANNER_H`, `CREAM`, `CYAN`, `MAGENTA`, `GROUND`,
  `bannerWord`, `rngFor` from Task 2.
- Produces:
  - `FONT: Record<string, string[]>` — 26 entries `A`–`Z`, each 7 strings of 5
    characters using `#` and `.`
  - `layoutWord(word: string): { scale: number, advance: number, glyphW: number, glyphH: number, x0: number, y0: number }`
  - `bannerArt(post: { slug, stream, keyword? }): { width, height, palette: string[], cells: Uint8Array, wordMask: Uint8Array, primary: number, secondary: number }`
    — at this task, `cells` carries only the ground and the word; the field
    layers land in Task 4. `wordMask` marks cells the word owns, so Task 4's
    scanlines can skip them.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/banner-art.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: FAIL — `FONT`, `layoutWord` and `bannerArt` are not exported.

- [ ] **Step 3: Add the font, the layout and the word layer**

Append to `src/lib/banner-art.mjs`:

```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: PASS. If `layoutWord` collision or overspan assertions fail, the
constants `CAP` / `OVERSPAN` are wrong — do not weaken the test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/banner-art.mjs src/lib/banner-art.test.ts
git commit -m "feat: bitmap font and word layer for post banners"
```

---

### Task 4: The field layers

Dither ground, wireframe, glitch, scanlines. This completes `bannerArt`.

**Files:**
- Modify: `src/lib/banner-art.mjs`
- Test: `src/lib/banner-art.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 and 3.
- Produces: no new exports. `bannerArt`'s return shape is unchanged; `cells`
  now carries all five layers.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/banner-art.test.ts`:

```ts
import { GOLD, LIME } from './banner-art.mjs';

const ALL = [
  { slug: 'automate', stream: 'drop', keyword: 'AUTOMATE' },
  { slug: 'cheatsheet', stream: 'drop', keyword: 'CHEATSHEET' },
  { slug: 'swipe', stream: 'drop', keyword: 'SWIPE' },
  { slug: 'system', stream: 'drop', keyword: 'SYSTEM' },
  { slug: 'workflow', stream: 'drop', keyword: 'WORKFLOW' },
  { slug: 'prompts', stream: 'drop', keyword: 'PROMPTS' },
  { slug: 'ai-wrapper-tell', stream: 'wisdom' },
  { slug: 'bolt-on-ai-mistake', stream: 'wisdom' },
];

describe('banner-art — field layers', () => {
  it('gives the field two distinct neon hues, never three', () => {
    for (const post of ALL) {
      const { primary, secondary } = bannerArt(post);
      expect([MAGENTA, CYAN, LIME], post.slug).toContain(primary);
      expect([MAGENTA, CYAN, LIME], post.slug).toContain(secondary);
      expect(primary, post.slug).not.toBe(secondary);
    }
  });

  it('lets the field use only its own two hues', () => {
    for (const post of ALL) {
      // Erase the word, fringe included, and whatever neon is left is the
      // field's. The third hue must not appear there.
      const { cells, wordMask, primary, secondary } = bannerArt(post);
      const field = new Set();
      for (let i = 0; i < cells.length; i++) if (!wordMask[i]) field.add(cells[i]);
      const stray = [MAGENTA, CYAN, LIME].filter((v) => field.has(v) && v !== primary && v !== secondary);
      expect(stray, post.slug).toEqual([]);
    }
  });

  it('draws the gold horizon on every plate', () => {
    for (const post of ALL) {
      expect(bannerArt(post).cells.includes(GOLD), post.slug).toBe(true);
    }
  });

  it('fills the plate rather than leaving it mostly bare', () => {
    for (const post of ALL) {
      const cells = bannerArt(post).cells;
      const lit = cells.reduce((n, v) => n + (v === GROUND ? 0 : 1), 0);
      expect(lit / cells.length, post.slug).toBeGreaterThan(0.15);
      expect(lit / cells.length, post.slug).toBeLessThan(0.75);
    }
  });

  it('leaves the word unscanned', () => {
    const { cells, wordMask } = bannerArt(ALL[0]);
    let masked = 0;
    for (let i = 0; i < cells.length; i++) {
      if (wordMask[i]) {
        masked++;
        expect(cells[i]).not.toBe(GROUND);
      }
    }
    expect(masked).toBeGreaterThan(200);
  });

  it('stays deterministic with every layer applied', () => {
    for (const post of ALL) {
      expect(Array.from(bannerArt(post).cells)).toEqual(Array.from(bannerArt(post).cells));
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: FAIL — "draws the gold horizon" (no gold is drawn yet) and
"fills the plate" (coverage is far below 0.15).

- [ ] **Step 3: Implement the four field layers**

In `src/lib/banner-art.mjs`, add these above `bannerArt`:

```js
/** Ordered 4 × 4 Bayer threshold matrix, values 0–15. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Layer 1 — the ground.
 *
 * An ordered dither ramp, densest at the left and thinning to the right. The
 * direction is not decorative: the word runs off the right edge, and the tail
 * of it is where it is largest and most easily lost, so the field gets out of
 * its way exactly there.
 */
const dither = (cells, primary) => {
  for (let y = 0; y < BANNER_H; y++) {
    for (let x = 0; x < BANNER_W; x++) {
      const t = 1 - x / (BANNER_W - 1);
      if (t * 0.62 * 16 > BAYER[y % 4][x % 4]) cells[y * BANNER_W + x] = primary;
    }
  }
};

/**
 * Layer 2 — the wireframe.
 *
 * A horizon with a hash-placed vanishing point, floor lines converging on it,
 * and receding horizontals spaced quadratically so they crowd toward the
 * horizon the way perspective actually behaves. The horizon itself is gold:
 * the one place the site's own accent appears inside the plate.
 */
const wireframe = (cells, rng, secondary) => {
  const vx = Math.floor(BANNER_W * (0.3 + rng() * 0.4));
  const vy = Math.floor(BANNER_H * 0.42);

  for (let x = 0; x < BANNER_W; x++) cells[vy * BANNER_W + x] = GOLD;

  for (let k = 0; k <= 12; k++) {
    const x1 = Math.round((k / 12) * (BANNER_W - 1));
    const y1 = BANNER_H - 1;
    const steps = y1 - vy;
    for (let s = 1; s <= steps; s++) {
      const y = vy + s;
      const x = Math.round(vx + ((x1 - vx) * s) / steps);
      if (x >= 0 && x < BANNER_W) cells[y * BANNER_W + x] = secondary;
    }
  }

  for (let i = 1; i <= 6; i++) {
    const y = vy + Math.round((BANNER_H - 1 - vy) * (i / 6) ** 2);
    if (y <= vy || y >= BANNER_H) continue;
    for (let x = 0; x < BANNER_W; x++) cells[y * BANNER_W + x] = secondary;
  }
};

/**
 * Layer 5a — glitch.
 *
 * Two or three horizontal bands shifted sideways. Cells shifted in from beyond
 * the edge become ground rather than wrapping: a wrap reads as a deliberate
 * tile, and the point is a torn signal.
 */
const glitch = (cells, mask, rng) => {
  const bands = 2 + Math.floor(rng() * 2);
  for (let b = 0; b < bands; b++) {
    const by = Math.floor(rng() * BANNER_H);
    const bh = 2 + Math.floor(rng() * 4);
    const dx = Math.round((rng() * 2 - 1) * 18);
    if (dx === 0) continue;
    for (let y = by; y < Math.min(by + bh, BANNER_H); y++) {
      const row = cells.slice(y * BANNER_W, (y + 1) * BANNER_W);
      const rowMask = mask.slice(y * BANNER_W, (y + 1) * BANNER_W);
      for (let x = 0; x < BANNER_W; x++) {
        const src = x - dx;
        const i = y * BANNER_W + x;
        cells[i] = src >= 0 && src < BANNER_W ? row[src] : GROUND;
        mask[i] = src >= 0 && src < BANNER_W ? rowMask[src] : 0;
      }
    }
  }
};

/**
 * Layer 5b — scanlines.
 *
 * Every second row goes dark, except where the word owns the cell. Scanning the
 * word would halve its contrast at exactly the size where it is supposed to be
 * the loudest thing on the page.
 */
const scanlines = (cells, mask) => {
  for (let y = 1; y < BANNER_H; y += 2) {
    for (let x = 0; x < BANNER_W; x++) {
      const i = y * BANNER_W + x;
      if (!mask[i]) cells[i] = GROUND;
    }
  }
};
```

Then rewrite the body of `bannerArt` so the layers run in order. Replace the
existing body between the `const [primary, secondary] = neonFor(rng);` line and
the `return`:

```js
  dither(cells, primary);
  wireframe(cells, rng, secondary);

  const word = bannerWord({ stream, keyword });
  const { scale, advance, x0, y0 } = layoutWord(word);
  for (let i = 0; i < word.length; i++) {
    const x = x0 + i * advance;
    // The fringe first, so the cream face sits on top of both offsets.
    stamp(cells, wordMask, word[i], x - scale, y0, scale, CYAN, true);
    stamp(cells, wordMask, word[i], x + scale, y0, scale, MAGENTA, true);
    stamp(cells, wordMask, word[i], x, y0, scale, CREAM, true);
  }

  glitch(cells, wordMask, rng);
  scanlines(cells, wordMask);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/banner-art.test.ts`
Expected: PASS, all suites.

If "fills the plate" fails low, raise the `0.62` in `dither`; if it fails high,
lower it. Do not change the assertion bounds — they encode "a plate that is
neither bare nor a solid block", which is the actual requirement.

- [ ] **Step 5: Commit**

```bash
git add src/lib/banner-art.mjs src/lib/banner-art.test.ts
git commit -m "feat: dither, wireframe, glitch and scanline layers"
```

---

### Task 5: Generate the PNGs and wire up the build

**Files:**
- Create: `scripts/generate-banners.mjs`
- Modify: `package.json:6-15`, `.gitignore`, `tsconfig.app.json`

**Interfaces:**
- Consumes: `bannerArt`, `PALETTE` from `src/lib/banner-art.mjs`; `collect`,
  `pathOf` from `scripts/post-files.mjs`.
- Produces: `src/generated/banners.json` — `Record<string, string>` keyed by
  the post's URL path (`/drops/automate`), valued with a
  `data:image/png;base64,…` URI. Read by Task 6 and Task 7.

- [ ] **Step 1: Write the generator**

Create `scripts/generate-banners.mjs`:

```js
/**
 * Per-post banner generation.
 *
 * Runs BEFORE `vite-react-ssg build`, unlike `generate-og.mjs` which runs
 * after. That ordering is forced: `Banner.tsx` imports the output, so it has to
 * exist before anything is prerendered. `npm run dev` gets it through `predev`
 * for the same reason.
 *
 * Output is a JSON map of data URIs rather than files in `public/`. Inlining
 * costs a couple of KB per page and buys back a network request for an image
 * that sits above the fold, where a late arrival is a visible pop.
 *
 * The art itself lives in `src/lib/banner-art.mjs` and is deliberately pure —
 * this file only knows about the filesystem, the rasteriser and base64.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { bannerArt } from '../src/lib/banner-art.mjs';
import { collect, pathOf } from './post-files.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src', 'generated');

/**
 * Cells to SVG, run-length encoded per row.
 *
 * One rect per horizontal run rather than one per cell: a 360 × 60 plate is
 * 21,600 cells, and the dither and scanlines produce long runs, so this is
 * roughly an order of magnitude fewer nodes for the rasteriser to walk. The SVG
 * is never shipped — it exists only long enough to become a PNG.
 */
const toSvg = ({ width, height, palette, cells }) => {
  const rects = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      const v = cells[y * width + x];
      let run = 1;
      while (x + run < width && cells[y * width + x + run] === v) run++;
      if (v !== 0) {
        rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[v]}"/>`);
      }
      x += run;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
    `<rect width="${width}" height="${height}" fill="${palette[0]}"/>` +
    rects.join('') +
    `</svg>`
  );
};

const posts = collect();
if (!posts.length) {
  console.log('[banners] no published posts — nothing to render.');
  process.exit(0);
}

const banners = {};
let total = 0;
for (const post of posts) {
  const art = bannerArt(post);
  const svg = toSvg(art);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: art.width } }).render().asPng();
  const uri = `data:image/png;base64,${png.toString('base64')}`;
  banners[pathOf(post)] = uri;
  total += uri.length;
  console.log(`[banners] ${pathOf(post).padEnd(28)} ${(uri.length / 1024).toFixed(1)}KB`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'banners.json'), `${JSON.stringify(banners, null, 2)}\n`);
console.log(
  `[banners] ${posts.length} plate${posts.length === 1 ? '' : 's'}, ` +
    `${(total / 1024).toFixed(1)}KB total, ` +
    `${(total / posts.length / 1024).toFixed(1)}KB average.`,
);
```

- [ ] **Step 2: Run it and read the sizes**

Run: `node scripts/generate-banners.mjs`
Expected: twelve lines and a total. **Note the average.** If any single plate
exceeds 8KB, the spec's budget (§8.8) is breached — reduce `BANNER_W`/`BANNER_H`
proportionally (keeping 6:1) rather than weakening the check in Task 8.

- [ ] **Step 3: Look at one**

Run:

```bash
node -e "const b=require('./src/generated/banners.json');require('fs').writeFileSync('/tmp/banner.png',Buffer.from(b['/drops/automate'].split(',')[1],'base64'))" && open /tmp/banner.png
```

Expected: a neon plate with `AUTOMATE` running off the right edge, a gold
horizon, converging floor lines and scanlines. **If it does not look right,
stop and report before continuing** — every later task assumes this image is
good.

- [ ] **Step 4: Wire the build**

In `package.json`, add `predev` and `prebuild` and leave `build` itself alone
(npm runs `pre*` automatically for `npm run <name>`):

```json
    "predev": "node scripts/generate-banners.mjs",
    "dev": "vite-react-ssg dev",
    "prebuild": "node scripts/generate-banners.mjs",
    "build": "vite-react-ssg build && node scripts/generate-og.mjs && node scripts/generate-feeds.mjs",
    "prebuild:dev": "node scripts/generate-banners.mjs",
    "build:dev": "vite-react-ssg build --mode development && node scripts/generate-og.mjs && node scripts/generate-feeds.mjs",
```

In `.gitignore`, after the `dist` line:

```
src/generated
```

In `tsconfig.app.json`, inside `compilerOptions`, after `"isolatedModules": true,`:

```json
    "resolveJsonModule": true,
```

- [ ] **Step 5: Verify the build runs the step**

Run: `npm run build`
Expected: `[banners] …` lines appear **before** the Vite build output, then the
OG and feed steps as usual.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-banners.mjs package.json .gitignore tsconfig.app.json
git commit -m "feat: generate banner plates before the build"
```

---

### Task 6: Render the banner in the post header

**Files:**
- Create: `src/components/notes/Banner.tsx`
- Modify: `src/components/notes/PostHeader.tsx:21-25`, `src/styles/notes.css`

**Interfaces:**
- Consumes: `src/generated/banners.json` from Task 5; the existing `.pf-bleed`
  class from the frame spec; `Post` from `@/data/notes`.
- Produces: `<Banner post={post} />`, rendering
  `<div class="pf-banner pf-bleed"><img …/></div>` or nothing.

- [ ] **Step 1: Write the component**

Create `src/components/notes/Banner.tsx`:

```tsx
import banners from '@/generated/banners.json';
import type { Post } from '@/data/notes';

/**
 * The plate above the title.
 *
 * A neon pixel field cannot be the page's background without fighting the
 * paper, so it is framed as an object sitting *in* the page — a screen embedded
 * in a document. The cream edge is what does that framing, and it is the same
 * cream edge the OG card has always used.
 *
 * The image is a data URI baked in at build time, not a file: it is above the
 * fold, and a banner that arrives late is a visible pop. `alt=""` because it is
 * decoration — the word on the plate repeats what the eyebrow and the H1
 * already say, and announcing "AUTOMATE" before the title is noise.
 *
 * Renders nothing for a post with no plate rather than a broken image. A
 * genuinely missing banner is caught by `scripts/check-notes.mjs`, which is the
 * right place for it: a silent gap in dev is survivable, a shipped gap is not.
 */
const Banner = ({ post }: { post: Post }) => {
  const src = (banners as Record<string, string>)[post.path];
  if (!src) return null;

  return (
    <div className="pf-banner pf-bleed">
      <img src={src} alt="" aria-hidden="true" width={360} height={60} />
    </div>
  );
};

export default Banner;
```

- [ ] **Step 2: Add the styles**

Append to `src/styles/notes.css`:

```css
/* The banner plate.
   `image-rendering: pixelated` is the whole technique: the source is a 360x60
   PNG and the browser must replicate its pixels rather than smooth them, or the
   art becomes a blurry gradient at the size it actually renders.
   `object-position: left` so that what gets cropped is the tail of the word,
   which is the part designed to be cropped, at every viewport width.
   This is the ONLY place neon appears on this site — see the banners spec. */
.pf-banner {
  height: clamp(96px, 14vw, 200px);
  margin-bottom: 40px;
  overflow: hidden;
  background: #0a0a0a;
  border: 1px solid #e4ded0;
  border-left-width: 24px;
}

.pf-banner img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: left center;
  image-rendering: pixelated;
}

/* A neon plate on paper is a solid block of toner and tells the reader
   nothing. */
@media print {
  .pf-banner {
    display: none;
  }
}
```

- [ ] **Step 3: Render it**

In `src/components/notes/PostHeader.tsx`, add the import:

```tsx
import Banner from './Banner';
```

and make it the first child of the `<header>`, immediately before the existing
eyebrow `<div>`:

```tsx
  <header style={{ marginBottom: s[9] }}>
    <Banner post={post} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[4], alignItems: 'center', marginBottom: s[6] }}>
```

- [ ] **Step 4: Look at it**

Run: `npm run dev` and open `http://localhost:5173/drops/automate`.

Expected: the plate spans the measure plus the bleed track, pixels are square
and hard-edged, the word runs off the right edge, and the H1 sits below it
unchanged. Check `/wisdom/ai-wrapper-tell` shows `WISDOM`.

- [ ] **Step 5: Check the widths**

In the browser, at 1600, 1280, 1024 and 375: the plate never causes horizontal
page scroll, the pixels stay square (never stretched), and below 1200 the plate
is content-width because `--bleed` collapses.

- [ ] **Step 6: Commit**

```bash
git add src/components/notes/Banner.tsx src/components/notes/PostHeader.tsx src/styles/notes.css
git commit -m "feat: neon pixel banner above every post title"
```

---

### Task 7: The banner band on the OG card

**Files:**
- Modify: `scripts/generate-og.mjs` — the `card()` function and the `OUT`/import
  block

**Interfaces:**
- Consumes: `src/generated/banners.json` from Task 5.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Read the map**

In `scripts/generate-og.mjs`, add near the other imports:

```js
import banners from '../src/generated/banners.json' with { type: 'json' };
```

- [ ] **Step 2: Restructure the card**

The card is currently a single padded column. It becomes an unpadded outer
column holding the band and a padded inner column holding what was there
before. Replace the outer `props.style` object and wrap the existing children.

The banner is 360 × 60 — exactly 6:1 — and the band is 1200 × 200, also exactly
6:1, so the artwork is placed at its native proportion and never distorted.

```js
const card = (post) => ({
  type: 'div',
  props: {
    style: {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      background: c.ink,
      // The cream edge is the site's own signature; without it the card is just
      // white text on black and reads as anyone's.
      borderLeft: `24px solid ${c.accent}`,
    },
    children: [
      {
        type: 'img',
        props: {
          src: banners[`/${post.dir}/${post.slug}`],
          width: 1176,
          height: 196,
          style: { display: 'flex' },
        },
      },
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexGrow: 1,
            padding: '56px 80px 72px',
          },
          children: [
            /* the existing eyebrow+title block and the existing footer block,
               moved here unchanged */
          ],
        },
      },
    ],
  },
});
```

Move the two existing children of the old outer div — the eyebrow/title block
and the `Anadi Thakur` / `@the.anadi` footer block — into the inner `children`
array verbatim. Nothing about their content changes.

- [ ] **Step 3: Render and look**

Run:

```bash
npm run build && open dist/og/drops/automate.png
```

Expected: 1200 × 630, neon band across the top, eyebrow chip and title on ink
below, cream left edge intact. The title must still be the most legible thing
on the card — if the band is fighting it, reduce the band height to 160 rather
than dimming the artwork.

- [ ] **Step 4: Check every card rendered**

Run: `ls dist/og/drops dist/og/wisdom dist/og/dispatch | wc -l`
Expected: twelve PNGs plus the three directory headers.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-og.mjs
git commit -m "feat: banner band across the top of every OG card"
```

---

### Task 8: Assert the guarantees against the built HTML

**Files:**
- Modify: `scripts/check-notes.mjs` — add a block before the "No scroll engine"
  section

**Interfaces:**
- Consumes: `dist/` from a full build.
- Produces: nothing.

- [ ] **Step 1: Add the assertions**

In `scripts/check-notes.mjs`, inside the existing `for (const page of pages)`
loop that already checks the rail and the anchors, add:

```js
  // The plate is in the prerendered HTML and inlined, not fetched. An image
  // above the fold that arrives over the network arrives late.
  check(`${page}: no banner in the prerendered HTML`, html.includes('class="pf-banner'));
  const banner = /<img[^>]+src="(data:image\/png;base64,[^"]+)"/.exec(html);
  check(`${page}: banner is not an inlined PNG data URI`, banner !== null);
  if (banner) {
    const kb = banner[1].length / 1024;
    check(`${page}: banner is ${kb.toFixed(1)}KB, over the 8KB budget`, kb < 8);
  }

  // Nothing new is fetched. `og:image` is a meta tag, not a request the page
  // makes, so any `<img src>` that is not a data URI would be a regression.
  const fetched = [...html.matchAll(/<img[^>]+src="(?!data:)([^"]+)"/g)];
  check(`${page}: banner work added ${fetched.length} fetched image(s)`, fetched.length === 0);
```

- [ ] **Step 2: Run the check**

Run: `npm run build && npm run check`
Expected: `check-notes: OK — 12 pages, N rail anchors, none dead`, with no
failures.

- [ ] **Step 3: Prove the check can fail**

Temporarily comment out `<Banner post={post} />` in `PostHeader.tsx`, then:

Run: `npm run build && npm run check`
Expected: FAIL with twelve `no banner in the prerendered HTML` lines. Restore
the line and re-run to confirm OK. A check that cannot fail is not a check.

- [ ] **Step 4: Confirm no neon leaked**

Run:

```bash
grep -rniE '#FF2E88|#2EE6FF|#B8FF2E' src/ --include='*.ts' --include='*.tsx' --include='*.css' | grep -v 'banner-art.mjs'
```

Expected: only the `.pf-banner` block in `src/styles/notes.css`. Anything else
is neon leaking into the document's own chrome, which the spec's §3 forbids.

Run:

```bash
grep -rn '0E7A45\|35D48A' src/lib/banner-art.mjs
```

Expected: no output.

- [ ] **Step 5: Confirm the chunk is still clean**

The check script already asserts no GSAP and no Lenis in the notes chunks, and
Step 2 ran it. Additionally report the size delta:

```bash
du -sh dist/assets/*.js | sort -h | tail -5
```

Record the numbers in the commit message so the cost of this feature is on the
record.

- [ ] **Step 6: Full verification pass**

- [ ] `npm test` — all suites pass
- [ ] `npm run lint` — clean
- [ ] `npm run build && npm run check` — clean
- [ ] Rendered at 1600 / 1280 / 1024 / 768 / 375: no horizontal page scroll, the
      word clipped at the right edge at every width, pixels square
- [ ] Tab through a post: focus order is unchanged, the banner is not focusable
- [ ] Print preview of `/drops/automate`: no plate
- [ ] `/wisdom/*` shows `WISDOM`, `/dispatch/*` shows `DISPATCH`, each drop
      shows its own keyword

- [ ] **Step 7: Commit**

```bash
git add scripts/check-notes.mjs
git commit -m "chore: assert the banner guarantees against the built HTML"
```

---

## Notes for the executor

- **The art is the risky part, not the plumbing.** Task 5 Step 3 is a hard gate:
  if the rendered plate does not look like a neon pixel screen, stop and report
  rather than continuing to wire it into three consumers.
- **Never weaken a test to make it pass.** The bounds in Task 4 encode design
  requirements ("neither bare nor a solid block"); the constants above them are
  what is meant to move.
- **`src/generated/` is gitignored.** A fresh clone has no `banners.json`, which
  is why `predev` exists. If `npm run dev` fails on a missing import, that step
  did not run.
