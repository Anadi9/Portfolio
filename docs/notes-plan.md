# Notes — build plan

Three streams on `anadithakur.in`: **Drop**, **Wisdom**, **Dispatch**.
Source of truth for content: the `the.anadi Resources` Notion page + the Aug 2026 content calendar.

---

## 0. Content inventory (as of Aug 29, 2026)

### Resource Drop — 6 live

| Slug | Keyword | Notion source | State |
|---|---|---|---|
| `automate` | AUTOMATE | 5 Automations That Give Me 10+ Hours Back | **Complete.** 5 automations, n8n JSON skeletons, Zapier equivalents, setup notes. Ports directly. |
| `system` | SYSTEM | The Free Resource — System Design Template | **Complete.** 9 sections, worked "Video → Transcript" example, common-mistake callouts. Strongest page on the site. |
| `swipe` | SWIPE | 20 Automations Worth Stealing | **Complete.** Index table + 20 entries with trigger→action + setup. |
| `cheatsheet` | CHEATSHEET | The AI Builder's Cheat Sheet | **Complete.** 8 comparison tables. Dated content — see §4. |
| `prompts` | PROMPTS | The AI prompt PLAYBOOK | **Live.** All 100 prompts extracted to on-page text, PDF kept as a download alongside. Stub decision reversed — see Phase 3. |
| `workflow` | WORKFLOW | — | **Live.** Written from scratch: Linear → Slack standup, with the n8n JSON. |

### Builder Wisdom — 2 written (Aug 29, 2026)
Both reel hooks are now full posts:
- `ai-wrapper-tell` — "Most 'AI-powered' products are just a wrapper. Here's how to tell in 10 seconds." **Live.**
- `bolt-on-ai-mistake` — "The #1 architecture mistake founders make bolting on AI features." **Live.**

### Dispatch — 4 written (Aug 29, 2026)
The August calendar rows were all placeholders (`[This week's biggest AI headline]`) and no text existed. Four dispatches were written from the week of 24 Aug 2026 instead — one story each, sourced: `claudeforce`, `o3-retired-from-chatgpt`, `glm-5-3-flash`, `openai-agent-containment-report`.

**Launch reality: 4 complete drops port directly, `workflow` gets written, `prompts` ships as a stub. Six drops at launch.**
*Update (Aug 28, 2026): the four are ported and live. `workflow` and `prompts` remain — see Phase 3.*
*Update (Aug 29, 2026): all six drops are live, plus two Wisdom posts and four Dispatches. `prompts` shipped as a full page rather than a stub. Twelve posts, all three streams populated.*

---

## 1. Decisions locked

- **URLs:** `anadithakur.in/notes` (index), `/drops/:slug`, `/wisdom/:slug`, `/dispatch/:slug`. Short, no nesting — sayable in a reel.
- **No subdomain.** `notes.anadithakur.in` (if wanted) 308-redirects to the canonical path. Subdirectory keeps search authority on one domain and keeps drop↔case-study links internal.
- **Index is one reverse-chron feed with three filter chips**, not three sections. Wisdom at 0–2 posts would read as neglect in a column.
- **Nothing gated.** Full artifact on the page, email capture below it.
- **Slug = DM keyword.** `AUTOMATE` → `/drops/automate`. The DM automation sends a link, not a file.
- **No subdomain at all.** Not even a redirect. `anadithakur.in/notes` is the only address.
- **Byline is `@the.anadi` everywhere.** The cheat sheet's `@soulisanadiii` gets rewritten on port.

---

## 2. Phases

### Phase 1 — Foundation (no content) — **DONE (Aug 28, 2026)**

1. ~~Add `vite-react-ssg`; prerender all notes routes.~~ Done, pinned to **0.8.9** — 0.9.x requires Vite 6 and this repo is on Vite 5. `npm run build` is now `vite-react-ssg build` and emits real HTML per route.
2. ~~`src/content/` + MDX via `@mdx-js/rollup`.~~ Done. `remark-frontmatter` + `remark-mdx-frontmatter` + `remark-gfm` (GFM is what makes pipe tables work — non-negotiable for the cheat sheet). `src/content/index.ts` globs eagerly and **throws at build time** on missing frontmatter or a file in the wrong stream directory.
3. ~~Types in `src/data/notes.ts`.~~ Done, as a discriminated union on `stream`, plus `draft`, `lastVerified` and `sourcePost` on the base.
4. ~~Three layouts + `/notes` index.~~ Done. `DropLayout` / `WisdomLayout` / `DispatchLayout` + `PostHeader` + a `prose` MDX element map. Wisdom's tradeoff renders on `c.plate` from frontmatter, so it can't be quietly skipped.
5. ~~Route-split.~~ Done. `/` lazy-loads a ~197 kB chunk (GSAP, Lenis, loader); the notes routes lazy-load ~5 kB and contain **zero GSAP** — verified against the built assets.
6. ~~Nav gets a sixth item.~~ Done — `NOTES` sits after `SELECTED WORK`. `nav` items now take an optional `href`, which opts them out of the in-page scrollspy.

