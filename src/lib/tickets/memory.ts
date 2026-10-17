import { feedRow, firstSent, MAX_ATTEMPTS, statusAfter, type TicketStore } from './store';
import { feedOrder, isOpen, type FeedItem } from '../feed/types';
import type { CoachTask, Commitment } from '../coach/types';
import type { Invoice } from '../money/types';
import { NewTicketSchema, type BoardTicket, type Message, type Notification, type Scorecard, type Ticket } from './types';

/**
 * An in-memory `TicketStore` for tests: same contract as the Supabase one
 * (numbers from A-1001, one client per lower-cased email), everything
 * inspectable. Not imported by any page or function.
 */
/** `clock` stands in for the database's `now()`; by default each write is one second after the last, from 16 Oct 2026. */
export function memoryTicketStore(opts: { clock?: () => Date } = {}) {
  let seq = 1000;
  let n = 0;
  const clients = new Map<string, { id: string; email: string; name?: string; company?: string; whatsapp?: string }>();
  const tickets: Ticket[] = [];
  const events: { ticketId: string; type: string; data: Record<string, unknown>; at: string }[] = [];
  const notifications: Notification[] = [];
  const messages: Message[] = [];
  const briefs: { ticketId: string; body: Record<string, unknown>; createdAt: string }[] = [];
  const scorecards: Scorecard[] = [];
  const feed: FeedItem[] = [];
  const commitments: Commitment[] = [];
  const tasks: CoachTask[] = [];
  const invoices: Invoice[] = [];
  const portalLinks = new Map<string, { email: string; usedAt: string | null }>();
  const passkeys: { id: string; publicKey: string; counter: number; transports: string[]; createdAt: string }[] = [];
  const pushSubs = new Map<string, { endpoint: string; p256dh: string; auth: string }>();
  const id = (p: string) => `${p}_${++n}`;
  const now = () => (opts.clock ? opts.clock().toISOString() : new Date(Date.UTC(2026, 9, 16) + n * 1000).toISOString());

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
      const m: Message = { id: id('msg'), ticketId, direction: 'out', kind, status: 'draft', body, channel, createdAt: now(), sentAt: null };
      messages.push(m);
      return m.id;
    },
    async getTicket(tid) {
      const t = tickets.find((x) => x.id === tid);
      if (!t) return null;
      const c = [...clients.values()].find((x) => x.id === t.clientId)!;
      const b = briefs.filter((x) => x.ticketId === tid).at(-1);
      return {
        ...t,
        client: { name: c.name ?? null, email: c.email, whatsapp: c.whatsapp ?? null },
        events: events.filter((e) => e.ticketId === tid).map(({ type, data, at }) => ({ type, data, at })),
        messages: messages.filter((x) => x.ticketId === tid).map((x) => ({ ...x })),
        brief: b ? { ...b.body } : null,
        commitments: commitments.filter((c) => c.ticketId === tid).map((c) => ({ ...c })),
        tasks: tasks.filter((x) => x.ticketId === tid).map((x) => ({ ...x })),
      };
    },
    async listTickets(opts = {}) {
      return tickets
        .filter((t) => !opts.stage || t.stage === opts.stage)
        .slice()
        .reverse()
        .slice(0, opts.limit ?? 200)
        .map((t) => {
          const c = [...clients.values()].find((x) => x.id === t.clientId)!;
          return {
            id: t.id,
            number: t.number,
            kind: t.kind,
            stage: t.stage,
            appUrl: t.appUrl,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            clientName: c.name ?? null,
            clientEmail: c.email,
            hasBrief: briefs.some((b) => b.ticketId === t.id),
            firstReplySentAt: firstSent(messages.filter((x) => x.ticketId === t.id)),
          };
        });
    },
    async saveBrief(ticketId, body) {
      briefs.push({ ticketId, body, createdAt: now() });
    },
    async setStage(ticketId, stage) {
      const t = tickets.find((x) => x.id === ticketId);
      if (t) {
        t.stage = stage;
        t.updatedAt = now();
      }
    },
    async updateMessage(mid, patch) {
      const m = messages.find((x) => x.id === mid);
      if (!m) return;
      if (patch.body !== undefined) m.body = patch.body;
      if (patch.status) {
        m.status = patch.status;
        if (patch.status === 'sent') m.sentAt = now();
      }
    },
    async ticketsMissingBrief(limit = 5) {
      return tickets.filter((t) => !briefs.some((b) => b.ticketId === t.id)).slice(0, limit).map((t) => t.id);
    },
    async publicBoard() {
      return tickets
        .filter((t) => t.boardOptIn && t.stage !== 'closed')
        .map<BoardTicket>((t) => ({ number: t.number, kind: t.kind, category: t.category, stack: t.stack, stage: t.stage, updatedAt: t.updatedAt }))
        .reverse();
    },
    async saveScorecard(results) {
      scorecards.push({ runAt: now(), results });
    },
    async latestScorecard() {
      const last = scorecards[scorecards.length - 1];
      return last ? { ...last } : null;
    },
    async postFeed(item) {
      const f: FeedItem = { id: id('feed'), ...feedRow(item), createdAt: now(), doneAt: null, snoozedUntil: null, assignee: null };
      feed.push(f);
      return { ...f };
    },
    async openFeed(at = new Date(), limit = 100) {
      return feed.filter((f) => isOpen(f, at)).sort(feedOrder).slice(0, limit).map((f) => ({ ...f }));
    },
    async markFeedDone(fid) {
      const f = feed.find((x) => x.id === fid);
      if (f) f.doneAt = now();
    },
    async snoozeFeed(fid, until) {
      const f = feed.find((x) => x.id === fid);
      if (f) f.snoozedUntil = until.toISOString();
    },
    async doneFeedFor(ref) {
      for (const f of feed) if (f.ref === ref && !f.doneAt) f.doneAt = now();
    },
    async planInvoices(ticketId, plans, currency) {
      for (let i = invoices.length - 1; i >= 0; i--) if (invoices[i].ticketId === ticketId && invoices[i].status === 'planned') invoices.splice(i, 1);
      const made = plans.map<Invoice>((p) => ({ ...p, id: id('inv'), ticketId, currency, status: 'planned', stripeInvoiceId: null, createdAt: now() }));
      invoices.push(...made);
      return made.map((x) => ({ ...x }));
    },
    async invoicesFor(ticketId) {
      return invoices.filter((x) => x.ticketId === ticketId).map((x) => ({ ...x }));
    },
    async updateInvoice(iid, patch) {
      const x = invoices.find((y) => y.id === iid);
      if (!x) return;
      if (patch.status) x.status = patch.status;
      if (patch.stripeInvoiceId !== undefined) x.stripeInvoiceId = patch.stripeInvoiceId;
    },
    async clientByEmail(email) {
      const c = clients.get(email.trim().toLowerCase());
      return c ? { id: c.id, email: c.email } : null;
    },
    async ticketsForClient(clientId) {
      const mine = new Set(tickets.filter((t) => t.clientId === clientId).map((t) => t.id));
      return (await store.listTickets({ limit: 1000 })).filter((r) => mine.has(r.id));
    },
    async createPortalLink(nonce, email) {
      portalLinks.set(nonce, { email: email.trim().toLowerCase(), usedAt: null });
    },
    async usePortalLink(nonce) {
      const l = portalLinks.get(nonce);
      if (!l || l.usedAt) return false;
      l.usedAt = now();
      return true;
    },
    async passkeys() {
      return passkeys.map((p) => ({ ...p }));
    },
    async savePasskey(p) {
      passkeys.push({ ...p, createdAt: now() });
    },
    async setPasskeyCounter(pid, counter) {
      const p = passkeys.find((x) => x.id === pid);
      if (p) p.counter = counter;
    },
    async removePasskey(pid) {
      const i = passkeys.findIndex((x) => x.id === pid);
      if (i >= 0) passkeys.splice(i, 1);
    },
    async savePushSubscription(sub) {
      pushSubs.set(sub.endpoint, { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
    },
    async removePushSubscription(endpoint) {
      pushSubs.delete(endpoint);
    },
    async pushSubscriptions() {
      return [...pushSubs.values()].map((x) => ({ ...x }));
    },
    async assignFeed(fid, assignee) {
      const f = feed.find((x) => x.id === fid);
      if (f) f.assignee = assignee;
    },
    async openCommitment(c) {
      const row: Commitment = {
        id: id('commit'),
        ticketId: c.ticketId,
        promiseId: c.promiseId,
        openedAt: c.openedAt ?? now(),
        dueAt: new Date(c.dueAt).toISOString(),
        status: 'open',
        closedAt: null,
        missReason: null,
        alertedStatus: null,
      };
      commitments.push(row);
      return { ...row };
    },
    async liveCommitments() {
      return commitments
        .filter((c) => c.status === 'open' || c.status === 'at_risk')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .map((c) => ({ ...c }));
    },
    async updateCommitment(cid, patch) {
      const c = commitments.find((x) => x.id === cid);
      if (!c) return;
      if (patch.status) c.status = patch.status;
      if (patch.status === 'kept' || patch.status === 'missed') c.closedAt = now();
      if (patch.missReason !== undefined) c.missReason = patch.missReason.slice(0, 1000);
      if (patch.alertedStatus !== undefined) c.alertedStatus = patch.alertedStatus;
    },
    async addTasks(ticketId, stage, list) {
      for (const t of list) {
        if (tasks.some((x) => x.ticketId === ticketId && x.stage === stage && x.key === t.key)) continue;
        tasks.push({ id: id('task'), ticketId, stage, key: t.key, owner: t.owner, title: t.title, doneWhen: t.doneWhen, status: 'open', createdAt: now(), doneAt: null });
      }
    },
    async completeTask(ticketId, key) {
      const t = tasks.find((x) => x.ticketId === ticketId && x.key === key && x.status === 'open');
      if (!t) return false;
      t.status = 'done';
      t.doneAt = now();
      return true;
    },
    async postedSince(kind, since) {
      return feed.some((f) => f.kind === kind && Date.parse(f.createdAt) >= Date.parse(since));
    },
    async allCommitments(since) {
      return commitments
        .filter((c) => !since || c.openedAt >= new Date(since).toISOString())
        .slice()
        .reverse()
        .map((c) => ({ ...c }));
    },
    async countTickets({ kind, since }) {
      return tickets.filter((t) => t.kind === kind && t.createdAt >= new Date(since).toISOString()).length;
    },
  };
  return { store, clients, tickets, events, notifications, messages, briefs, scorecards, feed, commitments, tasks, invoices };
}
