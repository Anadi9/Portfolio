# Terminal Head Kit — anadithakur.in

Everything for the Terminal Head mascot: React component, ready-made website components, standalone animated SVGs, PNGs, favicons and two preview pages.

## What's inside

```
terminal-head-kit/
├── react/
│   ├── TerminalHead.tsx      ← the mascot component (faces, shapes, props, modes, motion)
│   ├── terminal-head.css     ← colour tokens, 4 modes, all animations
│   └── TerminalHeadUI.tsx    ← website components: NavLogo, LoadingButton, Toast, Field,
│                               EmptyState, PricingCard, NotFound, ContactHello,
│                               FooterSignoff, StatusBadge, ScanStatus
├── svg/                      ← standalone animated SVGs (open in a browser, use as <img>)
│   ├── shapes/{crt,flat,tv,laptop}/{face}.svg     48 files
│   ├── modes/{signal,night,mono,phosphor}/{face}.svg   48 files
│   └── loadouts/{lens,wrench,clipboard,shield}.svg
├── png/                      ← 400×400 transparent stills (social, decks, docs)
│   ├── faces/  shapes/  loadouts/  modes/
├── favicon/                  ← favicon.svg + 16/32/48 PNG, apple-touch-icon 180, icon 192/512
├── preview/
│   ├── gallery.html          ← every face, shape, loadout, mode and motion, animated
│   └── ui-kit.html           ← website layouts: nav, hero, buttons, toasts, form, scan, pricing, empty, 404, contact, footer
└── GUIDE.md                  ← rules: which face where, motion timings, do & don't
```

Open `preview/gallery.html` and `preview/ui-kit.html` in a browser first.

## Add to your project (React / Next.js / Vite)

1. Copy the `react/` folder to `src/components/terminal-head/`.
2. Copy `favicon/` contents to `public/` and add to your `<head>`:
   ```html
   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
   <link rel="icon" href="/favicon-32.png" sizes="32x32">
   <link rel="apple-touch-icon" href="/apple-touch-icon.png">
   ```
3. Load the fonts the UI components use (or swap for yours): Pixelify Sans, Silkscreen, Instrument Sans, JetBrains Mono from Google Fonts.
4. Use it:
   ```tsx
   import { TerminalHead } from '@/components/terminal-head/TerminalHead';
   import { NavLogo, LoadingButton, Toast, NotFound } from '@/components/terminal-head/TerminalHeadUI';

   <TerminalHead face="scan" prop="lens" size={120} />
   <LoadingButton loading={pending}>Run a free scan →</LoadingButton>
   ```

**Next.js App Router:** `TerminalHead` works in Server Components. `TerminalHeadUI.tsx` uses `useState` (NavLogo), so add `'use client';` at its top. If your setup forbids CSS imports from components, remove `import './terminal-head.css'` and import it once in `app/layout.tsx`.

**Not using React?** Use the files in `svg/` directly — each is self-contained and animated: `<img src="/mascot/prompt.svg" width="80" alt="">`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `face` | prompt, think, scan, found, error, fix, fixed, happy, love, sleep, hello, lost | prompt |
| `shape` | crt, flat, tv, laptop | crt |
| `prop` | none, lens, wrench, clipboard, shield (not drawn on `tv`) | none |
| `size` | px — multiples of 20 keep pixels square (favicon art excepted) | 80 |
| `motion` | idle, still, hop, peek, type | idle |
| `mode` | signal, night, mono, phosphor | inherits |
| `label` | screen-reader text; `""` = decorative | "Terminal Head, {face}" |

Changing `face` replays a short screen flicker automatically. To replay `hop` on demand, change the component's `key`.

## Prompt for Claude Code

Paste this into Claude Code from your repo root after copying the files in:

> I added a mascot component at `src/components/terminal-head/` (TerminalHead.tsx, terminal-head.css, TerminalHeadUI.tsx — read terminal-head-kit/README.md and GUIDE.md). Prefer the ready-made components in TerminalHeadUI.tsx. Wire it into the site following these rules:
> 1. Nav logo: `<TerminalHead size={40} />` beside the wordmark `anadithakur_`; on hover switch `face` to `hello`, back to `prompt` 600ms after mouse-out.
> 2. Every async submit button: while pending, show `<TerminalHead face="think" size={28} label="" />` and the text "Working…"; keep `role="status"`.
> 3. Toasts: success uses `face="fixed" motion="hop"`, error uses `face="error"` with `role="alert"`.
> 4. Form field errors: `<TerminalHead face="error" size={26} label="" />` before the message.
> 5. Empty states: `face="sleep" size={84}` + one action link. 404 page: `shape="tv" face="lost" size={84}`.
> 6. Pricing cards: App rescue `prop="wrench" face="fix"`, Production care `prop="shield" face="fixed"`, audits `prop="clipboard" face="found"`, all `size={60}`.
> 7. Footer: `face="love" mode="night" size={72}`. Contact page: `face="hello" motion="peek" size={84}` beside the intro.
> 8. Only one animated head per viewport; others use `motion="still"`. Don't add the head to case-study body copy or legal pages.
> Replace public/favicon with favicon.svg. Show me the diff before committing.
