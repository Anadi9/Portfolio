import type { THFace, THMode, THMotion, THProp, THShape } from '@/components/terminal-head/TerminalHead';
import { Bit, type BitPose } from './Bit';

export type { THFace, THMode, THMotion, THProp, THShape };

/**
 * Drop-in for `TerminalHead` that draws Bit instead, so every page that used
 * the old mascot rebrands by changing its import. Faces map onto Bit's poses;
 * `shape`, `prop` and `mode` are accepted and ignored. The portfolio still
 * imports the original component.
 */
const POSE: Record<THFace, BitPose> = {
  prompt: 'calm',
  think: 'scan',
  scan: 'scan',
  found: 'found',
  error: 'found',
  fix: 'ready',
  fixed: 'happy',
  happy: 'happy',
  love: 'wave',
  sleep: 'calm',
  hello: 'wave',
  lost: 'found',
};

export interface TerminalHeadProps {
  face?: THFace;
  shape?: THShape;
  prop?: THProp;
  size?: number;
  motion?: THMotion;
  mode?: THMode;
  /** Screen-reader label. "" (or omitted) when the text beside Bit says the same. */
  label?: string;
  className?: string;
}

export function TerminalHead({ face = 'prompt', size = 80, motion = 'idle', label, className }: TerminalHeadProps) {
  return (
    <Bit
      pose={POSE[face]}
      size={size}
      label={label || undefined}
      bob={motion === 'idle'}
      className={[motion === 'hop' || motion === 'peek' ? 'bq-rise' : '', className ?? ''].join(' ').trim() || undefined}
    />
  );
}

export default TerminalHead;
