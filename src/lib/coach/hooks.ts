import { PROMISES } from '../../data/promises.js';
import type { TicketStore } from '../tickets/store.js';
import type { Ticket, TicketDetail, TicketStage } from '../tickets/types.js';
import { dueFrom, weekStartIst } from './rules.js';
import { STAGE_RULES } from './stages.js';

/**
 * Where Coach hears about the ticket flow. Each hook opens, keeps or ticks
 * commitments and tasks, and never throws: a Coach failure is logged and the
 * request that triggered it carries on.
 */

const WEEKLY_CAP = 5;

async function safely(what: string, ticket: { number: string }, work: () => Promise<void>) {
  try {
    await work();
  } catch (err) {
    console.error('[coach]', what, ticket.number, err);
  }
}

export function onTicketCreated(store: TicketStore, ticket: Ticket, now = new Date()): Promise<void> {
  return safely('ticket created', ticket, async () => {
    await store.addTasks(ticket.id, 'inbox', STAGE_RULES.inbox.tasks);
    if (ticket.kind !== 'first_bug') return;
    await store.openCommitment({ ticketId: ticket.id, promiseId: 'first_bug_video', openedAt: ticket.createdAt, dueAt: dueFrom('first_bug_video', ticket.createdAt) });
    const thisWeek = await store.countTickets({ kind: 'first_bug', since: weekStartIst(now).toISOString() });
    if (thisWeek > WEEKLY_CAP) {
      await store.postFeed({
        ticketId: ticket.id,
        bot: 'coach',
        kind: 'weekly_cap',
        title: `${ticket.number} · first bug #${thisWeek} this week (over the five-a-week cap)`,
        body: 'The site promises five free first-bug videos a week. Decide: make an exception, or reply with the next free slot.',
        action: 'open',
      });
    }
  });
}

export function onReplySent(store: TicketStore, ticket: TicketDetail, messageKind: string, now = new Date()): Promise<void> {
  void now;
  return safely('reply sent', ticket, async () => {
    if (messageKind !== 'first_reply') return;
    await store.completeTask(ticket.id, 'first_reply');
    for (const c of ticket.commitments) {
      if (c.promiseId === 'first_bug_video' && (c.status === 'open' || c.status === 'at_risk')) await store.updateCommitment(c.id, { status: 'kept' });
    }
  });
}

export function onStageEntered(store: TicketStore, ticket: TicketDetail, stage: TicketStage, now = new Date()): Promise<void> {
  return safely('stage entered', ticket, async () => {
    const rule = STAGE_RULES[stage];
    await store.addTasks(ticket.id, stage, rule.tasks);
    for (const promiseId of rule.commitments) {
      const live = ticket.commitments.some((c) => c.promiseId === promiseId && (c.status === 'open' || c.status === 'at_risk'));
      if (!live) await store.openCommitment({ ticketId: ticket.id, promiseId, openedAt: now.toISOString(), dueAt: dueFrom(promiseId, now) });
    }
  });
}

/** Tasks whose completion keeps a promise. */
const KEEPS: Record<string, keyof typeof PROMISES> = { audit_report: 'audit_report' };

export function onTaskDone(store: TicketStore, ticket: TicketDetail, key: string, now = new Date()): Promise<void> {
  void now;
  return safely('task done', ticket, async () => {
    const promiseId = KEEPS[key];
    if (!promiseId) return;
    for (const c of ticket.commitments) {
      if (c.promiseId === promiseId && (c.status === 'open' || c.status === 'at_risk')) await store.updateCommitment(c.id, { status: 'kept' });
    }
  });
}

/** Anadi says he kept it (e.g. sent today's update by hand). A daily update kept while fixing opens tomorrow's. */
export function keepCommitment(store: TicketStore, ticket: TicketDetail, commitmentId: string, now = new Date()): Promise<void> {
  return safely('keep', ticket, async () => {
    const c = ticket.commitments.find((x) => x.id === commitmentId);
    if (!c || (c.status !== 'open' && c.status !== 'at_risk')) return;
    await store.updateCommitment(c.id, { status: 'kept' });
    if (c.promiseId === 'daily_update' && ticket.stage === 'fixing') {
      await store.openCommitment({ ticketId: ticket.id, promiseId: 'daily_update', openedAt: now.toISOString(), dueAt: dueFrom('daily_update', now) });
    }
  });
}
