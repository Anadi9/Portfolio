import type { BoardTicket, TicketStage } from './types.js';

/** The five stages the public board shows, left to right. `closed` never appears. */
export const BOARD_STAGES = ['inbox', 'bug_review', 'audit', 'fixing', 'live'] as const satisfies readonly TicketStage[];
export type BoardStage = (typeof BOARD_STAGES)[number];

export const STAGE_LABEL: Record<BoardStage, string> = {
  inbox: 'Inbox',
  bug_review: 'Bug review',
  audit: 'Audit',
  fixing: 'Fixing',
  live: 'Live ✓',
};

/** Fewer visible tickets than this and the site shows the honest empty state instead of a board. */
export const MIN_BOARD_TICKETS = 3;

export type BoardColumn = { stage: BoardStage; label: string; tickets: BoardTicket[] };
export type BoardPayload = { columns: BoardColumn[]; total: number };

/** Groups the public view into the five columns. Rows in any other stage are left out. */
export function boardColumns(tickets: BoardTicket[]): BoardPayload {
  const columns = BOARD_STAGES.map((stage) => ({ stage, label: STAGE_LABEL[stage], tickets: tickets.filter((t) => t.stage === stage) }));
  return { columns, total: columns.reduce((n, c) => n + c.tickets.length, 0) };
}
