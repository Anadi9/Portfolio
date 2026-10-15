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
- [x] **4. Reposition the service pages**: `/production-ready`, `/ai-visibility`, `/dpdp`, `/audit`: copy and prices
  aligned to the new packages; AI visibility and DPDP framed as audit areas and Care re-checks.
- [x] **5. Reskin tools and content**: teardown, scan, ai-readiness, dpdp/check, kit + legal pages, notes, work,
  review, 404.
- [x] **6. Meta and copy**: `index.html`/`Seo` defaults, `lib/schema.ts` descriptions, `public/llms.txt`, OG
  defaults to the new promise.
- [x] **7. QA pass**: every route at 1440 and 390 against `design/bits-quest/screenshots/light`; contrast, 44px
  targets, keyboard focus, reduced motion; portfolio route unchanged.

## Phase 2 (same night): decisions from Anadi

24h first-bug turnaround · keep `/ai-visibility` + `/dpdp` as audit-area pages · build chat, builder,
dock/tour, Build + Care pages, brand-only assets, animated process, dark mode · delete dead code.

**Phase 2 rules:** the phase 1 hard rules still hold (portfolio untouched, real backends only, nothing fake, one
commit per milestone, tests + build green, visual check, no push/deploy). New routes are allowed for Build with AI
and Care only. Nothing in `design/bits-quest/` is executed; `bit-logic.reference.js` is read and ported by hand.

- [x] **8. 24h turnaround + email copy**: `TURNAROUND_HOURS` → 24 for the first-bug review (the paid audit stays
  48h), every form/email/page string that promises the first-bug turnaround, "free audit" wording in
  `lib/teardown/email.ts` and `lib/audit/intake.ts` → first-bug wording; tests updated.
- [x] **9. Bit's chat**: port the conversation tree, `reply()`/`classify()` keyword routing, the 4 qualification
  questions and recommendations from `bit-logic.reference.js` into a typed state machine (`lib/bit/`, unit-tested)
  and a `BitChat` component. Hero menu options turn the hero into the chat; "Talk to Bit" opens it (other pages:
  `/?bit=1`). Hand-off is real: Fix → `/audit?type=app` prefilled; Build/Care → email with the answers. No fake
  ticket numbers.
- [x] **10. Package builder + Bit dock + tour**: "Build your own package" picker (totals, audit credit, send →
  email summary); floating mini-Bit with a hint per section in view; Bit's tour with Next/Back across sections.
  Keyboard accessible, reduced-motion safe.
- [ ] **11. Build with AI + Care pages**: `/build-with-ai` and `/care` (routes, Seo, Service JSON-LD + FAQ,
  sitemap/llms), linked from services cards, pricing, footer and llms.txt.
- [ ] **12. Animated process + dark mode**: "mission control" timeline (play/pause/replay, day counter, paid-so-far,
  log fills in) per `design/bits-quest/screenshots/*/05-quest-*`; light/dark toggle on CSS-variable surfaces
  (homepage + new pages), persisted per viewer, light default.
- [ ] **13. Brand-only assets**: Bit favicons and a new OG image served on brand pages only (route-level `<Head>`),
  brand fonts loaded from brand pages instead of `index.html`, `Testimonials` gets an opt-in Bit mascot. Portfolio
  output byte-identical apart from nothing.
- [ ] **14. Dead-code cleanup**: delete files nothing imports (unused shadcn components, `ErrorBoundary.tsx`,
  `build.log`); Terminal Head stays (portfolio uses it). One commit.
- [ ] **15. Phase 2 QA**: all routes at 390/1440, chat + builder + tour by keyboard, dark mode contrast, portfolio
  diff empty, summary.

## Left for tomorrow (after phase 2)
Bit chat + 4 qualification questions, package builder, interactive tracking, dock, tour, dark theme toggle,
Build with AI / Care pages + checkout, route cleanup (see earlier relevance audit), placeholders (About photo
choice, testimonials, teardown and Kit prices in the free-tools cards).

