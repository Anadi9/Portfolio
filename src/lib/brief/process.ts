import type { NotifyDeps } from '../notify/dispatch.js';
import type { TicketStore } from '../tickets/store.js';
import { fallbackBrief, writeBrief, type Brief, type BriefInput } from './brief.js';
import { draftFirstReply, joinDraft } from './draft.js';
import { scanLead } from './scan.js';

/**
 * The background work on a new ticket: scan the app, write the brief, draft
 * the first reply and post a card to the command centre (routine news: no
 * email; the morning summary covers it).
 * Runs from `waitUntil` after the ticket is saved, and from the daily cron for
 * any ticket that missed it. A ticket that already has a brief is skipped.
 * Nothing reaches the client: the reply stays a draft until Anadi sends it.
 */

export type ProcessDeps = {
  scan?: typeof scanLead;
  brief?: typeof writeBrief;
  /** Unused since briefs stopped emailing; kept so callers' deps still type-check. */
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
  await store.completeTask(ticket.id, 'brief').catch((err) => console.error('[coach] brief task', ticket.number, err));

  await store.postFeed({
    ticketId: ticket.id,
    bot: 'bit',
    kind: 'draft_ready',
    title: clip(`${ticket.number} · ${brief.topRisk || 'Brief ready'}`, 140),
    body: brief.summary,
    action: 'approve_send',
    ref: messageId,
  });

  return 'done';
}
