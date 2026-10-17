import type { VercelRequest, VercelResponse } from '@vercel/node';
import { computeNumbers } from '../../lib/command/numbers.js';
import { awaySummary, pickToday } from '../../lib/command/today.js';
import { ADMIN_URL, FROM, INBOX_FALLBACK, type ResendLike } from '../../lib/notify/email.js';
import { liveDeps } from '../../lib/notify/live.js';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';
import { ticketStore, type TicketStore } from '../../lib/tickets/store.js';

/**
 * GET /api/cron/summary — the one routine email, at 08:30 IST.
 *
 * The last 24 hours, today's three, how many cards are open and the numbers,
 * with a link to /admin. Routine news (new briefs, drafts) lives in the feed;
 * this replaces an email per event. Says nothing on a quiet day. Card titles
 * carry ticket numbers and app domains, never client names or emails.
 */

export type SummaryDeps = {
  store: () => TicketStore | null;
  env: Record<string, string | undefined>;
  resend: ResendLike | null;
  now: () => Date;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function createSummary(deps: SummaryDeps) {
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
    const since = new Date(now.getTime() - 24 * 3_600_000).toISOString();
    const [tickets, commitments, feed] = await Promise.all([store.listTickets({ limit: 2000 }), store.allCommitments(), store.openFeed(now)]);
    const away = awaySummary({ since, tickets, commitments, feed });
    const today = pickToday({ tickets, commitments, feed, now });
    if (!away.any && !today.length) return res.status(200).json({ ok: true, sent: false });
    if (!deps.resend) return res.status(200).json({ ok: true, sent: false, reason: 'RESEND_API_KEY not set' });

    const n = computeNumbers({ tickets, commitments, now });
    const lines = [
      away.newTickets && plural(away.newTickets, 'new ticket'),
      away.kept && `${plural(away.kept, 'promise')} kept`,
      away.missed && `${away.missed} missed`,
      away.atRisk && `${away.atRisk} at risk`,
    ].filter(Boolean) as string[];
    const subject = `Morning: ${lines.join(', ') || plural(today.length, 'thing') + ' for today'}`;
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">
<h2 style="margin:0 0 8px">Today</h2>
${today.length ? `<ol>${today.map((i) => `<li><strong>${esc(i.title)}</strong><br><span style="color:#6b6b6b">${esc(i.why)}</span></li>`).join('')}</ol>` : '<p>Nothing pressing.</p>'}
<h2 style="margin:16px 0 8px">Last 24 hours</h2>
<p>${esc(lines.join(' · ') || 'Quiet.')}. ${plural(feed.length, 'open card')} in the feed.</p>
<p>Promises kept: ${n.promisesKept.rate == null ? 'none closed yet' : `${Math.round(n.promisesKept.rate * 100)}% (${n.promisesKept.kept} kept, ${n.promisesKept.missed} missed)`}. Average first reply: ${n.avgFirstReplyHours == null ? '—' : `${n.avgFirstReplyHours}h`}.</p>
<p><a href="${ADMIN_URL}">Open the command centre</a></p>
</div>`;
    const to = deps.env.TICKETS_INBOX || deps.env.RESCUE_INBOX || INBOX_FALLBACK;
    const sent = await deps.resend.emails.send({ from: FROM, to, subject, html });
    if (sent.error) {
      console.error('[cron-summary] send failed', JSON.stringify(sent.error));
      return res.status(200).json({ ok: false, sent: false });
    }
    return res.status(200).json({ ok: true, sent: true });
  };
}

export default withErrorLog(
  'cron-summary',
  createSummary({
    store: ticketStore,
    env: process.env,
    get resend() {
      return liveDeps().resend;
    },
    now: () => new Date(),
  }),
);
