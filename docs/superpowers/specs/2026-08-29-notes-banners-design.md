# Notes — post banners

Date: 2026-08-29
Status: approved design, not yet implemented
Scope: `PostHeader` on the three post routes, the OG card generator, and one
new prebuild step. No index (`/notes`) changes, no feed changes, no MDX
changes.

Builds on `2026-08-29-notes-frame-and-figures-design.md`, which establishes the
grid, the rail, and the `.pf-bleed` track this reuses.

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
  satori → resvg PNG per post in the site's palette, with a 24px cream left
  edge it calls "the site's own signature". A second, unrelated visual system
  beside it would mean a post's social card and a post's page disagree about
  what the post looks like.

So the banner is generated art, driven by text already in the frontmatter, and
it is the same artwork the OG card uses.

This does not contradict decision 3 of the frame-and-figures spec ("code-drawn
figures only"). That decision governs figures — content. A banner is
decoration, and the rule it inherits is the one that matters: no assets
produced by hand.

## 2. Decisions

Settled across two rounds of brainstorming. Recorded here so the plan does not
relitigate them.

1. **Pixel art, neon, on a black plate.** Not the site's restrained
   ink/cream/gold vector language. Chosen deliberately over a
   palette-compatible version of the same technique — see §3 for how it is made
   to coexist.
2. **Type plus field.** An oversized bitmap word bleeding off the right edge,
   over a generated pixel field. Not per-stream motif systems: three motifs is
   three times the work for a distinction the eyebrow chip already draws.
3. **Post header and OG only.** No thumbnail on `FeedCard`, no index hero. The
   feed's value is that twelve rows scan as one feed, and a mark per row is the
   most likely thing to break that. It can be added later against the same
   generator if the feed ever needs it.
4. **One generator, two consumers.** Geometry and pixels are produced once, at
   build time, and consumed by both the page and the OG card. A drifting
   duplicate is the failure mode this exists to prevent.
5. **Deterministic from the slug.** A post's banner is fixed the moment its file
   is named. It never changes on rebuild.
6. **No new runtime dependency and no new network request.** The banner is an
   inlined data URI, not a fetched file.
7. **Static.** No animation, nothing to gate behind `prefers-reduced-motion`.

## 3. Making neon coexist with paper

The site is ink on paper, editorial, and deliberately restrained. A saturated
neon plate cannot act as the *page's* background without the two fighting.

It works as **a screen embedded in a paper document**: a hard-bordered object,
held by the same 24px cream edge the OG card uses, that the eye files as a
device sitting in the page rather than as the site changing personality. The
metaphor is also literally true — these posts are about automation software.

The rule that makes it hold:

> **Neon appears nowhere on the site except inside the banner's frame.**

Not in links, not in chips, not on the index, not in the rail. The moment a
neon hue leaks into the document's own chrome, the banner stops reading as an
embedded artefact and starts reading as a theme.

## 4. The artwork

A pixel grid of exactly **360 × 60 cells** — 6:1, matching the plate's rendered
proportion so cells stay square — displayed with `image-rendering: pixelated`,
so they are genuinely hard-edged rather than a smoothed simulation of pixels.
At a 1180px plate each cell renders about 3.3px.

### 4.1 Palette

Six indexed colours. Ground plus two carried over from the site, plus three
neon.

| role | hex | note |
|---|---|---|
| ground | `#0a0a0a` | `c.ink` |
| light | `#E4DED0` | `c.accent`, the cream — also the plate's border |
| gold | `#C9A24B` | `c.mark` |
| magenta | `#FF2E88` | neon |
| cyan | `#2EE6FF` | neon |
| lime | `#B8FF2E` | neon |

Cream and gold are carried over so the plate is still recognisably this site's.

**Per post the hash picks two of the three neon hues for the field, never all
three.** Two is what makes a set of twelve banners read as one system; three
per banner is a rainbow.

The rule governs the *field* — the dither ground and the wireframe. The word's
chromatic fringe (§4.2, layer 4) is always cyan and magenta, because it is
imitating a specific artefact — a misconverged RGB screen — and that artefact
has fixed colours. It is part of the type treatment, not part of the field
palette, and a fringe that changed hue per post would read as a third and
fourth accent rather than as a defect in a screen.

**Constraint on the lime.** `tokens.ts` reserves `signal` (`#0E7A45` /
`#35D48A`) exclusively for status, and its own comment explains why: "a status
light that reads as ornament isn't a status light." The banner's lime is
yellow-green at roughly 75° hue, far enough from the signal's emerald that a
banner pixel cannot be mistaken for a live dot. The palette must never include
`c.signal` or `c.signalOnInk`, and the implementation should assert this rather
than rely on the constant being copied correctly.

### 4.2 Layers

Five, back to front, all resolved at pixel resolution before rasterising.

1. **Dither ramp ground.** Bayer 4 × 4 ordered dither, ink to the post's
   primary neon hue, darkest toward the right so the tail of the word stays
   readable where it is largest.
2. **Wireframe perspective grid.** Horizon line with a vanishing point placed
   off-centre by the hash, receding floor lines and verticals, in the secondary
   neon hue at low density (reference: the CRT room).
3. **The word.** Bitmap glyphs drawn into the grid — not vector type scaled
   down, which would produce anti-aliased edges the pixelated upscale then
   magnifies into mush.

   Cap height is **constant** across all twelve posts at ~90% of the plate
   height. What varies per post is **tracking**: the per-character advance is
   set so the string always spans ~115% of the plate width and is always
   clipped by the right edge. `SWIPE` is therefore widely tracked and
   `CHEATSHEET` nearly tight, but both overflow by the same fraction and both
   sit on the same baseline at the same size.

   This is the inverse of the obvious approach — varying the type size to hit a
   target width — which does not work at this aspect ratio. A 6:1 plate sized
   to fit `SWIPE` across its width would need glyphs several times taller than
   the plate. Tracking is the only free variable, and the corpus fits it: words
   run 5 to 10 characters (`SWIPE` … `CHEATSHEET`), and at 10 characters the
   advance is still wider than a glyph, so letters never collide. The generator
   asserts that gap rather than assuming it, and drops one step of cap height
   if a longer word is ever added.
4. **Chromatic offset.** The word repeated one cell left in cyan and one cell
   right in magenta, beneath the cream original.
5. **Glitch and scanlines.** Two or three horizontal bands displaced by a
   hash-chosen offset, then a scanline overlay darkening every second pixel
   row.

### 4.3 Bitmap font

Layer 3 needs glyph bitmaps for `A–Z` only — the word is always uppercase
mono. A 5 × 7 cell font is enough at this scale and is roughly 26 short
integer arrays. It is authored once, inline in the generator, with no font file
and no text-measurement API. This is what allows the same code to run in the
browser-free build script.

Advance width is therefore exact rather than estimated: character count times
the fixed cell advance.

### 4.4 The word

`payloadOf(post).stamp` is the existing "keyword, else stream name" fallback,
but its non-drop value is `BUILDER WISDOM` — two words, wrong shape for type
this large. The banner defines its own one-word rule, in the generator so both
consumers agree:

| stream | word |
|---|---|
| `drop` | `keyword` from frontmatter (`AUTOMATE`, `SWIPE`, …) |
| `wisdom` | `WISDOM` |
| `dispatch` | `DISPATCH` |

This is a third naming of the streams, after `streamLabel` in
`src/data/notes.ts` and its copy in `generate-og.mjs`. Deliberate and narrow:
the banner word is a display constraint (one word, uppercase, in a 26-glyph
bitmap font), not a label, and coupling it to `streamLabel` would let a future
label change silently break the typography or reference a glyph that does not
exist. An unknown stream throws, matching how `generate-og.mjs` already handles
an unknown `stream`.

## 5. Rendering

### 5.1 Why not SVG

The approved earlier revision of this spec shipped inline SVG. Pixel art at
this density cannot be: a dithered 300 × 50 field is thousands of `<rect>`
elements, well over 100KB of markup per post — worse than any image.

The correct shape is the opposite. Pixel art wants to be a small raster.

### 5.2 The pipeline

`scripts/generate-banners.mjs`:

1. Reads frontmatter with the same parser `generate-og.mjs` already uses.
2. Computes the layers into a cell array, seeded by an FNV-1a hash of the slug
   feeding a mulberry32 PRNG — both inlined, a few lines each, no dependency.
3. Emits the cell array as an SVG of flat rects **at build time only** — this
   SVG is never shipped.
4. Rasterises it with `@resvg/resvg-js` at exactly 360 × 60, to a PNG.
   Already a devDependency for the OG cards. **No new packages.**
5. Writes `src/generated/banners.json` — `slug → data:image/png;base64,…`,
   roughly 1.5–2KB per entry.

`src/generated/` is gitignored. The file is a build artefact, on the same
reasoning `generate-og.mjs` gives for writing to `dist/` rather than `public/`:
generated binaries do not belong in the repo.

### 5.3 Why a prebuild step

The data URIs must exist *before* `vite-react-ssg` prerenders, because
`Banner.tsx` imports them. `generate-og.mjs` runs *after* the build. So the
generator cannot simply be folded into the existing post-build chain.

`package.json` gains a `prebuild` script, and `build` becomes:

```
node scripts/generate-banners.mjs
  && vite-react-ssg build
  && node scripts/generate-og.mjs
  && node scripts/generate-feeds.mjs
```

`build:dev` gains the same first step. `dev` also needs it, or the component
imports a missing file — the plan should make `generate-banners.mjs` idempotent
and cheap enough to run unconditionally, and document how a fresh clone gets
the file before `npm run dev`.

This build-step cost is the price of the pixel direction and is named here so
it is not discovered during implementation.

### 5.4 `<Banner post>` — `src/components/notes/Banner.tsx`

Imports `banners.json`, looks up the slug, renders:

```jsx
<div className="pf-banner pf-bleed">
  <img src={dataUri} alt="" aria-hidden="true" />
</div>
```

Inlined, so zero network requests and no pop-in above the fold. `alt=""` plus
`aria-hidden` — it is decoration, and the word duplicates context the eyebrow
and H1 already carry.

CSS: `image-rendering: pixelated`, `width: 100%`, `height: 100%`,
`object-fit: cover`, `object-position: left center` — so the word's tail is what
gets cropped, at every width. A cream border on the plate, and the 24px cream
left edge.

If a slug is missing from `banners.json`, the component renders nothing rather
than a broken image. The check in §8 is what catches a genuinely missing
banner.

### 5.5 OG card

The neon plate becomes a band across the top ~40% of the 1200 × 630 card, with
the existing eyebrow chip and title on ink below it. Not artwork behind the
title at reduced opacity: neon in a social feed is an asset, and a title
fighting it is not.

`generate-og.mjs` reads the same `banners.json` and passes the data URI to
satori as an `<img>`. The card's existing eyebrow, title and cream left edge
are otherwise unchanged.

## 6. Placement

`<Banner>` renders inside `PostHeader`, above the eyebrow row, on the existing
`.pf-bleed` class from the frame spec. **No grid work at all** — it consumes
the track that already exists.

- Height `clamp(96px, 14vw, 200px)`, `overflow: hidden`.
- Below 1200px `--bleed` collapses to zero and the banner is content-width.
  Same markup, no media query of its own beyond the clamp.
- `display: none` in print. A neon plate on paper is a solid block of toner.

## 7. Files touched

New:

- `scripts/generate-banners.mjs`
- `scripts/generate-banners.test.mjs`
- `src/components/notes/Banner.tsx`
- `src/generated/banners.json` (generated, gitignored)

Modified:

- `package.json` — `prebuild` step, and `build` / `build:dev` chains
- `.gitignore` — `src/generated/`
- `src/components/notes/PostHeader.tsx` — render `<Banner>`
- `src/styles/notes.css` — `.pf-banner`
- `scripts/generate-og.mjs` — neon band across the top of the card
- `scripts/check-notes.mjs` — the built-output assertions in §8

## 8. Verification

Unit, against the generator:

1. **Determinism** — two runs for the same slug produce a byte-identical PNG;
   two different slugs produce different PNGs.
2. **Palette** — asserted on the cell array rather than on decoded PNG bytes,
   because that is where the rule lives and the array is what the rule
   produces: every cell value indexes the §4.1 table, and the table contains
   neither `#0E7A45` nor `#35D48A`.
3. **Two hues** — the field's `primary` and `secondary` are distinct and both
   drawn from the three neon indices, and the gold index is present in the
   cells (the horizon line). The word's fixed cyan/magenta fringe is outside
   this rule, per §4.1.
4. **Tracking** — for every word in the corpus the per-character advance
   exceeds the glyph width, so no two letters overlap.
5. **The word** — the drop path uses `keyword`, not the stream name; an unknown
   stream throws; every character of every word has a glyph in the bitmap font.

Against the built `dist/`, as new assertions in `scripts/check-notes.mjs`:

6. Every published post's HTML contains exactly one `.pf-banner`, whose `img`
   `src` is a `data:image/png;base64,` URI.
7. No new network request — the count of non-data `<img src=` in any post page
   is unchanged from before this pass.
8. Each inlined banner is under 8KB of base64, so the page-weight cost stays
   bounded. The budget is deliberately loose: dithered noise compresses badly,
   and the actual figure is measured and reported rather than guessed.
9. All twelve OG PNGs regenerate, each 1200 × 630.
10. Notes route chunk size delta reported; still no GSAP, no Lenis.
11. Rendered at 1600 / 1280 / 1024 / 375 — the word is clipped by the right
    edge at every width, the pixels stay square, and no page scrolls
    horizontally at 375.

## 9. Explicitly out of scope

- Thumbnails on `FeedCard` and a hero on `/notes`. Deferred by decision 3; the
  generator is what makes them cheap later.
- Any neon anywhere outside the banner frame. See §3.
- Hand-drawn pixel illustration — figurative scenes, characters, mascots. Those
  are art, not generated output, and no amount of seeded code produces them.
- Banners on the portfolio route (`/`). This is a notes system.
