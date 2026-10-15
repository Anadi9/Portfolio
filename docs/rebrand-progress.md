# Bit's Quest rebrand: progress

Branch: `repositioning`. Source design: `design/bits-quest/` (copied from `~/Downloads/bits-quest-design`;
read its `README.md`). New positioning: **"Your app, made production-ready."** Three services:
Fix (audit $349 → Launch-ready sprint / Full rescue), Build with AI (AI build / MVP build),
Keep it running (Care $299/mo). AI visibility and privacy (GDPR · CCPA · DPDP) are **audit areas**,
not standalone services. Bit is the AI assistant mascot; Anadi does the work.

## Scope for tonight: reposition + rebrand only

**Hard rules (every iteration):**
- **Do not touch the portfolio** (portfolio.anadithakur.in): `src/pages/Home.tsx`, `src/pages/Index.tsx`,
  `src/components/portfolio/*` (incl. `tokens.ts`), `src/styles/portfolio.css`, `IntroLoader.tsx`,
  `use-portfolio-motion.ts`, the `/portfolio` route. Shared components it imports (`Testimonials`, `Seo`)
  must render unchanged on the portfolio.
- No architecture changes: no new/removed routes, no API or form-backend changes, no redirects, no deletions.
  (Cleanup and the cut list are tomorrow's job.)
- No Bit chat state machine, package builder, tour or dock. Those are development work for tomorrow. Hero menu
  options and "Talk to Bit" link to existing flows (`/audit?type=app`, `#pricing`, etc.).
- Forms keep posting to their real backends. Never fake success.
- Don't run anything from `design/bits-quest/` (reference only). It's excluded from lint.
- Each milestone ends with `npx vitest run` + `npm run build` green, a visual check (desktop 1440 + mobile 390)
  where UI changed, and one commit. Nothing is pushed or deployed.

## Approach

`src/components/brand/tokens.ts` mirrors the API of `portfolio/tokens.ts` (`c`, `display`, `pixel`,
`pixelLabel`, `mono`, `heading`, `label`, `buttonType`, `s`, `px`, `rule`, …) with Bit's Quest values
(Jersey 10 / Space Grotesk / Press Start 2P, #fafafa paper, #d42e24 brand, square, hard shadows).
Every non-portfolio file switches its import to it. The portfolio keeps the old module.

## Milestones

- [x] **1. Foundation**: copy design into `design/bits-quest/`, eslint ignore; fonts in `index.html`;
  `src/styles/brand.css` (tokens.css vars, `.bq-*` classes, grid background scoped to `.bq-page`);
  `src/components/brand/tokens.ts`; `Bit` sprite + `PixelIcon` components from `sprites/`.
- [x] **2. Site chrome**: rebuild header/footer in `components/site/kit.tsx` to the design (logo mini-Bit +
  "anadi.thakur", nav, red "▶ Talk to Bit"). Bit replaces Terminal Head on every page (keep call sites
  working). Bit favicons. Switch all non-portfolio imports to brand tokens.
- [x] **3. Homepage** (`Hub.tsx`): all 13 sections from `content/site-content.json` + `page-copy.md`, as data in
  `src/data/bitsQuest.ts`: hero + static menu board, bug-fix demo (simple click state), services, sample report,
  process timeline (static), audit checklist, pricing (4 groups / 6 packages + guarantees), tracking board
  (sample tickets), free tools (real routes), blog (real notes), about (real portrait), FAQ (+FAQPage JSON-LD).
- [ ] **4. Reposition the service pages**: `/production-ready`, `/ai-visibility`, `/dpdp`, `/audit`: copy and prices
  aligned to the new packages; AI visibility and DPDP framed as audit areas and Care re-checks.
- [ ] **5. Reskin tools and content**: teardown, scan, ai-readiness, dpdp/check, kit + legal pages, notes, work,
  review, 404.
- [ ] **6. Meta and copy**: `index.html`/`Seo` defaults, `lib/schema.ts` descriptions, `public/llms.txt`, OG
  defaults to the new promise.
- [ ] **7. QA pass**: every route at 1440 and 390 against `design/bits-quest/screenshots/light`; contrast, 44px
  targets, keyboard focus, reduced motion; portfolio route unchanged.

## Left for tomorrow
Bit chat + 4 qualification questions, package builder, interactive tracking, dock, tour, dark theme toggle,
Build with AI / Care pages + checkout, route cleanup (see earlier relevance audit), placeholders (About photo
choice, testimonials, teardown and Kit prices in the free-tools cards).

## Log
- M1: design copied to `design/bits-quest/` (vendor bundle dropped), fonts + `styles/brand.css` (scoped to `.bq-page`), `brand/tokens.ts` (portfolio-compatible API), `brand/Bit.tsx` + generated `brand/sprites.ts`. Tests 479/479, build green.
- M2: 52 non-portfolio files switched to `brand/tokens`, `brand/BitHead` (Bit drop-in for `TerminalHead`) and `brand/BitUI`. New sticky header (mini Bit + anadi.thakur, 8 section links, ▶ Talk to Bit → `/audit?type=app`), paper footer with services / free tools / audit areas, brand CTA/cards/headings in `site/kit.tsx`; `PaperPage` drops the per-page `--pp` theme and uses `.bq-page`. **Favicons left as-is**: they are shared with portfolio.anadithakur.in (tomorrow: host-specific icons). `Testimonials` still draws Terminal Head (shared with the portfolio). Portfolio checked unchanged. Tests 479/479, build green; lint errors are the 2 pre-existing shadcn ones.
- M3: `Hub.tsx` rebuilt as the Bit's Quest homepage: 12 sections in `components/home/sections.tsx`, content in `data/bitsQuest.ts`, layout in `styles/home.css`. Working bug-fix demo (4 bugs, live counter), "Run sample scan" on the report, blog filter over 8 real posts (curated, not the MDX index, to keep the corpus out of the homepage chunk). JSON-LD: WebSite + Fix/Build/Care `Service` nodes with USD offers + FAQPage. CTAs without a backend yet go to real places: Fix → `/audit?type=app`, Build/Care/custom → email with a subject. Process is a static 6-stop timeline + example log (the animated "mission control" run is tomorrow). Testimonials dropped from the homepage (design has none yet). Checked at 1440 and in a 390px frame (no overflow); tests 479/479, build + `npm run check` green.
