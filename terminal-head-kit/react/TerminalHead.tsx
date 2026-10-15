/**
 * Terminal Head — mascot for anadithakur.in
 * Pixel sprite drawn as inline SVG from text grids. No image assets needed.
 *
 *   <TerminalHead />                                   // idle prompt, 80px
 *   <TerminalHead face="think" size={28} />            // loading button
 *   <TerminalHead face="scan" prop="lens" size={120} />// free scan
 *   <TerminalHead face="lost" shape="tv" />            // 404
 *   <TerminalHead face="love" mode="night" />          // dark footer
 *
 * Requires ./terminal-head.css to be imported once (here or in your global CSS).
 */
import React, { useMemo } from 'react';
import './terminal-head.css';

export type THFace =
  | 'prompt' | 'think' | 'scan' | 'found' | 'error' | 'fix'
  | 'fixed' | 'happy' | 'love' | 'sleep' | 'hello' | 'lost';
export type THShape = 'crt' | 'flat' | 'tv' | 'laptop';
export type THProp = 'none' | 'lens' | 'wrench' | 'clipboard' | 'shield';
export type THMotion = 'idle' | 'still' | 'hop' | 'peek' | 'type';
export type THMode = 'signal' | 'night' | 'mono' | 'phosphor';

export interface TerminalHeadProps {
  face?: THFace;
  shape?: THShape;
  prop?: THProp;
  /** Rendered size in px. Multiples of 20 keep pixels perfectly square. */
  size?: number;
  motion?: THMotion;
  /** Colourway. Omit to inherit from a parent [data-th-mode] (or Signal Red). */
  mode?: THMode;
  /** Screen-reader label. Pass "" when the head is decorative (text beside it says the same). */
  label?: string;
  className?: string;
}

/* ---------- Face grids: 9 x 6, drawn inside the screen ----------
   e glyph · r alert · g ok · b progress bar · c cursor · u/v/x pulsing dots */
export const FACES: Record<THFace, string[]> = {
  prompt: ['.........', '.e.......', '..e......', '.e.......', '....ccc..', '.........'],
  think:  ['.........', '.........', '.u..v..x.', '.........', '.........', '.........'],
  scan:   ['.........', '.eeeeeee.', '.ebbbbbe.', '.eeeeeee.', '.........', '.........'],
  found:  ['....r....', '....r....', '....r....', '....r....', '.........', '....r....'],
  error:  ['.........', '.r.r.r.r.', '..r...r..', '.r.r.r.r.', '.........', '..rrrrr..'],
  fix:    ['..e...e..', '.e.....e.', 'e..u.v..e', '.e.....e.', '..e...e..', '.........'],
  fixed:  ['.........', '.......g.', '......g..', '.g...g...', '..g.g....', '...g.....'],
  happy:  ['.........', '..e...e..', '.e.e.e.e.', '.........', '.e.....e.', '..eeeee..'],
  love:   ['..rr.rr..', '.rrrrrrr.', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
  sleep:  ['.....eee.', '......e..', '.....eee.', '.........', '.eee.eee.', '.........'],
  hello:  ['.........', '.e.e..e..', '.e.e.....', '.eee..e..', '.e.e..e..', '.e.e..e..'],
  lost:   ['..eeee...', '.....e...', '...ee....', '...e.....', '.........', '...e.....'],
};

/* ---------- Bodies: 20 x 20. k ink · y shell · r alert · w white · q steel ---------- */
const R = (c: string, n: number) => c.repeat(n);
const BLANK = Array(6).fill('.........') as string[];
const BODY = [
  '.....kkyyyyykk......', '.....kyyyyyyyk......', '.....kyyyyyyyk......',
  '......kkkkkkk.......', '......kk...kk.......', '.....kkk...kkk......',
];

type Built = { rows: string[]; scr: [number, number, number, number]; face: [number, number] };

const pad = (rows: string[], scr: Built['scr'], face: Built['face']): Built => {
  const n = 20 - rows.length;
  return {
    rows: [...Array(n).fill(R('.', 20)), ...rows],
    scr: [scr[0], scr[1] + n, scr[2], scr[3]],
    face: [face[0], face[1] + n],
  };
};

const SHAPES: Record<THShape, () => Built> = {
  crt: () => pad([
    '..' + R('k', 15) + '...', '..k' + R('y', 13) + 'k...', '..ky' + R('k', 11) + 'yk...',
    ...BLANK.map((s) => '..kyk' + s + 'kyk...'),
    '..ky' + R('k', 11) + 'yk...', '..k' + R('y', 10) + 'ryyk...', '..' + R('k', 15) + '...',
    '.......kyyyk........', ...BODY.slice(1),
  ], [5, 3, 9, 6], [5, 3]),
  flat: () => pad([
    '.' + R('k', 17) + '..', '.k' + R('.', 15) + 'k..',
    ...BLANK.map((s) => '.k...' + s + '...k..'),
    '.k' + R('.', 15) + 'k..', '.' + R('k', 8) + 'r' + R('k', 8) + '..', '........kyk.........',
    ...BODY,
  ], [2, 1, 15, 8], [5, 2]),
  tv: () => pad([
    '.....k.......k......', '......k.....k.......',
    '..' + R('k', 15) + '...', '..k' + R('y', 13) + 'k...', '..ky' + R('k', 11) + 'yk...',
    ...BLANK.map((s) => '..kyk' + s + 'kyk...'),
    '..ky' + R('k', 11) + 'yk...', '..kyyyyyyyyykyryk...', '..' + R('k', 15) + '...',
    BODY[0], ...BODY.slice(2),
  ], [5, 5, 9, 6], [5, 5]),
  laptop: () => pad([
    '..' + R('k', 15) + '...', '..k' + R('.', 13) + 'k...',
    ...BLANK.map((s) => '..k..' + s + '..k...'),
    '..k' + R('.', 13) + 'k...', '..' + R('k', 15) + '...',
    '.k' + R('y', 15) + 'k..', '.' + R('k', 17) + '..', '........kyk.........',
    ...BODY,
  ], [3, 1, 13, 8], [5, 2]),
};

/* Props sit beside the body (CRT/TV coordinates; shifted for other shapes). */
const PROPS: Record<Exclude<THProp, 'none'>, [string[], number, number]> = {
  lens:      [['.kkk.', 'kwwwk', 'kwrwk', 'kwwwk', '.kkk.'], 14, 14],
  wrench:    [['q.q', 'qqq', '.q.', '.q.', '.q.'], 15, 14],
  clipboard: [['.kkk.', 'kwwwk', 'kkkwk', 'kwwwk', 'kkkwk', 'kkkkk'], 14, 14],
  shield:    [['kkkkk', 'kkrkk', 'krrrk', 'kkrkk', '.kkk.', '..k..'], 14, 14],
};

const overlay = (rows: string[], ov: string[], ox: number, oy: number) => {
  const out = rows.slice();
  ov.forEach((line, j) => {
    const y = oy + j;
    if (y < 0 || y >= out.length) return;
    const r = out[y].split('');
    [...line].forEach((ch, i) => { if (ch !== '.' && ox + i < 20) r[ox + i] = ch; });
    out[y] = r.join('');
  });
  return out;
};

const toPaths = (rows: string[]) => {
  const p: Record<string, string> = {};
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') p[ch] = (p[ch] || '') + `M${x} ${y}h1v1h-1z`;
  }));
  return p;
};

