# Terminal Head theme rollout

Source of truth: `terminal-head-kit/` (README.md, GUIDE.md, `preview/ui-kit.html`).
Goal: re-skin the whole site in the Terminal Head look (warm paper, ink, signal red,
pixel display type, 2px ink borders, hard red offset shadows) and add the mascot
wherever a state changes, so the site feels interactive rather than static.

Executed by a self-paced `/loop`: each iteration takes the **first unchecked task**,
implements it, runs the checks, ticks the box and writes one line in the Log.

## Design decisions (apply everywhere)

| Area | Before | After |
| --- | --- | --- |
| Paper | `#ffffff` | `#f2f0ea` |
| Ink | `#0a0a0a` | `#121212` |
| Accent (surface) | cream `#E4DED0` | white `#ffffff` cards on paper |
| Accent (small type) | gold `#8A6A2A` / `#C9A24B` | red `#b02a20` on paper / `#ff5a4e` on ink (shell `#d42e24` for fills) |
| Status | green `#0E7A45` | keep; `#5fd38d` on ink (= `--th-ok`) |
| Display type | Archivo (wdth 118–125) | **Pixelify Sans** 700 for h1/h2, wordmark |
| Labels / eyebrows | Archivo caps | **Silkscreen** 11–12px |
| Body | Archivo | **Instrument Sans** |
| Code / data | JetBrains Mono | JetBrains Mono (unchanged) |
| Buttons | flat ink | ink fill + `4px 4px 0 var(--th-shell)` shadow; press = shadow to 0, translate 4px |
| Cards | hairline rules | `2px solid ink`, white fill, hover lifts 2px with red shadow |

