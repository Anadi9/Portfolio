import { describe, expect, it } from 'vitest';
import { awaySummary, pickToday } from './today';
import type { TicketRow } from '../tickets/types';
import type { Commitment } from '../coach/types';
import type { FeedItem } from '../feed/types';

const now = new Date('2026-10-20T12:00:00Z');
const row = (o: Partial<TicketRow>): TicketRow => ({
  id: 't', number: 'A-1', kind: 'first_bug', stage: 'inbox', appUrl: null, createdAt: '2026-10-20T00:00:00Z', updatedAt: '',
  clientName: null, clientEmail: 'a@b.c', hasBrief: false, firstReplySentAt: null, ...o,
});
const com = (o: Partial<Commitment>): Commitment => ({
  id: 'c', ticketId: 't', promiseId: 'first_bug_video', openedAt: '2026-10-20T00:00:00Z', dueAt: '2026-10-21T00:00:00Z', status: 'open', closedAt: null, missReason: null, alertedStatus: null, ...o,
});
const card = (o: Partial<FeedItem>): FeedItem => ({
  id: 'f', ticketId: null, bot: 'bit', kind: 'new_ticket', title: 'x', body: '', action: 'open', ref: null, urgent: false, createdAt: '2026-10-20T10:00:00Z', doneAt: null, snoozedUntil: null, ...o,
});

describe('pickToday', () => {
  it('never returns more than three, most pressing first', () => {
    const items = pickToday({
      now,
      tickets: [row({ id: 't1', number: 'A-1' }), row({ id: 't2', number: 'A-2', createdAt: '2026-10-19T20:00:00Z' }), row({ id: 't3', number: 'A-3' })],
      commitments: [
        com({ id: 'm', ticketId: 't9', status: 'missed' }),
        com({ id: 'r1', ticketId: 't1', status: 'at_risk', dueAt: '2026-10-20T18:00:00Z' }),
        com({ id: 'r2', ticketId: 't3', status: 'at_risk', dueAt: '2026-10-20T15:00:00Z' }),
      ],
      feed: [card({ id: 'u', urgent: true })],
    });
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.key)).toEqual(['missed:m', 'risk:r2', 'risk:r1']);
  });

  it('skips a miss that already has a reason, and lists unsent first replies oldest first', () => {
    const items = pickToday({
      now,
      tickets: [row({ id: 'a', number: 'A-5', createdAt: '2026-10-20T05:00:00Z' }), row({ id: 'b', number: 'A-4', createdAt: '2026-10-19T05:00:00Z' }), row({ id: 'c', firstReplySentAt: '2026-10-20T01:00:00Z' })],
      commitments: [com({ id: 'm', status: 'missed', missReason: 'flu' })],
      feed: [],
    });
    expect(items.map((i) => i.key)).toEqual(['reply:b', 'reply:a']);
    expect(items[0].ticketId).toBe('b');
  });

  it('falls back to urgent cards', () => {
    expect(pickToday({ now, tickets: [], commitments: [], feed: [card({ id: 'u', urgent: true, title: 'Scorecard stale' }), card({ id: 'n' })] })).toMatchObject([
      { key: 'card:u', title: 'Scorecard stale' },
    ]);
  });
});

describe('awaySummary', () => {
  it('counts what happened since a time', () => {
    const since = '2026-10-20T06:00:00Z';
    const s = awaySummary({
      since,
      tickets: [row({ createdAt: '2026-10-20T07:00:00Z', hasBrief: true }), row({ createdAt: '2026-10-20T05:00:00Z' })],
      commitments: [com({ status: 'kept', closedAt: '2026-10-20T08:00:00Z' }), com({ status: 'missed', closedAt: '2026-10-20T09:00:00Z' }), com({ status: 'kept', closedAt: '2026-10-19T09:00:00Z' }), com({ status: 'at_risk' })],
      feed: [card({ createdAt: '2026-10-20T07:00:00Z' }), card({ createdAt: '2026-10-20T01:00:00Z' })],
    });
    expect(s).toEqual({ newTickets: 1, briefsReady: 1, kept: 1, missed: 1, atRisk: 1, newCards: 1, any: true });
  });

  it('says nothing happened', () => {
    expect(awaySummary({ since: '2026-10-20T00:00:00Z', tickets: [], commitments: [], feed: [] }).any).toBe(false);
  });
});
