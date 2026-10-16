import { Resend } from 'resend';
import { ticketStore, type TicketStore } from '../tickets/store.js';
import type { NewNotification, NewTicket, Ticket } from '../tickets/types.js';
import { dispatch, type NotifyDeps } from './dispatch.js';
import type { FetchLike } from './whatsapp.js';

/** Real dependencies: Resend only if keyed, global fetch resolved at call time. */
export function liveDeps(env: Record<string, string | undefined> = process.env): NotifyDeps {
  const key = env.RESEND_API_KEY;
  return {
    resend: key ? (new Resend(key) as unknown as NotifyDeps['resend']) : null,
    fetch: ((url, init) => fetch(url, init)) as FetchLike,
    env,
  };
}

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
export async function submitTicket(store: TicketStore, input: NewTicket, plan: NotifyPlan, deps: NotifyDeps): Promise<Ticket> {
  const ticket = await store.createTicket(input);
  try {
    const base = {
      number: ticket.number,
      kind: ticket.kind,
      source: ticket.source,
      name: input.name ?? '',
      email: input.email.trim().toLowerCase(),
      whatsapp: input.whatsapp ?? '',
      appUrl: input.appUrl ?? '',
      budget: input.budget ?? '',
      boardOptIn: input.boardOptIn ?? false,
      answers: input.answers,
    };
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
  return ticket;
}

/**
 * For the audit forms, whose own emails (lead to Anadi, confirmation to the
 * visitor) have already gone: save a ticket and send only the WhatsApp alert.
 * Never throws and never changes the caller's response.
 */
export async function recordFormTicket(input: NewTicket): Promise<void> {
  try {
    const store = ticketStore();
    if (!store) return;
    await submitTicket(store, input, { admin: false, receipt: false, whatsapp: true }, liveDeps());
  } catch (err) {
    console.error('[tickets] form ticket not saved', err);
  }
}
