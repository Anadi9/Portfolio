import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatch } from '../../lib/notify/dispatch.js';
import { liveDeps } from '../../lib/notify/ticket.js';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';
import { ticketStore } from '../../lib/tickets/store.js';
import { processTicket } from '../../lib/brief/process.js';

/**
 * GET /api/cron/notify
 *
 * Daily retry of outbox rows that did not go out (and have been tried fewer
 * than 3 times), then a backfill: up to 5 recent tickets with no brief get one. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 * Unlike the kit ping, this one fails closed: with no CRON_SECRET it refuses,
 * because it sends email.
 */
/** Tickets briefed per run; each one can take ~35 s (scan + model). */
const BACKFILL = 5;

export default withErrorLog('cron-notify', async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });

  const store = ticketStore();
  if (!store) return res.status(501).json({ error: 'tickets not configured' });

  const rows = await store.pendingNotifications();
  const summary = await dispatch(store, rows, liveDeps());

  let briefed = 0;
  for (const id of await store.ticketsMissingBrief(BACKFILL)) {
    try {
      if ((await processTicket(store, id)) === 'done') briefed += 1;
    } catch (err) {
      console.error('[cron-notify] backfill failed', id, err);
    }
  }
  return res.status(200).json({ ok: true, processed: rows.length, ...summary, briefed });
});