**Also fixed, found while building:**
- `IntroLoader` moved out of `App` and into a new `pages/Home.tsx`, wrapped in `ClientOnly` so the curtain is neither in the prerendered HTML nor on any notes route. `App.tsx` is deleted; `src/routes.tsx` is the route table.
- **Duplicate `<title>`/`<meta description>`.** Static tags in `index.html` survive into every prerendered page, so `/notes` was shipping two of each. `index.html` now carries only invariants; every route owns its head via `components/Seo.tsx` (canonical, absolute OG image, JSON-LD).
- Notes headings pass `vw: true` on the display ramp. The `cqw` default is tuned for a ~1450px container and the reading column caps at 760, which would have rendered every H1 at about half its intended size.

**Carried into later phases:**
- `src/content/*/_scaffold.mdx` are `draft: true` fixtures proving the pipeline. Drafts render in `vite dev` and are stripped from the production build *and* from the prerendered route list. Delete them as real content lands.
- `getStaticPaths` must return **whole paths** (`/drops/system`), not bare slugs — a slug alone renders the page at `/system`.
- Per-page OG image generation and `sitemap.xml` are still Phase 2 / Phase 4. `og.png` is the shared fallback for now.
- Unknown URLs currently 200 with the SPA shell. Emitting a real 404 is host config — folded into Phase 4.

### Phase 2 — Port the four complete drops — **DONE (Aug 28, 2026)**
Ported best-SEO-first: `system` → `automate` → `swipe` → `cheatsheet`. All four live at
`/drops/:slug`, prerendered, and `src/content/drops/_scaffold.mdx` is deleted.

Per page, all met:
- ~~Title/H1 carries the real search query.~~ Done. `system` is "System design document template
  — 9 sections, with a worked example"; `cheatsheet` leads on "Claude vs GPT vs Gemini".
- ~~Artifact is inline indexable text.~~ Done and checked against the built HTML: 8 real
  `<table>`s on `cheatsheet`, 5 copyable JSON `<pre>` blocks on `automate`, 3 tables + the
  architecture block on `system`, the 20-row index table on `swipe`.
- ~~`USE WHEN` line in mono under the title.~~ Done — frontmatter `useWhen`, rendered by `DropLayout`.
- ~~Failure modes / gotchas kept.~~ Done. Every "common mistake" on `system` and every
  "setup notes" paragraph survived the port, and several got sharpened into the specific
  thing that breaks rather than a general caution.
- ~~`Article` JSON-LD, canonical, per-page OG image.~~ Done. OG cards are generated at build
  by `scripts/generate-og.mjs` (satori → resvg) into `dist/og/drops/<slug>.png`, carrying the
  title and the `DROP 0N` numeral on the site's own ink/cream/gold.

**~~Resolve the automate/swipe overlap.~~** Done. `swipe` is now the 20-idea index and
`automate` the deep build guide with the JSON. Entries 1, 3, 7 and 8 on `swipe` link into
`automate`; `automate` links back per section and from a closing block. Neither page
repeats the other's depth, so they stop competing for the same query.

**Also decided, while porting:**
- **The cheat sheet's byline** was `@soulisanadiii`; it's `@the.anadi` now, and the page
  opens with an explicit "this is dated on purpose" block naming August 2026, above the
  `lastVerified` stamp the layout already renders. That's the §4 maintenance risk handled
  as far as content can handle it — the calendar reminder is still a human job.
- **`DROP 0N` numbering** runs oldest-first by `(date, slug)`, so a card's numeral never
  changes once it ships: automate 01, system 02, cheatsheet 03, swipe 04.
- **Fonts for the OG cards** are vendored as static TTFs in `scripts/og-fonts/` rather than
  fetched at build time. Same two faces `index.html` loads from Google Fonts, so the card
  matches the page, and a build never depends on a network call.

**Carried forward:**
- `og:image` on `/` and `/notes` is still the shared `public/og.png`. Only posts get a card.
- Draft scaffolds (`wisdom/`, `dispatch/`) are correctly stripped from the index and from
  prerender, but `import.meta.glob({ eager: true })` still compiles them into the client
  bundle. Nothing routes to them and no HTML contains them, so this is a bundle-size and
  tidiness issue, not an exposure one. Worth a `import.meta.env.PROD` guard on the glob
  when the drafts stop being fixtures.

### Phase 3 — Write what's missing — **DONE (Aug 29, 2026)**
1. ~~`workflow` — the Slack + Linear standup drop.~~ Written. `/drops/workflow`, DROP 06.
   Full node chain, the Linear GraphQL query filtered on `updatedAt`, the grouping Code
   node, the Slack Block Kit payload, a copyable workflow skeleton, a tracker-swap table
   (Jira / GitHub Issues / Notion / Asana) and four named failure modes. Titled for
   `n8n standup automation` directly.
