import { PROMISES } from '../../data/promises.js';
import type { Commitment } from '../coach/types.js';
import type { FeedItem } from '../feed/types.js';
import type { TicketRow } from '../tickets/types.js';

/**
 * "Today": never more than three things, picked by rule. Misses that still
 * need a reason, then promises at risk (soonest due), then first replies not
 * yet sent (oldest), then urgent cards.
 */

export type TodayItem = { key: string; title: string; why: string; ticketId: string | null };

const MAX = 3;
const what = (c: Commitment) => PROMISES[c.promiseId]?.what ?? c.promiseId;

export function pickToday({ tickets, commitments, feed, now }: { tickets: TicketRow[]; commitments: Commitment[]; feed: FeedItem[]; now: Date }): TodayItem[] {
  void now;
  const number = new Map(tickets.map((t) => [t.id, t.number]));
  const label = (id: string | null) => (id ? (number.get(id) ?? 'Ticket') : 'Site');
  const out: TodayItem[] = [];

  for (const c of commitments.filter((x) => x.status === 'missed' && !x.missReason?.trim()))
    out.push({ key: `missed:${c.id}`, title: `${label(c.ticketId)} · write a reason: ${what(c)}`, why: 'A missed promise blocks the ticket until it has a reason', ticketId: c.ticketId });

  for (const c of commitments.filter((x) => x.status === 'at_risk').sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)))
    out.push({ key: `risk:${c.id}`, title: `${label(c.ticketId)} · ${what(c)}`, why: 'At risk: most of its window has gone', ticketId: c.ticketId });

  for (const t of tickets.filter((x) => x.kind === 'first_bug' && x.stage === 'inbox' && !x.firstReplySentAt).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)))
    out.push({ key: `reply:${t.id}`, title: `${t.number} · record the video and reply`, why: 'First reply not sent yet', ticketId: t.id });

  for (const f of feed.filter((x) => x.urgent)) out.push({ key: `card:${f.id}`, title: f.title, why: 'Urgent card', ticketId: f.ticketId });

  const seen = new Set<string>();
  return out
    .filter((i) => {
      // One item per ticket: the most pressing one wins.
      const k = i.ticketId ?? i.key;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, MAX);
}

export type AwaySummary = { newTickets: number; briefsReady: number; kept: number; missed: number; atRisk: number; newCards: number; any: boolean };

export function awaySummary({ since, tickets, commitments, feed }: { since: string; tickets: TicketRow[]; commitments: Commitment[]; feed: FeedItem[] }): AwaySummary {
  // Parse both: Supabase returns `+00:00`, not `Z`, so string comparison is unsafe.
  const after = (iso: string | null) => !!iso && Date.parse(iso) > Date.parse(since);
  const fresh = tickets.filter((t) => after(t.createdAt));
  const s = {
    newTickets: fresh.length,
    briefsReady: fresh.filter((t) => t.hasBrief).length,
    kept: commitments.filter((c) => c.status === 'kept' && after(c.closedAt)).length,
    missed: commitments.filter((c) => c.status === 'missed' && after(c.closedAt)).length,
    atRisk: commitments.filter((c) => c.status === 'at_risk').length,
    newCards: feed.filter((f) => after(f.createdAt)).length,
  };
  return { ...s, any: Object.values(s).some((v) => v > 0) };
}
