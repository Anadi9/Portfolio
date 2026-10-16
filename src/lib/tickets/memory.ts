import { MAX_ATTEMPTS, statusAfter, type TicketStore } from './store';
import { NewTicketSchema, type BoardTicket, type Notification, type Scorecard, type Ticket } from './types';

/**
 * An in-memory `TicketStore` for tests: same contract as the Supabase one
 * (numbers from A-1001, one client per lower-cased email), everything
 * inspectable. Not imported by any page or function.
 */
export function memoryTicketStore() {
  let seq = 1000;
  let n = 0;
  const clients = new Map<string, { id: string; email: string; name?: string; company?: string; whatsapp?: string }>();
  const tickets: Ticket[] = [];
  const events: { ticketId: string; type: string; data: Record<string, unknown>; at: string }[] = [];
  const notifications: Notification[] = [];
  const messages: { ticketId: string; direction: 'out'; kind: string; status: 'draft'; body: string; channel: string }[] = [];
  const scorecards: Scorecard[] = [];
  const id = (p: string) => `${p}_${++n}`;
  const now = () => new Date(Date.UTC(2026, 9, 16) + n * 1000).toISOString();

  const store: TicketStore = {
    async createTicket(raw) {
      const input = NewTicketSchema.parse(raw);
      const prior = clients.get(input.email);
      const client = { ...(prior ?? { id: id('client'), email: input.email }) } as NonNullable<typeof prior>;
      if (input.name) client.name = input.name;
      if (input.company) client.company = input.company;
      if (input.whatsapp) client.whatsapp = input.whatsapp;
      clients.set(input.email, client);
      const at = now();
      const ticket: Ticket = {
        id: id('ticket'),
        number: `A-${++seq}`,
        clientId: client.id,
        kind: input.kind,
        stage: 'inbox',
        appUrl: input.appUrl ?? null,
        stack: input.stack ?? null,
        answers: input.answers,
        budget: input.budget ?? null,
        boardOptIn: input.boardOptIn,
        whatsappOptIn: input.whatsappOptIn,
        source: input.source,
        category: input.category ?? null,
        createdAt: at,
        updatedAt: at,
      };
      tickets.push(ticket);
      events.push({ ticketId: ticket.id, type: 'created', data: { source: input.source, kind: input.kind }, at });
      return { ...ticket };
    },
    async addEvent(ticketId, type, data = {}) {
      events.push({ ticketId, type, data, at: now() });
    },
    async enqueueNotifications(rows) {
      const made = rows.map<Notification>((r) => ({
        id: id('notif'),
        ticketId: r.ticketId,
        channel: r.channel,
        template: r.template,
        payload: r.payload ?? {},
        status: 'pending',
        attempts: 0,
        lastError: null,
        createdAt: now(),
        sentAt: null,
      }));
      notifications.push(...made);
      return made.map((m) => ({ ...m }));
    },
    async pendingNotifications(limit = 20) {
      return notifications
        .filter((x) => x.status === 'pending' && x.attempts < MAX_ATTEMPTS)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit)
        .map((x) => ({ ...x }));
    },
    async markNotification(nid, result) {
      const x = notifications.find((y) => y.id === nid);
      if (!x) throw new Error(`[tickets] mark notification: no row`);
      x.attempts += 1;
      x.status = statusAfter(result, x.attempts);
      x.lastError = result.error ?? null;
      x.sentAt = result.status === 'sent' ? now() : null;
    },
    async saveDraftMessage(ticketId, kind, body, channel) {
      messages.push({ ticketId, direction: 'out', kind, status: 'draft', body, channel });
    },
    async publicBoard() {
      return tickets
        .filter((t) => t.boardOptIn && t.stage !== 'closed')
        .map<BoardTicket>((t) => ({ number: t.number, category: t.category, stack: t.stack, stage: t.stage, updatedAt: t.updatedAt }))
        .reverse();
    },
    async saveScorecard(results) {
      scorecards.push({ runAt: now(), results });
    },
    async latestScorecard() {
      const last = scorecards[scorecards.length - 1];
      return last ? { ...last } : null;
    },
  };
  return { store, clients, tickets, events, notifications, messages, scorecards };
}