Service loadouts (adapts GUIDE's old offer list to the current three services):
Production Ready = `wrench` / `fix` · AI Visibility = `lens` / `scan` · DPDP = `shield` / `fixed` · `/audit` = `clipboard` / `found`.

Mascot rules from GUIDE stay binding: one animated head per viewport (others `motion="still"`),
never on case-study body copy or legal pages, every face paired with words, `prefers-reduced-motion` off.

### Interaction layer (the "feel")
- Nav logo flips `prompt → hello` on hover; header gains an ink underline that slides to the current service.
- Buttons/cards: press states, red offset shadow, 120–160ms `steps()` transitions to match the pixel sprite.
- Sections: heads use `motion="peek"` on first scroll into view (IntersectionObserver, once).
- Async forms: `LoadingButton` (think face), `Toast` (fixed/hop or error/shake), `Field` errors.
- Tools (`/scan`, `/teardown`, `/ai-readiness`, `/dpdp/check`): `ScanStatus` flow `prompt → think → scan → found → fixed`.
- Keyboard focus: 2px red outline offset 2px on every interactive element.

## Tasks

### Phase 0: Foundation
- [x] 0.1 Copy `terminal-head-kit/react/*` to `src/components/terminal-head/`; restyle `TerminalHeadUI.tsx` to read tokens (CSS vars) instead of hard-coded hex; fix `NavLogo` timeout leak (clear on re-enter / unmount).
- [x] 0.2 Fonts: add Pixelify Sans, Silkscreen, Instrument Sans to the Google Fonts link in `index.html` (keep JetBrains Mono; drop Archivo only after Phase 2).
- [x] 0.3 Tokens: update `src/components/portfolio/tokens.ts` (`c`, `display`, add `pixel`, `label` font) per the table; add `--th-*` + `--pp-*` defaults in `src/index.css`; global focus ring + reduced-motion guard.
- [x] 0.4 Favicons: replace `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`; add 16/48/192/512 + manifest icons from `terminal-head-kit/favicon/`.
- [x] 0.5 `src/components/site/kit.tsx`: `SiteHeader` uses `NavLogo` + `StatusBadge`; `cta` gets shadow/press states; `Cards` get border + hover; `SiteFooter` becomes `FooterSignoff` style (night mode, `love`). Remove the per-page Dpdp-only theme override if it now conflicts.
- [x] 0.6 Add `useInView` hook (`src/hooks/`) for once-only `peek` reveals.

### Phase 1: Home (`/`, `src/pages/Hub.tsx`)
- [x] 1.1 Hero: `TerminalHead motion="type" size={120}` beside the headline; pixel h1; primary CTA with shadow.
- [x] 1.2 Service cards → loadout cards (`PricingCard`-style, still heads), hover/press interaction.
- [x] 1.3 Steps section: faces `prompt → think → fixed` per step, `peek` on scroll.
- [x] 1.4 Testimonials (`src/components/Testimonials.tsx`): `happy` head on the section label only; FAQ accordion with pixel chevrons.
- [x] 1.5 Verify in browser (desktop + 375px), screenshot, check one-animated-head rule.

### Phase 2: Service pages
- [x] 2.1 `/production-ready` (`Rescue.tsx`, 1184 lines with its own copies of kit parts): swap to tokens/kit where possible; Fixer loadout; `fix` on current timeline step.
- [x] 2.2 `/ai-visibility` (`AiVisibility.tsx`): Inspector loadout; `found` on sample findings.
- [x] 2.3 `/dpdp` (`Dpdp.tsx`): Guardian loadout; fold its custom palette into the new tokens.
- [x] 2.4 `/products/production-kit` + thanks pages (`ProductionKit*.tsx`, `KitThanks.tsx`, `KitDownloads.tsx`, `components/kit/KitShell.tsx`): `fixed`/`hop` on thanks, `sleep` empty state on downloads with no files.
- [x] 2.5 Remove Archivo from `index.html` once nothing references it (`grep -r Archivo src`).

### Phase 3: Forms and tools
- [x] 3.1 `/audit` (`Audit.tsx`): `LoadingButton`, `Field` errors, success/error `Toast`, Reporter head.
- [x] 3.2 `/scan` (`Scan.tsx`): full `ScanStatus` flow tied to real request state.
- [x] 3.3 `/teardown` + `/teardown/r/:score`: think/scan while running, `found` per issue, `fixed` on result.
- [x] 3.4 `/ai-readiness`, `/dpdp/check`: per-question progress head, result face by score band.
- [x] 3.5 `/review` (`Review.tsx`): loading button + toasts.

### Phase 4: Content pages (light touch: theme only, mascot rules)
- [x] 4.1 `/notes`, stream pages, post pages (`NotesIndex`, `NotePost`, `styles/notes.css`): paper/ink/red, pixel headings; `lost` empty state for a stream with no posts. No head in post bodies.
- [ ] 4.2 `/work`, `/work/:slug`: theme; `fixed` only beside result metrics.
- [ ] 4.3 `/portfolio` (`Home.tsx`, `components/portfolio/*`, `styles/portfolio.css`): theme; `laptop` + `hello` on about block.
- [ ] 4.4 Legal pages (`Legal.tsx`): theme only, **no** mascot (mono mode for any print styles).
- [ ] 4.5 404 (`NotFound.tsx`): `NotFound` component, `tv` + `lost`.
- [ ] 4.6 `IntroLoader.tsx` / `RouteTransition.tsx`: progress bar in shell red; optional `think` head in loader.

### Phase 5: Verification
- [ ] 5.1 `npm run lint`, `npm test`, `npm run build` all pass.
- [ ] 5.2 Browser sweep of every route at 1280px and 375px; contrast check on red small type; keyboard tab-through on `/` and `/audit`.
- [ ] 5.3 Write the summary of changes for review (no commit/push without the user's go-ahead).

## Per-iteration checklist
1. Read this file; take the first `- [ ]` task.
2. Implement it; keep to the surrounding code's style (inline style objects + tokens).
3. `npx tsc -p tsconfig.app.json --noEmit` and `npm run lint` on touched files; `npm test` when logic changed.
4. For visual tasks, check the page in the dev server (`npm run dev`, port 8080).
5. Tick the box, add a Log line. Do **not** commit or push.
6. If blocked (design call, failing build you can't fix), stop the loop and ask.

## Log
- 2026-10-14 · 0.1 · Copied kit to src/components/terminal-head/; UI components read --pp-* vars, use router Link, NavLogo timer cleared on unmount; LOADOUT remapped to app/ai/dpdp/audit; added FieldError, ScanStatus thinking/error stages. FooterSignoff dropped (lands in SiteFooter, 0.5). tsc + eslint clean.
- 2026-10-14 · 0.2 · Added Instrument Sans, Pixelify Sans, Silkscreen to the Google Fonts link (Archivo kept until 2.5); URL returns 200.
- 2026-10-14 · 0.3 · tokens.ts: palette to paper #f2f0ea / ink #121212 / red (mark #ff5a4e, markOnPaper #b02a20, new shell #d42e24), dim #555550; display = Instrument Sans; new pixel + pixelLabel; heading() → Pixelify 700, caps x0.82, lh ≥1.02, no negative tracking; label() → Silkscreen, tracking /3. index.css: focus ring, .th-btn/.th-card/.th-reveal states, reduced-motion guard. shadcn vars untouched (404 redo in 4.5). tsc clean.
- 2026-10-14 · 0.4 · Replaced gold-diamond favicon (recoverable from git) with kit favicon.svg + 16/32/48 PNG, apple-touch-icon, icon-192/512; added public/site.webmanifest and head links; theme-color → #f2f0ea.
- 2026-10-14 · 0.5 · kit.tsx: SiteHeader logo → NavLogo; Cards bordered white + .th-card hover; SiteFooter gains night-mode love head sign-off; footer column heads ruleSoft → mark (contrast ~1.6:1 → readable). .pf-nudge (37 CTAs) now carries the red offset shadow + press state. StatusBadge moved to the hero (1.1) to keep the header nav from crowding. Dpdp palette left for 2.3. Browser-checked / on a fresh dev server (8081): Pixelify/Silkscreen/Instrument load, header/cards/footer render. Note: the pre-existing server on 8080 serves a stale index.html (no new fonts) until restarted.
- 2026-10-14 · 0.6 · src/hooks/use-in-view.ts: once-only observer; returns revealProps (data-in only set client-side, so SSR HTML never hidden), visible, entered (for still→peek). Reduced motion / no IO → shown immediately.
- 2026-10-14 · 1.1 · Hub hero: StatusBadge (new site.available flag) above h1; 120px head on top of the sample terminal (motion=type) runs prompt → scan → found as findings type in (CSS .th-row, per-row delay, plays from SSR HTML); hover/focus a finding → found/error face. NavLogo now still at rest, wakes on hover (one animated head per viewport). Fixed a Chrome float bug freezing steps() end frames at 75- 2026-10-14 · 1.1 · Hub hero: StatusBadge (new site.available flag) above h1; 120px head on top of the sample terminal (motion=type) runs prompt → scan → found as findings type in (CSS .th-row, per-row delay, plays from SSR HTML); hover/focus a finding → found/error face. NavLogo now still at rest, wakes on hover (one animated head per viewport). Fixed a Chrome float bug freezing steps() end frames at 75%: .th-row and the kit's peek/type one-shots now use fill-mode backwards.
- 2026-10-14 · 1.2 · ServiceCard: loadout head (ai lens/scan INSPECTOR, dpdp shield/fixed GUARDIAN, app wrench/fix FIXER), still until hover/focus → hop; tag label in red.
- 2026-10-14 · 1.3 · kit Steps takes optional faces; heads peek in once the list enters view (useInView). Hub passes prompt/think/fixed. Dpdp unchanged (no faces).
- 2026-10-14 · 1.4 · Testimonials: still `happy` head beside the heading, cards get .th-card hover. FAQ marker (all paper pages + /production-ready via data-rescue-faq-sign) is now a pixel chevron mask that flips in steps and turns red when open; question text goes red on hover. /audit chip focus ring → shell red. Testimonials not visible in local dev (/api/review isn't served by Vite), so verified by typecheck only.
- 2026-10-14 · 1.5 · Browser check of /: desktop 1491px and 390px (iframe; window resize isn't honoured by this Chrome). No horizontal overflow at 390px; header, badge, hero head + terminal, service cards, step heads, FAQ, footer all render. One animated head per viewport holds (nav + cards + steps still at rest).
- 2026-10-14 · 2.1 · /production-ready: header logo → NavLogo; hero ErrorLog gets the Fixer (wrench) head, `error` → `fix` as rows flip (rests on `fix`, log stops at 3/5 by design); timeline pulled into a Timeline component: step 03 bar in shell red, 04 striped (support), `fix` head peeks on 03, numeral rows equal height; own footer gets a still night-mode `love` head. Fixed my 0.3 regression: tokens accentEdge was set to ink but all 8 uses are light panel edges → #cfcabd. Browser-checked hero + timeline.
- 2026-10-14 · 2.2 · /ai-visibility: hero gets the Inspector (lens + scan, motion=type, 160px) beside the copy, wraps under it on narrow screens; SampleReport becomes stateful: clipboard head by the 34/100 score peeks in on scroll, hovering/focusing a question swaps it to found (miss) or fixed (mention); rows get a .th-finding highlight. Browser-checked.
- 2026-10-14 · 2.3 · /dpdp: Guardian head (shield + fixed, motion=type) stands on the timeline panel; Steps get faces prompt/scan/fix/fixed. **Kept the page's own palette** (pale green / carnation / wasabi from commit 9807d32, made earlier today) instead of folding it into the site tokens: removing it is the user's call. Pixel type, buttons and mascot apply on top of it; the head stays signal red (GUIDE: don't recolour per page). OPEN QUESTION for the user: keep the DPDP palette or switch /dpdp to the site-wide paper/ink/red?
- 2026-10-14 · 2.4 · New StateHead (80px, face per page state, hop on `fixed`). /kit/thanks: think while polling → fixed when ready; sleep unpaid/refunded, lost unknown, error error. /kit/downloads: think/lost/sleep(empty or rate-limited)/error/fixed. /products/production-kit/thanks: fixed + hop. KitShell header → NavLogo. Sales page itself: theme only. Browser-checked thanks (fixed) and a bogus downloads token (lost).
- 2026-10-14 · 2.5 · Archivo dropped from the Google Fonts link (URL still 200) and from portfolio.css body (→ Instrument Sans). Left scripts/generate-cover-masters.mjs alone: it renders OG covers from a local Archivo TTF, independent of the site fonts.
- 2026-10-14 · 3.1 · /audit (Audit.tsx + AppAuditForm.tsx): field/chip errors get a 40px `error` head (.th-inline pulls it to text height; 20px was illegible); submit shows `think` head + "Sending…" (role=status) while sending; failure message gets a 40px `error` head; sent state opens with `fixed` + hop. Browser-checked the empty-submit validation path (client-side, nothing sent); sending/sent/failed states verified by typecheck only (they need a real POST).
- 2026-10-14 · 3.2 · /scan: header → NavLogo; Inspector (lens, 120px) stands on the WHAT IT CHECKS panel and follows real state via scanFace(): idle prompt → scanning scan → done found (any critical/warning) or fixed + hop (all clear) → failed error. Button shows `think` head while checking; inline ScanStatus replaces the "CHECKING YOUR TABLES…" hint; failure message gets an `error` head. Browser-checked idle state only: running a scan needs real Supabase credentials, so other states verified by typecheck.
- 2026-10-14 · 3.3 · /teardown is a quiz, not a live scan, so the head follows answers: hero head (night mode, motion=type) prompt → think once answering → verdict face when complete. New components/teardown/face.ts verdictFace() on the BANDS thresholds: 65+ fixed, 40–64 found, <40 error. Verdict (both pages) and the score-only branch of /teardown/r/:score show it by the score. Both headers → NavLogo wrapped in night mode + light --pp-ink for the dark page. Browser-checked /teardown, /teardown/r/51 (found) and /r/90 (fixed).
- 2026-10-14 · 3.4 · New scoreFace() (80+ fixed, 50–79 found, <50 error: the tools' own colour cut-offs). /ai-readiness: Inspector (lens, 160px) beside the hero follows state (prompt → scan → score face / error, hop on fixed); button `think` while checking; error line gets an `error` head; result plate has a night-mode score head. /dpdp/check: laptop-shape head in the sticky score panel, keyed by answered count so each answer replays the screen flicker; prompt → think → score face when all 13 answered. Browser-checked /ai-readiness idle and /dpdp/check after answering (think). Didn't run a live readiness check (fetches an external site).
- 2026-10-14 · 3.5 · /review: header → NavLogo; field + rating errors get the 40px inline `error` head; submit shows `think` + "Sending…" (role=status); failure message gets an `error` head; thank-you screen opens with `happy` + hop (GUIDE: happy on thank-yous). Removed the now-unused Link import (tsconfig has noUnusedLocals off, so leftovers don't fail the build; checked the other swapped files, all still use their imports). Browser-checked empty-submit validation (client-side, nothing sent).
- 2026-10-14 · 4.1 · Notes: NotesShell header → NavLogo; notes.css recoloured (gold #8a6a2a/#c9a24b → red #b02a20/#ff5a4e, #0a0a0a → #121212, cream #e4ded0 → paper, rgba ink 10 → 18) across feed cards, work cards, rail, copy buttons; empty feed shows `lost` (search miss) or `sleep` (empty stream). No head in post bodies (GUIDE). Browser-checked /notes and a /fixes post; the empty-search state wasn't reproduced in automation (typed text didn't land in the box), typecheck only. Post cover banners render black in dev because generated banners aren't present locally; unrelated to this change.
