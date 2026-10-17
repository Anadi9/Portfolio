import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scanLead } from '../../lib/brief/scan.js';
import { joinDraft } from '../../lib/brief/draft.js';
import { fromLeadScan } from '../../lib/engine/adapters.js';
import { combine, type EngineResult } from '../../lib/engine/combine.js';
import { withErrorLog } from '../../lib/monitoring/with-error-log.js';
import { ticketStore, type TicketStore } from '../../lib/tickets/store.js';
import type { TicketDetail } from '../../lib/tickets/types.js';

/**
 * GET /api/cron/care — daily.
 *
 * 1. Care clients: any open `care` ticket not checked for 30 days gets the
 *    engine run on its app, a `care_check` event (shown in their portal), a
 *    card, and a drafted monthly review for Anadi to edit and send.
 * 2. Quiet leads: a first-bug or enquiry ticket whose last reply from Anadi
 *    is 5+ days old, with no stage change since, gets one drafted follow-up
 *    per stage. Drafts only: the send policy keeps nudges for approval.
 * Fails closed without CRON_SECRET. Sends nothing to anyone.
 */

const DAY = 86_400_000;
const CHECK_EVERY = 30 * DAY;
const QUIET_FOR = 5 * DAY;

export type CareDeps = { store: () => TicketStore | null; env: Record<string, string | undefined>; now: () => Date; scan?: typeof scanLead };

const lastEvent = (t: TicketDetail, type: string) => [...t.events].filter((e) => e.type === type).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1);

function reviewDraft(t: TicketDetail, r: EngineResult, delta: number | null) {
  const top = r.top.map((f, i) => `${i + 1}. ${f.title}${f.fix ? `: ${f.fix}` : ''}`);
  const trend = delta == null ? '' : delta === 0 ? ' (no change since last month)' : ` (${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} since last month)`;
  return joinDraft({
    subject: `Your monthly health review: ${t.appUrl ?? t.number}`,
    body: [
      'Hi,',
      '',
      `This month's outside-in check of ${t.appUrl ?? 'your app'} scored ${r.overall ?? '—'}/100${trend}.`,
      '',
      ...(top.length ? ['What I would look at next:', ...top] : ['Nothing new to fix from the outside.']),
      '',
      '[ANADI: add what you fixed this month and anything from monitoring]',
      '',
      'Anadi',
    ].join('\n'),
  });
}

export function createCare(deps: CareDeps) {
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
    const rows = await store.listTickets({ limit: 2000 });

    let checked = 0;
    for (const row of rows.filter((r) => r.kind === 'care' && r.stage !== 'closed')) {
      const t = await store.getTicket(row.id);
      if (!t) continue;
      const last = lastEvent(t, 'care_check');
      if (last && now.getTime() - Date.parse(last.at) < CHECK_EVERY) continue;
      const scan = await (deps.scan ?? scanLead)(t.appUrl);
      const result = combine(fromLeadScan(scan), 'error' in scan ? [] : ['visibility', 'security']);
      const prev = typeof last?.data?.overall === 'number' ? (last.data.overall as number) : null;
      const delta = prev != null && result.overall != null ? result.overall - prev : null;
      await store.addEvent(t.id, 'care_check', { overall: result.overall, areas: result.areas, count: result.findings.length, delta, scanOk: scan.ok });
      const messageId = await store.saveDraftMessage(t.id, 'care_review', reviewDraft(t, result, delta), 'email');
      await store.postFeed({
        ticketId: t.id,
        bot: 'bit',
        kind: 'care_check',
        title: `${t.number} · Care check ${result.overall ?? '—'}/100${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}`,
        body: 'Monthly review drafted. Add what you fixed, then send.',
        action: 'approve_send',
        ref: messageId,
        urgent: delta != null && delta <= -10,
      });
      checked += 1;
    }

    let nudged = 0;
    for (const row of rows.filter((r) => (r.stage === 'inbox' || r.stage === 'bug_review') && r.firstReplySentAt)) {
      const t = await store.getTicket(row.id);
      if (!t) continue;
      const lastSent = t.messages.filter((m) => m.direction === 'out' && m.status === 'sent' && m.sentAt).map((m) => Date.parse(m.sentAt as string)).sort((a, b) => a - b).at(-1);
      if (!lastSent || now.getTime() - lastSent < QUIET_FOR) continue;
      const movedSince = t.events.some((e) => e.type === 'stage' && Date.parse(e.at) > lastSent);
      const alreadyNudged = t.events.some((e) => e.type === 'nudge_drafted' && e.data?.stage === t.stage);
      if (movedSince || alreadyNudged) continue;
      const first = t.client.name?.trim().split(/\s+/)[0];
      const messageId = await store.saveDraftMessage(
        t.id,
        'followup',
        joinDraft({
          subject: `Checking in on ${t.number}`,
          body: `${first ? `Hi ${first},` : 'Hi,'}\n\nJust checking you saw my last email about ${t.appUrl ?? 'your request'}. Happy to answer any questions, or to leave it here if now isn't the right time.\n\nAnadi`,
        }),
        'email',
      );
      await store.addEvent(t.id, 'nudge_drafted', { stage: t.stage });
      await store.postFeed({ ticketId: t.id, bot: 'bit', kind: 'draft_ready', title: `${t.number} · quiet for 5 days: follow-up drafted`, action: 'approve_send', ref: messageId });
      nudged += 1;
    }

    return res.status(200).json({ ok: true, checked, nudged });
  };
}

export default withErrorLog('cron-care', createCare({ store: ticketStore, env: process.env, now: () => new Date() }));
