# Notes — post banners

Date: 2026-08-29
Status: approved design, not yet implemented
Scope: `PostHeader` on the three post routes, plus the OG card generator. No
index (`/notes`) changes, no feed changes, no MDX changes.

Builds on `2026-08-29-notes-frame-and-figures-design.md`, which establishes the
grid, the rail, and the figure primitives this reuses.

---

## 1. Problem

Twelve posts, and every one of them opens the same way: an eyebrow chip, a
date, an H1, a rule. The streams are distinguishable only by the word in the
chip. There is nothing to remember a post by and nothing to recognise it by on
return.

Two facts constrain the answer:

- **There are no images and no image budget.** `public/` holds a favicon, an
  apple-touch icon and one static `og.png`. Nothing else. There is no
  photography, no illustration, and nobody to make either.
- **There is already a generator.** `scripts/generate-og.mjs` renders one
  satori → resvg PNG per post in the site's own palette, with a 24px cream left
  edge it calls "the site's own signature". Adding a second, unrelated visual
  system beside it would mean a post's social card and a post's page disagree
  about what the post looks like.

So the banner has to be generated art, drawn from text already in the
frontmatter, and it has to be the same artwork the OG card uses.

This does not contradict decision 3 of the frame-and-figures spec ("code-drawn
figures only"). That decision governs figures — content. A banner is
decoration, and the rule it inherits from that decision is the one that
matters: no image pipeline, no assets produced by hand.

## 2. Decisions

Settled in brainstorming, recorded here so the plan does not relitigate them.

1. **Type plus lattice**, not texture and not per-stream motif systems. The
   oversized keyword carries identity; the node lattice carries subject. Three
   separate per-stream motifs was rejected as three times the work for a
   distinction the eyebrow chip already draws.
2. **Post header and OG only.** No thumbnail on `FeedCard`, no index hero. The
   feed's value is that twelve rows scan as one feed; a mark per row is the
   most likely thing to break that, and it can be added later against the same
   spec module if the feed ever needs it.
3. **One spec module, two renderers.** The geometry is computed once, in plain
   Node, and rendered both as inline SVG in the page and as artwork in the OG
   card. A drifting duplicate is the failure mode this exists to prevent.
4. **Deterministic from the slug.** A post's banner is fixed at the moment its
   file is named. It never changes on rebuild.
5. **No new runtime dependency and no new network request.** The page banner is
   inline SVG markup, not a file.
6. **Static.** No motion, no hydration, nothing to gate behind
   `prefers-reduced-motion`.

## 3. The artwork

A `1200 × 200` viewBox on ink `#0a0a0a`, carrying the 24px cream `#E4DED0` left
edge from the OG card — so the banner reads as the same object as the social
card rather than as a second visual language.

Three layers, back to front.

### 3.1 Lattice

Four to seven nodes drawn as rounded rects, 24 × 14 in viewBox units, on a
coarse normalised grid. They are rects and not circles because `<Flow>` draws
its nodes as boxes, and the banner should look like an abstraction of the
figures inside the post rather than a different idea about what a node is.

Connectors are orthogonal — horizontal, vertical, or one 90° elbow. Never
diagonal, never curved. Cream at 14% opacity, 1px hairline, matching the
`rgba(10,10,10,.2)` hairline weight the notes CSS uses throughout, inverted for
ink ground.

Exactly one node is filled solid gold `#C9A24B` at full opacity. One, not a
proportion: the gold is the site's accent and a lattice with three gold nodes
reads as a colour scheme rather than as an accent.

### 3.2 The word

Set in JetBrains Mono 700, cream `#E4DED0`, positioned on the baseline of the
lower third and clipped by the box.

Size is derived, not fixed: the font size is chosen so the rendered string
measures approximately 115% of the box width. A short word like `SWIPE` is
therefore set large and a long one like `AUTOMATE` smaller, but both overflow
the right edge by roughly the same fraction. The gesture — a word too big for
its box, running off the edge — is identical across all twelve posts, which is
what makes it a system rather than twelve arbitrary type sizes.

Advance width is computed from the mono font's fixed advance ratio (0.6 em for
JetBrains Mono) times the character count. No text measurement API is needed,
which is what allows the same calculation to run in the browser-free OG script.

**Which word.** `payloadOf(post).stamp` is the existing "keyword, else stream
name" fallback, but its non-drop value is `BUILDER WISDOM` — two words, and
wrong shape for type this large. The banner defines its own one-word rule
instead, in the spec module so both renderers agree:

| stream | word |
|---|---|
| `drop` | `keyword` from frontmatter (`AUTOMATE`, `SWIPE`, …) |
| `wisdom` | `WISDOM` |
| `dispatch` | `DISPATCH` |

This is a third naming of the streams, after `streamLabel` in `src/data/notes.ts`
and its copy in `generate-og.mjs`. It is deliberate and narrow: the banner word
is a display constraint (one word, uppercase, mono), not a label, and coupling
it to `streamLabel` would mean a future label change silently breaks the
typography. An unknown stream throws rather than rendering an empty banner,
matching how `generate-og.mjs` already handles an unknown `stream`.

### 3.3 Baseline

A gold hairline under the word, full box width, echoing the `rule.base` stroke
under the H1 immediately below it.

### 3.4 Legibility

