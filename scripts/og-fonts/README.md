Static TTF instances pulled from Google Fonts, vendored so `scripts/generate-og.mjs`
can rasterise OG cards without a network call at build time.

- `archivo-700.ttf`, `archivo-900.ttf` — Archivo, SIL Open Font License 1.1
- `jetbrainsmono-500.ttf` — JetBrains Mono, SIL Open Font License 1.1

Both faces are already loaded by `index.html` from Google Fonts for the site
itself; these copies exist only so the card matches the page it represents.
