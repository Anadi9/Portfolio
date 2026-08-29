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
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { bannerArt, GROUND } from '../src/lib/banner-art.mjs';
import { collect, pathOf, root } from './lib/content.mjs';

const OUT = join(root, 'src', 'generated');

/** Width of the banner band across the top of an OG card. See generate-og.mjs. */
const CARD_BAND_W = 1176;

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
      if (v !== GROUND) {
        rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[v]}"/>`);
      }
      x += run;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">` +
    `<rect width="${width}" height="${height}" fill="${palette[GROUND]}"/>` +
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
  const path = pathOf(post);
  let art;
  try {
    art = bannerArt({ ...post, path });
  } catch (err) {
    throw new Error(`banner: ${path} — ${err.message}`);
  }
  const svg = toSvg(art);

  // Two rasterisations of the same vector SVG, not one bitmap scaled twice:
  // resvg drawing flat rects directly at each target width keeps hard pixel
  // edges and the six-colour palette at both sizes. Upscaling the 360-wide
  // page PNG for the card would resample it into ~5,000 interpolated colours,
  // which is what made the OG cards hundreds of KB apiece.
  const pagePng = new Resvg(svg, { fitTo: { mode: 'width', value: art.width } }).render().asPng();
  const cardPng = new Resvg(svg, { fitTo: { mode: 'width', value: CARD_BAND_W } }).render().asPng();
  const page = `data:image/png;base64,${pagePng.toString('base64')}`;
  const card = `data:image/png;base64,${cardPng.toString('base64')}`;
  banners[path] = { page, card };
  total += page.length + card.length;
  console.log(`[banners] ${path.padEnd(28)} page ${(page.length / 1024).toFixed(1)}KB, card ${(card.length / 1024).toFixed(1)}KB`);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'banners.json'), `${JSON.stringify(banners, null, 2)}\n`);
console.log(
  `[banners] ${posts.length} plate${posts.length === 1 ? '' : 's'}, ` +
    `${(total / 1024).toFixed(1)}KB total, ` +
    `${(total / posts.length / 1024).toFixed(1)}KB average.`,
);
