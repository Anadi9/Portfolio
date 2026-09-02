import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigation } from 'react-router-dom';
import { c, mono, px, rule, s } from './portfolio/tokens';

/** How long a navigation has to be pending before the loader is worth showing. */
const ARM_MS = 140;
/** Fade-out of the bar once the new route has landed. */
const EXIT_MS = 420;

type Phase = 'idle' | 'run' | 'done';

/**
 * Route chrome: a mini loader for every route except `/`.
 *
 * The front page has the full intro takeover; everything else used to have
 * nothing at all. Each route is a lazy chunk, and react-router holds the old
 * screen on-screen while that chunk downloads, so on a cold cache a click on
 * "NOTES" looked for a beat like it had done nothing. This fills that beat: a
 * hairline gold bar creeps across the top while the chunk is in flight, snaps
 * to full on arrival, and the incoming page fades up under it.
 *
 * `/` is deliberately excluded in both directions. Navigating *to* it hands
 * over to `IntroLoader`, which is its own full-screen curtain — two loaders for
 * one navigation is one too many.
 */
const RouteTransition = () => {
  const navigation = useNavigation();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>('idle');
  // The very first paint is prerendered HTML, not a navigation; fading that in
  // would mean shipping a page that starts invisible and hoping the animation
  // runs. The enter effect only arms once the router has actually moved.
  const [navigated, setNavigated] = useState(false);

  const target = navigation.location?.pathname;
  const pending = navigation.state === 'loading' && target !== undefined && target !== '/';

  // Mirror, so the effect below can read the current phase without re-running
  // on every phase change and restarting its own timers.
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (pending) {
      setNavigated(true);
      const arm = window.setTimeout(() => setPhase('run'), ARM_MS);
      return () => window.clearTimeout(arm);
    }

    if (phaseRef.current === 'idle') return;

    setPhase('done');
    const exit = window.setTimeout(() => setPhase('idle'), EXIT_MS);
    return () => window.clearTimeout(exit);
  }, [pending]);

  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (phase === 'run') {
      // The chunk's arrival time is unknowable, so the bar eases towards 90%
      // and waits there rather than pretending to a percentage it doesn't have.
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0.04)';
      void bar.offsetWidth;
      bar.style.transition = 'transform 1.8s cubic-bezier(.16,.84,.3,1)';
      bar.style.transform = 'scaleX(0.9)';
      return;
    }

    if (phase === 'done') {
      bar.style.transition = 'transform .2s cubic-bezier(.7,0,.3,1)';
      bar.style.transform = 'scaleX(1)';
    }
  }, [phase]);

  const showEnter = navigated && location.pathname !== '/';

  return (
    <>
      {phase !== 'idle' && (
        <div
          data-route-loader="1"
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            pointerEvents: 'none',
            opacity: phase === 'done' ? 0 : 1,
            transition: `opacity .26s ease ${phase === 'done' ? '.14s' : '0s'}`,
          }}
        >
          <div style={{ height: rule.base, overflow: 'hidden' }}>
            <div
              ref={barRef}
              style={{
                height: '100%',
                background: c.mark,
                transform: 'scaleX(0)',
                transformOrigin: 'left center',
              }}
            />
          </div>

          <div
            style={{
              position: 'fixed',
              right: s[5],
              bottom: s[5],
              display: 'flex',
              alignItems: 'center',
              gap: s[2],
              padding: px(s[2], s[3]),
              background: c.ink,
              color: c.bright,
              font: `700 10px/1 ${mono}`,
              letterSpacing: '.14em',
            }}
          >
            <span
              data-route-loader-dot="1"
              style={{
                width: 6,
                height: 6,
                background: c.mark,
                display: 'block',
                animation: 'pf-blink 1.2s steps(1,end) infinite',
              }}
            />
            LOADING
          </div>
        </div>
      )}

      {/*
        Keyed on the path so the fade restarts per navigation. Opacity only:
        a transform here would turn this wrapper into the containing block for
        every `position: fixed` child a page has, and the rail would ride the
        animation with it.
      */}
      <div key={location.pathname} className={showEnter ? 'pf-route-enter' : undefined}>
        <Outlet />
      </div>
    </>
  );
};

export default RouteTransition;
