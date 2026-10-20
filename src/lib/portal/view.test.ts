import { describe, expect, it } from 'vitest';
import { clientView, JOURNEY } from './view';
import { joinDraft } from '../brief/draft';
import type { TicketDetail } from '../tickets/types';
import { TICKET_STAGES } from '../tickets/types';

const detail: TicketDetail = {
  id: 't1', number: 'A-1001', clientId: 'c1', kind: 'first_bug', stage: 'audit', appUrl: 'a.example', stack: 'Lovable',
  answers: { budget: 'secret band' }, budget: '$1k', whatsappOptIn: false, source: 'bit', category: null,
  createdAt: '2026-10-18T00:00:00Z', updatedAt: '2026-10-19T00:00:00Z',
  client: { name: 'Jo', email: 'jo@example.com', whatsapp: '+911234567890' },
  events: [
    { type: 'created', data: { source: 'bit' }, at: '2026-10-18T00:00:00Z' },
    { type: 'brief_ready', data: {}, at: '2026-10-18T00:01:00Z' },
    { type: 'reply_sent', data: {}, at: '2026-10-18T10:00:00Z' },
    { type: 'stage', data: { from: 'bug_review', to: 'audit' }, at: '2026-10-19T00:00:00Z' },
    { type: 'miss_reason', data: {}, at: '2026-10-19T01:00:00Z' },
  ],
  messages: [
    { id: 'm1', ticketId: 't1', direction: 'out', kind: 'first_reply', status: 'sent', body: joinDraft({ subject: 'Your first bug', body: 'Hi Jo, here it is.' }), channel: 'email', createdAt: '2026-10-18T09:00:00Z', sentAt: '2026-10-18T10:00:00Z' },
    { id: 'm2', ticketId: 't1', direction: 'out', kind: 'quote', status: 'draft', body: 'DRAFT PRICE $9,999', channel: 'email', createdAt: '2026-10-19T00:00:00Z', sentAt: null },
    { id: 'm3', ticketId: 't1', direction: 'out', kind: 'x', status: 'failed', body: 'FAILED', channel: 'email', createdAt: '2026-10-19T00:00:00Z', sentAt: null },
  ],
  brief: { topRisk: 'INTERNAL RISK' },
  commitments: [{ id: 'k', ticketId: 't1', promiseId: 'first_bug_video', openedAt: '', dueAt: '', status: 'missed', closedAt: null, missReason: 'INTERNAL REASON', alertedStatus: null }],
  tasks: [{ id: 'x', ticketId: 't1', stage: 'audit', key: 'audit_paid', owner: 'anadi', title: 'INTERNAL TASK', doneWhen: '', status: 'open', createdAt: '', doneAt: null }],
};

describe('clientView', () => {
  it('keeps only what the client may see', () => {
    const v = clientView(detail);
    expect(v).toEqual({
      id: 't1',
      number: 'A-1001',
      kind: 'first_bug',
      stage: 'audit',
      appUrl: 'a.example',
      createdAt: '2026-10-18T00:00:00Z',
      updatedAt: '2026-10-19T00:00:00Z',
      timeline: [
        { at: '2026-10-18T00:00:00Z', label: 'Request received' },
        { at: '2026-10-18T10:00:00Z', label: 'Anadi replied' },
        { at: '2026-10-19T00:00:00Z', label: 'Moved to Audit' },
      ],
      messages: [{ at: '2026-10-18T10:00:00Z', subject: 'Your first bug', body: 'Hi Jo, here it is.' }],
    });
    const raw = JSON.stringify(v);
    for (const secret of ['INTERNAL', 'DRAFT', 'FAILED', 'secret band', '$1k', 'jo@example.com', '+91', 'Lovable']) expect(raw).not.toContain(secret);
  });

  it('names every stage for the client', () => {
    for (const s of TICKET_STAGES) expect(JOURNEY[s].label.length).toBeGreaterThan(2);
  });
});
