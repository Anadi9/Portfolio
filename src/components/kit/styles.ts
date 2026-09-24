import type { CSSProperties } from 'react';
import { c, display, label, px, s } from '@/components/portfolio/tokens';

/** Shared by the kit's two pages; see `KitShell`. */
export const p = {
  ink: c.ink,
  body: '#4a4a4a',
  dim: c.dim,
  gold: c.markOnPaper,
  rule: 'rgba(10,10,10,.14)',
  error: '#B3261E',
} as const;

export const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: p.gold, margin: 0 };
export const body: CSSProperties = { margin: 0, font: `400 16px/1.6 ${display}`, color: p.body, textWrap: 'pretty', maxWidth: '62ch' };
export const hint: CSSProperties = { margin: 0, font: `400 13px/1.45 ${display}`, color: p.dim };
export const cta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: s[5],
  minHeight: 56,
  padding: px(0, s[7]),
  background: c.ink,
  color: c.accent,
  border: 0,
  ...label(11, 700, 0.12),
  textDecoration: 'none',
  cursor: 'pointer',
};
