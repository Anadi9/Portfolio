import { dispatch, type NotifyDeps } from '../notify/dispatch.js';
import { liveDeps } from '../notify/live.js';
import { replyBy } from '../notify/email.js';
import type { TicketStore } from '../tickets/store.js';
import { fallbackBrief, writeBrief, type Brief, type BriefInput } from './brief.js';
import { draftFirstReply, joinDraft } from './draft.js';
import { scanLead } from './scan.js';

/**
 * The background work on a new ticket: scan the app, write the brief, draft
 * the first reply, post a card to the command centre and email Anadi a copy.
 * Runs from `waitUntil` after the ticket is saved, and from the daily cron for
 * any ticket that missed it. A ticket that already has a brief is skipped.
 * Nothing reaches the client: the reply stays a draft until Anadi sends it.
 */

export type ProcessDeps = {
  scan?: typeof scanLead;
  brief?: typeof writeBrief;
  notify?: NotifyDeps;
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function processTicket(store: TicketStore, ticketId: string, deps: ProcessDeps = {}): Promise<'done' | 'skipped' | 'missing'> {
  const ticket = await store.getTicket(ticketId);
  if (!ticket) return 'missing';
  if (ticket.brief) return 'skipped';

  const scan = await (deps.scan ?? scanLead)(ticket.appUrl);
  const input: BriefInput = { kind: ticket.kind, stack: ticket.stack, appUrl: ticket.appUrl, answers: ticket.answers, budget: ticket.budget, scan };
  let brief: Brief;
  try {
    brief = await (deps.brief ?? writeBrief)(input);
  } catch (err) {
    console.error('[brief] writer failed, using fallback', ticket.number, err);
    brief = fallbackBrief(input);
  }
  await store.saveBrief(ticket.id, { ...brief, scan });

  const draft = draftFirstReply({ number: ticket.number, kind: ticket.kind, name: ticket.client.name, appUrl: ticket.appUrl, brief });
  const messageId = await store.saveDraftMessage(ticket.id, 'first_reply', joinDraft(draft), 'email');
  await store.addEvent(ticket.id, 'brief_ready', { source: brief.source, scanOk: scan.ok });

  const card = await store.postFeed({
    ticketId: ticket.id,
    bot: 'bit',
    kind: 'draft_ready',
    title: clip(`${ticket.number} · ${brief.topRisk || 'Brief ready'}`, 140),
    body: brief.summary,
    action: 'approve_send',
    ref: messageId,
  });

  try {
    const rows = await store.enqueueNotifications([
      {
        ticketId: ticket.id,
        channel: 'email',
        template: 'brief_ready',
        payload: {
          number: ticket.number,
          kind: ticket.kind,
          topRisk: brief.topRisk,
          summary: brief.summary,
          score: 'error' in scan ? null : scan.readiness.score,
          replyBy: ticket.kind === 'first_bug' ? replyBy(ticket.createdAt) : null,
          cardId: card.id,
        },
      },
    ]);
    await dispatch(store, rows, deps.notify ?? liveDeps());
  } catch (err) {
    console.error('[brief] card posted but email failed', ticket.number, err);
  }
  return 'done';
}
