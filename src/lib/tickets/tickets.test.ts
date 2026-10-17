import { describe, expect, it } from 'vitest';
import { memoryTicketStore } from './memory';
import { MESSAGE_POLICY, policyFor } from './policy';
import { NewTicketSchema } from './types';

const base = { email: 'Ana@Example.com', kind: 'first_bug', answers: { q: 'a' }, source: 'bit', boardOptIn: false, whatsappOptIn: false } as const;

describe('policyFor', () => {
  it('sends transactional kinds automatically', () => {
    for (const k of ['ticket_receipt', 'new_ticket_admin', 'stage_change']) expect(policyFor(k)).toBe('auto');
  });
  it('drafts anything about price, scope, findings, fit or follow-up', () => {
    for (const k of ['followup', 'quote', 'findings', 'fit']) expect(policyFor(k)).toBe('draft');
  });
  it('drafts unknown kinds, including prototype keys', () => {
    expect(policyFor('mystery')).toBe('draft');
    expect(policyFor('toString')).toBe('draft');
    expect(Object.keys(MESSAGE_POLICY)).toHaveLength(7);
  });
});

describe('NewTicketSchema', () => {
  it('lower-cases the email and defaults the opt-ins to false', () => {
    const t = NewTicketSchema.parse({ email: ' Ana@Example.com ', kind: 'audit', answers: {}, source: 'audit_form' });
    expect(t.email).toBe('ana@example.com');
    expect(t.boardOptIn).toBe(false);
    expect(t.whatsappOptIn).toBe(false);
  });
  it('rejects a bad kind, source or email', () => {
    expect(NewTicketSchema.safeParse({ ...base, kind: 'nope' }).success).toBe(false);
    expect(NewTicketSchema.safeParse({ ...base, source: 'nope' }).success).toBe(false);
    expect(NewTicketSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
  });
});

describe('memory ticket store', () => {
  it('numbers tickets from A-1001, reuses a client by email, writes a created event', async () => {
    const m = memoryTicketStore();
    const a = await m.store.createTicket(base);
    const b = await m.store.createTicket({ ...base, email: 'ana@example.com', name: 'Ana' });
    expect(a.number).toBe('A-1001');
    expect(b.number).toBe('A-1002');
    expect(a.stage).toBe('inbox');
    expect(a.clientId).toBe(b.clientId);
    expect(m.clients.size).toBe(1);
    expect(m.clients.get('ana@example.com')?.name).toBe('Ana');
    expect(m.events.filter((e) => e.type === 'created')).toHaveLength(2);
  });

  it('adds events', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    await m.store.addEvent(t.id, 'stage_change', { to: 'fixing' });
    expect(m.events.at(-1)).toMatchObject({ ticketId: t.id, type: 'stage_change', data: { to: 'fixing' } });
  });

  it('lists pending notifications oldest first, within the limit', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const made = await m.store.enqueueNotifications([
      { ticketId: t.id, channel: 'email', template: 'ticket_receipt' },
      { ticketId: t.id, channel: 'whatsapp', template: 'new_ticket_admin', payload: { n: 1 } },
      { ticketId: t.id, channel: 'email', template: 'new_ticket_admin' },
    ]);
    expect(made.every((x) => x.status === 'pending' && x.attempts === 0)).toBe(true);
    const pending = await m.store.pendingNotifications(2);
    expect(pending.map((x) => x.id)).toEqual([made[0].id, made[1].id]);
  });

  it('marks sent and skipped as final, counting the attempt', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const [a, b] = await m.store.enqueueNotifications([
      { ticketId: t.id, channel: 'email', template: 'ticket_receipt' },
      { ticketId: t.id, channel: 'whatsapp', template: 'new_ticket_admin' },
    ]);
    await m.store.markNotification(a.id, { status: 'sent' });
    await m.store.markNotification(b.id, { status: 'skipped', error: 'whatsapp not configured' });
    expect(m.notifications.map((x) => [x.status, x.attempts])).toEqual([['sent', 1], ['skipped', 1]]);
    expect(m.notifications[0].sentAt).not.toBeNull();
    expect(await m.store.pendingNotifications()).toEqual([]);
  });

  it('retries a failure until the third attempt, then leaves it failed', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const [n] = await m.store.enqueueNotifications([{ ticketId: t.id, channel: 'email', template: 'ticket_receipt' }]);
    await m.store.markNotification(n.id, { status: 'failed', error: 'boom 1' });
    expect(m.notifications[0]).toMatchObject({ status: 'pending', attempts: 1, lastError: 'boom 1' });
    await m.store.markNotification(n.id, { status: 'failed', error: 'boom 2' });
    expect(m.notifications[0]).toMatchObject({ status: 'pending', attempts: 2 });
    expect(await m.store.pendingNotifications()).toHaveLength(1);
    await m.store.markNotification(n.id, { status: 'failed', error: 'boom 3' });
    expect(m.notifications[0]).toMatchObject({ status: 'failed', attempts: 3, lastError: 'boom 3' });
    expect(await m.store.pendingNotifications()).toEqual([]);
  });

  it('saves draft messages', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    await m.store.saveDraftMessage(t.id, 'quote', 'Hi', 'email');
    expect(m.messages).toEqual([{ ticketId: t.id, direction: 'out', kind: 'quote', status: 'draft', body: 'Hi', channel: 'email' }]);
  });

  it('shows only opted-in, open tickets on the board, without personal fields', async () => {
    const m = memoryTicketStore();
    await m.store.createTicket({ ...base, boardOptIn: false });
    const shown = await m.store.createTicket({ ...base, boardOptIn: true, category: 'Booking app', stack: 'Next.js', name: 'Ana', company: 'Acme', appUrl: 'https://acme.test' });
    const closed = await m.store.createTicket({ ...base, boardOptIn: true });
    m.tickets.find((t) => t.id === closed.id)!.stage = 'closed';
    const board = await m.store.publicBoard();
    expect(board).toHaveLength(1);
    expect(Object.keys(board[0]).sort()).toEqual(['category', 'kind', 'number', 'stack', 'stage', 'updatedAt']);
    expect(board[0].number).toBe(shown.number);
  });

  it('keeps the latest scorecard', async () => {
    const m = memoryTicketStore();
    expect(await m.store.latestScorecard()).toBeNull();
    await m.store.saveScorecard({ leads: 1 });
    await m.store.saveScorecard({ leads: 2 });
    expect((await m.store.latestScorecard())?.results).toEqual({ leads: 2 });
  });
});
