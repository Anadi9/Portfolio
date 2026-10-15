# Prompt to paste into Claude Code

> Copy everything below the line. Change the folder path if you unzipped somewhere else.

---

I want to rebuild my site's UI to match the **Bit's Quest** design in `design/bits-quest/`. Read `design/bits-quest/README.md` first.

**Goal:** adopt this design and page structure in *this* codebase, using our existing framework, routing, component conventions and styling approach. Don't paste the prototype HTML in; rebuild it as proper components.

**Sources, in priority order:**
1. `screenshots/light/*` (desktop + mobile): match these visually.
2. `snapshots/*.html`: exact structure, spacing, font sizes, borders, shadows and copy per section.
3. `tokens/`: add `tokens.css` globally (or the Tailwind preset if we use Tailwind) and use the variables. Don't hard-code colours.
4. `content/site-content.json` and `content/page-copy.md`: data and copy. Keep content in a data file, not hard-coded in JSX.
5. `content/bit-logic.reference.js`: behaviour for Bit's chat, the 4 qualification questions, recommendations, package builder and tracking board.
6. `sprites/`: Bit poses and pixel icons as SVG components.

**Plan before coding.** Inspect our repo, then propose:
- where the tokens and fonts go;
- the component list (Nav, Hero + MenuBoard, BitChat, BugFixDemo, Services, SampleReport, ProcessTimeline, AuditChecklist, Pricing, PackageBuilder, TrackingBoard, FreeTools, Blog, About, FAQ, Footer, BitDock, BitTour, PixelSprite);
- what we already have that can be reused, and what's new.

Wait for my OK before building.

**Build order:**
1. Tokens + fonts + page background.
2. Nav + Hero (static menu board first).
3. Static sections in page order.
4. Pricing from data.
5. Bit's chat as a small state machine from `nodes()`/`reply()`/`classify()` in the logic file.
6. Package builder, tracking board, dock, tour.
7. Animations last, with `prefers-reduced-motion` support.

**Rules:**
- Light theme is the default. Dark theme via `data-theme="dark"`.
- Square corners, 2–3px ink borders, hard offset shadows, 40px grid background.
- Jersey 10 / Space Grotesk / Press Start 2P (labels only, kept short).
- Professional, friendly wording: no game jargon. "Bit's Quest" is only the brand name.
- Responsive down to 390px; touch targets ≥ 44px; keyboard accessible; Bit SVGs get `role="img"` + `aria-label`; decorative pixel art gets `aria-hidden`.
- Forms (first-bug request, contact) should post to our real backend or a clearly marked TODO, never fake success.

After each step, run the app and compare against the matching screenshot before moving on.
