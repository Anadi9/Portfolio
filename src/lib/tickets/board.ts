import { BOARD_STACKS } from '../bit/stacks.js';
import type { BoardTicket, TicketKind, TicketStage } from './types.js';

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

/** Shown on a card when the ticket has no category of its own. */
export const KIND_LABEL: Record<TicketKind, string> = {
  first_bug: 'First-bug review',
  audit: 'Audit',
  build: 'AI build',
  care: 'Care',
  question: 'Question',
  teardown: 'Teardown',
};

/** Fewer visible tickets than this and the site shows the honest empty state instead of a board. */
export const MIN_BOARD_TICKETS = 3;

export type BoardColumn = { stage: BoardStage; label: string; tickets: BoardTicket[] };
export type BoardPayload = { columns: BoardColumn[]; total: number };

/** Groups the public view into the five columns. Rows in any other stage are left out. An empty category falls back to a label for the kind. */
export function boardColumns(tickets: BoardTicket[]): BoardPayload {
  const labelled = tickets.map((t) => ({
    ...t,
    category: t.category?.trim() || KIND_LABEL[t.kind] || null,
    // Free text never reaches the public board: only the fixed answers do.
    stack: t.stack && BOARD_STACKS.includes(t.stack) ? t.stack : null,
  }));
  const columns = BOARD_STAGES.map((stage) => ({ stage, label: STAGE_LABEL[stage], tickets: labelled.filter((t) => t.stage === stage) }));
  return { columns, total: columns.reduce((n, c) => n + c.tickets.length, 0) };
}
