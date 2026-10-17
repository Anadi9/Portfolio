import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../../lib/tickets/memory';
import { createCare } from './care';
import { onTicketCreated } from '../../lib/coach/hooks';
import { clientView } from '../../lib/portal/view';

let mem: ReturnType<typeof memoryTicketStore>;
let now: Date;
let scan: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createCare>;

const okScan = (score: number) => ({ ok: true, url: 'https://a.example/', readiness: { score, topFixes: [{ id: 'r', label: 'Weak titles' }] }, headers: { present: [], missing: [] }, ms: 1 });

beforeEach(() => {
  mem = memoryTicketStore({ clock: () => now });
  now = new Date('2026-10-20T02:00:00Z');
  scan = vi.fn().mockResolvedValue(okScan(80));
  handler = createCare({ store: () => mem.store, env: { CRON_SECRET: 's3cret' }, now: () => now, scan });
});

async function run(auth = 'Bearer s3cret') {
  const res: { statusCode?: number; body?: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = { status: (c: number) => ((res.statusCode = c), r), json: (b: unknown) => ((res.body = b), r), setHeader: () => r };
  await handler({ method: 'GET', headers: { authorization: auth } } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
}

const care = () => mem.store.createTicket({ email: 'c@example.com', kind: 'care', appUrl: 'a.example', answers: {}, source: 'bit' });

describe('care cron: monthly checks', () => {
  it('fails closed', async () => {
    expect((await run('Bearer x')).statusCode).toBe(401);
  });

  it('a Care ticket opens a monthly review promise', async () => {
    const t = await care();
    await onTicketCreated(mem.store, t, now);
    expect(mem.commitments).toMatchObject([{ promiseId: 'care_review', status: 'open' }]);
  });

  it('checks a Care ticket once a month, drafts the review and shows it in the portal', async () => {
    const t = await care();
    expect((await run()).body).toMatchObject({ ok: true, checked: 1 });
    expect(scan).toHaveBeenCalledWith('a.example');
    expect(mem.events.filter((e) => e.type === 'care_check')).toMatchObject([{ ticketId: t.id, data: { overall: expect.any(Number), delta: null } }]);
    expect(mem.messages).toMatchObject([{ kind: 'care_review', status: 'draft' }]);
    expect(mem.feed.at(-1)).toMatchObject({ kind: 'care_check', ticketId: t.id });

    now = new Date('2026-11-05T02:00:00Z');
    expect((await run()).body).toMatchObject({ checked: 0 });

    now = new Date('2026-11-20T02:00:00Z');
    scan.mockResolvedValue({ ...okScan(40), headers: { present: [], missing: ['Content-Security-Policy', 'Strict-Transport-Security'] } });
    await run();
    const checks = mem.events.filter((e) => e.type === 'care_check');
    expect(checks).toHaveLength(2);
    expect(checks[1].data.delta).toBeLessThan(0);

    const view = clientView((await mem.store.getTicket(t.id))!);
    expect(view.timeline.some((e) => /^Monthly health check: \d+\/100$/.test(e.label))).toBe(true);
  });

  it('skips closed Care tickets', async () => {
    const t = await care();
    await mem.store.setStage(t.id, 'closed');
    expect((await run()).body).toMatchObject({ checked: 0 });
  });
});

describe('care cron: nudges', () => {
  async function replied(daysAgo: number) {
    const t = await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    const mid = await mem.store.saveDraftMessage(t.id, 'first_reply', 'x', 'email');
    const was = now;
    now = new Date(was.getTime() - daysAgo * 86_400_000);
    await mem.store.updateMessage(mid, { status: 'sent' });
    now = was;
    return t;
  }

  it('drafts one follow-up for a lead quiet for 5 days after our reply', async () => {
    const t = await replied(6);
    expect((await run()).body).toMatchObject({ nudged: 1 });
    expect(mem.messages.filter((m) => m.kind === 'followup')).toMatchObject([{ ticketId: t.id, status: 'draft' }]);
    expect(mem.feed.at(-1)).toMatchObject({ kind: 'draft_ready', action: 'approve_send' });
    await run();
    expect(mem.messages.filter((m) => m.kind === 'followup')).toHaveLength(1);
  });

  it('leaves a lead alone before 5 days, or with no reply from us yet', async () => {
    await replied(3);
    await mem.store.createTicket({ email: 'x@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    expect((await run()).body).toMatchObject({ nudged: 0 });
  });
});
