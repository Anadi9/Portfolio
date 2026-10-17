import { useEffect, useState } from 'react';
import { board } from '@/data/bitsQuest';
import { recalledTicket } from '@/lib/bit/submit';
import { MIN_BOARD_TICKETS, type BoardPayload } from '@/lib/tickets/board';

/**
 * The homepage's board. The prerendered page and every failure show the honest
 * empty state; the kanban appears only when `/api/board` returns enough real,
 * opted-in tickets (fewer would identify people by elimination).
 */

export function BoardEmpty() {
  return (
    <div className="hq-card" style={{ padding: '28px 24px', display: 'grid', gap: 8 }}>
      <b style={{ font: '400 24px/1.1 var(--bq-font-display)' }}>{board.emptyTitle}</b>
      <p className="hq-small" style={{ margin: 0 }}>{board.emptyNote}</p>
    </div>
  );
}

const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export function LiveBoard() {
  const [data, setData] = useState<BoardPayload | null>(null);
  const [mine, setMine] = useState<string | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    setMine(recalledTicket());
    fetch('/api/board', { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: BoardPayload | null) => {
        if (j && Array.isArray(j.columns) && typeof j.total === 'number') setData(j);
      })
      .catch(() => {});
    return () => ctl.abort();
  }, []);

  if (!data || data.total < MIN_BOARD_TICKETS) return <BoardEmpty />;

  return (
    <div className="hq-kanban">
      {data.columns.map((col) => (
        <div key={col.stage} className="hq-col" role="group" aria-label={`${col.label}, ${col.tickets.length} requests`}>
          <header>
            <span>{col.label}</span>
            <span aria-hidden>{col.tickets.length}</span>
          </header>
          <div>
            {col.tickets.length === 0 && <p className="hq-col-empty">Nothing here right now.</p>}
            {col.tickets.map((t) => (
              <article key={t.number} className="hq-tix" data-mine={t.number === mine ? 'true' : undefined}>
                {t.number === mine && <span className="hq-mine">Your request</span>}
                <b>{t.number}</b>
                <span>{t.category ?? 'Request'}</span>
                {t.stack && <span className="hq-tix-meta">{t.stack}</span>}
                <span className="hq-tix-meta">Updated {day(t.updatedAt)}</span>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
