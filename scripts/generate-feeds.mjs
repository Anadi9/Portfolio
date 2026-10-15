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
import { existsSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, collect, root, streamPath } from './lib/content.mjs';

const OUT = join(root, 'dist');

/** `/work` plus one path per prerendered `dist/work/<slug>/index.html`. */
const workPaths = () => {
  const dir = join(OUT, 'work');
  if (!existsSync(dir)) return [];
  const slugs = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'index.html')))
    .map((d) => d.name)
    .sort();
  return ['/work', ...slugs.map((s) => `/work/${s}`)];
};

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

// The non-post routes worth listing: the hub, the three service pages, the
// one audit form and the free tools. Left out on purpose: `/rescue/audit` (a
// 301 to `/audit?type=app`; a sitemap should never list a redirect),
// `/portfolio` (canonical at portfolio.anadithakur.in, a different host this
// sitemap can't speak for), `/work-with-me` (a 301 to `/`), the teardown
// result pages (`noindex`), the kit's thank-you page (`noindex`), `/404` and
// the SPA catch-all. A path is listed only once the build prerendered it, so a
// route that doesn't exist yet can't leak in.
const prerendered = (path) => existsSync(join(OUT, path === '/' ? 'index.html' : `${path.slice(1)}/index.html`)) || existsSync(join(OUT, `${path.slice(1)}.html`));
const pages = [
  { path: '/', priority: '1.0' },
  { path: '/ai-visibility', priority: '1.0' },
  { path: '/dpdp', priority: '1.0' },
  { path: '/production-ready', priority: '1.0' },
  { path: '/build-with-ai', priority: '1.0' },
  { path: '/care', priority: '1.0' },
  { path: '/audit', priority: '0.9' },
  { path: '/ai-readiness', priority: '0.9' },
  { path: '/dpdp/check', priority: '0.9' },
  { path: '/scan', priority: '0.9' },
  { path: '/teardown', priority: '0.9' },
  { path: '/notes', priority: '0.9' },
  { path: '/products/production-kit', priority: '0.9' },
]
  .filter((pg) => prerendered(pg.path))
  .map((pg) => ({ url: pg.path === '/' ? ORIGIN : `${ORIGIN}${pg.path}`, modified: posts[0].modified, priority: pg.priority }));
pages.push(
  // Case studies: whatever the build prerendered under `dist/work`, which is
  // exactly the live set. Reading the output rather than the TS data keeps a
  // pending study out of the sitemap by construction.
  ...workPaths().map((p) => ({ url: `${ORIGIN}${p}`, modified: posts[0].modified, priority: '0.8' })),
  ...posts.map((p) => ({ url: p.url, modified: p.modified, priority: '0.8' })),
);

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
// pages. Prices can't be imported from the TSX they live in, so they are
// repeated here: change them in `data/bitsQuest.ts` and `Rescue.tsx` and here
// too. The first paragraph is the business's one-line description and
// must match `BUSINESS_TAGLINE` in `src/lib/schema.ts` word for word.
const llms = `# Anadi Thakur · Your app, made production-ready

> Your app, made production-ready: fixes, AI builds and ongoing care for web and mobile apps, at fixed prices, by a senior full-stack engineer who does the work himself.

Anadi Thakur is a senior full-stack engineer based in India with 4+ years shipping production web and mobile apps (including the ZEISS Microscopy platform). He fixes and hardens React, Next.js, React Native, Node.js and PostgreSQL products (plus Supabase and Firebase), whether written by people or with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit, and adds AI features that hold up in production. Works with Indian and US businesses, remotely, available 8am–12pm US Eastern. Bit is the site's AI assistant; Anadi reads every request and does the work. Contact: anadithakur99@gmail.com.

## Services

All prices are fixed, in USD. Every project starts with a free first-bug review: the biggest risk in the app, on video, with the fixed price to fix it.

- [Fix it or get it launch-ready](${ORIGIN}/production-ready): Production audit $349 (48 hours; reliability and security, search and AI visibility, privacy and compliance, ranked by business impact; credited 100% toward any package; full refund if nothing real is found). Launch-ready sprint $1,500–$2,500 (1 week, up to three problem areas). Full rescue $3,000–$6,000 (2–3 weeks, everything the audit found plus tests and monitoring). Half to start, the second half once the fix is live and confirmed.
- [Build with AI](${ORIGIN}/build-with-ai): AI build $2,000–$8,000 (1–4 weeks: an assistant, smart search or automation with guardrails and cost limits). MVP build $6,000–$20,000 (4–8 weeks: a complete web or mobile product). Fixed quote after a short scoping call, weekly demos, paid in milestones.
- [Keep it running](${ORIGIN}/care): Care plan $299/month: monitoring, a monthly health review, small fixes, and a quarterly search-visibility and privacy re-check. Cancel anytime.
- [First bug free](${ORIGIN}/audit): one form. No access needed, no sales call unless asked for.

## What the audit checks

- [Reliability & security](${ORIGIN}/production-ready): accounts and access, customer data protection, exposed keys and secrets, safe releases, performance and error alerts.
- [Search & AI visibility](${ORIGIN}/ai-visibility): whether Google and AI assistants (ChatGPT, Gemini, Perplexity) can read the site and recommend the business; business information, answer-ready content, reviews and mentions.
- [Privacy & compliance](${ORIGIN}/dpdp): consent, privacy notices, data map, customer data requests, vendors and incident readiness, aligned with GDPR, CCPA and India's DPDP Act (core obligations from May 2027). Not a law firm.

## Free tools

- [AI Readiness Checker](${ORIGIN}/ai-readiness): paste a URL and see in seconds whether AI crawlers can read the site: robots.txt rules for AI bots, prerendered content, structured data, llms.txt, titles and descriptions.
- [DPDP self-check](${ORIGIN}/dpdp/check): a short questionnaire that scores how ready an app is for the DPDP Act's obligations.
- [Free Supabase security check](${ORIGIN}/scan): checks in 30 seconds whether a Supabase project's tables are readable by anyone, using only the public anon key. Nothing is stored.
- [The Wrapper Test](${ORIGIN}/teardown): a free 13-question diagnostic that scores an AI product on defensibility, failure design, cost floor and evaluation.
- [The Production Kit](${ORIGIN}/products/production-kit): CLAUDE.md, Cursor rules, Claude Code skills, templates, launch and security checklists and Supabase SQL for AI-built apps. Free, one download, no sign-up.

## Notes

${posts.map((p) => `- [${p.title}](${p.url}): ${p.summary}`).join('\n')}

## Optional

- [Case studies](${ORIGIN}/work): before-and-after write-ups of shipped work.
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
