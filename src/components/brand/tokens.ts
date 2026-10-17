import type { CSSProperties } from 'react';

/**
 * Bit's Quest tokens for every page except the portfolio.
 *
 * Same API as `components/portfolio/tokens.ts`, so a page rebrands by changing
 * its import and nothing else; the portfolio keeps the old module untouched.
 * Values come from `design/bits-quest/tokens/`: off-white paper, ink borders,
 * one brand red that does the shouting, yellow only on dark panels.
 */
export const c = {
  ink: '#121212',
  paper: '#fafafa',

  /** Panels: white cards on the graph-paper page, edged in ink. */
  accent: '#ffffff',
  accentEdge: '#121212',

  /** Small-type accent: arcade yellow on ink panels, brand red on paper. */
  mark: '#ffd60a',
  markOnPaper: '#d42e24',
  /** Brand red: buttons, fills, Bit's body. */
  shell: '#d42e24',

  /** Status hue, reserved for availability claims. */
  signal: '#0E7A45',
  signalOnInk: '#35D48A',

  dim: '#525252',
  dimOnInk: '#a3a3a3',
  rule: '#2a2a2a',
  ruleSoft: '#3a3a3a',
  plate: '#121212',
  bright: '#f5f5f5',
} as const;

export const mono = "'JetBrains Mono', ui-monospace, monospace";
/** Reading face: body copy, card text. */
export const display = "'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif";
/** Pixel display face for headings and prices. Weight 400 only, never synthesized bold. */
export const pixel = "'Jersey 10', system-ui, sans-serif";
/** Tiny uppercase labels, nav and button labels. Keep short. */
export const pixelLabel = "'Press Start 2P', ui-monospace, monospace";

/** Kept for call-site compatibility; Jersey 10 has no width axis. */
export const stretch = { bleed: 125, display: 118 } as const;

/** Border weights: 2px component edge, 3px section joint. */
export const rule = { hair: 2, base: 2, edge: 3 } as const;

/** Space scale (px), 4-based. Index is the step, so `s[6]` is 24px. */
export const s = [0, 4, 8, 12, 16, 20, 24, 28, 36, 44, 56, 72, 88, 112] as const;

export const gutter = 40;
export const sectionY = { top: s[11], bottom: s[11] } as const;

export const px = (...n: number[]) => n.map((v) => `${v}px`).join(' ');

/** Hard offset shadows, no blur. */
export const shadow = {
  sm: `4px 4px 0 ${c.ink}`,
  md: `6px 6px 0 ${c.ink}`,
  lg: `8px 8px 0 ${c.ink}`,
  brand: `6px 6px 0 ${c.shell}`,
} as const;

/**
 * Display ramp for Jersey 10, which sets tall and narrow: h1 tops out at 74px
 * and h2 at 52px in the design, so the ramp is pinned to those.
 */
const RAMP = {
  d0: { max: 120, min: 48 },
  d1: { max: 74, min: 40 },
  d2: { max: 64, min: 36 },
  d3: { max: 52, min: 34 },
  d4: { max: 42, min: 30 },
  d5: { max: 30, min: 26 },
  d6: { max: 29, min: 24 },
  d7: { max: 24, min: 19 },
} as const;

export type Step = keyof typeof RAMP;

const CAP_CQW = 1240;
const CAP_VW = 1440;

export const heading = (
  step: Step,
  opts: { stretch?: number; vw?: boolean; fixed?: boolean; weight?: 800 | 900 } = {},
): CSSProperties => {
  const r = RAMP[step];
  const cap = opts.vw ? CAP_VW : CAP_CQW;
  const fluid = `${((r.max / cap) * 100).toFixed(2)}${opts.vw ? 'vw' : 'cqw'}`;
  return {
    fontFamily: pixel,
    fontWeight: 400,
    fontSize: opts.fixed ? r.max : `clamp(${r.min}px, ${fluid}, ${r.max}px)`,
    lineHeight: 0.98,
    letterSpacing: 0,
  };
};

/** Button labels: the pixel label face, uppercase, at 11–13px. */
export const buttonType = (size = 16): CSSProperties => ({
  font: `400 ${Math.min(13, Math.max(11, Math.round(size * 0.75)))}px/1.5 ${pixelLabel}`,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
});

/**
 * Pixel label for eyebrows, nav and metadata. Press Start 2P is wide, so sizes
 * are cut by a fifth and floored at 9px (the design's minimum).
 */
export const label = (size: number, _weight: 500 | 600 | 700 = 700, _tracking = 0.14): CSSProperties => ({
  font: `400 ${Math.max(9, Math.round(size * 0.82))}px/1.5 ${pixelLabel}`,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
});
