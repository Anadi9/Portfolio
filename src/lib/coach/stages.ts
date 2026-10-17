import { PROMISES, type PromiseId } from '../../data/promises.js';
import { TICKET_STAGES, type TicketStage } from '../tickets/types.js';
import type { CommitmentStatus } from './rules.js';

/**
 * What each client stage asks for. On entry a stage opens its tasks and its
 * commitments; to leave it forwards, every task must be done. A missed promise
 * with no written reason blocks any move, even closing the ticket.
 */

export type TaskOwner = 'coach' | 'anadi' | 'helper';
export type TaskTemplate = { key: string; owner: TaskOwner; title: string; doneWhen: string };
export type StageRule = { tasks: TaskTemplate[]; commitments: PromiseId[] };

export const STAGE_RULES: Record<TicketStage, StageRule> = {
  inbox: {
    tasks: [
      { key: 'brief', owner: 'coach', title: 'Scan, brief and draft', doneWhen: 'The brief and the drafted reply exist' },
      { key: 'first_reply', owner: 'anadi', title: 'Record the video and send the first reply', doneWhen: 'The first reply is sent from /admin' },
    ],
    // first_bug_video is opened at ticket creation, for first-bug tickets only.
    commitments: [],
  },
  bug_review: {
    tasks: [{ key: 'next_step', owner: 'anadi', title: 'Agree the next step with the client', doneWhen: 'The client chose an audit, a fix, or to stop' }],
    commitments: [],
  },
  audit: {
    tasks: [
      { key: 'audit_paid', owner: 'anadi', title: 'Confirm the $349 audit is paid', doneWhen: 'The payment shows in Stripe' },
      { key: 'audit_report', owner: 'anadi', title: 'Send the audit report', doneWhen: 'The report is in the client’s inbox' },
      { key: 'refund_check', owner: 'anadi', title: 'Real issues found? If not, refund in full', doneWhen: 'Issues are listed in the report, or the refund is issued' },
    ],
    commitments: ['audit_report'],
  },
  fixing: {
    tasks: [{ key: 'fix_shipped', owner: 'anadi', title: 'Ship the fix', doneWhen: 'Every agreed fix is live' }],
    commitments: ['daily_update'],
  },
  live: {
    tasks: [
      { key: 'client_confirmed', owner: 'anadi', title: 'Client confirms it works', doneWhen: 'The client said so in writing' },
      { key: 'second_invoice', owner: 'anadi', title: 'Send the second invoice', doneWhen: 'Sent, and only after the client confirmed' },
    ],
    commitments: [],
  },
  closed: { tasks: [], commitments: [] },
};

export type GateInput = {
  stage: TicketStage;
  to: TicketStage;
  tasks: { key: string; stage: TicketStage; status: 'open' | 'done'; title?: string }[];
  commitments: { promiseId: PromiseId; status: CommitmentStatus; missReason: string | null }[];
};

const order = (s: TicketStage) => TICKET_STAGES.indexOf(s);

export function gate(input: GateInput): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  for (const c of input.commitments) {
    if (c.status === 'missed' && !c.missReason?.trim()) blockers.push(`Write a reason for the missed promise: ${PROMISES[c.promiseId]?.what ?? c.promiseId}`);
  }
  const forward = input.to !== 'closed' && order(input.to) > order(input.stage);
  if (forward) {
    const titles = new Map(STAGE_RULES[input.stage].tasks.map((t) => [t.key, t.title]));
    for (const t of input.tasks) if (t.stage === input.stage && t.status === 'open') blockers.push(`Not done: ${t.title ?? titles.get(t.key) ?? t.key}`);
  }
  return { ok: blockers.length === 0, blockers };
}
