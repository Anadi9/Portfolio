/**
 * OG cards for shared Wrapper Test results, one per reachable score.
 *
 * Runs AFTER `vite-react-ssg build`, and writes into `dist/` rather than
 * `public/`, on the same terms as `generate-feeds.mjs`: these are build
 * artefacts derived from something already in the repo, and a generated file
 * committed alongside its source is a file that will eventually disagree with
 * it. Unlike the banners, nothing imports these — a card is fetched by a
 * crawler from a URL — so they do not have to exist before the prerender.
 *
 * Forty PNGs at 1200 × 630. The alternative, rendering a card per request from
 * a serverless function, would put a cold start between a crawler and the
 * image on a link's first share, which is the one moment it matters.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  CARD_COLS,
  CARD_ROWS,
  CELL,
  MAX_RAW,
  cardArt,
  reachableScores,
} from '../src/lib/teardown/share-card-art.mjs';
import { root } from './lib/content.mjs';

const OUT = join(root, 'dist', 'og', 'teardown');

/**
 * Cells to SVG, run-length encoded per row, the same trick
 * `generate-banners.mjs` uses: one rect per horizontal run rather than per
 * cell, which on a card this flat is an order of magnitude fewer nodes.
 *
 * The viewBox is in cells and the render is in pixels, so the integer upscale
 * happens in the rasteriser and every glyph edge lands on a whole pixel.
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

const scores = reachableScores(MAX_RAW);

mkdirSync(OUT, { recursive: true });

let total = 0;
for (const score of scores) {
  const svg = toSvg(cardArt(score));
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: CARD_COLS * CELL } }).render().asPng();
  writeFileSync(join(OUT, `${score}.png`), png);
  total += png.length;
}

console.log(
  `[share-cards] ${scores.length} cards at ${CARD_COLS * CELL} × ${CARD_ROWS * CELL}, ` +
    `${(total / 1024).toFixed(1)}KB total, ` +
    `${(total / scores.length / 1024).toFixed(1)}KB average.`,
);