Nothing sits on the banner but the word. The H1, the eyebrow and the date all
remain on paper below it, so there is no text-over-image contrast case to
manage and no need for a scrim.

## 4. The spec module

`src/lib/banner-spec.mjs`, with a hand-written `src/lib/banner-spec.d.ts`.

Plain `.mjs` with no `@/` alias and no Vite-only syntax. This is forced, not
stylistic: `generate-og.mjs` runs in plain Node and its own doc comment
explains why it cannot import from `src/content/index.ts` — `import.meta.glob`
does not exist there. Authoring the spec as `.mjs` is the one shape both
consumers can import, and it follows the precedent already set by
`src/lib/remark-headings.mjs`, which `vite.config.ts` imports the same way.

```ts
type BannerNode = { x: number; y: number; on: boolean };   // x, y normalised 0..1
type BannerSpec = {
  word: string;
  nodes: BannerNode[];
  edges: [number, number][];   // indices into nodes
};

bannerSpec(input: { slug: string; stream: string; keyword?: string }): BannerSpec
```

It takes a plain object, not a `Post`, so it has no dependency on
`src/data/notes.ts` and can be called from the OG script's frontmatter parser
output directly.

Randomness is an FNV-1a hash of the slug seeding a mulberry32 PRNG, both
inlined — a few lines each, and a dependency for this would be absurd.
Determinism is the point: the lattice for `automate` is fixed the moment the
file is named, and never differs between the page render, the OG render, and a
rebuild six months later.

## 5. Renderers

### 5.1 `<Banner post>` — `src/components/notes/Banner.tsx`

One inline `<svg viewBox="0 0 1200 200" preserveAspectRatio="xMinYMid slice">`
containing the lattice, the word as `<text>`, and the baseline. Putting the
word inside the SVG rather than in HTML means it scales with the box: no CSS
font-size arithmetic per breakpoint, and no layout shift.

Roughly 1KB of prerendered markup per post. No request, no new dependency, no
change to the notes chunk beyond the component itself.

Marked `aria-hidden="true"` with `role="presentation"`. It is decoration, and
the word duplicates context the eyebrow and H1 already carry; announcing
"AUTOMATE" before the title would be noise.

### 5.2 `generate-og.mjs`

The same spec is serialised to an SVG string, encoded as a `data:image/svg+xml`
URI, and passed to satori as an `<img>` positioned behind the existing title
layout. The same geometry and the same word as the page banner, by
construction — composited at reduced opacity, see below.

**Fallback.** If resvg rasterises the data URI incorrectly or satori refuses
it, the lattice is rebuilt as absolutely-positioned satori divs — one per node,
one per connector, from the same normalised coordinates — and the word as a
positioned text div. Same artwork, more code. The implementation plan should
verify the data-URI path first and only fall back on evidence, not
speculatively.

The OG card's existing content — eyebrow chip, title, cream left edge — is
unchanged. The banner artwork sits behind it at reduced opacity so the title
stays the dominant element on a social card, where the title is what earns the
click.

## 6. Placement

`<Banner>` renders inside `PostHeader`, above the eyebrow row, as:

```jsx
<div className="pf-banner pf-bleed">
```

`.pf-bleed` already exists in `src/styles/notes.css` and extends a child right
into the bleed track. The banner needs no grid work at all — it consumes the
frame the figures spec already built.

- Height `clamp(96px, 14vw, 200px)`, `overflow: hidden`.
- Below 1200px `--bleed` collapses to zero and the banner is simply
  content-width. Same markup, no media query of its own beyond the clamp.
- `display: none` in print.

## 7. Files touched

New:

- `src/lib/banner-spec.mjs`
- `src/lib/banner-spec.d.ts`
- `src/lib/banner-spec.test.ts`
- `src/components/notes/Banner.tsx`

Modified:

- `src/components/notes/PostHeader.tsx` — render `<Banner>`
- `src/styles/notes.css` — `.pf-banner`
- `scripts/generate-og.mjs` — artwork behind the title layout
- `scripts/check-notes.mjs` — the built-output assertions in §8

## 8. Verification

Against the built `dist/`, not against dev, as new assertions in
`scripts/check-notes.mjs` alongside the existing ones:

1. Every published post's HTML contains exactly one `.pf-banner` svg, and that
   svg contains a non-empty `<text>` element.
2. Determinism: two `bannerSpec()` calls for the same slug are deep-equal, and
   two different slugs produce different node sets. Unit test, in
   `banner-spec.test.ts`.
3. Every stream produces a word: `bannerSpec` throws on an unknown stream, and
   the drop path uses `keyword` rather than the stream name.
4. No new network request — the count of `<img src=` in any post page is
   unchanged from before this pass.
5. All twelve OG PNGs regenerate, each 1200 × 630.
6. Notes route chunk size delta reported; still contains no GSAP and no Lenis.
7. Rendered at 1600 / 1280 / 1024 / 375 — the word bleeds off the right edge at
   every width and no page scrolls horizontally at 375.

## 9. Explicitly out of scope

- Thumbnails on `FeedCard` and a hero on `/notes`. Deferred by decision 2; the
  spec module is the piece that makes them cheap later.
- Any change to the OG card's title, eyebrow or layout beyond placing artwork
  behind it.
- Banners on the portfolio route (`/`). This is a notes system.
