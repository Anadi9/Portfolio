import { splitDraft } from '../brief/draft.js';
import type { TicketDetail, TicketStage } from '../tickets/types.js';

/**
 * What a signed-in client may see of their own ticket, and nothing else: no
 * brief, scan, drafts, Coach tasks or commitments, internal events, budget or
 * contact details. Everything the portal returns goes through `clientView`.
 */

export const JOURNEY: Record<TicketStage, { label: string; about: string }> = {
  inbox: { label: 'Enquiry', about: 'Your request is in. Anadi reviews it and replies.' },
  bug_review: { label: 'First-bug video', about: 'Anadi has sent the video of the biggest risk and a fixed price to fix it.' },
  audit: { label: 'Audit', about: 'The full production audit: reliability, search visibility and privacy.' },
  fixing: { label: 'Fix', about: 'The agreed fixes are being made, with a written update every day.' },
  live: { label: 'Live', about: 'The fix is live. Check it works; the second half is due only after you confirm.' },
  closed: { label: 'Done', about: 'Finished. Care plan clients keep a monthly health review.' },
};

const EVENT_LABEL: Record<string, (data: Record<string, unknown>) => string> = {
  created: () => 'Request received',
  reply_sent: () => 'Anadi replied',
  care_check: (d) => (typeof d.overall === 'number' ? `Monthly health check: ${d.overall}/100` : 'Monthly health check'),
  stage: (d) => `Moved to ${JOURNEY[d.to as TicketStage]?.label ?? 'the next step'}`,
};

export type ClientTicket = {
  id: string;
  number: string;
  kind: TicketDetail['kind'];
  stage: TicketStage;
  appUrl: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: { at: string; label: string }[];
  messages: { at: string; subject: string; body: string }[];
};

export function clientView(t: TicketDetail): ClientTicket {
  return {
    id: t.id,
    number: t.number,
    kind: t.kind,
    stage: t.stage,
    appUrl: t.appUrl,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    timeline: t.events.filter((e) => EVENT_LABEL[e.type]).map((e) => ({ at: e.at, label: EVENT_LABEL[e.type](e.data ?? {}) })),
    messages: t.messages
      .filter((m) => m.direction === 'out' && m.status === 'sent' && m.sentAt)
      .map((m) => {
        const { subject, body } = splitDraft(m.body);
        return { at: m.sentAt as string, subject, body };
      }),
  };
}
