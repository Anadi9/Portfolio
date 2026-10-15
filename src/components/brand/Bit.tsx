import type { CSSProperties } from 'react';
import { SPRITES, type SpriteName } from './sprites';

/**
 * Bit, the site's assistant, and the pixel icon set, drawn from
 * `design/bits-quest/sprites`. Pixel art stays crisp at any size; sizes that
 * are multiples of 18 (Bit) or 9 (icons) keep every pixel square.
 */
export const BIT_POSES = {
  /** Pointing at a board or checklist (hero). */
  point: 'bit-pointing',
  /** Holding the lens, scanning. */
  scan: 'bit-pose-01',
  /** Happy, arm out. */
  happy: 'bit-pose-02',
  /** Wide eyes with the lens: something found. */
  found: 'bit-pose-03',
  /** Happy, waving. */
  wave: 'bit-pose-04',
  /** Calm, eyes level. */
  calm: 'bit-pose-05',
  /** Lens, ready. */
  ready: 'bit-pose-06',
  /** Arm out, presenting. */
  present: 'bit-pose-07',
} as const satisfies Record<string, SpriteName>;

export type BitPose = keyof typeof BIT_POSES;

/** Ink icons for light panels; `dark` variants for ink panels (light + yellow). */
export const ICONS = {
  bug: 'icon-01',
  lock: 'icon-02',
  spark: 'icon-03',
  shield: 'icon-04',
  'bug-dark': 'icon-05',
  'spark-dark': 'icon-06',
  'shield-dark': 'icon-07',
  'lens-dark': 'icon-08',
  'mark-dark': 'icon-09',
} as const satisfies Record<string, SpriteName>;

export type IconName = keyof typeof ICONS;

function Sprite({
  name,
  size,
  label,
  className,
  style,
}: {
  name: SpriteName;
  size: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { size: grid, paths } = SPRITES[name];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      {...a11y}
      width={size}
      height={size}
      viewBox={`0 0 ${grid} ${grid}`}
      shapeRendering="crispEdges"
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map(([fill, d], i) => (
        <path key={i} d={d} fill={fill} />
      ))}
    </svg>
  );
}

/** Bit. Pass `label` when Bit carries meaning; omit it when text beside him says the same. */
export function Bit({
  pose = 'happy',
  size = 72,
  label,
  bob = false,
  className,
  style,
}: {
  pose?: BitPose;
  size?: number;
  label?: string;
  bob?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Sprite
      name={BIT_POSES[pose]}
      size={size}
      label={label}
      className={[bob ? 'bq-bob' : '', className ?? ''].join(' ').trim() || undefined}
      style={style}
    />
  );
}

export function PixelIcon({ name, size = 27, label, style }: { name: IconName; size?: number; label?: string; style?: CSSProperties }) {
  return <Sprite name={ICONS[name]} size={size} label={label} style={style} />;
}
