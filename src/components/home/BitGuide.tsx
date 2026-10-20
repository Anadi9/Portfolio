import { useEffect, useRef, useState } from 'react';
import { Bit } from '@/components/brand/Bit';
import { builderMailto, PACKAGES, pickedPackages, type PackageId } from '@/lib/bit/builder';
import { trackRescue } from '@/lib/rescue/track';

/**
 * The homepage's guide pieces: the package builder (opened from the pricing
 * section or by Bit), the floating mini-Bit dock with a hint for the section
 * in view, and Bit's tour. All three talk to the rest of the page through
 * window events (`bq:builder`, `bq:tour`, `bq:chat`), so the sections and the
 * chat never import each other.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });

/* ---------------------------------------------------------------- builder */

export function PackageBuilder() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<PackageId>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent).detail as PackageId | undefined;
      setOpen(true);
      if (id) setPicked(new Set([id]));
      setTimeout(() => ref.current?.focus(), 50);
    };
    window.addEventListener('bq:builder', onOpen);
    return () => window.removeEventListener('bq:builder', onOpen);
  }, []);

  const toggle = (id: PackageId) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const chosen = pickedPackages(picked);

  return (
    <div className="hq-card hq-custom" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
        <div>
          <h3 style={{ font: '400 32px/1 var(--bq-font-display)', margin: 0 }}>Need a mix? Build your own package.</h3>
          <p className="hq-small" style={{ marginTop: 8 }}>Tick what you need — Bit writes it up for Anadi, who replies with one fixed quote.</p>
        </div>
        {!open && (
          <button type="button" className="bq-btn" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="builder">
            <span aria-hidden>▶</span> Build with Bit
          </button>
        )}
      </div>
      {open && (
        <div id="builder" ref={ref} tabIndex={-1} className="hq-builder" aria-label="Package builder">
          <fieldset>
            <legend className="hq-lab">Pick packages</legend>
            {PACKAGES.map((p) => (
              <label key={p.id} className="hq-pick" data-on={picked.has(p.id)}>
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                <span>{p.name}</span>
                <b>{p.price}</b>
              </label>
            ))}
          </fieldset>
          <div className="hq-dark hq-total" aria-live="polite">
            <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>Your package</span>
            {chosen.length === 0 ? (
              <p style={{ margin: 0 }}>Nothing picked yet.</p>
            ) : (
              <>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {chosen.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
                <p className="hq-small" style={{ color: '#c9c9c9' }}>Anadi replies with one fixed quote after the free first-bug review.</p>
              </>
            )}
            <a
              href={chosen.length ? builderMailto(picked) : undefined}
              aria-disabled={chosen.length === 0}
              className="bq-btn"
              style={chosen.length ? undefined : { opacity: 0.5, pointerEvents: 'none' }}
              onClick={() => trackRescue('cta_click', { page: 'home', location: 'builder:send' })}
            >
              <span aria-hidden>✉</span> Email it to Anadi
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- dock + tour */

const HINTS: Record<string, string> = {
  stomp: 'Want Anadi to check yours? Tap me.',
  services: 'Not sure which one? I’ll pick for you.',
  report: 'Yours looks like this — and the first bug is free.',
  quest: 'Press play — I’ll carry the ticket.',
  checks: 'Reliability, visibility and privacy — in plain business terms.',
  pricing: 'Want a custom mix? I’ll build one.',
  board: 'Want a card on this board? I can start yours.',
  free: 'Start free — the Wrapper Test takes 3 minutes.',
  blog: 'Want posts on your problem? I’ll filter them.',
  about: 'Tell me what’s broken.',
  faq: 'Not here? Ask me.',
};

const STOPS: { id: string; title: string; say: string }[] = [
  { id: 'stomp', title: 'What gets fixed', say: 'Apps built fast hide bugs like these. Click one in the demo and watch it get fixed.' },
  { id: 'services', title: 'Three services', say: 'Fix it, build with AI, keep it running. Most clients start with Fix.' },
  { id: 'report', title: 'The audit report', say: 'Three areas, one plain-English report, ranked by business impact.' },
  { id: 'quest', title: 'How a project runs', say: 'From first message to live in about eleven days. You pay half when it starts and half when it works.' },
  { id: 'checks', title: 'What gets checked', say: 'Reliability and security, search and AI visibility, privacy and compliance.' },
  { id: 'pricing', title: 'Fixed quotes', say: 'Six packages. The audit is $349; everything else gets one fixed quote.' },
  { id: 'board', title: 'Request tracking', say: 'Every request gets a ticket and a written update every day while work is in progress.' },
  { id: 'free', title: 'Start free', say: 'The first-bug video costs nothing. Neither does the Wrapper Test.' },
  { id: 'about', title: 'Meet Anadi', say: 'I take your question. Anadi reads it and does the work himself.' },
];

export function BitGuide() {
  const [section, setSection] = useState<string | null>(null);
  const [heroGone, setHeroGone] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [stop, setStop] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Which section is in view, and whether the hero has scrolled away.
  useEffect(() => {
    const hero = document.getElementById('top');
    const ids = Object.keys(HINTS);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSection(e.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    const heroIo = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting), { threshold: 0.05 });
    if (hero) heroIo.observe(hero);
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => {
      io.disconnect();
      heroIo.disconnect();
    };
  }, []);

  // The tour: started by Bit's chat or the dock.
  useEffect(() => {
    const start = () => {
      setStop(0);
      scrollTo(STOPS[0].id);
    };
    window.addEventListener('bq:tour', start);
    return () => window.removeEventListener('bq:tour', start);
  }, []);

  useEffect(() => {
    if (stop === null) return;
    barRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setStop(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);

  const go = (i: number) => {
    setStop(i);
    scrollTo(STOPS[i].id);
  };

  if (stop !== null) {
    const s = STOPS[stop];
    return (
      <div ref={barRef} tabIndex={-1} className="hq-tour" role="dialog" aria-label={`Bit's tour, stop ${stop + 1} of ${STOPS.length}`}>
        <Bit pose="point" size={54} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>
            Stop {stop + 1}/{STOPS.length} · {s.title}
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 15 }}>{s.say}</p>
        </div>
        <div className="hq-btnrow">
          <button type="button" className="bq-btn-ghost" onClick={() => go(stop - 1)} disabled={stop === 0}>
            ◀ Back
          </button>
          {stop < STOPS.length - 1 ? (
            <button type="button" className="bq-btn" onClick={() => go(stop + 1)}>
              Next ▶
            </button>
          ) : (
            <button
              type="button"
              className="bq-btn"
              onClick={() => {
                setStop(null);
                window.dispatchEvent(new Event('bq:chat'));
              }}
            >
              Talk to Bit ▶
            </button>
          )}
          <button type="button" className="bq-btn-ghost" onClick={() => setStop(null)} aria-label="End the tour">
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!heroGone || hidden || !section) return null;
  return (
    <div className="hq-dock">
      <button
        type="button"
        className="hq-dock-hint"
        onClick={() => {
          if (section === 'pricing') {
            window.dispatchEvent(new CustomEvent('bq:builder'));
            document.getElementById('builder')?.scrollIntoView({ block: 'center' });
          } else if (section === 'blog') {
            (document.querySelector('.hq-chips button') as HTMLButtonElement | null)?.focus();
          } else window.dispatchEvent(new Event('bq:chat'));
        }}
      >
        {HINTS[section]}
      </button>
      <Bit pose="wave" size={64} bob />
      <button type="button" className="hq-dock-x" onClick={() => setHidden(true)} aria-label="Hide Bit">
        ✕
      </button>
    </div>
  );
}
