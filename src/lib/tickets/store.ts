import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  NewTicketSchema,
  type BoardTicket,
  type Channel,
  type NewNotification,
  type NewTicket,
  type Notification,
  type Message,
  type Scorecard,
  type Ticket,
  type TicketDetail,
  type TicketRow,
  type TicketKind,
  type TicketStage,
} from './types.js';
import type { CoachTask, Commitment } from '../coach/types.js';
import type { CommitmentStatus } from '../coach/rules.js';
import type { TaskTemplate } from '../coach/stages.js';
import type { PromiseId } from '../../data/promises.js';
import type { StoredPasskey } from '../admin/passkey.js';
import type { InvoicePlan } from '../money/invoices.js';
import type { Invoice, InvoiceStatus } from '../money/types.js';
import { FEED_BODY_MAX, FEED_TITLE_MAX, feedOrder, type FeedItem, type NewFeedItem } from '../feed/types.js';

/**
 * Everything the ticket pipeline keeps. Supabase, reached with the secret key
 * from server functions only; the tables have RLS on and no policies (see
 * supabase/migrations/20261016000000_tickets.sql). Handlers depend on
 * `TicketStore`, so they can be tested against `memory.ts`.
 */

/** A notification is retried until it has been tried this many times. */
export const MAX_ATTEMPTS = 3;

export type MarkResult = { status: 'sent' | 'failed' | 'skipped'; error?: string };

