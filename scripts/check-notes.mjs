import { existsSync, readFileSync, globSync, statSync } from 'node:fs';

/**
 * Assertions against the built HTML, not against the dev server.
 *
 * Everything this project promises is a promise about the prerendered page: the
 * rail's anchors resolve, the tables are real tables, the code blocks are whole
 * whether collapsed or not. All three are invisible in `vite dev`, where
 * hydration has already run by the time anyone looks.
 */
const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};

const count = (html, needle) => (html.match(new RegExp(needle, 'g')) ?? []).length;

const pages = globSync('dist/{drops,wisdom,dispatch}/*/index.html');
check(`found 12 prerendered posts (found ${pages.length})`, pages.length === 12);

let anchors = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');

  // The rail is server-rendered, not injected on hydration.
  check(`${page}: no rail in the prerendered HTML`, html.includes('class="pf-rail"'));

  // Every anchor resolves to an id on the same page. This is the slug-parity
  // guarantee between remark-headings and rehype-slug, checked where it counts.
  const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  anchors += hrefs.length;
  for (const href of hrefs) {
    check(`${page}: anchor #${href} has no matching id`, ids.has(href));
  }

  // The plate is in the prerendered HTML and inlined, not fetched. Exactly one:
  // spec §8.7 promises one banner per page, and `.includes` would have passed
  // on two.
  check(`${page}: expected exactly one banner (found ${count(html, 'class="pf-banner')})`, count(html, 'class="pf-banner') === 1);
  const banner = /<img[^>]+src="(data:image\/png;base64,[^"]+)"/.exec(html);
  check(`${page}: banner is not an inlined PNG data URI`, banner !== null);
  if (banner) {
    const kb = banner[1].length / 1024;
    check(`${page}: banner is ${kb.toFixed(1)}KB, over the 8KB budget`, kb < 8);
  }

  // Exactly one cover, and it sits above the title while the plate closes the
  // article. Position, not just presence: the two swapped ends once already and
  // a silent swap back would look like a styling accident rather than a bug.
  check(`${page}: expected exactly one cover (found ${count(html, 'class="pf-cover')})`, count(html, 'class="pf-cover') === 1);
  check(`${page}: the plate is above the cover`, html.indexOf('class="pf-cover') < html.indexOf('class="pf-banner'));

  // Every image the page does fetch is a cover, it asks for all three widths,
  // and each width is a file that actually shipped. A `srcset` naming a missing
  // width is invisible in the HTML and invisible in dev — the browser just
  // quietly picks another one, until it picks that one.
  const fetched = [...html.matchAll(/<img[^>]+src="(?!data:)([^"]+)"/g)].map((m) => m[1]);
  for (const src of fetched) {
    check(`${page}: fetches ${src}, which is not a cover`, src.startsWith('/covers/'));
  }
  const widths = [...html.matchAll(/\/covers\/[a-z0-9/-]+-(\d+)\.webp/g)].map((m) => Number(m[1]));
  check(`${page}: cover offers ${new Set(widths).size} widths, expected 3`, new Set(widths).size === 3);
  for (const src of new Set([...html.matchAll(/\/covers\/[a-z0-9/-]+\.webp/g)].map((m) => m[0]))) {
    check(`${page}: cover ${src} is not in dist`, existsSync(`dist${src}`));
  }
}

/**
 * A JPEG's dimensions, from its first SOF marker.
 *
 * The PNG version of this was two `readUInt32BE`s at fixed offsets. JPEG has no
 * fixed offset — the frame header sits behind a variable run of segments — so
 * the segment chain has to be walked. Worth the fifteen lines: the size of an
 * OG card is the one thing about it every crawler agrees on, and a card written
 * at the wrong size looks perfect locally and wrong in every share.
 */
const jpegSize = (buf) => {
  let i = 2; // past SOI
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    // SOF0..SOF15, minus the four that are not frame headers.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

// Spec §8.10, rewritten for the covers: all twelve OG cards ship, each 1200 x
// 630. They are committed files now rather than build output, so this is
// checking that a post was not added without one — the failure mode the old
// generator threw on, moved to the only place left that can still catch it.
const ogCards = globSync('dist/og/**/*.jpg');
check(`found 12 OG cards (found ${ogCards.length})`, ogCards.length === 12);
for (const card of ogCards) {
  const buf = readFileSync(card);
  const size = jpegSize(buf);
  check(`${card}: is not a readable JPEG`, size !== null);
  if (size) check(`${card}: is ${size.width}x${size.height}, not 1200x630`, size.width === 1200 && size.height === 630);
  const kb = buf.length / 1024;
  check(`${card}: is ${kb.toFixed(1)}KB, over the 200KB budget`, kb < 200);
}

// Every post's card is the one its `og:image` names. A card present under a
// slug nothing points at is the same shipped-broken-share as a missing one.
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const og = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/.exec(html);
  check(`${page}: has no og:image`, og !== null);
  if (og) {
    const file = `dist${og[1].replace('https://anadithakur.in', '')}`;
    check(`${page}: og:image ${og[1]} is not in dist`, existsSync(file) && statSync(file).isFile());
  }
}

