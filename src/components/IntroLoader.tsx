import { useEffect, useRef } from 'react';
import { c, gutter, heading, mono, px, rule, s, stretch } from './portfolio/tokens';

interface IntroLoaderProps {
  onLoadingComplete: () => void;
}

const COUNT_MS = 1300;
const HOLD_MS = 200;
const WIPE_MS = 460;
const SLIDE_MS = 620;

/**
 * Cold open: the name sits outlined on black while a counter and rule fill,
 * then an accent panel wipes up in steps and carries the whole plate off the
 * top. The page renders underneath from the first frame, so the wipe reveals
 * the real hero rather than a blank.
 */
const IntroLoader = ({ onLoadingComplete }: IntroLoaderProps) => {
  const plateRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);

  const doneRef = useRef(onLoadingComplete);
  doneRef.current = onLoadingComplete;

  useEffect(() => {
    const plate = plateRef.current;
    const pctEl = pctRef.current;
    const bar = barRef.current;
    const wipe = wipeRef.current;
    if (!plate || !pctEl || !bar || !wipe) return;

    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    let raf = 0;
    const timers: number[] = [];

    const cleanup = () => {
      plate.style.display = 'none';
      html.style.overflow = prevOverflow;
      doneRef.current();
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cleanup();
      return;
    }

    bar.style.transition = 'transform 1.3s cubic-bezier(.65,0,.35,1)';
    raf = requestAnimationFrame(() => {
      bar.style.transform = 'scaleX(1)';
    });

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      pctEl.textContent = String(Math.round(eased * 100)).padStart(2, '0');

      if (p < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }

      raf = 0;
      timers.push(
        window.setTimeout(() => {
          wipe.style.transition = 'transform .5s steps(7,end)';
          wipe.style.transform = 'translateY(0)';

          timers.push(
            window.setTimeout(() => {
              plate.style.transition = 'transform .6s cubic-bezier(.7,0,.3,1)';
              plate.style.transform = 'translateY(-100%)';
              timers.push(window.setTimeout(cleanup, SLIDE_MS));
            }, WIPE_MS),
          );
        }, HOLD_MS),
      );
    };
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      timers.forEach(window.clearTimeout);
      html.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      ref={plateRef}
      data-loader="1"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: c.ink,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: px(s[6], gutter),
          font: `700 11px/1 ${mono}`,
          letterSpacing: '.16em',
          color: c.dim,
        }}
      >
        <span>PORTFOLIO · 2026 EDITION</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: s[2] }}>
          <span
            style={{
              width: 8,
              height: 8,
              background: c.accent,
              display: 'block',
              animation: 'pf-blink 1.6s steps(1,end) infinite',
            }}
          />
          LOADING ASSETS
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: px(0, gutter),
        }}
      >
        <div
          data-loader-word="1"
          style={{
            ...heading('d0', { stretch: stretch.bleed, vw: true }),
            color: 'transparent',
            WebkitTextStroke: '1.5px #fff',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          ANADI
          <br />
          THAKUR
        </div>
      </div>

      <div style={{ padding: px(0, gutter, s[7]) }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: s[3],
          }}
        >
          <span ref={pctRef} style={{ ...heading('d4', { vw: true }), color: '#fff' }}>
            00
          </span>
          <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: c.dim }}>
            INITIALIZING RENDER
          </span>
        </div>
        <div style={{ height: rule.edge, background: c.rule, position: 'relative' }}>
          <div
            ref={barRef}
            style={{
              position: 'absolute',
              inset: 0,
              background: c.accent,
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
            }}
          />
        </div>
      </div>

      <div
        ref={wipeRef}
        style={{
          position: 'absolute',
          inset: 0,
          background: c.accent,
          transform: 'translateY(100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default IntroLoader;
