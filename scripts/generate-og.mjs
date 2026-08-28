/**
 * Per-post OG card generation.
 *
 * Runs after `vite-react-ssg build` and writes one PNG per published post into
 * `dist/og/<stream>/<slug>.png`, matching the `image` path each layout hands to
 * `Seo`. Output goes to `dist/` rather than `public/` deliberately: these are
 * build artefacts, `dist/` is gitignored, and generated binaries do not belong
 * in the repo.
 *
 * The frontmatter is parsed here rather than imported from `src/content/index.ts`
 * because that module is a Vite module — `import.meta.glob` does not exist in
 * plain Node. Only flat scalar keys are read (`title`, `stream`, `date`,
 * `draft`), which is all a card needs and all the streams agree on.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(root, 'src', 'content');
const OUT = join(root, 'dist', 'og');
const FONTS = join(root, 'scripts', 'og-fonts');

// Kept in step with src/data/notes.ts. A stream added there without a line here
// throws below rather than silently shipping a post with no card.
const streamPath = { drop: 'drops', wisdom: 'wisdom', dispatch: 'dispatch' };
const streamLabel = { wisdom: 'BUILDER WISDOM', dispatch: 'DISPATCH' };

const c = {
  ink: '#0a0a0a',
  plate: '#161616',
  accent: '#E4DED0',
  mark: '#C9A24B',
  bright: '#f2f2f2',
  dimOnInk: '#9a9a9a',
};

/** The `---` block at the top of an MDX file, as flat scalars. */
const frontmatter = (src, file) => {
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

const collect = () => {
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

/**
 * `DROP 01` counts up in publication order, so the numeral on a card never
 * changes once it ships. Same (date, slug) comparator the feed uses, reversed —
 * the feed shows newest first, the numbering runs oldest first.
 */
const numbered = (posts) => {
  const drops = posts
    .filter((p) => p.stream === 'drop')
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : a.date.localeCompare(b.date)));
  const n = new Map(drops.map((p, i) => [p.slug, String(i + 1).padStart(2, '0')]));
  return posts.map((p) => ({
    ...p,
    eyebrow: p.stream === 'drop' ? `DROP ${n.get(p.slug)}` : streamLabel[p.stream],
  }));
};

/** Long titles get smaller type rather than a clipped card. */
const titleSize = (t) => (t.length <= 44 ? 70 : t.length <= 68 ? 58 : 48);

const card = (post) => ({
  type: 'div',
  props: {
    style: {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      background: c.ink,
      padding: '72px 80px',
      // The cream edge is the site's own signature; without it the card is just
      // white text on black and reads as anyone's.
      borderLeft: `24px solid ${c.accent}`,
    },
    children: [
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', gap: 20 },
          children: [
            {
              type: 'div',
              props: {
                style: {
                  fontFamily: 'JetBrains Mono',
                  fontSize: 22,
                  letterSpacing: 3,
                  color: c.ink,
                  background: c.mark,
                  padding: '8px 16px',
                },
                children: post.eyebrow,
              },
            },
            {
              type: 'div',
              props: {
                style: { fontFamily: 'JetBrains Mono', fontSize: 22, letterSpacing: 3, color: c.dimOnInk },
                children: 'ANADITHAKUR.IN/NOTES',
              },
            },
          ],
        },
      },
      {
        type: 'div',
        props: {
          style: {
            fontFamily: 'Archivo',
            fontWeight: 900,
            fontSize: titleSize(post.title),
            lineHeight: 1.08,
            letterSpacing: -1.5,
            color: c.bright,
            // Satori has no text-wrap heuristics beyond the box, so the cap is
            // what keeps a long title off the footer rule.
            maxWidth: 980,
            display: 'flex',
          },
          children: post.title,
        },
      },
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `2px solid ${c.plate}`,
            paddingTop: 28,
          },
          children: [
            {
              type: 'div',
              props: {
                style: { fontFamily: 'Archivo', fontWeight: 700, fontSize: 26, color: c.accent },
                children: 'Anadi Thakur',
              },
            },
            {
              type: 'div',
              props: {
                style: { fontFamily: 'JetBrains Mono', fontSize: 20, letterSpacing: 2, color: c.dimOnInk },
                children: '@the.anadi',
              },
            },
          ],
        },
      },
    ],
  },
});

const fonts = [
  { name: 'Archivo', weight: 700, style: 'normal', data: readFileSync(join(FONTS, 'archivo-700.ttf')) },
  { name: 'Archivo', weight: 900, style: 'normal', data: readFileSync(join(FONTS, 'archivo-900.ttf')) },
  { name: 'JetBrains Mono', weight: 500, style: 'normal', data: readFileSync(join(FONTS, 'jetbrainsmono-500.ttf')) },
];

const posts = numbered(collect());
if (!posts.length) {
  console.log('[og] no published posts — nothing to render.');
  process.exit(0);
}

for (const post of posts) {
  const svg = await satori(card(post), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  const dir = join(OUT, post.dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${post.slug}.png`), png);
  console.log(`[og] dist/og/${post.dir}/${post.slug}.png  ${post.eyebrow} — ${post.title}`);
}
console.log(`[og] ${posts.length} card${posts.length === 1 ? '' : 's'} rendered.`);