const BODY_CH = ['k', 'y', 'r', 'w', 'q'] as const;
const FACE_CH = ['e', 'r', 'g', 'b', 'c', 'u', 'v', 'x'] as const;

export function TerminalHead({
  face = 'prompt', shape = 'crt', prop = 'none', size = 80,
  motion = 'idle', mode, label, className = '',
}: TerminalHeadProps) {
  const body = useMemo(() => {
    const b = SHAPES[shape]();
    let rows = b.rows;
    // Props are designed for crt / flat / laptop. The TV is a special-occasion shape and stays prop-free.
    if (prop !== 'none' && shape !== 'tv') {
      const [ov, ox, oy] = PROPS[prop];
      // body bottom is always row 19, so the same coordinates work for these shapes
      rows = overlay(rows, ov, ox, oy);
    }
    return { ...b, p: toPaths(rows) };
  }, [shape, prop]);

  const fp = useMemo(() => toPaths(FACES[face]), [face]);
  const decorative = label === '';
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': label ?? `Terminal Head, ${face}` };

  return (
    <span
      className={`th th--${face} th--m-${motion} ${className}`.trim()}
      data-th-mode={mode}
      style={{ width: size, height: size }}
      {...a11y}
    >
      <svg viewBox="0 0 20 20" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <g className="th-spr">
          <rect className="th-glass" x={body.scr[0]} y={body.scr[1]} width={body.scr[2]} height={body.scr[3]} />
          {BODY_CH.map((ch) => body.p[ch] && <path key={ch} className={`th-c-${ch}`} d={body.p[ch]} />)}
          {/* key={face} remounts the screen on every face change, replaying th-swap */}
          <g key={face} className="th-face" transform={`translate(${body.face[0]} ${body.face[1]})`}>
            {FACE_CH.map((ch) => fp[ch] && <path key={ch} className={`th-f-${ch}`} d={fp[ch]} />)}
          </g>
        </g>
      </svg>
    </span>
  );
}

export default TerminalHead;
