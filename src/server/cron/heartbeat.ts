import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PROMISES } from '../../data/promises.js';
import { statusAt } from '../../lib/coach/rules.js';
import { dispatch } from '../../lib/notify/dispatch.js';
import type { ResendLike } from '../../lib/notify/email.js';
import { liveDeps } from '../../lib/notify/live.js';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';
import { ticketStore, type TicketStore } from '../../lib/tickets/store.js';

/**
 * GET /api/cron/heartbeat — Coach's hourly check.
 *
 * Recomputes every live commitment from the clock. At 75% of its window a
 * promise turns `at_risk`: an urgent green card and one email to Anadi. Past
 * due it turns `missed`: an urgent card saying a reason is needed before the
 * ticket can move. `alerted_status` keeps a second run from repeating either.
 * Also posts one card when the daily scorecard hasn't run for 26 hours.
 *
 * Hobby crons are daily, so cron-job.org calls this hourly with
 * `Authorization: Bearer $CRON_SECRET`; vercel.json's daily run is the floor.
 * Fails closed. Never messages a client.
 */

const STALE_SCORECARD_MS = 26 * 3_600_000;

export type HeartbeatDeps = {
  store: () => TicketStore | null;
  env: Record<string, string | undefined>;
  resend: ResendLike | null;
  now: () => Date;
};

const IST = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export function createHeartbeat(deps: HeartbeatDeps) {
  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method not allowed' });
    }
    const secret = deps.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
    const store = deps.store();
    if (!store) return res.status(501).json({ error: 'tickets not configured' });

    const now = deps.now();
    const live = await store.liveCommitments();
    let atRisk = 0;
    let missed = 0;

    for (const c of live) {
      const next = statusAt(c, now);
      if (next !== c.status) await store.updateCommitment(c.id, { status: next });
      if (next === 'open' || next === c.alertedStatus) continue;

      const promise = PROMISES[c.promiseId]?.what ?? c.promiseId;
      const ticket = c.ticketId ? await store.getTicket(c.ticketId) : null;
      const label = ticket?.number ?? 'Site';
      const hoursLeft = Math.max(0, Math.round((Date.parse(c.dueAt) - now.getTime()) / 3_600_000));

      if (next === 'at_risk') {
        atRisk += 1;
        const card = await store.postFeed({
          ticketId: c.ticketId,
          bot: 'coach',
          kind: 'promise_at_risk',
          title: `${label} · ${promise} due in ${hoursLeft}h`,
          body: `Due ${IST.format(new Date(c.dueAt))} IST.`,
          action: 'open',
          ref: c.id,
          urgent: true,
        });
        if (c.ticketId) {
          const rows = await store.enqueueNotifications([
            { ticketId: c.ticketId, channel: 'email', template: 'promise_at_risk', payload: { number: label, promise, due: `${IST.format(new Date(c.dueAt))} IST`, hoursLeft, cardId: card.id } },
          ]);
          await dispatch(store, rows, { ...liveDeps(deps.env), resend: deps.resend });
        }
      } else if (next === 'missed') {
        missed += 1;
        await store.postFeed({
          ticketId: c.ticketId,
          bot: 'coach',
          kind: 'promise_missed',
          title: `${label} · missed: ${promise}`,
          body: 'Write a reason on the ticket before it can move on. The miss stays in the promises-kept count.',
          action: 'open',
          ref: c.id,
          urgent: true,
        });
      }
      await store.updateCommitment(c.id, { alertedStatus: next });
    }

    const scorecard = await store.latestScorecard();
    if (scorecard && now.getTime() - Date.parse(scorecard.runAt) > STALE_SCORECARD_MS) {
      const open = await store.openFeed(now);
      if (!open.some((f) => f.kind === 'scorecard_stale')) {
        await store.postFeed({
          ticketId: null,
          bot: 'coach',
          kind: 'scorecard_stale',
          title: 'The public scorecard hasn’t run for over a day',
          body: '/scorecard promises a daily run. Check the scorecard cron in Vercel and its CRON_SECRET.',
          action: 'mark_done',
        });
      }
    }

    return res.status(200).json({ ok: true, checked: live.length, atRisk, missed });
  };
}

export default withErrorLog(
  'cron-heartbeat',
  createHeartbeat({
    store: ticketStore,
    env: process.env,
    get resend() {
      return liveDeps().resend;
    },
    now: () => new Date(),
  }),
);
