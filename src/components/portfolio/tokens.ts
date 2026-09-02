import type { CSSProperties } from 'react';

/**
 * Design tokens for the 2026 portfolio.
 *
 * Two-tier accent: `accent` is a surface colour (large filled panels), `mark`
 * is the small-type accent. Cream reads beautifully as a field but disappears
 * as 10px text, so anything set in the accent gets `mark` / `markOnPaper`
 * depending on what it sits on.
 */
export const c = {
  ink: '#0a0a0a',
  paper: '#ffffff',

  accent: '#E4DED0',
  accentEdge: '#CFC6B2',

  mark: '#C9A24B',
  markOnPaper: '#8A6A2A',

  /**
   * Status hue: one colour, reserved.
   *
   * Nothing decorative is allowed to use it: it appears only where the page
   * makes a claim about availability (the two live dots, the open-for-work
   * badge, the "available now" milestone). That exclusivity is the whole point:
   * the gold is used often enough that a gold dot reads as ornament, and a
   * status light that reads as ornament isn't a status light. Same two-tier
   * split as `mark` / `markOnPaper`: one hue, two lightnesses, because a single
   * green can't hold contrast against both the cream and the ink.
   */
  signal: '#0E7A45',
  signalOnInk: '#35D48A',

  dim: '#6b6b6b',
  dimOnInk: '#9a9a9a',
  rule: '#2a2a2a',
  ruleSoft: '#3a3a3a',
  plate: '#0f0f0f',
  bright: '#e4e4e4',
} as const;

export const mono = "'JetBrains Mono', ui-monospace, monospace";
export const display = 'Archivo, Helvetica, sans-serif';

/**
 * Width axis. Archivo is variable on width, which makes it tempting to pick a
 * new value per block, and six of them had crept in. Exactly two settings ship, so
 * the display type reads as one voice.
 */
export const stretch = {
  /** Monumental type that fills its frame: hero name, closing headline, takeovers. */
  bleed: 125,
  /** Everything else: section headings, card titles, numerals. */
  display: 118,
} as const;

/** Border weights. hair = internal division, base = component edge, edge = section joint. */
export const rule = { hair: 1.5, base: 2, edge: 3 } as const;

/** Space scale (px), 4-based. Index is the step, so `s[6]` is 24px. */
export const s = [0, 4, 8, 12, 16, 20, 24, 28, 36, 44, 56, 72, 88, 112] as const;

/** Page gutter, and the vertical rhythm every section opens and closes on. */
export const gutter = 40;
export const sectionY = { top: s[12], bottom: s[12] } as const;

/** `px(s[12], gutter)` → `"88px 40px"`. Keeps shorthand off magic strings. */
export const px = (...n: number[]) => n.map((v) => `${v}px`).join(' ');

/**
 * Display ramp: one geometric progression (~1.34) shared by every heading, so
 * the sections scale together instead of drifting apart. Before this, six
 * headings mixed `cqw` and `vw` at unrelated rates and visibly fell out of
 * step with each other around 1200–1600px.
 *
 * The fluid term is `cqw` for in-flow headings: every section declares
 * `containerType: inline-size`, and with a 264px rail in the way viewport units
 * over-report the space a heading actually has. Steps are tuned to reach their
 * cap at the same container width, which is what keeps the ramp coordinated.
 * Fixed-position type (loader, section takeover, 404) has no container to
 * measure, so those pass `vw: true` and cap against the viewport instead.
 */
const RAMP = {
  /** full-viewport takeover */
  d0: { max: 200, min: 48, lh: 0.86, ls: -0.05 },
  /** hero name */
  d1: { max: 148, min: 40, lh: 0.84, ls: -0.05 },
  /** closing headline */
  d2: { max: 110, min: 34, lh: 0.84, ls: -0.05 },
  /** section heading */
  d3: { max: 82, min: 30, lh: 0.88, ls: -0.045 },
  /** sub-section heading */
  d4: { max: 61, min: 26, lh: 0.9, ls: -0.042 },
  /** card title, year numeral */
  d5: { max: 46, min: 24, lh: 0.94, ls: -0.038 },
  /** stat numeral */
  d6: { max: 34, min: 22, lh: 1, ls: -0.032 },
  /** standfirst */
  d7: { max: 25, min: 17, lh: 1.08, ls: -0.025 },
} as const;

export type Step = keyof typeof RAMP;

/** Widths at which a step stops growing: container for `cqw`, viewport for `vw`. */
const CAP_CQW = 1450;
const CAP_VW = 1700;

/**
 * A step off the display ramp. Size, leading and tracking always travel together.
 *
 * `fixed` opts out of the fluid term and pins the step to its cap, for type
 * inside a fixed-width component like the rail, where there is nothing sensible
 * for a percentage to measure against.
 */
export const heading = (
  step: Step,
  opts: { stretch?: number; vw?: boolean; fixed?: boolean; weight?: 800 | 900 } = {},
): CSSProperties => {
  const r = RAMP[step];
  const cap = opts.vw ? CAP_VW : CAP_CQW;
  const fluid = `${((r.max / cap) * 100).toFixed(2)}${opts.vw ? 'vw' : 'cqw'}`;
  return {
    fontFamily: display,
    fontWeight: opts.weight ?? 900,
    fontStretch: `${opts.stretch ?? stretch.display}%`,
    fontSize: opts.fixed ? r.max : `clamp(${r.min}px, ${fluid}, ${r.max}px)`,
    lineHeight: r.lh,
    letterSpacing: `${r.ls}em`,
  };
};

/**
 * Mono label: the small caps-and-tracking type used everywhere.
 *
 * Floored at 10px. The design had drifted to 8px and 9px in the rail and the
 * hero badge, which is below any reasonable legibility threshold at this
 * tracking; tracking is the lever for emphasis here, not size.
 */
export const label = (
  size: number,
  weight: 500 | 600 | 700 = 700,
  tracking = 0.14,
): CSSProperties => ({
  font: `${weight} ${Math.max(10, size)}px/1 ${mono}`,
  letterSpacing: `${tracking}em`,
});
