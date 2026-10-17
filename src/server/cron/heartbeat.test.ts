import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../../lib/tickets/memory';
import { createHeartbeat } from './heartbeat';

let mem: ReturnType<typeof memoryTicketStore>;
let send: ReturnType<typeof vi.fn>;
let now: Date;
let handler: ReturnType<typeof createHeartbeat>;
let push: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mem = memoryTicketStore({ clock: () => now });
  send = vi.fn().mockResolvedValue({ data: {} });
  push = vi.fn().mockResolvedValue({});
  now = new Date('2026-10-17T00:00:00Z');
  handler = createHeartbeat({
    store: () => mem.store,
    env: { CRON_SECRET: 's3cret', TICKETS_INBOX: 'me@example.com' },
    resend: { emails: { send } },
    now: () => now,
    push,
  });
});

async function run(auth = 'Bearer s3cret') {
  const res: { statusCode?: number; body?: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = { status: (c: number) => ((res.statusCode = c), r), json: (b: unknown) => ((res.body = b), r), setHeader: () => r };
  await handler({ method: 'GET', headers: { authorization: auth } } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
}

async function promise(hoursAgo: number) {
  const t = await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
  const openedAt = new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
  const c = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', openedAt, dueAt: new Date(Date.parse(openedAt) + 24 * 3_600_000).toISOString() });
  return { t, c };
}

describe('heartbeat', () => {
  it('fails closed without the secret', async () => {
    expect((await run('Bearer nope')).statusCode).toBe(401);
    const bare = createHeartbeat({ store: () => mem.store, env: {}, resend: null, now: () => now });
    const res: { statusCode?: number } = {};
    const r = { status: (c: number) => ((res.statusCode = c), r), json: () => r, setHeader: () => r };
    await bare({ method: 'GET', headers: { authorization: 'Bearer ' } } as unknown as VercelRequest, r as unknown as VercelResponse);
    expect(res.statusCode).toBe(401);
  });

  it('leaves a young promise alone', async () => {
    await promise(13);
    const res = await run();
    expect(res.body).toMatchObject({ ok: true, checked: 1, atRisk: 0, missed: 0 });
    expect(mem.feed).toEqual([]);
  });

  it('warns once when a promise is at risk', async () => {
    const { t } = await promise(19);
    expect((await run()).body).toMatchObject({ atRisk: 1 });
    expect(mem.commitments[0]).toMatchObject({ status: 'at_risk', alertedStatus: 'at_risk' });
    expect(mem.feed).toMatchObject([{ bot: 'coach', kind: 'promise_at_risk', urgent: true, ticketId: t.id }]);
    expect(mem.feed[0].title).toContain(t.number);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: 'me@example.com' });
    expect(send.mock.calls[0][0].subject).toMatch(/^At risk: /);

    await run();
    expect(mem.feed).toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('records a miss with a card and no email', async () => {
    await promise(25);
    expect((await run()).body).toMatchObject({ missed: 1 });
    expect(mem.commitments[0]).toMatchObject({ status: 'missed', alertedStatus: 'missed' });
    expect(mem.commitments[0].closedAt).not.toBeNull();
    expect(mem.feed).toMatchObject([{ kind: 'promise_missed', urgent: true }]);
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores kept promises', async () => {
    const { c } = await promise(30);
    await mem.store.updateCommitment(c.id, { status: 'kept' });
    expect((await run()).body).toMatchObject({ checked: 0 });
  });

  it('flags a stale scorecard once', async () => {
    mem.scorecards.push({ runAt: '2026-10-15T08:00:00Z', results: {} });
    await run();
    await run();
    expect(mem.feed.filter((f) => f.kind === 'scorecard_stale')).toHaveLength(1);
  });

  it('says nothing about a fresh scorecard, or before the first run', async () => {
    await run();
    mem.scorecards.push({ runAt: '2026-10-16T08:00:00Z', results: {} });
    await run();
    expect(mem.feed.filter((f) => f.kind === 'scorecard_stale')).toHaveLength(0);
  });
});

describe('heartbeat: weekly and monthly cards', () => {
  it('posts the weekly review once on a Monday (IST)', async () => {
    now = new Date('2026-10-19T03:00:00Z'); // Mon 08:30 IST
    await run();
    await run();
    const cards = mem.feed.filter((f) => f.kind === 'weekly_review');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ bot: 'coach', action: 'mark_done' });
    expect(cards[0].body).toMatch(/Next:/);
    await mem.store.markFeedDone(cards[0].id);
    await run();
    expect(mem.feed.filter((f) => f.kind === 'weekly_review')).toHaveLength(1);
  });

  it('posts nothing weekly on other days', async () => {
    now = new Date('2026-10-20T03:00:00Z'); // Tuesday
    await run();
    expect(mem.feed.filter((f) => f.kind === 'weekly_review')).toHaveLength(0);
  });

  it('posts the AI-visibility check once on the 1st', async () => {
    now = new Date('2026-11-01T04:00:00Z');
    await run();
    await run();
    expect(mem.feed.filter((f) => f.kind === 'ai_visibility_check')).toHaveLength(1);
    now = new Date('2026-11-02T04:00:00Z');
    await run();
    expect(mem.feed.filter((f) => f.kind === 'ai_visibility_check')).toHaveLength(1);
  });
});

describe('heartbeat push', () => {
  it('pushes at-risk and missed cards once each', async () => {
    await promise(19);
    await promise(25);
    await run();
    await run();
    expect(push).toHaveBeenCalledTimes(2);
    expect(push.mock.calls.map((c) => c[1].url)).toEqual(mem.feed.filter((f) => f.urgent).map((f) => `/admin#card-${f.id}`));
  });
});