// The cheat sheet's eight tables survived the ProseTable swap, and gained the
// labels the mobile card view reads.
const cheatsheet = readFileSync('dist/drops/cheatsheet/index.html', 'utf8');
check('cheatsheet has 8 real tables', count(cheatsheet, '<table') === 8);
check('cheatsheet cells carry data-label', count(cheatsheet, 'data-label') > 0);

// The automate JSON survived the collapse, and the diagrams landed.
const automate = readFileSync('dist/drops/automate/index.html', 'utf8');
check('automate still ships its n8n JSON', count(automate, 'n8n-nodes-base') === 19);
check('automate has five Flow diagrams', count(automate, 'class="pf-flow"') === 5);
check('automate keeps all five setup-notes sections', count(automate, 'Setup notes') === 5);

// All 100 prompts are still on the page. This one matters more than the rest:
// that page's whole SEO argument is that the artifact is on it, and a filter UI
// is exactly the kind of change that could quietly render 12 of them.
const prompts = readFileSync('dist/drops/prompts/index.html', 'utf8');
check(`prompts page renders 100 cards (found ${count(prompts, 'pf-prompt-card')})`, count(prompts, 'pf-prompt-card') === 100);
check('prompts page keeps its five category anchors', count(prompts, 'id="[0-9]-[a-z0-9-]*"') === 5);
check('prompts page keeps its PDF link', prompts.includes('the-ai-prompt-playbook.pdf'));

// The index still prerenders every card and every chip.
const index = readFileSync('dist/notes/index.html', 'utf8');
check('index prerenders 12 feed cards', count(index, 'pf-feed-card"') === 12);
check('index prerenders 4 filter chips', count(index, 'aria-pressed') === 4);
check(`index prerenders 12 feed thumbnails (found ${count(index, 'pf-feed-media')})`, count(index, 'pf-feed-media') === 12);

// The feeds list every published post and nothing else.
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
const rss = readFileSync('dist/rss.xml', 'utf8');
check(`sitemap lists 14 urls (found ${count(sitemap, '<loc>')})`, count(sitemap, '<loc>') === 14);
check(`rss lists 12 items (found ${count(rss, '<item>')})`, count(rss, '<item>') === 12);
check('robots.txt declares the sitemap', readFileSync('dist/robots.txt', 'utf8').includes('Sitemap:'));
for (const page of pages) {
  const url = 'https://anadithakur.in/' + page.replace('dist/', '').replace('/index.html', '');
  check(`${url} is missing from the sitemap`, sitemap.includes(`<loc>${url}</loc>`));
  check(`${url} is missing from the rss feed`, rss.includes(`<link>${url}</link>`));
}

// No scroll engine reached any notes chunk. `/` is allowed both; anything a
// notes route pulls in is not.
//
// Chunks are found by the markers they emit rather than by filename. Vite names
// a shared chunk after whichever module it happened to hoist, and that name
// moves whenever the import graph shifts — this check previously looked for
// `useRail-*.js` and started finding nothing the moment a hook was added
// elsewhere. A check that silently scans nothing is worse than no check, which
// is why the count is asserted too.
const NOTES_MARKERS = ['pf-rail', 'pf-prompt-card', 'pf-flow', 'pf-feed-card'];
const notesChunks = globSync('dist/assets/*.js').filter((asset) => {
  const code = readFileSync(asset, 'utf8');
  return NOTES_MARKERS.some((marker) => code.includes(marker));
});
check(`found notes chunks to scan (found ${notesChunks.length})`, notesChunks.length >= 3);
for (const asset of notesChunks) {
  const code = readFileSync(asset, 'utf8');
  check(`${asset}: notes chunk contains GSAP`, !/\bgsap\b/i.test(code));
  check(`${asset}: notes chunk contains Lenis`, !/\blenis\b/i.test(code));
}

if (failures.length > 0) {
  console.error(`\ncheck-notes: ${failures.length} failure(s)\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}
console.log(`check-notes: OK — ${pages.length} pages, ${anchors} rail anchors, none dead`);
