# Terminal Head — Mascot System & Usage Guide

Terminal Head is the one mascot for anadithakur.in: a pixel-art robot whose head is a terminal screen. The body never changes; only the screen does.

**The one rule:** the head appears only where something is happening — loading, scanning, success, error, empty, lost, hello. Content pages (case studies, long copy, legal) stay clean.

## Construction

- 20 × 20 pixel grid; the face is a 9 × 6 window inside the screen.
- Render with `shape-rendering: crispEdges`; scale in whole multiples (20, 40, 60, 80, 100, 120, 200px).
- Favicon is a separate 16 × 16 drawing (head only). Don't shrink the full sprite below 32px except inside buttons/toasts.

| Token | Hex | Used for |
| --- | --- | --- |
| `--th-ink` | #121212 | Outlines |
| `--th-shell` | #d42e24 | Head and body shell |
| `--th-glass` | #1b1b1b | Screen background |
| `--th-glyph` | #f2f0ea | Face pixels, cursor |
| `--th-alert` | #ff5a4e | Findings, errors, love |
| `--th-ok` | #5fd38d | Fixed tick only |
| `--th-steel` | #8a8a83 | Wrench prop |

## The 12 faces

| Face | Screen | Meaning | Where | Motion |
| --- | --- | --- | --- | --- |
| `prompt` | `>` + blinking cursor | Ready, idle | Hero, nav logo, default | blink + bob |
| `think` | Three dots | Working on it | Loading buttons, form submit | dots pulse |
| `scan` | Bracket with filling bar | Reading your app | Free-scan progress, audit intake | bar fills |
| `found` | Red `!` | Needs attention | Report findings, risk callouts | shake ×3 |
| `error` | Red X eyes | Something failed | Form errors, failed scan | shake ×3 |
| `fix` | `{ }` with dots | Work in progress | Progress updates, rescue timeline | dots pulse |
| `fixed` | Green tick | Done, shipped | Success toasts, handover, results | one bob |
| `happy` | Smile | Pleased | Testimonials, thank-you | bob |
| `love` | Red heart | Care, loyalty | Footer, retainers | pulse |
| `sleep` | `z` + closed eyes | Nothing yet / off-hours | Empty states, booked status | breathe |
| `hello` | "HI" | Greeting | About, contact, nav hover | bob |
| `lost` | `?` | Can't find it | 404, no results | bob |

Free-scan flow: `prompt → think → scan → found (per issue) → fixed`.

## Motion

| Name | What moves | Timing | Used with |
| --- | --- | --- | --- |
| `th-bob` | Sprite up 0.5px | 1.4s steps(2) infinite | Default idle |
| `th-blink` | Cursor on/off | 1s steps(1) infinite | prompt |
| `th-dots` | Dots fade in turn, 0.2s apart | 1.2s infinite | think, fix |
| `th-fill` | Bar 0 → 100% | 2.2s infinite | scan |
| `th-shake` | ±0.4px sideways | 0.22s × 3, then stop | found, error |
| `th-pulse` | Scale to 1.04 | 0.9s infinite | love |
| `th-breathe` | Squash 1.015 / 0.985 | 2.8s infinite | sleep |
| `th-peek` (`motion="peek"`) | Rises from bottom edge | 0.4s steps(4), once | Section enters view |
| `th-hop` (`motion="hop"`) | Jump 3px + squash | 0.5s steps(5), once | Success |
| `th-swap` | 2-frame screen flicker | 0.16s, on every face change | Automatic |
| `th-type` (`motion="type"`) | Face draws top to bottom | 0.24s steps(6), once | Hero first load |

Rules: one animated head per viewport (others `motion="still"`); never loop a shake; `prefers-reduced-motion` turns all motion off.

## Shapes & loadouts

| Shape | Use for |
| --- | --- |
| `crt` (core) | Hero, nav, all UI states — default |
| `flat` | Logo lockup, proposals, invoices, email signature |
| `tv` | 404, empty search, social posts — rare, no props |
| `laptop` | About, process, blog |

| Loadout | Prop | Face | Service |
| --- | --- | --- | --- |
| Plain | none | prompt | Homepage |
| Inspector | `lens` | scan | Free scan |
| Fixer | `wrench` | fix | App rescue ($499 / $1,200–1,800 / $2,500+) |
| Reporter | `clipboard` | found | AI Visibility & DPDP audits |
| Guardian | `shield` | fixed | Production care ($249/mo) |

## Modes

| Mode | Ink | Shell | Glass | Glyph | When |
| --- | --- | --- | --- | --- | --- |
| `signal` | #121212 | #d42e24 | #1b1b1b | #f2f0ea | Default, light theme |
| `night` | #f2f0ea | #d42e24 | #000000 | #f2f0ea | Dark mode, footer |
| `mono` | #121212 | #4a4a46 | #121212 | #f2f0ea | Print, PDFs, invoices, legal |
| `phosphor` | #0b1a10 | #2f7d5b | #06100a | #9dffb0 | Dev docs, changelog, status page |

## Page map

| Page | Head appearances | Component |
| --- | --- | --- |
| Home | Hero (`motion="type"`), status badge, pricing loadouts, footer | `StatusBadge`, `PricingCard`, `FooterSignoff` |
| Free scan | Inspector, full scan flow, success hop | `ScanStatus`, `LoadingButton`, `Toast` |
| App rescue | Fixer loadout; `fix` on current timeline step | `PricingCard service="rescue"` |
| Production care | Guardian loadout; `love` on retainer callout | `PricingCard service="care"` |
| Audits | Reporter loadout; `found` on sample findings | `PricingCard service="audit"` |
| Work / case studies | Only `fixed` beside result metrics | — |
| About | Laptop shape, `hello` | `TerminalHead shape="laptop"` |
| Contact | Hello bubble, loading button, toasts, field errors | `ContactHello`, `Field`, `Toast` |
| 404 | Retro TV, `lost` | `NotFound` |
| Proposals / invoices | Flat panel, mono | PNG/SVG from the kit |

## Do & don't

| Do | Don't |
| --- | --- |
| Show the head only where a state changes | Put it on case-study copy or legal pages |
| One animated head per viewport | Several looping heads side by side |
| Whole-multiple sizes | Fractional sizes or smooth easing on the sprite |
| One meaning per face | `love` for success or `found` for errors |
| Pair every face with words | Let the face carry a message alone |
| Label it, or `label=""` when decorative | Rely on animation to communicate |
| Keep the red shell in signal/night | Recolour per page or client |
| Use tv and laptop rarely | Make a variant the default |
