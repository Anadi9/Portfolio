import { useEffect, useRef, useState } from 'react';
import { Bit } from '@/components/brand/Bit';
import { process } from '@/data/bitsQuest';

/**
 * "Mission control × delivery run": a typical Launch-ready sprint played in
 * about 12 seconds. Bit carries the example ticket along six stops, the day
 * counter and "paid so far" chips advance, and the project log fills in.
 * Plays once when it scrolls into view; Pause, Replay or tap any stop. Under
 * reduced motion it starts at the end, fully filled, with the stops tappable.
 */

const LAST_DAY = 12;
/** First day of each stop, in `process.steps` order. */
const STOP_DAY = [0, 1, 2, 4, 11, 12];
/** "Where it is" chips and the stop each one is reached at. No payment stages: the site publishes no payment terms. */
const PAID: [string, number][] = [
  ['Free', 0],
  ['Audit', 2],
  ['Quote', 3],
  ['Live', 4],
  ['Care', 5],
];
const TICK_MS = 1000;

const stopAt = (day: number) => STOP_DAY.reduce((idx, d, i) => (day >= d ? i : idx), 0);

export function Process() {
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDay(LAST_DAY);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          setPlaying(true);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setDay((d) => {
        if (d >= LAST_DAY) {
          setPlaying(false);
          return d;
        }
        return d + 1;
      });
    }, TICK_MS);
    return () => clearInterval(t);
  }, [playing]);

  const stop = stopAt(day);
  const log = process.log.filter(([d]) => Number(d.replace(/\D/g, '')) <= day);
  const replay = () => {
    setDay(0);
    setPlaying(true);
  };
  const jump = (i: number) => {
    setPlaying(false);
    setDay(STOP_DAY[i]);
  };

  return (
    <section id="quest" aria-labelledby="h-quest" className="hq-section" ref={ref}>
      <div className="hq-wrap">
        <p className="hq-eyebrow">{process.eyebrow}</p>
        <div className="hq-head">
          <h2 id="h-quest">{process.title}</h2>
          <p>{process.intro} Played in about 12 seconds. Press play, or tap any stop.</p>
        </div>

        <div className="hq-card hq-mc">
          <div className="hq-btnrow">
            {playing ? (
              <button type="button" className="bq-btn" onClick={() => setPlaying(false)}>
                ❚❚ Pause
              </button>
            ) : day >= LAST_DAY ? (
              <button type="button" className="bq-btn" onClick={replay}>
                ↺ Replay
              </button>
            ) : (
              <button type="button" className="bq-btn" onClick={() => setPlaying(true)}>
                ▶ Play
              </button>
            )}
            {playing && (
              <button type="button" className="bq-btn-ghost" onClick={replay}>
                ↺ Replay
              </button>
            )}
          </div>
          <div>
            <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>Project day</span>
            <div aria-live="polite" style={{ font: '400 40px/1 var(--bq-font-display)' }}>
              Day {String(day).padStart(2, '0')}
            </div>
          </div>
          <div>
            <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>Where it is</span>
            <div className="hq-paid">
              {PAID.map(([p, at], i) => (
                <span key={i} data-on={stop >= at}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hq-mcgrid">
          <div className="hq-card hq-run">
            <ol className="hq-stops">
              {process.steps.map((st, i) => (
                <li key={st.title} data-state={i < stop ? 'done' : i === stop ? 'now' : 'next'}>
                  <button type="button" onClick={() => jump(i)} aria-current={i === stop ? 'step' : undefined}>
                    <span className="hq-lab">{st.day}</span>
                    <b>{st.title}</b>
                    <span className="hq-small">{st.price}</span>
                  </button>
                  {i === stop && (
                    <span className="hq-runner" aria-hidden>
                      <Bit pose={stop === 5 ? 'ready' : stop === 4 ? 'happy' : 'scan'} size={54} bob={playing} />
                      <span className="hq-tickettag">#A-0000</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="hq-small" style={{ marginTop: 14 }}>
              <b style={{ color: 'var(--bq-ink)' }}>Now: {process.steps[stop].title}.</b> {process.steps[stop].body}
            </p>
          </div>
          <div className="hq-dark hq-log" style={{ marginTop: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>Project log · #A-0000 (example)</span>
              <span className="hq-lab" style={{ color: day >= 11 ? '#35d48a' : 'var(--bq-secondary)' }}>
                {day >= 11 ? '● Live' : playing ? '● Running' : '● Paused'}
              </span>
            </div>
            {log.map(([d, t]) => (
              <div key={d}>
                <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>{d}</span>
                <span>{t}</span>
              </div>
            ))}
            {day < LAST_DAY && <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>_</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
