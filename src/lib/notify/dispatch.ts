import { policyFor } from '../tickets/policy.js';
import type { TicketStore } from '../tickets/store.js';
import type { Notification } from '../tickets/types.js';
import { sendEmailNotification, type ResendLike, type SendResult } from './email.js';
import { sendWhatsAppNotification, type FetchLike } from './whatsapp.js';

export type NotifyDeps = {
  resend: ResendLike | null;
  fetch: FetchLike;
  env: Record<string, string | undefined>;
};

export type DispatchSummary = { sent: number; failed: number; skipped: number; drafted: number };

/**
 * Sends the given outbox rows and marks each one. The caller decides which
 * rows: the ticket route passes only the rows it just enqueued; the cron
 * passes `pendingNotifications()`. The store caps retries at 3 attempts.
 *
 * `draft` kinds (price, scope, findings, fit, follow-ups) are never sent: the
 * body is saved as a draft message for Anadi to approve, and the row is closed.
 */
export async function dispatch(store: TicketStore, rows: Notification[], deps: NotifyDeps): Promise<DispatchSummary> {
  const summary: DispatchSummary = { sent: 0, failed: 0, skipped: 0, drafted: 0 };

  for (const row of rows) {
    let result: SendResult;
    try {
      if (policyFor(row.template) === 'draft') {
        const body = typeof row.payload.body === 'string' ? row.payload.body : '';
        await store.saveDraftMessage(row.ticketId, row.template, body, row.channel);
        result = { status: 'skipped', error: 'draft: awaiting approval' };
        summary.drafted += 1;
      } else if (row.channel === 'email') {
        result = await sendEmailNotification(row, deps.resend, deps.env);
      } else {
        result = await sendWhatsAppNotification(row, deps.fetch, deps.env);
      }
    } catch (err) {
      result = { status: 'failed', error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
    }

    if (result.status === 'sent') summary.sent += 1;
    else if (result.status === 'failed') {
      summary.failed += 1;
      console.error('[notify] send failed', JSON.stringify({ id: row.id, channel: row.channel, template: row.template, error: result.error }));
    } else {
      if (!result.error?.startsWith('draft')) summary.skipped += 1;
      console.warn('[notify] skipped', JSON.stringify({ id: row.id, channel: row.channel, template: row.template, reason: result.error }));
    }

    try {
      await store.markNotification(row.id, { status: result.status, error: result.error });
    } catch (err) {
      console.error('[notify] could not mark notification', row.id, err);
    }
  }
  return summary;
}