export interface TicketStore {
  /** Upserts the client by lower-cased email, inserts the ticket, writes a `created` event. */
  createTicket(input: NewTicket): Promise<Ticket>;
  addEvent(ticketId: string, type: string, data?: Record<string, unknown>): Promise<void>;
  enqueueNotifications(rows: NewNotification[]): Promise<Notification[]>;
  /** Status `pending` with fewer than MAX_ATTEMPTS attempts, oldest first. */
  pendingNotifications(limit?: number): Promise<Notification[]>;
  /**
   * Always increments `attempts`. `sent` and `skipped` are final. `failed` goes
   * back to `pending` (retryable) while attempts < MAX_ATTEMPTS, and stays
   * `failed` once the last attempt is used. `error` is kept as `last_error`.
   */
  markNotification(id: string, result: MarkResult): Promise<void>;
  /** Stores a message awaiting Anadi's approval (policy `draft` kinds). Returns its id. */
  saveDraftMessage(ticketId: string, kind: string, body: string, channel: Channel): Promise<string>;
  /** Ticket + client contact + timeline + messages + latest brief; null when there's no such ticket. */
  getTicket(id: string): Promise<TicketDetail | null>;
  /** Newest first. */
  listTickets(opts?: { stage?: TicketStage; limit?: number }): Promise<TicketRow[]>;
  saveBrief(ticketId: string, body: Record<string, unknown>): Promise<void>;
  setStage(ticketId: string, stage: TicketStage): Promise<void>;
  /** `status: 'sent'` also stamps `sentAt`. */
  updateMessage(id: string, patch: { body?: string; status?: 'sent' | 'failed' }): Promise<void>;
  /** Ids of tickets from the last 7 days with no brief yet, oldest first. */
  ticketsMissingBrief(limit?: number): Promise<string[]>;
  publicBoard(): Promise<BoardTicket[]>;
  saveScorecard(results: Record<string, unknown>): Promise<void>;
  latestScorecard(): Promise<Scorecard | null>;
  /** Command centre cards (`/admin`). Title and body are clipped to the table's limits. */
  postFeed(item: NewFeedItem): Promise<FeedItem>;
  /** Not done and not snoozed past `now`; urgent first, then newest. */
  openFeed(now?: Date, limit?: number): Promise<FeedItem[]>;
  markFeedDone(id: string): Promise<void>;
  snoozeFeed(id: string, until: Date): Promise<void>;
  /** Closes every open card about `ref` (e.g. a draft once it's sent). */
  doneFeedFor(ref: string): Promise<void>;
  assignFeed(id: string, assignee: 'helper'): Promise<void>;
  /** Anadi's phones/browsers for push alerts; saving an existing endpoint replaces its keys. */
  savePushSubscription(s: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
  pushSubscriptions(): Promise<{ endpoint: string; p256dh: string; auth: string }[]>;
  /** Anadi's passkeys for /admin. */
  passkeys(): Promise<StoredPasskey[]>;
  /** Client portal (Phase 6). */
  /** Invoice plans (Phase 7). Replaces the ticket's still-`planned` rows. */
  planInvoices(ticketId: string, plans: InvoicePlan[], currency: 'usd' | 'inr'): Promise<Invoice[]>;
  invoicesFor(ticketId: string): Promise<Invoice[]>;
  updateInvoice(id: string, patch: { status?: InvoiceStatus; stripeInvoiceId?: string | null }): Promise<void>;
  clientByEmail(email: string): Promise<{ id: string; email: string } | null>;
  /** The client's own tickets, newest first. */
  ticketsForClient(clientId: string): Promise<TicketRow[]>;
  createPortalLink(nonce: string, email: string): Promise<void>;
  /** True the first time only; false when the link is unknown or already used. */
  usePortalLink(nonce: string): Promise<boolean>;
  savePasskey(p: Omit<StoredPasskey, 'createdAt'>): Promise<void>;
  setPasskeyCounter(id: string, counter: number): Promise<void>;
  removePasskey(id: string): Promise<void>;
  /** Coach (master plan Phase 4). */
  openCommitment(c: { ticketId: string | null; promiseId: PromiseId; dueAt: string; openedAt?: string }): Promise<Commitment>;
  /** Open and at-risk commitments, soonest due first. */
  liveCommitments(): Promise<Commitment[]>;
  /** `kept` or `missed` also stamps `closedAt`. */
  updateCommitment(id: string, patch: { status?: CommitmentStatus; missReason?: string; alertedStatus?: string }): Promise<void>;
  /** Ignores a task that already exists for this ticket, stage and key. */
  addTasks(ticketId: string, stage: TicketStage, tasks: TaskTemplate[]): Promise<void>;
  /** False when the ticket has no open task with that key. */
  completeTask(ticketId: string, key: string): Promise<boolean>;
  countTickets(opts: { kind: TicketKind; since: string }): Promise<number>;
  /** Every commitment opened since `since` (all when omitted), newest first, up to 2000. */
  allCommitments(since?: string): Promise<Commitment[]>;
  /** Whether a card of this kind was posted since `since`, done or not (for once-a-week cards). */
  postedSince(kind: string, since: string): Promise<boolean>;
}

const closes = (s?: CommitmentStatus) => s === 'kept' || s === 'missed';

/** The row a new card becomes, shared so both stores clip alike. */
export const feedRow = (item: NewFeedItem) => ({
  ticketId: item.ticketId ?? null,
  bot: item.bot,
  kind: item.kind.slice(0, 60),
  title: item.title.trim().slice(0, FEED_TITLE_MAX) || item.kind,
  body: (item.body ?? '').slice(0, FEED_BODY_MAX),
  action: item.action,
  ref: item.ref ?? null,
  urgent: item.urgent ?? false,
});

/** What the next status is after an attempt; shared so both stores agree. */
export function statusAfter(result: MarkResult, attemptsNow: number): Notification['status'] {
  if (result.status === 'failed') return attemptsNow < MAX_ATTEMPTS ? 'pending' : 'failed';
  return result.status;
}

/** `null` when Supabase isn't configured, so a route can answer 501 instead of crashing. */
export function ticketStore(): TicketStore | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return supabaseStore(createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`[tickets] ${what}: ${error?.message ?? 'no row'}`);
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toTicket = (r: Row): Ticket => ({
  id: r.id,
  number: r.number,
  clientId: r.client_id,
  kind: r.kind,
  stage: r.stage,
  appUrl: r.app_url,
  stack: r.stack,
  answers: r.answers ?? {},
  budget: r.budget,
  boardOptIn: r.board_opt_in,
  whatsappOptIn: r.whatsapp_opt_in,
  source: r.source,
  category: r.category,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toFeed = (r: Row): FeedItem => ({
  id: r.id,
  ticketId: r.ticket_id,
  bot: r.bot,
  kind: r.kind,
  title: r.title,
  body: r.body ?? '',
  action: r.action,
  ref: r.ref,
  urgent: r.urgent,
  createdAt: r.created_at,
  doneAt: r.done_at,
  snoozedUntil: r.snoozed_until,
  assignee: r.assignee ?? null,
});

const toCommitment = (r: Row): Commitment => ({
  id: r.id,
  ticketId: r.ticket_id,
  promiseId: r.promise_id,
  openedAt: r.opened_at,
  dueAt: r.due_at,
  status: r.status,
  closedAt: r.closed_at,
  missReason: r.miss_reason,
  alertedStatus: r.alerted_status,
});

const toTask = (r: Row): CoachTask => ({
  id: r.id,
  ticketId: r.ticket_id,
  stage: r.stage,
  key: r.key,
  owner: r.owner,
  title: r.title,
  doneWhen: r.done_when ?? '',
  status: r.status,
  createdAt: r.created_at,
  doneAt: r.done_at,
});

const toInvoice = (r: Row): Invoice => ({
  id: r.id,
  ticketId: r.ticket_id,
  key: r.key,
  label: r.label,
  lines: r.lines ?? [],
  totalCents: r.total_cents,
  currency: r.currency,
  afterConfirm: r.after_confirm,
  status: r.status,
  stripeInvoiceId: r.stripe_invoice_id,
  createdAt: r.created_at,
});

const toMessage = (r: Row): Message => ({
  id: r.id,
  ticketId: r.ticket_id,
  direction: r.direction,
  kind: r.kind,
  status: r.status,
  body: r.body,
  channel: r.channel,
  createdAt: r.created_at,
  sentAt: r.sent_at,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** When the first outgoing message was sent, if any. Shared so both stores agree. */
export const firstSent = (messages: Pick<Message, 'direction' | 'status' | 'sentAt'>[]): string | null =>
  messages
    .filter((m) => m.direction === 'out' && m.status === 'sent' && m.sentAt)
    .map((m) => m.sentAt as string)
    .sort()[0] ?? null;

const latest = (rows: Row[] | null | undefined): Row | undefined =>
  [...(rows ?? [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];

const toNotification = (r: Row): Notification => ({
  id: r.id,
  ticketId: r.ticket_id,
  channel: r.channel,
  template: r.template,
  payload: r.payload ?? {},
  status: r.status,
  attempts: r.attempts,
  lastError: r.last_error,
  createdAt: r.created_at,
  sentAt: r.sent_at,
});

export function supabaseStore(db: SupabaseClient): TicketStore {
  return {
    async createTicket(raw) {
      // Same contract as the memory store: trim, lower-case, length/email checks,
      // empty fields dropped. Throws before any write if the input is bad.
      const input = NewTicketSchema.parse(raw);
      const email = input.email;
      // Only overwrite client details the form actually gave.
      const client: Row = { email };
      if (input.name) client.name = input.name;
      if (input.company) client.company = input.company;
      if (input.whatsapp) client.whatsapp = input.whatsapp;
      const c = await db.from('clients').upsert(client, { onConflict: 'email' }).select('id').single();
      if (c.error) fail('upsert client', c.error);

      // Write order: client, then ticket, then the `created` event. The ticket is
      // the record that matters and it carries the number, so once it exists we
      // never throw: a retry by the caller would create a duplicate ticket.
      const t = await db
        .from('tickets')
        .insert({
          client_id: c.data.id,
          kind: input.kind,
          app_url: input.appUrl ?? null,
          stack: input.stack ?? null,
          answers: input.answers,
          budget: input.budget ?? null,
          board_opt_in: input.boardOptIn,
          whatsapp_opt_in: input.whatsappOptIn,
          source: input.source,
          category: input.category ?? null,
        })
        .select('*')
        .single();
      if (t.error) {
        console.error('[tickets]', JSON.stringify({ op: 'createTicket', message: t.error.message }));
        fail('insert ticket', t.error);
      }

      const ticket = toTicket(t.data);
      const e = await db.from('ticket_events').insert({ ticket_id: ticket.id, type: 'created', data: { source: input.source, kind: input.kind } });
      if (e.error) console.error('[tickets]', JSON.stringify({ op: 'addEvent', ticket: ticket.number, message: e.error.message }));
      return ticket;
    },

    async addEvent(ticketId, type, data = {}) {
      const { error } = await db.from('ticket_events').insert({ ticket_id: ticketId, type, data });
      if (error) fail('add event', error);
    },

    async enqueueNotifications(rows) {
      if (rows.length === 0) return [];
      const { data, error } = await db
        .from('notifications')
        .insert(rows.map((r) => ({ ticket_id: r.ticketId, channel: r.channel, template: r.template, payload: r.payload ?? {} })))
        .select('*');
      if (error) fail('enqueue notifications', error);
      return (data as Row[]).map(toNotification);
    },

    async pendingNotifications(limit = 20) {
      const { data, error } = await db
        .from('notifications')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', MAX_ATTEMPTS)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) fail('pending notifications', error);
      return (data as Row[]).map(toNotification);
    },

    async markNotification(id, result) {
      const found = await db.from('notifications').select('attempts').eq('id', id).single();
      if (found.error) fail('find notification', found.error);
      const attempts = found.data.attempts + 1;
      const { error } = await db
        .from('notifications')
        .update({
          status: statusAfter(result, attempts),
          attempts,
          last_error: result.error ?? null,
          sent_at: result.status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) fail('mark notification', error);
    },

    async saveDraftMessage(ticketId, kind, body, channel) {
      const { data, error } = await db
        .from('messages')
        .insert({ ticket_id: ticketId, direction: 'out', kind, status: 'draft', body, channel })
        .select('id')
        .single();
      if (error) fail('save draft message', error);
      return data.id as string;
    },

    async getTicket(id) {
      if (!UUID.test(id)) return null;
      const { data, error } = await db
        .from('tickets')
        .select('*, clients(name, email, whatsapp), ticket_events(type, data, at), messages(*), briefs(body, created_at), commitments(*), tasks(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) fail('get ticket', error);
      if (!data) return null;
      const c = data.clients ?? {};
      return {
        ...toTicket(data),
        client: { name: c.name ?? null, email: c.email ?? '', whatsapp: c.whatsapp ?? null },
        events: ((data.ticket_events ?? []) as Row[]).map((e) => ({ type: e.type, data: e.data ?? {}, at: e.at })).sort((a, b) => a.at.localeCompare(b.at)),
        messages: ((data.messages ?? []) as Row[]).map(toMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        brief: latest(data.briefs)?.body ?? null,
        commitments: ((data.commitments ?? []) as Row[]).map(toCommitment).sort((a, b) => a.openedAt.localeCompare(b.openedAt)),
        tasks: ((data.tasks ?? []) as Row[]).map(toTask).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      };
    },

    async listTickets(opts = {}) {
      let q = db
        .from('tickets')
        .select('id, number, kind, stage, app_url, created_at, updated_at, clients(name, email), briefs(id), messages(direction, status, sent_at)')
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? 200);
      if (opts.stage) q = q.eq('stage', opts.stage);
      const { data, error } = await q;
      if (error) fail('list tickets', error);
      return (data as Row[]).map((r) => ({
        id: r.id,
        number: r.number,
        kind: r.kind,
        stage: r.stage,
        appUrl: r.app_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        clientName: r.clients?.name ?? null,
        clientEmail: r.clients?.email ?? '',
        hasBrief: (r.briefs ?? []).length > 0,
        firstReplySentAt: firstSent(((r.messages ?? []) as Row[]).map((m) => ({ direction: m.direction, status: m.status, sentAt: m.sent_at }))),
      }));
    },

    async saveBrief(ticketId, body) {
      const { error } = await db.from('briefs').insert({ ticket_id: ticketId, body });
      if (error) fail('save brief', error);
    },

    async setStage(ticketId, stage) {
      const { error } = await db.from('tickets').update({ stage }).eq('id', ticketId);
      if (error) fail('set stage', error);
    },

    async updateMessage(id, patch) {
      const row: Row = {};
      if (patch.body !== undefined) row.body = patch.body;
      if (patch.status) {
        row.status = patch.status;
        if (patch.status === 'sent') row.sent_at = new Date().toISOString();
      }
      if (!Object.keys(row).length) return;
      const { error } = await db.from('messages').update(row).eq('id', id);
      if (error) fail('update message', error);
    },

    async ticketsMissingBrief(limit = 5) {
      const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
      const { data, error } = await db
        .from('tickets')
        .select('id, created_at, briefs(id)')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) fail('tickets missing brief', error);
      return (data as Row[]).filter((r) => !(r.briefs ?? []).length).slice(0, limit).map((r) => r.id);
    },

    async publicBoard() {
      const { data, error } = await db
        .from('public_board')
        .select('number, kind, category, stack, stage, updated_at')
        .order('updated_at', { ascending: false });
      if (error) fail('public board', error);
      return (data as Row[]).map((r) => ({ number: r.number, kind: r.kind, category: r.category, stack: r.stack, stage: r.stage, updatedAt: r.updated_at }));
    },

    async saveScorecard(results) {
      const { error } = await db.from('scorecard_runs').insert({ results });
      if (error) fail('save scorecard', error);
    },

    async latestScorecard() {
      const { data, error } = await db.from('scorecard_runs').select('run_at, results').order('run_at', { ascending: false }).limit(1).maybeSingle();
      if (error) fail('latest scorecard', error);
      return data ? { runAt: data.run_at, results: data.results ?? {} } : null;
    },

    async postFeed(item) {
      const r = feedRow(item);
      const { data, error } = await db
        .from('feed_items')
        .insert({ ticket_id: r.ticketId, bot: r.bot, kind: r.kind, title: r.title, body: r.body, action: r.action, ref: r.ref, urgent: r.urgent })
        .select('*')
        .single();
      if (error) fail('post feed', error);
      return toFeed(data);
    },

    async openFeed(now = new Date(), limit = 100) {
      const { data, error } = await db
        .from('feed_items')
        .select('*')
        .is('done_at', null)
        .or(`snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`)
        .order('urgent', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) fail('open feed', error);
      return (data as Row[]).map(toFeed).sort(feedOrder);
    },

    async markFeedDone(id) {
      const { error } = await db.from('feed_items').update({ done_at: new Date().toISOString() }).eq('id', id);
      if (error) fail('mark feed done', error);
    },

    async snoozeFeed(id, until) {
      const { error } = await db.from('feed_items').update({ snoozed_until: until.toISOString() }).eq('id', id);
      if (error) fail('snooze feed', error);
    },

    async doneFeedFor(ref) {
      const { error } = await db.from('feed_items').update({ done_at: new Date().toISOString() }).eq('ref', ref).is('done_at', null);
      if (error) fail('done feed for', error);
    },

    async planInvoices(ticketId, plans, currency) {
      const del = await db.from('invoices').delete().eq('ticket_id', ticketId).eq('status', 'planned');
      if (del.error) fail('clear planned invoices', del.error);
      const { data, error } = await db
        .from('invoices')
        .insert(plans.map((p) => ({ ticket_id: ticketId, key: p.key, label: p.label, lines: p.lines, total_cents: p.totalCents, currency, after_confirm: p.afterConfirm })))
        .select('*');
      if (error) fail('plan invoices', error);
      return (data as Row[]).map(toInvoice);
    },

    async invoicesFor(ticketId) {
      const { data, error } = await db.from('invoices').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });
      if (error) fail('invoices', error);
      return (data as Row[]).map(toInvoice);
    },

    async updateInvoice(id, patch) {
      const row: Row = { updated_at: new Date().toISOString() };
      if (patch.status) row.status = patch.status;
      if (patch.stripeInvoiceId !== undefined) row.stripe_invoice_id = patch.stripeInvoiceId;
      const { error } = await db.from('invoices').update(row).eq('id', id);
      if (error) fail('update invoice', error);
    },

    async clientByEmail(email) {
      const { data, error } = await db.from('clients').select('id, email').eq('email', email.trim().toLowerCase()).maybeSingle();
      if (error) fail('client by email', error);
      return data ? { id: data.id as string, email: data.email as string } : null;
    },

    async ticketsForClient(clientId) {
      const { data, error } = await db
        .from('tickets')
        .select('id, number, kind, stage, app_url, created_at, updated_at, clients(name, email), briefs(id), messages(direction, status, sent_at)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) fail('tickets for client', error);
      return (data as Row[]).map((r) => ({
        id: r.id,
        number: r.number,
        kind: r.kind,
        stage: r.stage,
        appUrl: r.app_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        clientName: r.clients?.name ?? null,
        clientEmail: r.clients?.email ?? '',
        hasBrief: (r.briefs ?? []).length > 0,
        firstReplySentAt: firstSent(((r.messages ?? []) as Row[]).map((m) => ({ direction: m.direction, status: m.status, sentAt: m.sent_at }))),
      }));
    },

    async createPortalLink(nonce, email) {
      const { error } = await db.from('portal_links').insert({ nonce, email: email.trim().toLowerCase() });
      if (error) fail('create portal link', error);
    },

    async usePortalLink(nonce) {
      const { data, error } = await db.from('portal_links').update({ used_at: new Date().toISOString() }).eq('nonce', nonce).is('used_at', null).select('nonce');
      if (error) fail('use portal link', error);
      return (data ?? []).length > 0;
    },

    async passkeys() {
      const { data, error } = await db.from('admin_passkeys').select('*').order('created_at', { ascending: true });
      if (error) fail('passkeys', error);
      return (data as Row[]).map((r) => ({ id: r.id, publicKey: r.public_key, counter: Number(r.counter), transports: r.transports ?? [], createdAt: r.created_at }));
    },

    async savePasskey(p) {
      const { error } = await db.from('admin_passkeys').insert({ id: p.id, public_key: p.publicKey, counter: p.counter, transports: p.transports });
      if (error) fail('save passkey', error);
    },

    async setPasskeyCounter(id, counter) {
      const { error } = await db.from('admin_passkeys').update({ counter }).eq('id', id);
      if (error) fail('set passkey counter', error);
    },

    async removePasskey(id) {
      const { error } = await db.from('admin_passkeys').delete().eq('id', id);
      if (error) fail('remove passkey', error);
    },

    async savePushSubscription(sub) {
      const { error } = await db.from('push_subscriptions').upsert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' });
      if (error) fail('save push subscription', error);
    },

    async removePushSubscription(endpoint) {
      const { error } = await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
      if (error) fail('remove push subscription', error);
    },

    async pushSubscriptions() {
      const { data, error } = await db.from('push_subscriptions').select('endpoint, p256dh, auth').limit(50);
      if (error) fail('push subscriptions', error);
      return data as { endpoint: string; p256dh: string; auth: string }[];
    },

    async assignFeed(id, assignee) {
      const { error } = await db.from('feed_items').update({ assignee }).eq('id', id);
      if (error) fail('assign feed', error);
    },

    async openCommitment(c) {
      const { data, error } = await db
        .from('commitments')
        .insert({ ticket_id: c.ticketId, promise_id: c.promiseId, due_at: c.dueAt, ...(c.openedAt ? { opened_at: c.openedAt } : {}) })
        .select('*')
        .single();
      if (error) fail('open commitment', error);
      return toCommitment(data);
    },

    async liveCommitments() {
      const { data, error } = await db.from('commitments').select('*').in('status', ['open', 'at_risk']).order('due_at', { ascending: true }).limit(500);
      if (error) fail('live commitments', error);
      return (data as Row[]).map(toCommitment);
    },

    async updateCommitment(id, patch) {
      const row: Row = {};
      if (patch.status) row.status = patch.status;
      if (closes(patch.status)) row.closed_at = new Date().toISOString();
      if (patch.missReason !== undefined) row.miss_reason = patch.missReason.slice(0, 1000);
      if (patch.alertedStatus !== undefined) row.alerted_status = patch.alertedStatus;
      if (!Object.keys(row).length) return;
      const { error } = await db.from('commitments').update(row).eq('id', id);
      if (error) fail('update commitment', error);
    },

    async addTasks(ticketId, stage, tasks) {
      if (!tasks.length) return;
      const { error } = await db.from('tasks').upsert(
        tasks.map((t) => ({ ticket_id: ticketId, stage, key: t.key, owner: t.owner, title: t.title, done_when: t.doneWhen })),
        { onConflict: 'ticket_id,stage,key', ignoreDuplicates: true },
      );
      if (error) fail('add tasks', error);
    },

    async completeTask(ticketId, key) {
      const { data, error } = await db
        .from('tasks')
        .update({ status: 'done', done_at: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .eq('key', key)
        .eq('status', 'open')
        .select('id');
      if (error) fail('complete task', error);
      return (data ?? []).length > 0;
    },

    async postedSince(kind, since) {
      const { count, error } = await db.from('feed_items').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since);
      if (error) fail('posted since', error);
      return (count ?? 0) > 0;
    },

    async allCommitments(since) {
      let q = db.from('commitments').select('*').order('opened_at', { ascending: false }).limit(2000);
      if (since) q = q.gte('opened_at', since);
      const { data, error } = await q;
      if (error) fail('all commitments', error);
      return (data as Row[]).map(toCommitment);
    },

    async countTickets({ kind, since }) {
      const { count, error } = await db.from('tickets').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since);
      if (error) fail('count tickets', error);
      return count ?? 0;
    },
  };
}
