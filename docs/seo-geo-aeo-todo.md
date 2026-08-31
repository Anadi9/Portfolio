# SEO / GEO / AEO — todo

Audited against the built `dist/` on 1 Sep 2026. The foundations are done: every
route prerenders real HTML, `components/Seo.tsx` owns title/description/canonical/OG
per page, `index.html` carries only invariants, `sitemap.xml` and `rss.xml` are
generated at build, and every post ships Article/NewsArticle JSON-LD.

What follows is what is *missing*, ordered by return per hour. GEO = generative
engine optimisation (being cited by ChatGPT/Claude/Perplexity). AEO = answer
engine optimisation (winning the extracted answer). Both mostly reduce to: be
crawlable by the right bots, and put the answer where a machine can lift it.

---

## P0 — do these first, they're cheap and they gate everything

- [ ] **Verify the domain in Google Search Console and Bing Webmaster Tools.**
      Nothing below is measurable without it. Submit `sitemap.xml` to both.
      Bing matters more than usual now — ChatGPT search reads Bing's index.
- [ ] **Name the AI crawlers explicitly in `public/robots.txt`.** It currently
      allows everything by default, which technically permits them, but several
      answer engines only treat an explicit `Allow` as consent, and the file is
      also how you'd ever say no. Add blocks for `GPTBot`, `OAI-SearchBot`,
      `ChatGPT-User`, `ClaudeBot`, `Claude-User`, `Claude-SearchBot`,
      `PerplexityBot`, `Perplexity-User`, `Google-Extended`, `Applebot-Extended`,
      `Bingbot`/`CCBot`. Decide per-bot: training crawlers (`GPTBot`,
      `Google-Extended`, `CCBot`) vs. retrieval crawlers (`OAI-SearchBot`,
      `Perplexity`, `Claude-SearchBot`) are a different trade — retrieval ones
      are the ones that cite you back, so allow those at minimum.
- [ ] **Ship `public/llms.txt` and generate `dist/llms-full.txt`.** `llms.txt` is
      a short markdown index of the site (who, what, and a linked list of every
      note with its one-line summary); `llms-full.txt` is the whole corpus as
      plain markdown. Generate both in `scripts/generate-feeds.mjs` — it already
      has `collect()` and the MDX source, so this is ~30 lines next to the RSS
      block. This is the single highest-leverage GEO item: it hands a model the
      corpus without asking it to parse the inlined-style HTML the site emits.
- [ ] **Add `<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">` to `index.html`.**
      Without `max-snippet:-1` Google caps the snippet length it will extract,
      which directly suppresses featured-snippet and AI-overview eligibility.
- [ ] **`noindex` the 404.** `src/pages/NotFound.tsx` renders with no `<Seo>`,
      so it inherits nothing and is indexable. Give it
      `<meta name="robots" content="noindex">`.

## P1 — structured data gaps (these are what AEO actually eats)

- [ ] **`dateModified` on Dispatch.** `DispatchLayout.tsx:29` builds NewsArticle
      JSON-LD with `datePublished` only, while `DropLayout.tsx:35` and
      `WisdomLayout.tsx:36` both emit `dateModified: post.lastVerified ?? post.date`.
      Dispatch is the stream where freshness is the whole value proposition.
- [ ] **Add `image`, `publisher`, `url` and `inLanguage` to every article's JSON-LD.**
      `image` should be the absolute per-post OG JPEG that `ogImageFor()` already
      computes — Google will not show an article rich result without it.
- [ ] **`BreadcrumbList` on every post.** Home → Notes → {stream} → post. Cheap,
      and it's what puts the readable breadcrumb trail under the result instead
      of a raw URL.
- [ ] **`FAQPage` on the posts that are already Q&A shaped.** `ai-wrapper-tell`
      has literal question `<h2>`s ("What does it own that isn't the model?").
      Emitting those as FAQPage `mainEntity` is the most direct path to an
      extracted answer. Only where the H2s are genuinely questions — do not
      retrofit questions onto posts that aren't.
- [ ] **`HowTo` on the procedural drops** (`system`, `automate`, `workflow`) if
      they have ordered steps. Same reasoning.
- [ ] **`WebSite` + `Person` schema sitewide, not just `/`.** Home carries the
      `Person` node (`Home.tsx:40`); notes pages don't, so an engine reading a
      post has no entity to attach the author to. Reference the same `@id`
      (`https://anadithakur.in/#person`) from every article's `author` so the
      graph resolves to one entity. This is the E-E-A-T plumbing.
