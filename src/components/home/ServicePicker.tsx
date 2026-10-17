import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Bit } from '@/components/brand/Bit';
import { CARTRIDGES, nextIndex } from '@/lib/bit/picker';

/**
 * "What do you need?": the five cartridges from the design. ← → (or ↑ ↓,
 * Home, End) move the choice and Bit hops above it; Enter or SELECT starts the
 * chat on that topic. A radio group, so screen readers hear one control with
 * five choices and the selected one announced.
 */
export function ServicePicker({ onPick }: { onPick: (start?: string) => void }) {
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  const move = (i: number) => {
    setSel(i);
    refs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      return onPick(CARTRIDGES[sel].start);
    }
    if (e.key === 'Escape') return onPick(undefined);
    const n = nextIndex(sel, e.key, CARTRIDGES.length);
    if (n === null) return;
    e.preventDefault();
    move(n);
  };
  const cur = CARTRIDGES[sel];
  return (
    <div className="hq-picker">
      <p className="hq-lab" style={{ color: 'var(--bq-brand)', textAlign: 'center', margin: 0 }}>
        What do you need? · ← → · Enter
      </p>
      <div className="hq-cwrap">
        <div className="hq-chop" aria-hidden="true" style={{ left: `${10 + sel * 20}%` }}>
          <Bit pose="point" size={90} />
        </div>
        <div className="hq-carts" role="radiogroup" aria-label="What do you need?" onKeyDown={onKey}>
          {CARTRIDGES.map((c, i) => (
            <button
              key={c.name}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={i === sel}
              tabIndex={i === sel ? 0 : -1}
              className="hq-cart"
              onClick={() => (i === sel ? onPick(c.start) : move(i))}
              onMouseEnter={() => setSel(i)}
            >
              <span className="hq-cart-top" />
              <span className="hq-cart-body">
                <span className="hq-lab">{c.level}</span>
                <b>{c.name}</b>
                <span className="hq-lab">{c.price}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="hq-cart-info" aria-live="polite">
        <div>
          <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>Solves: {cur.solves}</span>
          <p style={{ margin: '6px 0 0', lineHeight: 1.45 }}>Bit says: {cur.bit}</p>
        </div>
        <div className="hq-btnrow">
          <button type="button" className="bq-btn-ghost" onClick={() => onPick(undefined)}>
            ✎ Something else
          </button>
          <button type="button" className="bq-btn" onClick={() => onPick(cur.start)}>
            Select <span aria-hidden>▶</span>
          </button>
        </div>
      </div>
    </div>
  );
}
