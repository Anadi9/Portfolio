import { describe, expect, it } from 'vitest';
import { memoryTicketStore } from '../tickets/memory';
import { keepCommitment, onReplySent, onStageEntered, onTaskDone, onTicketCreated } from './hooks';

const input = { email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' } as const;
const NOW = new Date('2026-10-20T06:00:00Z'); // Tuesday

async function ticket(m: ReturnType<typeof memoryTicketStore>, kind: 'first_bug' | 'audit' = 'first_bug', now = NOW) {
  const t = await m.store.createTicket({ ...input, kind });
  await onTicketCreated(m.store, t, now);
  return t;
}

describe('onTicketCreated', () => {
  it('opens the inbox tasks and the 24h promise for a first bug', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    expect(m.tasks.map((x) => [x.stage, x.key])).toEqual([['inbox', 'brief'], ['inbox', 'first_reply']]);
    expect(m.commitments).toMatchObject([{ ticketId: t.id, promiseId: 'first_bug_video', status: 'open' }]);
    expect(Date.parse(m.commitments[0].dueAt) - Date.parse(t.createdAt)).toBe(24 * 3_600_000);
  });

  it('opens no promise for other kinds', async () => {
    const m = memoryTicketStore();
    await ticket(m, 'audit');
    expect(m.commitments).toEqual([]);
    expect(m.tasks).toHaveLength(2);
  });

  it('posts a Coach card for the sixth first bug of the week, not the fifth', async () => {
    const m = memoryTicketStore();
    const friday = new Date('2026-10-16T06:00:00Z'); // the memory store dates tickets 16 Oct
    for (let i = 0; i < 5; i++) await ticket(m, 'first_bug', friday);
    expect(m.feed.filter((f) => f.kind === 'weekly_cap')).toHaveLength(0);
    const sixth = await ticket(m, 'first_bug', friday);
    expect(m.feed.filter((f) => f.kind === 'weekly_cap')).toMatchObject([{ bot: 'coach', ticketId: sixth.id, action: 'open' }]);
  });
});

describe('onReplySent', () => {
  it('ticks the reply task and keeps the promise', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await onReplySent(m.store, (await m.store.getTicket(t.id))!, 'first_reply', NOW);
    expect(m.tasks.find((x) => x.key === 'first_reply')!.status).toBe('done');
    expect(m.commitments[0].status).toBe('kept');
  });

  it('leaves a missed promise missed', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await m.store.updateCommitment(m.commitments[0].id, { status: 'missed' });
    await onReplySent(m.store, (await m.store.getTicket(t.id))!, 'first_reply', NOW);
    expect(m.commitments[0].status).toBe('missed');
  });
});

describe('onStageEntered', () => {
  it('opens the stage’s tasks and promises once', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'audit', NOW);
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'audit', NOW);
    expect(m.tasks.filter((x) => x.stage === 'audit').map((x) => x.key)).toEqual(['audit_paid', 'audit_report', 'refund_check']);
    const audit = m.commitments.filter((c) => c.promiseId === 'audit_report');
    expect(audit).toHaveLength(1);
    expect(audit[0].dueAt).toBe('2026-10-22T06:00:00.000Z');
  });
});

describe('onTaskDone and keepCommitment', () => {
  it('sending the audit report keeps the audit promise', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'audit', NOW);
    await onTaskDone(m.store, (await m.store.getTicket(t.id))!, 'audit_report', NOW);
    expect(m.commitments.find((c) => c.promiseId === 'audit_report')!.status).toBe('kept');
  });

  it('keeping a daily update opens the next one while fixing', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await m.store.setStage(t.id, 'fixing');
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'fixing', NOW);
    const first = m.commitments.find((c) => c.promiseId === 'daily_update')!;
    const later = new Date('2026-10-20T20:00:00Z');
    await keepCommitment(m.store, (await m.store.getTicket(t.id))!, first.id, later);
    const daily = m.commitments.filter((c) => c.promiseId === 'daily_update');
    expect(daily.map((c) => c.status)).toEqual(['kept', 'open']);
    expect(daily[1].dueAt).toBe('2026-10-21T20:00:00.000Z');
  });

  it('keeping a daily update after the fix stage opens nothing new', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'fixing', NOW);
    await m.store.setStage(t.id, 'live');
    const first = m.commitments.find((c) => c.promiseId === 'daily_update')!;
    await keepCommitment(m.store, (await m.store.getTicket(t.id))!, first.id, NOW);
    expect(m.commitments.filter((c) => c.promiseId === 'daily_update')).toHaveLength(1);
  });
});

describe('onReplySent for reports', () => {
  it('sending the audit report ticks its task and keeps the 48h promise', async () => {
    const m = memoryTicketStore();
    const t = await ticket(m);
    await onStageEntered(m.store, (await m.store.getTicket(t.id))!, 'audit', NOW);
    await onReplySent(m.store, (await m.store.getTicket(t.id))!, 'audit_report', NOW);
    expect(m.tasks.find((x) => x.key === 'audit_report')!.status).toBe('done');
    expect(m.commitments.find((c) => c.promiseId === 'audit_report')!.status).toBe('kept');
  });
});
