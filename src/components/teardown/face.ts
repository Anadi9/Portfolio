import type { THFace } from '@/components/terminal-head/TerminalHead';

/**
 * Terminal Head face for a wrapper-test score, on the same thresholds as
 * `BANDS` in lib/teardown/score.ts: real product (65+) gets the fixed tick,
 * a wrapper with foundations (40–64) gets `found`, a thin wrapper gets `error`.
 */
export const verdictFace = (score: number): THFace => (score >= 65 ? 'fixed' : score >= 40 ? 'found' : 'error');