2. ~~`prompts`~~ Written — and the earlier "download stub" decision is **reversed**: all
   100 prompts are on the page as indexable text, extracted from the PDF rather than
   retyped. `format: both` — the PDF is committed at
   `public/uploads/the-ai-prompt-playbook.pdf` and linked, but the page no longer depends
   on it. At 127 KB of HTML it is the largest page on the site by a wide margin.
   *Why the reversal:* §3.1 accepted a stub only because extraction looked like the
   expensive option. It wasn't — the PDF is a text PDF and parsed cleanly into
   category → entry → audience tag → prompt → "why it works", so the argument for the
   stub disappeared.
3. ~~Two Wisdom posts.~~ Written. `/wisdom/ai-wrapper-tell` runs its three questions
   against Signal as the live counter-example and links to `/#work`;
   `/wisdom/bolt-on-ai-mistake` covers designing from the data outward rather than from
   the button inward. They link to each other, and the second one closes into
   `/drops/system`. `src/content/wisdom/_scaffold.mdx` is deleted.
4. ~~First Dispatch~~ Written — as **four standalone posts, not a weekly roundup**:
   `/dispatch/claudeforce`, `/dispatch/o3-retired-from-chatgpt`,
   `/dispatch/glm-5-3-flash`, `/dispatch/openai-agent-containment-report`. Each is
   800–900 words with one argument, three `items` breaking the story into its constituent
   claims, the honest caveats, a "what to actually do", and every factual claim linked in
   a sources line. `src/content/dispatch/_scaffold.mdx` is deleted.
   *The roundup was written first and then deleted.* A four-item weekly digest is thin per
   story, and news outlets outrank a personal site on the raw story within hours; one page
   per story with an argument the coverage doesn't have is the only version that's still
   worth reading a week later.
   *On the gate:* these shipped because there were four real stories, not because the
   upkeep question from §4 is settled. See the recurring-cost note below.

**Also done, while writing:**
- **`rehype-slug` added** to the MDX pipeline in `vite.config.ts`. Every heading now
  carries an id — needed for the prompts page's own five-section table of contents, and
  free for every other post. `prose.tsx` already spreads props onto its elements, so no
  layout change was required.
- **Drop numbering held.** New posts are dated `2026-08-29`, after all four ported drops,
  so the oldest-first `(date, slug)` numbering left automate 01 → swipe 04 untouched and
  appended prompts 05, workflow 06.

**Carried forward:** `og:image` on `/` and `/notes` is still the shared `public/og.png`.
The Phase 2 note about `import.meta.glob({ eager: true })` compiling draft scaffolds into
the client bundle is now moot — every scaffold is deleted and the bundle is clean. If a
draft is ever reintroduced, that `import.meta.env.PROD` guard becomes worth having again.

**Dispatch conventions, set by these four:** one story per post, not a digest. Topical
slugs (`claudeforce`), not date slugs — the date lives in `date` and the `dateline`, and a
topical slug is what search actually matches. `items` holds the story's constituent claims
rather than separate stories, which keeps the layout's numbered spine honest at one story
per page. Every post carries a caveats section and a sources line.

**Recurring cost this creates:** Dispatch is the second thing on the site that ages by
design (see §4). Unlike `cheatsheet` it ages *correctly* — a dated dispatch is supposed to
stay dated — but the stream is only worth having if more appear. Four posts dated one day
and then silence reads worse than no dispatch at all. This is the §4 "needs an owner"
problem, now with four pages attached to it.

### Phase 4 — Distribution
- `sitemap.xml` + `rss.xml` generated at build.
- Update the IG DM automation: keyword replies send the URL.
- `sourcePost` field on each post linking back to its reel; two-way traffic.
- Case studies in `portfolio.ts` link out to related drops/wisdom.

---

## 3. Resolved (Aug 28, 2026)

1. **Prompt Playbook** — ~~ships as a download stub~~ **superseded Aug 29, 2026.** The full 100 prompts are on the page; the PDF is an extra way to take it away, not the content. See Phase 3 item 2 for why this reversed.
2. **`workflow`** — write it from scratch. Target query: `n8n standup automation`, `auto standup from linear`.
3. **Byline** — `@the.anadi` everywhere.
4. **No subdomain.** `/notes` only.

## 3a. Implementation constraint found in the code — **resolved in Phase 1**

~~`IntroLoader` is mounted in `src/App.tsx` **outside** `<BrowserRouter>`, so it plays on every route — it would fire on `/drops/system` for someone arriving from Google. It has to move inside the route tree and be scoped to `/` before any notes route ships.~~ Done — it lives in `pages/Home.tsx` inside the `/` route, behind `ClientOnly`.

~~`react-router-dom` v6 is wired with declarative `<BrowserRouter>`/`<Routes>`. `vite-react-ssg` needs a routes **array**.~~ Done — `App.tsx` is deleted and `src/routes.tsx` exports the array; `main.tsx` is now the `ViteReactSSG` entry.

---

## 4. Maintenance risk

`cheatsheet` is dated by design — August 2026 pricing, and it already notes Sora 2's shutdown. It will be wrong within a quarter. Give it a visible `LAST VERIFIED` stamp and a calendar reminder to re-check, or it becomes the page that makes the whole site look stale. Same class of problem as Dispatch: both trade evergreen value for timeliness, and both need an owner.
