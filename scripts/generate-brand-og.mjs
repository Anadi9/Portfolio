/**
 * The main site's share card (`public/og-brand.png`, 1200 × 630): graph paper,
 * Bit pointing at the promise, in the Bit's Quest fonts. `Seo` uses it as the
 * default image on main-site pages; the portfolio keeps `/og.png`.
 * Run by hand when the promise or Bit changes; the PNG is committed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const W = 1200;
const H = 630;
const sprite = readFileSync('design/bits-quest/sprites/bit-pointing-at-his-checklist.svg', 'utf8');
const bit = [...sprite.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].map(([, d, fill]) => `<path d="${d}" fill="${fill}"/>`).join('');

const grid = [];
for (let x = 0; x <= W; x += 40) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`);
for (let y = 0; y <= H; y += 40) grid.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`);

const headline = (y, text) =>
  `<text x="70" y="${y + 6}" fill="#121212" font-family="Jersey 10" font-size="118">${text}</text>` +
  `<text x="64" y="${y}" fill="#d42e24" font-family="Jersey 10" font-size="118">${text}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <g stroke="#ededed" stroke-width="2">${grid.join('')}</g>
  <rect x="0" y="0" width="${W}" height="14" fill="#d42e24"/>
  <text x="64" y="96" fill="#121212" font-family="Press Start 2P" font-size="20">ANADI.THAKUR</text>
  ${headline(232, 'Your app,')}
  ${headline(340, 'made production-')}
  ${headline(448, 'ready.')}
  <text x="66" y="530" fill="#525252" font-family="Space Grotesk" font-size="30" font-weight="500">Fix it · Build with AI · Keep it running</text>
  <rect x="64" y="560" width="470" height="44" fill="#d42e24"/>
  <rect x="534" y="566" width="6" height="44" fill="#121212"/><rect x="70" y="604" width="470" height="6" fill="#121212"/>
  <text x="84" y="590" fill="#ffffff" font-family="Press Start 2P" font-size="15">FIRST BUG FREE · FIXED PRICES</text>
  <svg x="842" y="210" width="306" height="306" viewBox="0 0 18 18" shape-rendering="crispEdges">${bit}</svg>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    loadSystemFonts: false,
    fontFiles: ['scripts/fonts/Jersey10-Regular.ttf', 'scripts/fonts/PressStart2P-Regular.ttf', 'scripts/fonts/SpaceGrotesk[wght].ttf'],
    defaultFontFamily: 'Space Grotesk',
  },
})
  .render()
  .asPng();
writeFileSync('public/og-brand.png', png);
console.log(`[brand-og] public/og-brand.png ${W} × ${H}, ${(png.length / 1024).toFixed(1)}KB`);
