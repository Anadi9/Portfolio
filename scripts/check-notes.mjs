import { readFileSync, globSync } from 'node:fs';

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
