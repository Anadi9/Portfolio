/**
 * Bit favicons for the main site (`public/brand/`), drawn from the design's
 * sprite so they match the nav logo. The portfolio keeps `public/favicon*`.
 * Run once by hand (`node scripts/generate-brand-icons.mjs`) when Bit changes;
 * the output is committed, like the other generated images.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const sprite = readFileSync('design/bits-quest/sprites/bit-pose-02.svg', 'utf8');
const paths = [...sprite.matchAll(/<path d="([^"]+)" fill="([^"]+)"/g)].map(([, d, fill]) => `<path d="${d}" fill="${fill}"/>`).join('');

// Tab icon: Bit's head only (rows 0–10), so each pixel stays visible at 16px.
const head = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1.5 -0.5 13 13" shape-rendering="crispEdges">${paths}</svg>`;
// App icons: whole Bit on paper, with breathing room.
const full = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 24 24" shape-rendering="crispEdges"><rect x="-3" y="-3" width="24" height="24" fill="${bg}"/>${paths}</svg>`;

writeFileSync('public/brand/favicon.svg', head);
const png = (svg, size, out) => sharp(Buffer.from(svg), { density: 600 }).resize(size, size, { kernel: 'nearest' }).png().toFile(out);
await Promise.all([
  png(head, 16, 'public/brand/favicon-16.png'),
  png(head, 32, 'public/brand/favicon-32.png'),
  png(head, 48, 'public/brand/favicon-48.png'),
  png(full('#fafafa'), 180, 'public/brand/apple-touch-icon.png'),
  png(full('#fafafa'), 192, 'public/brand/icon-192.png'),
  png(full('#fafafa'), 512, 'public/brand/icon-512.png'),
]);
console.log('[brand-icons] public/brand: favicon.svg + 16/32/48 + 180/192/512');
