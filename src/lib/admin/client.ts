import type { FeedItem } from '../feed/types';
import type { Numbers } from '../command/numbers';
import type { AwaySummary, TodayItem } from '../command/today';
import type { PlanItem } from '../command/plan';
import type { Invoice, InvoiceStatus } from '../money/types';
import type { TicketDetail, TicketRow, TicketStage } from '../tickets/types';

/** Browser wrappers for `/api/admin`. A 401 comes back as `auth: false` so the page can show the login form. */

export type AdminResult<T> = { ok: true; auth: true; data: T } | { ok: false; auth: boolean; error: string };

async function call<T>(body: Record<string, unknown>): Promise<AdminResult<T>> {
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (res.status === 401) return { ok: false, auth: false, error: data.error ?? 'unauthorized' };
    if (!res.ok) {
      const blockers = (data as { blockers?: unknown }).blockers;
      const detail = Array.isArray(blockers) && blockers.length ? `: ${blockers.join('; ')}` : '';
      return { ok: false, auth: true, error: `${data.error ?? `HTTP ${res.status}`}${detail}` };
    }
    return { ok: true, auth: true, data };
  } catch {
    return { ok: false, auth: true, error: 'Network error. Try again.' };
  }
}

type Ok = { ok: true };

export const admin = {
  login: (email: string, password: string) => call<{ ok?: true; passkey?: true; options?: Record<string, unknown> }>({ op: 'login', email, password }),
  passkeyLogin: (response: unknown) => call<Ok>({ op: 'passkeyLogin', response }),
  passkeyOptions: () => call<{ options: Record<string, unknown> }>({ op: 'passkeyOptions' }),
  passkeyRegister: (response: unknown) => call<Ok>({ op: 'passkeyRegister', response }),
  passkeys: () => call<{ passkeys: { id: string; createdAt: string }[] }>({ op: 'passkeys' }),
  passkeyRemove: (id: string) => call<Ok>({ op: 'passkeyRemove', id }),
  logout: () => call<Ok>({ op: 'logout' }),
  feed: () => call<{ items: FeedItem[] }>({ op: 'feed' }),
  numbers: () => call<{ numbers: Numbers }>({ op: 'numbers' }),
  plan: () => call<{ items: PlanItem[]; phases: { phase: string; done: number; total: number }[]; next: PlanItem[] }>({ op: 'plan' }),
  pushKey: () => call<{ key: string }>({ op: 'pushKey' }),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => call<Ok>({ op: 'pushSubscribe', ...sub }),
  pushUnsubscribe: (endpoint: string) => call<Ok>({ op: 'pushUnsubscribe', endpoint }),
  today: () => call<{ items: TodayItem[] }>({ op: 'today' }),
  away: (since: string) => call<{ away: AwaySummary }>({ op: 'away', since }),
  done: (feedId: string) => call<Ok>({ op: 'done', feedId }),
  helper: (feedId: string) => call<Ok>({ op: 'helper', feedId }),
  snooze: (feedId: string, hours: number) => call<Ok>({ op: 'snooze', feedId, hours }),
  list: (stage?: TicketStage) => call<{ tickets: TicketRow[] }>(stage ? { op: 'list', stage } : { op: 'list' }),
  get: (id: string) => call<{ ticket: TicketDetail }>({ op: 'get', id }),
  stage: (id: string, stage: TicketStage) => call<Ok>({ op: 'stage', id, stage }),
  saveDraft: (id: string, messageId: string, subject: string, body: string) => call<Ok>({ op: 'saveDraft', id, messageId, subject, body }),
  send: (id: string, messageId: string, subject: string, body: string) => call<Ok>({ op: 'send', id, messageId, subject, body }),
  planInvoices: (id: string, work: 'audit' | 'fix' | 'build', currency: 'usd' | 'inr', priceCents?: number, teardownPaidAt?: string) =>
    call<{ invoices: Invoice[] }>({ op: 'planInvoices', id, work, currency, ...(priceCents ? { priceCents } : {}), ...(teardownPaidAt ? { teardownPaidAt } : {}) }),
  invoices: (id: string) => call<{ invoices: Invoice[] }>({ op: 'invoices', id }),
  invoiceStatus: (id: string, invoiceId: string, status: InvoiceStatus, stripeInvoiceId?: string) =>
    call<Ok>({ op: 'invoiceStatus', id, invoiceId, status, ...(stripeInvoiceId !== undefined ? { stripeInvoiceId } : {}) }),
  draftReport: (id: string) => call<{ ok: true; messageId: string; overall: number | null }>({ op: 'draftReport', id }),
  taskDone: (id: string, key: string) => call<Ok>({ op: 'taskDone', id, key }),
  keep: (id: string, commitmentId: string) => call<Ok>({ op: 'keep', id, commitmentId }),
  missReason: (id: string, commitmentId: string, reason: string) => call<Ok>({ op: 'missReason', id, commitmentId, reason }),
};
