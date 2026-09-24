/**
 * `sitemap.xml`, `rss.xml` and `llms.txt`, written into `dist/` after the build.
 *
 * Both read the corpus through `lib/content.mjs`, the same module the OG cards
 * use, so a draft can never be absent from the cards and present in the feed.
 *
 * Output goes to `dist/` rather than `public/`, for the same reason the cards
 * do: these are build artefacts derived from content that already exists in the
 * repo, and committing a generated file that can drift from its source is how
 * you end up serving a sitemap listing a post you deleted.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, collect, root, streamPath } from './lib/content.mjs';

const OUT = join(root, 'dist');

/** The five characters XML will not accept raw. */
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const posts = collect()
  .map((p) => ({
    ...p,
    url: `${ORIGIN}/${streamPath[p.stream]}/${p.slug}`,
    // `lastVerified` is the honest modification date where a post has one: the
    // cheat sheet is re-checked against reality without its `date` changing,
    // and a crawler should hear about that.
    modified: p.lastVerified || p.date,
  }))
  .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));

if (!posts.length) {
  console.log('[feeds] no published posts, nothing to write.');
  process.exit(0);
}

/* --- sitemap ------------------------------------------------------------- */

// The non-post routes worth listing. `/` is the Vibe Code Rescue offer, and
// `/rescue/audit` and `/scan` are its two free entry points, so all three are
// meant to be found. Left out on purpose: `/rescue` (a 301 to `/` in
// `vercel.json`, and a sitemap should never list a redirect), `/portfolio`
// (canonical at portfolio.anadithakur.in, a different host this sitemap can't
// speak for), `/work-with-me` (a 301 to `/`), the
// teardown result pages (`noindex`), the kit's thank-you page (`noindex`),
// `/404` and the SPA catch-all.
const pages = [
  { url: ORIGIN, modified: posts[0].modified, priority: '1.0' },
  { url: `${ORIGIN}/rescue/audit`, modified: posts[0].modified, priority: '0.9' },
  { url: `${ORIGIN}/scan`, modified: posts[0].modified, priority: '0.9' },
  { url: `${ORIGIN}/teardown`, modified: posts[0].modified, priority: '0.9' },
  { url: `${ORIGIN}/notes`, modified: posts[0].modified, priority: '0.9' },
  { url: `${ORIGIN}/products/production-kit`, modified: posts[0].modified, priority: '0.9' },
  ...posts.map((p) => ({ url: p.url, modified: p.modified, priority: '0.8' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${esc(p.url)}</loc>
    <lastmod>${esc(p.modified)}</lastmod>
    <priority>${p.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync(join(OUT, 'sitemap.xml'), sitemap);

/* --- rss ----------------------------------------------------------------- */

/** RFC-822, which is what RSS 2.0 requires and ISO-8601 is not. */
const rfc822 = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Notes · Anadi Thakur</title>
    <link>${ORIGIN}/notes</link>
    <description>Templates, build notes, AI dispatches and fixes for apps built with AI. Whatever the piece promises is on the page in full: no signup, no gate.</description>
    <language>en</language>
    <lastBuildDate>${rfc822(posts[0].date)}</lastBuildDate>
    <atom:link href="${ORIGIN}/rss.xml" rel="self" type="application/rss+xml" />
${posts
  .map(
    (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(p.url)}</link>
      <guid isPermaLink="true">${esc(p.url)}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${esc(p.summary)}</description>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>
`;

writeFileSync(join(OUT, 'rss.xml'), rss);

/* --- llms.txt ------------------------------------------------------------ */

// The llmstxt.org summary AI answer engines read before (or instead of) the
// pages. The prices can't be imported from the TSX they live in, so they are
// repeated here: change them in `Rescue.tsx` or `lib/kit/product.ts` and here too.
const llms = `# Anadi Thakur · Vibe Code Rescue

> Fixed-price production fixes for web apps built with Lovable, Bolt, Cursor and v0: security, database, auth, payments, deployment and performance. From $499, done in 7 days, with 7 days of follow-up fixes. Every engagement starts with a free audit.

Run by Anadi Thakur, a full-stack engineer. Work is done remotely, worldwide. Contact: anadithakur99@gmail.com.

## Services

- [Vibe Code Rescue](${ORIGIN}/): the fixed-price production fix, from $499, done in 7 days. Add-ons include monthly production care at $249/month.
- [Free production audit](${ORIGIN}/rescue/audit): send the app link and get a plain-English report of what is broken, what is risky and what can wait, within 48 hours. Free, no call.
- [Free Supabase security check](${ORIGIN}/scan): checks in 30 seconds whether a Supabase project's tables are readable by anyone, using only the public anon key. Nothing is stored.
- [The Wrapper Test](${ORIGIN}/teardown): a free 13-question diagnostic that scores an AI product on defensibility, failure design, cost floor and evaluation.
- [The Production Kit](${ORIGIN}/products/production-kit): $19. CLAUDE.md, Cursor rules, Claude Code skills, launch and security checklists and Supabase SQL for AI-built apps.

## Notes

${posts.map((p) => `- [${p.title}](${p.url}): ${p.summary}`).join('\n')}

## Optional

- [Portfolio](https://portfolio.anadithakur.in/): past work and background.
- [RSS feed](${ORIGIN}/rss.xml)
`;

writeFileSync(join(OUT, 'llms.txt'), llms);

/* --- robots -------------------------------------------------------------- */

// Only written if it isn't already served from `public/`, so a hand-authored
// one always wins.
const robotsPath = join(OUT, 'robots.txt');
let robots = '';
try {
  robots = readFileSync(robotsPath, 'utf8');
} catch {
  /* not present, so we write one below */
}
if (!robots.includes('Sitemap:')) {
  writeFileSync(robotsPath, `${robots.trimEnd()}${robots ? '\n' : ''}\nSitemap: ${ORIGIN}/sitemap.xml\n`.trimStart());
}

console.log(`[feeds] dist/sitemap.xml  ${pages.length} urls`);
console.log(`[feeds] dist/rss.xml      ${posts.length} items`);
console.log(`[feeds] dist/robots.txt   sitemap declared`);
console.log(`[feeds] dist/llms.txt     ${posts.length} notes`);