- [ ] **`ItemList` / `blogPost` array on `/notes`** so the index page is itself a
      liftable list of the corpus (`NotesIndex.tsx:53` has the `Blog` node already).

## P2 — feeds, crawl surface, canonical hygiene

- [ ] **Trailing-slash mismatch on `/`.** Canonical renders
      `https://anadithakur.in/` (`dist/index.html`) but `sitemap.xml` lists
      `https://anadithakur.in` with no slash. Make `generate-feeds.mjs` emit the
      canonical form. Harmless-but-sloppy signal duplication.
- [ ] **Put full post bodies in RSS via `<content:encoded>`.** Currently
      `<description>` carries the summary only. Aggregators and several LLM
      ingest paths take the feed as the whole article; a summary-only feed means
      they see 40 words per post.
- [ ] **Add `<lastmod>` accuracy + drop `<priority>`.** `priority` is ignored by
      every major engine now. `lastmod` is honoured, and yours is already honest
      (`lastVerified || date`) — keep that, lose the noise.
- [ ] **Image sitemap entries or `<image:image>` on post URLs** so the covers in
      `public/covers/` are eligible for image search.
- [ ] **IndexNow ping on deploy.** One POST to `api.indexnow.org` with the changed
      URLs after `npm run build` gets Bing (and therefore ChatGPT search)
      re-crawling in minutes instead of days. ~15 lines in a postbuild script.
- [ ] **Cover images have `alt=""` + `aria-hidden`** (correct, they're
      decorative), but that means the site publishes zero indexable image alt
      text. If any cover is actually informative, give it real alt text.

## P3 — content shape, the part that decides whether you get cited

- [ ] **A `Person`/about page.** There is no dedicated author entity page. For
      E-E-A-T and for an engine answering "who is Anadi Thakur", one URL that
      states credentials, employer history (ZEISS), and links to GitHub/LinkedIn
      is worth more than any schema tweak.
- [ ] **Answer-first paragraph on every post.** Wisdom and Dispatch have a
      standfirst; make sure it *answers* rather than teases. The extractable
      unit is a 40–60 word self-contained paragraph immediately under the H1
      that would survive being quoted alone with no other context.
- [ ] **Question-shaped H2s throughout.** Engines match at the heading level.
      `ai-wrapper-tell` already does this well — it's the template.
- [ ] **Cite sources with outbound links, especially in Dispatch.** GEO rewards
      pages that look like they sit inside a citation graph rather than
      free-floating opinion. Dispatch is reporting on other people's news and
      should link to it.
- [ ] **Add concrete numbers, dates and named entities.** "GLM-5.3 Flash, released
      August 2026, priced at $X/M tokens" is liftable; "the new cheap model" is
      not. This is the difference between being read and being cited.
- [ ] **Keep the cheat sheet's `LAST VERIFIED` stamp current.** Already flagged
      in `notes-plan.md` §4 as a maintenance risk; it's also an AEO risk, since
      a stale-dated page is deprioritised for anything time-sensitive.

## P4 — performance and measurement

- [ ] **Self-host Archivo and JetBrains Mono.** `index.html` blocks render on a
      Google Fonts stylesheet (external DNS + connection before first paint).
      Preconnect helps but self-hosting with `font-display: swap` and a preload
      of the two actual woff2 files removes the round trip. LCP is the CWV that
      most affects ranking, and the H1 is huge display type.
- [ ] **Measure real CWV**, not just Lighthouse. Vercel Analytics is wired
      (`a872b2f`); confirm Speed Insights is on and watch INP on the GSAP/Lenis
      front page specifically.
- [ ] **Track AI-referral traffic separately.** Referrers from `chatgpt.com`,
      `perplexity.ai`, `claude.ai` are the only feedback loop GEO has. If Vercel
      Analytics can't segment it, log it.
- [ ] **Quarterly: query the engines directly.** Ask ChatGPT/Claude/Perplexity
      the four target queries the notes were written for and see whether the
      site is cited. That's the actual scoreboard.

---

## Not worth doing

- `hreflang` — single language, single region.
- `changefreq` in the sitemap — ignored by every major engine.
- Keyword density / meta keywords — dead for a decade.
- A subdomain for notes — already resolved against in `notes-plan.md` §1.
