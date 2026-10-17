import { describe, expect, it } from 'vitest';
import { computeNumbers } from './numbers';
import type { TicketRow } from '../tickets/types';
import type { Commitment } from '../coach/types';

const now = new Date('2026-10-20T00:00:00Z');
const row = (o: Partial<TicketRow>): TicketRow => ({
  id: 'x', number: 'A-1', kind: 'first_bug', stage: 'inbox', appUrl: null, createdAt: '2026-10-19T00:00:00Z', updatedAt: '2026-10-19T00:00:00Z',
  clientName: null, clientEmail: 'a@b.c', hasBrief: false, firstReplySentAt: null, ...o,
});
const com = (status: Commitment['status']): Commitment => ({ id: status, ticketId: null, promiseId: 'first_bug_video', openedAt: '', dueAt: '', status, closedAt: null, missReason: null, alertedStatus: null });

describe('computeNumbers', () => {
  it('is empty with no data', () => {
    const n = computeNumbers({ tickets: [], commitments: [], now });
    expect(n).toMatchObject({ promisesKept: { kept: 0, missed: 0, rate: null }, avgFirstReplyHours: null, ticketsLast7: 0, ticketsLast30: 0 });
    expect(Object.values(n.pipeline).every((v) => v === 0)).toBe(true);
  });

  it('counts the pipeline, recent tickets, first reply time and promises kept', () => {
    const n = computeNumbers({
      tickets: [
        row({ stage: 'inbox', createdAt: '2026-10-19T00:00:00Z', firstReplySentAt: '2026-10-19T06:00:00Z' }),
        row({ stage: 'audit', createdAt: '2026-10-10T00:00:00Z', firstReplySentAt: '2026-10-10T18:00:00Z' }),
        row({ stage: 'audit', createdAt: '2026-09-01T00:00:00Z' }),
        row({ stage: 'closed', createdAt: '2026-10-18T00:00:00Z' }),
      ],
      commitments: [com('kept'), com('kept'), com('kept'), com('missed'), com('open')],
      now,
    });
    expect(n.pipeline).toMatchObject({ inbox: 1, audit: 2, closed: 1, fixing: 0 });
    expect(n.ticketsLast7).toBe(2);
    expect(n.ticketsLast30).toBe(3);
    expect(n.avgFirstReplyHours).toBe(12);
    expect(n.promisesKept).toEqual({ kept: 3, missed: 1, rate: 0.75 });
  });
});
