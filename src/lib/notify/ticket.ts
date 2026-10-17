import { ticketStore, type TicketStore } from '../tickets/store.js';
import type { NewNotification, NewTicket, Ticket } from '../tickets/types.js';
import { processInBackground } from '../brief/background.js';
import { onTicketCreated } from '../coach/hooks.js';
import { dispatch, type NotifyDeps } from './dispatch.js';
import { kindLabel } from './email.js';
import { liveDeps } from './live.js';
import { withTimeout } from './timeout.js';

export { liveDeps };

export type NotifyPlan = {
  /** Email to Anadi with the full ticket. */
  admin: boolean;
  /** Receipt to the visitor. */
  receipt: boolean;
  /** WhatsApp alert to Anadi. */
  whatsapp: boolean;
};

/** One short line for the WhatsApp alert: the app's host, else the name. */
function summaryOf(input: { appUrl?: string; name?: string }): string {
  let line = '';
  if (input.appUrl) {
    try {
      line = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input.appUrl) ? input.appUrl : `https://${input.appUrl}`).hostname;
    } catch {
      line = input.appUrl;
    }
  }
  line = line || input.name || 'no app link';
  return line.replace(/\s+/g, ' ').trim().slice(0, 60);
}

/**
 * Saves the ticket, then enqueues and inline-dispatches ONLY the rows it just
 * created (the store does not claim rows, so reading the pending queue here
 * would double-send what the cron also sees). Once the ticket is saved,
 * nothing after it can throw to the caller.
 */
export async function submitTicket(store: TicketStore, input: NewTicket, plan: NotifyPlan, deps: NotifyDeps, dispatchTimeoutMs = 4000): Promise<Ticket> {
  const ticket = await store.createTicket(input);
  // Bounded: if the backend hangs, the ticket is saved and unsent rows stay pending for the cron.
  await withTimeout(notifyFor(store, ticket, input, plan, deps), dispatchTimeoutMs, 'dispatch');
  return ticket;
}

async function notifyFor(store: TicketStore, ticket: Ticket, input: NewTicket, plan: NotifyPlan, deps: NotifyDeps): Promise<void> {
  try {
    const base = {
      number: ticket.number,
      kind: ticket.kind,
      source: ticket.source,
      createdAt: ticket.createdAt,
      name: input.name ?? '',
      email: input.email.trim().toLowerCase(),
      whatsapp: input.whatsapp ?? '',
      appUrl: input.appUrl ?? '',
      budget: input.budget ?? '',
      boardOptIn: input.boardOptIn ?? false,
      answers: input.answers,
    };
    await onTicketCreated(store, ticket);
    await store
      .postFeed({
        ticketId: ticket.id,
        bot: 'bit',
        kind: 'new_ticket',
        title: `${ticket.number} · ${kindLabel(ticket.kind)} · ${summaryOf(input)}`,
        action: 'open',
      })
      .catch((err) => console.error('[notify] could not post the new-ticket card', ticket.number, err));
    const rows: NewNotification[] = [];
    if (plan.admin) rows.push({ ticketId: ticket.id, channel: 'email', template: 'new_ticket_admin', payload: base });
    if (plan.receipt) {
      rows.push({
        ticketId: ticket.id,
        channel: 'email',
        template: 'ticket_receipt',
        payload: { number: ticket.number, kind: ticket.kind, name: input.name ?? '', to: base.email },
      });
    }
    if (plan.whatsapp) {
      rows.push({
        ticketId: ticket.id,
        channel: 'whatsapp',
        template: 'new_ticket_admin',
        payload: { number: ticket.number, kind: ticket.kind, summary: summaryOf(input) },
      });
    }
    if (rows.length) {
      const queued = await store.enqueueNotifications(rows);
      await dispatch(store, queued, deps);
    }
  } catch (err) {
    console.error('[notify] ticket saved but notifications failed', ticket.number, err);
  }
}

const clip = (v: string | undefined, max: number) => (v && v.length > max ? v.slice(0, max) : v);

/**
 * For the audit forms, whose own emails (lead to Anadi, confirmation to the
 * visitor) have already gone: save a ticket and send only the WhatsApp alert.
 * Never throws. Returns the ticket number once the bounded work finishes, or
 * null on timeout, failure or no store.
 */
export async function recordFormTicket(input: NewTicket, timeoutMs = 2500): Promise<string | null> {
  const fit: NewTicket = {
    ...input,
    name: clip(input.name, 120),
    whatsapp: clip(input.whatsapp, 40),
    stack: clip(input.stack, 120),
    appUrl: clip(input.appUrl, 500),
    answers: input.appUrl && input.appUrl.length > 500 ? { ...input.answers, appUrlTruncated: true } : input.answers,
  };
  const ticket = await withTimeout(
    (async () => {
      const store = ticketStore();
      if (!store) return null;
      const ticket = await submitTicket(store, fit, { admin: false, receipt: false, whatsapp: true }, liveDeps(), Math.max(500, timeoutMs - 1000));
      processInBackground(store, ticket.id);
      return ticket;
    })(),
    timeoutMs,
    'form ticket',
  );
  return ticket?.number ?? null;
}
