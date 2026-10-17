import type { PromiseId } from '../../data/promises.js';
import type { TicketStage } from '../tickets/types.js';
import type { CommitmentStatus } from './rules.js';
import type { TaskOwner } from './stages.js';

/** Rows of `commitments` and `tasks` (supabase/migrations/20261020000000_coach.sql). */

export type Commitment = {
  id: string;
  ticketId: string | null;
  promiseId: PromiseId;
  openedAt: string;
  dueAt: string;
  status: CommitmentStatus;
  closedAt: string | null;
  missReason: string | null;
  /** The last status Coach alerted on, so the heartbeat never repeats itself. */
  alertedStatus: string | null;
};

export type CoachTask = {
  id: string;
  ticketId: string | null;
  stage: TicketStage;
  key: string;
  owner: TaskOwner;
  title: string;
  doneWhen: string;
  status: 'open' | 'done';
  createdAt: string;
  doneAt: string | null;
};
