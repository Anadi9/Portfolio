import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatch } from '../../src/lib/notify/dispatch.js';
import { liveDeps } from '../../src/lib/notify/ticket.js';
import { withErrorLog } from '../../src/lib/monitoring/with-error-log.js';
import { ticketStore } from '../../src/lib/tickets/store.js';

/**
 * GET /api/cron/notify
 *
 * Daily retry of outbox rows that did not go out (and have been tried fewer
 * than 3 times). Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`.
 * Unlike the kit ping, this one fails closed: with no CRON_SECRET it refuses,
 * because it sends email.
 */
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
  return res.status(200).json({ ok: true, processed: rows.length, ...summary });
});
