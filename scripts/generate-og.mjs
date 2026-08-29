/**
 * Per-post OG card generation.
 *
 * Runs after `vite-react-ssg build` and writes one PNG per published post into
 * `dist/og/<stream>/<slug>.png`, matching the `image` path each layout hands to
 * `Seo`. Output goes to `dist/` rather than `public/` deliberately: these are
 * build artefacts, `dist/` is gitignored, and generated binaries do not belong
 * in the repo.
 *
 * The corpus is read through `lib/content.mjs`, which `generate-feeds.mjs`
 * shares — one frontmatter parser, so the cards and the feeds can never
 * disagree about which posts are published.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { collect, pathOf, root } from './lib/content.mjs';
import banners from '../src/generated/banners.json' with { type: 'json' };

const OUT = join(root, 'dist', 'og');
const FONTS = join(root, 'scripts', 'og-fonts');

const streamLabel = { wisdom: 'BUILDER WISDOM', dispatch: 'DISPATCH' };

const c = {
  ink: '#0a0a0a',
  plate: '#161616',
  accent: '#E4DED0',
  mark: '#C9A24B',
  bright: '#f2f2f2',
  dimOnInk: '#9a9a9a',
};

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

/**
 * The banner lookup, or a loud failure.
 *
 * A key mismatch (a stale `banners.json`, a post added after the last
 * `prebuild`) would otherwise render a blank top band with nothing in the
 * output to say why. Throwing here — naming the post — turns that into a
 * failure `node scripts/generate-og.mjs` cannot miss.
 */
const cardBanner = (post) => {
  const entry = banners[pathOf(post)];
  if (!entry) throw new Error(`og: no banner for ${pathOf(post)} — run \`node scripts/generate-banners.mjs\` first.`);
  return entry.card;
};

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
          src: cardBanner(post),
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
