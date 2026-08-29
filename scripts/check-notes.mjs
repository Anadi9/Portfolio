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

// The index still prerenders every card and every chip.
const index = readFileSync('dist/notes/index.html', 'utf8');
check('index prerenders 12 feed cards', count(index, 'pf-feed-card"') === 12);
check('index prerenders 4 filter chips', count(index, 'aria-pressed') === 4);

// No scroll engine reached the notes chunks. `/` is allowed both; anything a
// notes route pulls in is not. That means the two route chunks — found by the
// rail class they emit — plus the shared chunk Vite names after `useRail`,
// which carries the rail itself and would otherwise go unchecked.
const notesChunks = [
  ...globSync('dist/assets/*.js').filter((a) => readFileSync(a, 'utf8').includes('pf-rail')),
  ...globSync('dist/assets/useRail-*.js'),
];
check('found the notes chunks to scan', notesChunks.length >= 3);
for (const asset of new Set(notesChunks)) {
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