## Log
- M1: design copied to `design/bits-quest/` (vendor bundle dropped), fonts + `styles/brand.css` (scoped to `.bq-page`), `brand/tokens.ts` (portfolio-compatible API), `brand/Bit.tsx` + generated `brand/sprites.ts`. Tests 479/479, build green.
- M2: 52 non-portfolio files switched to `brand/tokens`, `brand/BitHead` (Bit drop-in for `TerminalHead`) and `brand/BitUI`. New sticky header (mini Bit + anadi.thakur, 8 section links, ▶ Talk to Bit → `/audit?type=app`), paper footer with services / free tools / audit areas, brand CTA/cards/headings in `site/kit.tsx`; `PaperPage` drops the per-page `--pp` theme and uses `.bq-page`. **Favicons left as-is**: they are shared with portfolio.anadithakur.in (tomorrow: host-specific icons). `Testimonials` still draws Terminal Head (shared with the portfolio). Portfolio checked unchanged. Tests 479/479, build green; lint errors are the 2 pre-existing shadcn ones.
- M3: `Hub.tsx` rebuilt as the Bit's Quest homepage: 12 sections in `components/home/sections.tsx`, content in `data/bitsQuest.ts`, layout in `styles/home.css`. Working bug-fix demo (4 bugs, live counter), "Run sample scan" on the report, blog filter over 8 real posts (curated, not the MDX index, to keep the corpus out of the homepage chunk). JSON-LD: WebSite + Fix/Build/Care `Service` nodes with USD offers + FAQPage. CTAs without a backend yet go to real places: Fix → `/audit?type=app`, Build/Care/custom → email with a subject. Process is a static 6-stop timeline + example log (the animated "mission control" run is tomorrow). Testimonials dropped from the homepage (design has none yet). Checked at 1440 and in a 390px frame (no overflow); tests 479/479, build + `npm run check` green.
- M4: `/production-ready`: new hero ("Fix it — or get it launch-ready"), tiers = $349 audit / $1,500–$2,500 sprint / $3,000–$6,000 rescue, process = first-bug video → audit → fix → live, add-ons = Care $299/mo + Build with AI from $2,000, refund guarantee, brand header/footer and red CTAs. `/audit`: "Find your app's first bug, free", chooser relabelled to the three audit areas (`TYPE_LABEL` also feeds email subjects; one test expectation updated). `/ai-visibility` and `/dpdp`: framed as audit areas, ₹ packages replaced by the USD price list, cross-links to the other two areas; `/dpdp` per-page theme removed. **Open for Anadi:** forms + emails still promise **48 hours** (`TURNAROUND_HOURS`), the design says **24h** for the first-bug video; homepage keeps the design's 24h. `SERVICES` in `site/kit.tsx` left as-is because the portfolio hero reads it. Tests 479/479, build + check green.
- M5: brand header (and footer where the page had its own) on notes + case studies (`NotesShell`, header height var → 72px), Kit + legal pages (`KitShell`), `/scan`, `/review`, `/teardown` and results (Wrapper Test keeps its dark ground). Graph-paper `.bq-page` ground on all of them. 404 rebuilt with Bit ("Bit looked everywhere", home + first-bug CTAs). Notes `ServicesCta` reframed as "First bug free" + the three audit areas (no longer reads `SERVICES`); fix-post CTA → "Find my first bug — free". Kit CTA → brand red. Tests 479/479, build + check green.
- M6: `BUSINESS_TAGLINE` + `ProfessionalService` name/knowsAbout ("Your app, made production-ready…", "Anadi Thakur · Production-ready apps"); `llms.txt` generator rewritten (Fix / Build with AI / Keep it running with USD prices, the three audit areas, Bit). Visible "free audit" CTAs on Kit, Kit thanks/downloads, AI readiness, DPDP check, scan, case studies → first-bug wording; DPDP check breadcrumb → "Privacy & compliance". **Not changed (shared with the portfolio):** `index.html` static meta (theme-color, og:image:alt), `/og.png`. **Not changed (backend emails):** `lib/teardown/email.ts`, `lib/audit/intake.ts` footer still say "free audit". `/ai-visibility` and `/dpdp` titles kept for search intent. Tests 479/479, build + check green.
- M7: swept 23 routes at 390px and 1440px in same-origin frames. Fixed a 3px overflow on every brand page at 390px (header inner row used the fixed 40px gutter; now `var(--bq-gutter)`, scoped to `.bq-page`). After the fix: no horizontal overflow anywhere, header CTA 44px tall. Contrast: brand red on paper ≈4.9:1, muted ≈7.6:1. Focus outlines + reduced-motion rules in `brand.css`. `git diff fff28d1` shows no changes to portfolio files, routes, API or `vercel.json`; `index.html` only gains the three brand fonts (also downloaded on the portfolio, which doesn't use them). Tests 479/479, build + check green; the 3 lint errors are pre-existing (shadcn `command`/`textarea`, `tailwind.config.ts`).
- M8: `TURNAROUND_HOURS` 48 → 24 (drives the form deadline, the confirmation email "by <date>" and every "within N hours" line); deadline test updated (24h out, Thu 24 Sep 3pm EST). Static first-bug promises on `/production-ready`, `/ai-visibility`, `/dpdp` → 24 hours; the paid $349 audit keeps 48 hours. Emails: Wrapper Test report CTA → "Find my first bug, free"; lead-form footer and app confirmation say first-bug review/video. Tests 479/479, build + check green.
- M9: `lib/bit/chat.ts` ports the design's conversation tree, the 4 qualification questions (3 of 4 strong → free review, else an honest "not yet"), recommendation rules (sprint / audit / AI build / Kit) and keyword routing, typed and pure; 7 tests incl. "never a fake ticket". `BitChat` replaces the hero when a menu option, "Start with Bit" or "Talk to Bit" is used (`/?bit=1` from other pages, a `bq:chat` event on the homepage); typed questions are routed too. Every ending is real: first-bug form (symptoms pre-ticked via `?s=`), an email to Anadi with the answers filled in, or a page section (blog filter via `bq:blog`; builder and tour events wired for M10). The prototype's ticket numbers and in-chat contact form were dropped. Checked at 1440 and 390 (no overflow, 44px options). Tests 486/486, build + check green.
- M10: `lib/bit/builder.ts` (6 packages, one-off range + monthly Care, $349 audit credited once a fix/build is picked with it; 4 tests). `PackageBuilder` replaces the static custom-package card: checkbox picks, live total, "Email it to Anadi" opens a real email with the picks and totals (nothing submitted from the page); opens from the button, Bit's chat or the dock (`bq:builder`). `BitGuide`: floating mini-Bit after the hero scrolls away, with the design's hint for the section in view (tap → chat, builder, or the blog filter; dismissible), and Bit's 9-stop tour (`bq:tour`) with Back/Next, focus on the bar, Escape to close, ends in the chat. Checked at 1440 and 390 (no overflow). Tests 490/490, build + check green.
