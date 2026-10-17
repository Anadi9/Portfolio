import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  NewTicketSchema,
  type BoardTicket,
  type Channel,
  type NewNotification,
  type NewTicket,
  type Notification,
  type Scorecard,
  type Ticket,
} from './types.js';

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
  /** Stores a message awaiting Anadi's approval (policy `draft` kinds). */
  saveDraftMessage(ticketId: string, kind: string, body: string, channel: Channel): Promise<void>;
  publicBoard(): Promise<BoardTicket[]>;
  saveScorecard(results: Record<string, unknown>): Promise<void>;
  latestScorecard(): Promise<Scorecard | null>;
}

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
      const { error } = await db
        .from('messages')
        .insert({ ticket_id: ticketId, direction: 'out', kind, status: 'draft', body, channel });
      if (error) fail('save draft message', error);
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
  };
}
