# Notes — page frame and figure primitives

Date: 2026-08-29
Status: approved design, not yet implemented
Scope: `/notes` and the three post routes. No portfolio (`/`) changes.

---

## 1. Problem

Two complaints, one root cause.

**The side space reads as empty.** `Column` in `src/components/notes/NotesShell.tsx`
caps at 760px for posts and 1060px for the index, centred. On a 1600px viewport
that leaves roughly 400px of white per side. Whitespace alone would be fine —
but the header rule, the footer, and the `NextUp` section joint are all
full-bleed, edge to edge. Full-bleed rules promise a grid; a narrow centred
column inside them reads as a grid with two columns missing rather than as
generous margin. The mismatch is the defect, not the width.

**Nothing in a post is visual.** Twelve posts, 140KB of MDX, zero figures. The
content most in need of one is the content the site is actually about: five
trigger→action workflows on `/drops/automate`, an n8n node chain on
`/drops/workflow`, twenty trigger→action pairs on `/drops/swipe`, eight
comparison tables on `/drops/cheatsheet`.

Related defects found while reading, fixed as a side effect:

- Every JSON skeleton on `automate` and `workflow` exists to be copied, and
  there is no copy button.
- `prose.table` sets `minWidth: 480` inside an `overflow-x: auto` box, so every
  comparison table scrolls sideways on a phone.
- `PostHeader` stacks eyebrow, date, `LAST VERIFIED`, `USE WHEN`, `YOU GET`,
  standfirst and a download button before the first sentence of the article.
- Long posts have no in-page navigation. `/drops/system` has 11 sections,
  `/drops/prompts` is 127KB of HTML with a hand-rolled inline table of contents
  that duplicates what the frame should provide.

## 2. Decisions

Settled in brainstorming, recorded here so the plan does not relitigate them.

1. **One rail, not two.** The left gutter gets navigation and meta. The right
   gutter stays clear and exists as overflow room for figures. Two fixed rails
   box a 760px measure in on both sides and turn a personal editorial site into
   documentation software — which is the same argument the `NotesShell` doc
   comment already makes against reusing the portfolio `Rail`.
2. **CSS Grid with named tracks**, not a sticky aside with negative margins.
   Bleed becomes a declaration rather than per-breakpoint arithmetic.
3. **Code-drawn figures only.** Inline SVG and CSS built from text already in
   the MDX. No image pipeline, no assets to produce by hand. `<Figure>` gets an
   image slot later if screenshots ever exist.
4. **Static first, interactive second.** Everything renders in the prerendered
   HTML; hydration only adds affordances. `DropLayout`'s own doc comment — a
   page whose content is a file is a page with no content as far as search is
   concerned — applies equally to a client-rendered figure.
5. **No chart or diagram library on notes routes.** Recharts is in
   `package.json` and stays out of this. The notes chunk is ~5KB with zero GSAP
   and that number is a constraint, not an accident.
6. **Scope: frame plus primitives.** `automate` and `cheatsheet` are the proof
   retrofits. The other ten MDX files are not touched.

## 3. The frame

### 3.1 Grid

`Column` generalises into a three-track grid with named lines:

```
[full-start] [rail-start] rail [rail-end measure-start] measure [measure-end bleed-start] bleed [bleed-end full-end]
```

- `rail` — 220px, collapses to `0` below 1200px.
- `measure` — `min(760px, 100%)`. Unchanged; prose reads exactly as it does today.
- `bleed` — the remaining space, capped so the total never exceeds 1180px.

Default child placement is `measure`. A figure opting into `bleed` declares
`grid-column: measure-start / bleed-end`.

