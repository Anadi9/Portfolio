# Bit's Quest — design handoff for anadithakur.in

This package holds the **H4 "Bit's Quest" arcade design** (light theme is primary, dark theme is included). Give it to Claude Code in your existing project and ask it to rebuild the UI in your codebase's own framework and components.

## Quick start with Claude Code

1. Unzip into your repo, e.g. `design/bits-quest/` (keep it out of your build output).
2. Open Claude Code in the repo and paste the prompt from **`CLAUDE_CODE_PROMPT.md`**.
3. To see the live, clickable prototype locally:
   ```bash
   cd design/bits-quest/preview && npx serve .     # or: python3 -m http.server
   # open http://localhost:3000/light.html  (or dark.html)
   ```
   It needs to be served over http (not opened as file://).

## What's inside

| Folder | What it is | How Claude Code should use it |
|---|---|---|
| `screenshots/light`, `screenshots/dark` | Every section, desktop (1440px) and mobile (390px), plus one full-page shot | **Visual source of truth.** Match these. |
| `snapshots/*.html` + `_shared.css` | The rendered HTML of each section with the final inline styles (light theme, default state) | Exact spacing, sizes, borders, colours, copy, structure. Translate into components; don't paste as-is. |
| `tokens/` | `tokens.css` (CSS variables + a few base classes), `tailwind.preset.js`, `tokens.json` | Drop-in design tokens. Light default, `data-theme="dark"` for dark. Includes the background / red / yellow presets. |
| `sprites/` | Bit's pixel poses (`bit-pose-*.svg`, 18×18 grid) and pixel icons (`icon-*.svg`, 9×9 grid) | Use directly as SVG components. Keep `shape-rendering="crispEdges"`. |
| `content/site-content.json` | Packages and pricing, guarantees, hero menu, audit checklist, FAQ | Feed components from this data. |
| `content/page-copy.md` | All visible copy, section by section | Copy reference. |
| `content/bit-logic.reference.js` | The prototype's full logic: Bit's conversation tree, the 4 qualification questions, recommendation rules, keyword routing, package builder, ticket and tracking board, tour | Port the **behaviour and data**, not the plumbing. |
| `source/*.dc.html` | Original prototype source files (Claude Design format) | Last-resort reference. |
| `preview/` | The runnable prototype (light.html, dark.html) | Click through the flows. |

## Page structure (top to bottom)

| # | Section id | Purpose | Key UI |
|---|---|---|---|
| — | `nav` | Sticky top bar | Logo (mini Bit + "anadi.thakur"), links: Services · Process · Pricing · Tracking · Free tools · Blog · About · FAQ, red "▶ Talk to Bit" button |
| 1 | `top` (hero) | First impression + Bit | H1 "Your app, made production-ready." · Bit pointing at a **4-option menu board** (Fix · something's breaking / Fix · get launch-ready / Build · add AI / Keep · look after my live app) · "▶ Start with Bit" · ghost button "Or: find my app's first bug — free ▶". Clicking an option turns the hero into **Bit's chat**. |
| 2 | `stomp` | Live demo · what gets fixed | A mock app with bugs; click a bug → it gets fixed in the mock; counter "bugs fixed" |
| 3 | `services` | Three pillars | Fix it · Build with AI · Keep it running; dark cards with pixel icon, list, stat chips; "Is this me? Ask Bit" + "See prices" |
| 4 | `report` | Sample audit report | Bit scan-beam scene + dark sample report (three areas) with "Run sample scan" |
| 5 | `quest` | Process · how a project runs | "Mission control × delivery run" animated timeline + project log |
| 6 | `checks` | What the audit covers | 3 columns (Reliability & security / Search & AI visibility / Privacy & compliance) with ✓ items + "CHECKED" stamp |
| 7 | `pricing` | Simple, fixed pricing | 4 guarantee badges · 4 group cards holding **6 packages** · "Build your own package" CTA |
| 8 | `board` | Request tracking | Kanban (Inbox → Bug review → Audit → Fixing → Live) + the visitor's own ticket |
| 9 | `free` | Free tools | Cards |
| 10 | `blog` | Field notes | Filterable post list |
| 11 | `about` | Who you'll work with | Bio + photo placeholder |
| 12 | `faq` | FAQ | Accordion |
| — | `footer` | Footer | Links, small labels |

A floating **mini-Bit dock** (bottom right) shows a context hint for the section in view once the hero scrolls away. **Bit's tour** walks section to section with Next/Back.

## Visual rules (keep these)

- **Fonts:** Jersey 10 for display (weight 400, never faux-bold), Space Grotesk for body, Press Start 2P for tiny uppercase labels (9–13px, short text only).
- **Shape:** square corners, 2–3px solid ink borders, hard offset shadows (4/6/8px, no blur), 40px graph-paper background.
- **Colour:** off-white page, white panels, ink #121212, **brand red** for actions and highlights, **secondary yellow** only on dark panels. One brand colour does the shouting.
- **Pixel art** stays crisp (`shape-rendering: crispEdges`, `image-rendering: pixelated`).
- **Motion:** sections fade/rise in on scroll, Bit bobs, buttons press down 4px. Respect `prefers-reduced-motion`.
- **Tone:** friendly, technical, professional. No game jargon (level, boss, stage, quest select, inventory, stomp). "Bit's Quest" is only the brand name.
- **Mobile:** single column under ~600px; pricing cards 4 → 2 → 1 columns (2 below 1240px); minimum touch target 44px.

## Still placeholders (fill in later)

Real ticket IDs and free-review counter, case studies and testimonials, the photo in About, prices for the recorded teardown and the Production Kit.
