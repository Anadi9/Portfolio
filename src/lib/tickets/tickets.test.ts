import { describe, expect, it } from 'vitest';
import { memoryTicketStore } from './memory';
import { MESSAGE_POLICY, policyFor } from './policy';
import { NewTicketSchema } from './types';

const base = { email: 'Ana@Example.com', kind: 'first_bug', answers: { q: 'a' }, source: 'bit', boardOptIn: false, whatsappOptIn: false } as const;

describe('policyFor', () => {
  it('sends transactional kinds automatically', () => {
    for (const k of ['ticket_receipt', 'new_ticket_admin', 'stage_change', 'promise_at_risk']) expect(policyFor(k)).toBe('auto');
  });
  it('drafts anything about price, scope, findings, fit or follow-up', () => {
    for (const k of ['followup', 'quote', 'findings', 'fit']) expect(policyFor(k)).toBe('draft');
  });
  it('drafts unknown kinds, including prototype keys', () => {
    expect(policyFor('mystery')).toBe('draft');
    expect(policyFor('toString')).toBe('draft');
    expect(Object.keys(MESSAGE_POLICY)).toHaveLength(8);
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
    expect(m.messages).toMatchObject([{ ticketId: t.id, direction: 'out', kind: 'quote', status: 'draft', body: 'Hi', channel: 'email' }]);
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

describe('feed items', () => {
  const card = { bot: 'bit' as const, kind: 'new_ticket', title: 'A-1001 · first bug', action: 'open' as const };

  it('shows a posted card until it is done', async () => {
    const { store } = memoryTicketStore();
    const c = await store.postFeed(card);
    expect(c).toMatchObject({ bot: 'bit', title: 'A-1001 · first bug', body: '', urgent: false, doneAt: null });
    expect((await store.openFeed()).map((f) => f.id)).toEqual([c.id]);
    await store.markFeedDone(c.id);
    expect(await store.openFeed()).toEqual([]);
  });

  it('hides a snoozed card until the time passes', async () => {
    const { store } = memoryTicketStore();
    const c = await store.postFeed(card);
    await store.snoozeFeed(c.id, new Date('2030-01-01T09:00:00Z'));
    expect(await store.openFeed(new Date('2029-12-31T00:00:00Z'))).toEqual([]);
    expect((await store.openFeed(new Date('2030-01-01T09:00:01Z'))).length).toBe(1);
  });

  it('puts urgent cards first, then newest', async () => {
    const { store } = memoryTicketStore();
    const a = await store.postFeed({ ...card, title: 'a' });
    const b = await store.postFeed({ ...card, title: 'b' });
    const u = await store.postFeed({ ...card, title: 'u', urgent: true, bot: 'coach' });
    expect((await store.openFeed()).map((f) => f.id)).toEqual([u.id, b.id, a.id]);
  });

  it('closes only the cards for one ref', async () => {
    const { store } = memoryTicketStore();
    await store.postFeed({ ...card, kind: 'draft_ready', action: 'approve_send', ref: 'm1' });
    const other = await store.postFeed({ ...card, kind: 'draft_ready', action: 'approve_send', ref: 'm2' });
    await store.doneFeedFor('m1');
    expect((await store.openFeed()).map((f) => f.id)).toEqual([other.id]);
  });

  it('clips long titles and bodies', async () => {
    const { store } = memoryTicketStore();
    const c = await store.postFeed({ ...card, title: 'x'.repeat(500), body: 'y'.repeat(5000) });
    expect(c.title.length).toBe(140);
    expect(c.body.length).toBe(2000);
  });
});

describe('ticket detail methods', () => {
  it('gets a ticket with client, events, messages and brief', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket({ ...base, name: 'Ana', whatsapp: '+911234567890' });
    const mid = await m.store.saveDraftMessage(t.id, 'first_reply', 'hello', 'email');
    await m.store.saveBrief(t.id, { topRisk: 'x' });
    const d = await m.store.getTicket(t.id);
    expect(d).toMatchObject({ id: t.id, number: t.number, client: { name: 'Ana', email: 'ana@example.com', whatsapp: '+911234567890' }, brief: { topRisk: 'x' } });
    expect(d!.events.map((e) => e.type)).toContain('created');
    expect(d!.messages).toMatchObject([{ id: mid, kind: 'first_reply', status: 'draft', body: 'hello', sentAt: null }]);
    expect(await m.store.getTicket('nope')).toBeNull();
  });

  it('lists tickets newest first with brief and reply flags', async () => {
    const m = memoryTicketStore();
    const a = await m.store.createTicket(base);
    const b = await m.store.createTicket({ ...base, kind: 'audit' });
    await m.store.saveBrief(a.id, {});
    const mid = await m.store.saveDraftMessage(a.id, 'first_reply', 'x', 'email');
    await m.store.updateMessage(mid, { status: 'sent' });
    const rows = await m.store.listTickets();
    expect(rows.map((r) => r.id)).toEqual([b.id, a.id]);
    expect(rows[1]).toMatchObject({ hasBrief: true, clientEmail: 'ana@example.com' });
    expect(rows[1].firstReplySentAt).not.toBeNull();
    expect(rows[0]).toMatchObject({ hasBrief: false, firstReplySentAt: null });
    expect((await m.store.listTickets({ stage: 'audit' })).length).toBe(0);
  });

  it('changes stage and edits messages', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    await m.store.setStage(t.id, 'audit');
    const mid = await m.store.saveDraftMessage(t.id, 'first_reply', 'x', 'email');
    await m.store.updateMessage(mid, { body: 'y' });
    const d = await m.store.getTicket(t.id);
    expect(d!.stage).toBe('audit');
    expect(d!.messages[0]).toMatchObject({ body: 'y', status: 'draft', sentAt: null });
  });

  it('finds tickets with no brief', async () => {
    const m = memoryTicketStore();
    const a = await m.store.createTicket(base);
    const b = await m.store.createTicket(base);
    await m.store.saveBrief(a.id, {});
    expect(await m.store.ticketsMissingBrief()).toEqual([b.id]);
  });
});

describe('coach store methods', () => {
  it('opens commitments and lists the live ones, soonest first', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const late = await m.store.openCommitment({ ticketId: t.id, promiseId: 'audit_report', dueAt: '2026-10-21T00:00:00Z' });
    const soon = await m.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: '2026-10-19T00:00:00Z' });
    const done = await m.store.openCommitment({ ticketId: null, promiseId: 'daily_scorecard', dueAt: '2026-10-19T00:00:00Z' });
    expect(soon).toMatchObject({ status: 'open', closedAt: null, missReason: null, alertedStatus: null });
    await m.store.updateCommitment(done.id, { status: 'kept' });
    expect((await m.store.liveCommitments()).map((c) => c.id)).toEqual([soon.id, late.id]);
    await m.store.updateCommitment(soon.id, { status: 'at_risk', alertedStatus: 'at_risk' });
    expect((await m.store.liveCommitments())[0]).toMatchObject({ status: 'at_risk', alertedStatus: 'at_risk', closedAt: null });
  });

  it('stamps closedAt when kept or missed and keeps the reason', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const c = await m.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: '2026-10-19T00:00:00Z' });
    await m.store.updateCommitment(c.id, { status: 'missed' });
    await m.store.updateCommitment(c.id, { missReason: 'Down with flu' });
    const d = await m.store.getTicket(t.id);
    expect(d!.commitments).toMatchObject([{ id: c.id, status: 'missed', missReason: 'Down with flu' }]);
    expect(d!.commitments[0].closedAt).not.toBeNull();
  });

  it('adds tasks once per ticket, stage and key, and completes them', async () => {
    const m = memoryTicketStore();
    const t = await m.store.createTicket(base);
    const tpl = [{ key: 'brief', owner: 'coach' as const, title: 'Brief', doneWhen: 'It exists' }];
    await m.store.addTasks(t.id, 'inbox', tpl);
    await m.store.addTasks(t.id, 'inbox', tpl);
    expect((await m.store.getTicket(t.id))!.tasks).toHaveLength(1);
    expect(await m.store.completeTask(t.id, 'brief')).toBe(true);
    expect(await m.store.completeTask(t.id, 'brief')).toBe(false);
    expect(await m.store.completeTask(t.id, 'nope')).toBe(false);
    const task = (await m.store.getTicket(t.id))!.tasks[0];
    expect(task).toMatchObject({ status: 'done', stage: 'inbox', owner: 'coach' });
    expect(task.doneAt).not.toBeNull();
  });

  it('counts tickets of a kind since a time', async () => {
    const m = memoryTicketStore();
    await m.store.createTicket(base);
    await m.store.createTicket(base);
    await m.store.createTicket({ ...base, kind: 'audit' });
    expect(await m.store.countTickets({ kind: 'first_bug', since: '2000-01-01T00:00:00Z' })).toBe(2);
    expect(await m.store.countTickets({ kind: 'first_bug', since: '2100-01-01T00:00:00Z' })).toBe(0);
  });
});

describe('give to helper', () => {
  it('labels a card and keeps it in the feed', async () => {
    const m = memoryTicketStore();
    const c = await m.store.postFeed({ bot: 'bit', kind: 'new_ticket', title: 'x', action: 'open' });
    expect(c.assignee).toBeNull();
    await m.store.assignFeed(c.id, 'helper');
    expect(await m.store.openFeed()).toMatchObject([{ id: c.id, assignee: 'helper' }]);
  });
});