The index reuses the same grid. Its feed occupies `measure-start / bleed-end`
(preserving today's 1060px `wide` behaviour) and its rail holds the filter
chips.

Hairlines sit at the `rail-end` and `bleed-end` boundaries so the full-bleed
header and footer rules resolve into a visible structure instead of terminating
in nothing.

Below 1200px the rail track collapses and the layout is single-column. Same
markup, no JavaScript, no duplicate DOM.

### 3.2 Rail contents — post routes

Top to bottom:

- Stream stamp, from the existing `payloadOf(post).stamp` in
  `streamPayload.ts` — a drop's DM keyword, otherwise the stream name.
  *Not* the `DROP 0N` numeral: that numbering rule currently lives only in
  `scripts/generate-og.mjs`, and duplicating it in `src/` for a cosmetic label
  buys a consistency bug for nothing.
- The heading list (h2 and h3), with an active state.
- A thin read-progress rule.
- The meta relocated out of `PostHeader`: `YOU GET`, `LAST VERIFIED`, the drop
  keyword chip, the download link where `format !== 'inline'`, and a copy-link
  control.

`PostHeader` slims to: eyebrow, date, H1, `USE WHEN`, standfirst.

### 3.3 Rail contents — index

The filter chips currently sit in a horizontal strip above the feed and scroll
away after the first two rows. They move into the rail, sticky, with their
counts. `StartHere` stays in `measure`, above the feed, unchanged.

### 3.4 Below 1200px

The rail's contents become a `<details>` disclosure pinned under the sticky
header, labelled `CONTENTS`. Static HTML, zero JavaScript, closed by default.
This is the single biggest win for `/drops/prompts` on a phone.

## 4. The TOC data

Headings must be in the prerendered HTML. Reading them from the DOM after mount
means the rail pops in on hydration and search never sees it.

A remark plugin, `src/lib/remark-headings.mjs`, is added to the MDX pipeline in
`vite.config.ts` alongside the existing `rehypeSlug`. It walks the tree,
collects `h2` and `h3`, and exports:

```ts
headings: { depth: 2 | 3; id: string; text: string }[]
```

**Slug consistency is the risk.** `rehype-slug` runs on the rehype side, after
this plugin, and generates ids with `github-slugger`. The remark plugin must
produce the same ids or every TOC link is dead. It uses `github-slugger`
directly (a transitive dependency of `rehype-slug`, promoted to a direct
`devDependency`) with one slugger instance per file, so the duplicate-heading
disambiguation suffix (`-1`, `-2`) matches too. `/drops/prompts` and
`/drops/automate` both repeat headings (`Trigger`, `Steps`, `Setup notes`), so
this is exercised immediately rather than being a theoretical concern.

Threading:

- `src/data/notes.ts` — `headings` added to `BaseFrontmatter`, optional, so a
  post compiled before the plugin lands does not break the type.
- `src/content/index.ts` — `build()` reads `mod.headings` and puts it on the
  post. It does **not** validate the field, unlike `title`/`summary`/`date`:
  a post legitimately may have no h2 at all.

## 5. Primitives

All four live in `src/components/notes/`. `Figure` and `CopyBlock` are the
primitives; `Flow` and `Compare` are built on `Figure`.

### 5.1 `<Figure caption source bleed>`

The container. Renders `<figure>` + `<figcaption>` with the caption in mono at
the existing `MetaLine` weight, and an optional source line. `bleed` switches
the grid column. Everything else composes into it.

### 5.2 `<CopyBlock>`

Replaces the `pre` entry in the `prose` map, so all existing `<pre>` blocks
across every post gain it without a content edit.

- Optional filename tab above the block, read from the code fence's `meta`
  string (```` ```json title="workflow.json" ````).
- Copy button. `navigator.clipboard` where available; the button renders in the
  HTML always and its handler no-ops if the API is missing, so there is no
  hydration mismatch.
- Collapse past ~24 lines, as a `<details>` — the full `<pre>` text stays in the
  DOM whether open or closed, so indexing is unaffected.

Source text comes from the `<pre>`'s rendered `textContent` via a ref, not from
walking `props.children` — MDX nests a `<code>` element whose children may be an
array once syntax highlighting or `remark-gfm` interferes, and `textContent` is
correct in every case.

### 5.3 `<Flow>`

Trigger → node → action, as CSS boxes with SVG connectors. Interactive layer:
tap or focus a node to reveal its config. Static form is the full node list with
its config visible — the interactivity hides detail, never reveals hidden
content, so nothing depends on JavaScript to be readable or indexable.

Data comes from a prop in the MDX, not from parsing prose:

```jsx
<Flow nodes={[
  { name: 'Instagram Trigger', kind: 'trigger', config: '…' },
  …
]} />
```

### 5.4 `<Compare>`

Replaces `prose.table` for tables that opt in. Adds:

- Column hover highlight.
- Sort by column, clicking a `<th>`. Header stays a real `<th>` with
  `aria-sort`.
- **Card view under 640px** — each row becomes a labelled block, replacing the
  current sideways scroll. This is a live mobile defect fix, not an enhancement.

The default `prose.table` keeps working for tables that do not opt in; it also
gains the card-view breakpoint, since the sideways-scroll problem is not
specific to `cheatsheet`.

## 6. Retrofit

- `src/content/drops/automate.mdx` — a `<Flow>` above each of the five
  workflows. Its five JSON blocks gain copy buttons for free through the prose
  map.
- `src/content/drops/cheatsheet.mdx` — its eight tables become `<Compare>`.

No other MDX file changes in this pass.

## 7. Motion and accessibility

- Scroll-spy and read-progress use `IntersectionObserver`. No GSAP, no Lenis —
  the notes chunk stays free of both.
- The progress rule animates width only, and is static under
  `prefers-reduced-motion: reduce`.
- The TOC is a real `<nav>` of anchors: tabbable, `aria-current` on the active
  item, and functional with JavaScript disabled.
- `<Compare>`'s sort control is a `<button>` inside the `<th>`, not a click
  handler on the cell.
- Hover-only affordances are gated behind `@media (hover: hover)`, matching the
  existing `pf-feed-card` convention in `notes.css`.

## 8. Files touched

New:

- `src/lib/remark-headings.mjs`
- `src/components/notes/Rail.tsx`
- `src/components/notes/Figure.tsx`
- `src/components/notes/CopyBlock.tsx`
- `src/components/notes/Flow.tsx`
- `src/components/notes/Compare.tsx`

Modified:

- `vite.config.ts` — register the remark plugin
- `package.json` — `github-slugger` as a direct devDependency
- `src/data/notes.ts` — `headings` on `BaseFrontmatter`
- `src/content/index.ts` — thread `headings` through `build()`
- `src/components/notes/NotesShell.tsx` — `Column` becomes the grid
- `src/components/notes/PostHeader.tsx` — slim down
- `src/components/notes/prose.tsx` — `pre` → `CopyBlock`, responsive `table`
- `src/components/notes/DropLayout.tsx`
- `src/components/notes/WisdomLayout.tsx`
- `src/components/notes/DispatchLayout.tsx`
- `src/pages/NotesIndex.tsx` — chips into the rail
- `src/styles/notes.css` — grid, rail, card-view table, mobile disclosure
- `src/content/drops/automate.mdx`
- `src/content/drops/cheatsheet.mdx`

## 9. Verification

Against the built `dist/`, not against dev:

1. Every TOC anchor in a post's rail resolves to an `id` present in that post's
   HTML. Checked across all twelve posts, including the repeated headings on
   `prompts` and `automate`.
2. All eight `<table>` elements still present on `cheatsheet`; all five `<pre>`
   blocks still present with full text on `automate`, collapsed or not.
3. Figure captions present in the markup.
4. The notes route chunk contains no GSAP and no Lenis. Size delta reported.
5. Keyboard: tab through the rail, activate a TOC link, activate a copy button,
   activate a `Compare` sort.
6. Rendered at 1600 / 1280 / 1024 / 768 / 375 — the rail collapses at 1200 and
   the disclosure takes over; no horizontal page scroll at 375.

## 10. Explicitly out of scope

Worth doing, not in this pass. They become the retrofit backlog once the
primitives exist.

- `<PromptCard>` grid, category filter and client search on `/drops/prompts`.
- Before/after architecture diagram on `/wisdom/bolt-on-ai-mistake`; decision
  tree on `/wisdom/ai-wrapper-tell`.
- `<Steps>` on `/drops/system`.
- Reading-time estimate, back-to-top, index search, skip-to-content link.
- `sitemap.xml` / `rss.xml` — already Phase 4 in `docs/notes-plan.md`.
