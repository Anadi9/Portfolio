/**
 * Cover masters for posts nobody captured one for.
 *
 * The hand-made masters in `assets/covers/` are browser captures of a share
 * card: black ground, a boxed mono eyebrow top left, the headline burnt in
 * bottom left. This script composes the same frame, and where the captures have
 * artwork it sets the evidence instead: the lines of code, output or error the
 * post is about, from `cover-evidence.mjs`, with the one that matters in gold.
 * `generate-covers.mjs` then treats the result like any other master.
 *
 * It only ever writes a master that does not exist yet. A hand-made capture is
 * never overwritten; delete the generated PNG to regenerate one.
 *
 *     npm run covers:masters && npm run covers
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { collect, pathOf, root } from './lib/content.mjs';
import { evidence } from './cover-evidence.mjs';

const SRC = join(root, 'assets', 'covers');
const FONTS = join(root, 'scripts', 'fonts');

/** The size of the hand captures, so both kinds go through the same crop. */
const W = 2152;
const H = 1152;

/** Left margin and the eyebrow's box, measured off the existing masters. */
const MARGIN = 108;

// Kept in step with `streamLabel` in src/data/notes.ts.
const LABEL = { drops: 'DROPS', wisdom: 'WISDOM', dispatch: 'DISPATCH', fixes: 'FIXES' };

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const f = (n) => n.toFixed(1);

/**
 * The burnt-in headline is the title up to its colon. The page sets the whole
 * title underneath in real type; the cover only needs the hook.
 */
const headline = (title) => title.split(/:\s/)[0].trim();

/**
 * Greedy wrap on an estimated advance. Archivo ExtraBold averages a little
 * over half an em per character in mixed case; slightly generous so a line
 * never runs into the artwork.
 */
const wrap = (text, size, maxWidth) => {
  const perLine = Math.floor(maxWidth / (size * 0.56));
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/** Largest size that fits the headline in three lines, down to a floor. */
const fitHeadline = (text) => {
  for (let size = 112; size >= 80; size -= 4) {
    const lines = wrap(text, size, 1280);
    if (lines.length <= 3) return { size, lines };
  }
  return { size: 80, lines: wrap(text, 80, 1280) };
};

/* ---------------------------------------------------------------- frame -- */

const GROUND = '#0a0a0a';
const CREAM = '#E4DED0';
const GOLD = '#C9A24B';

/** The evidence block: mono, dim context, the line that matters in gold. */
const MONO = 50;
const MONO_LEAD = MONO * 1.5;
const INDENT = 40;

const compose = (post) => {
  const path = pathOf(post);
  const lines = evidence[path] ?? [];
  const { size, lines: head } = fitHeadline(headline(post.title));
  const lead = size * 1.02;
  const baseY = H - 92 - (head.length - 1) * lead;
  const headTop = baseY - size * 0.8;

  const stream = LABEL[post.dir] ?? post.dir.toUpperCase();
  const label = post.symptom ? `${stream} / ${post.symptom.toUpperCase()}` : stream;
  // JetBrains Mono advances 0.6em; the tracking follows every glyph but the last.
  const boxW = 44 + label.length * (24 * 0.6 + 4.5) - 4.5;

  // Centre the evidence in the space between the eyebrow and the headline.
  const blockH = lines.length * MONO_LEAD;
  const room = [145 + 60, headTop - 70];
  const firstY = room[0] + Math.max(0, (room[1] - room[0] - blockH) / 2) + MONO * 0.8;

  const code = lines.map((raw, k) => {
    const hot = raw.startsWith('!');
    const text = hot ? raw.slice(1) : raw;
    const y = firstY + k * MONO_LEAD;
    const bar = hot
      ? `<rect x="${MARGIN}" y="${f(y - MONO * 0.95)}" width="6" height="${f(MONO * 1.3)}" fill="${GOLD}"/>`
      : '';
    return (
      bar +
      `<text x="${MARGIN + INDENT}" y="${f(y)}" xml:space="preserve" fill="${hot ? GOLD : CREAM}"` +
      `${hot ? '' : ' fill-opacity="0.5"'}>${esc(text)}</text>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <rect x="${MARGIN}" y="89" width="${f(boxW)}" height="56" fill="none" stroke="#8a8a8a" stroke-width="2"/>
  <text x="${MARGIN + 22}" y="127" font-family="JetBrains Mono" font-weight="500" font-size="24" letter-spacing="4.5" fill="${CREAM}">${esc(label)}</text>
  <g font-family="JetBrains Mono" font-weight="500" font-size="${MONO}">${code.join('')}</g>
  <text font-family="Archivo" font-weight="800" font-size="${size}" letter-spacing="${f(-size * 0.02)}" fill="#ffffff">
    ${head.map((l, k) => `<tspan x="${MARGIN}" y="${f(baseY + k * lead)}">${esc(l)}</tspan>`).join('\n    ')}
  </text>
</svg>`;
};

let written = 0;
for (const post of collect()) {
  const master = join(SRC, post.dir, `${post.slug}.png`);
  if (existsSync(master)) continue;
  const svg = compose(post);
  const png = new Resvg(svg, {
    font: {
      fontFiles: [join(FONTS, 'Archivo-ExtraBold.ttf'), join(FONTS, 'JetBrainsMono-Medium.ttf')],
      loadSystemFonts: false,
      defaultFontFamily: 'Archivo',
    },
  })
    .render()
    .asPng();
  mkdirSync(join(SRC, post.dir), { recursive: true });
  writeFileSync(master, png);
  written += 1;
  console.log(`[masters] assets/covers${pathOf(post)}.png  ${(png.length / 1024).toFixed(0)}KB`);
}

console.log(`[masters] ${written} master${written === 1 ? '' : 's'} written.`);
