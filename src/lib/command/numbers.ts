import { keptRate } from '../coach/rules.js';
import type { Commitment } from '../coach/types.js';
import { TICKET_STAGES, type TicketRow, type TicketStage } from '../tickets/types.js';

/**
 * The command centre's numbers. "Chats" and "paid" are not tracked yet: the
 * site promises chats aren't stored, and payments link to tickets in Phase 7.
 */

export type Numbers = {
  promisesKept: { kept: number; missed: number; rate: number | null };
  pipeline: Record<TicketStage, number>;
  avgFirstReplyHours: number | null;
  ticketsLast7: number;
  ticketsLast30: number;
};

const DAY = 24 * 3_600_000;

export function computeNumbers({ tickets, commitments, now }: { tickets: TicketRow[]; commitments: Commitment[]; now: Date }): Numbers {
  const pipeline = Object.fromEntries(TICKET_STAGES.map((s) => [s, 0])) as Record<TicketStage, number>;
  for (const t of tickets) pipeline[t.stage] += 1;
  const age = (t: TicketRow) => now.getTime() - Date.parse(t.createdAt);
  const replies = tickets.filter((t) => t.firstReplySentAt).map((t) => (Date.parse(t.firstReplySentAt as string) - Date.parse(t.createdAt)) / 3_600_000);
  return {
    promisesKept: keptRate(commitments),
    pipeline,
    avgFirstReplyHours: replies.length ? Math.round((replies.reduce((a, b) => a + b, 0) / replies.length) * 10) / 10 : null,
    ticketsLast7: tickets.filter((t) => age(t) <= 7 * DAY).length,
    ticketsLast30: tickets.filter((t) => age(t) <= 30 * DAY).length,
  };
}
