import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../../lib/tickets/memory';
import { createSummary } from './summary';

let mem: ReturnType<typeof memoryTicketStore>;
let send: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createSummary>;
const now = new Date('2026-10-16T03:00:00Z');

beforeEach(() => {
  mem = memoryTicketStore();
  send = vi.fn().mockResolvedValue({ data: {} });
  handler = createSummary({ store: () => mem.store, env: { CRON_SECRET: 's3cret', TICKETS_INBOX: 'me@example.com' }, resend: { emails: { send } }, now: () => now });
});

async function run(auth = 'Bearer s3cret') {
  const res: { statusCode?: number; body?: any } = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = { status: (c: number) => ((res.statusCode = c), r), json: (b: unknown) => ((res.body = b), r), setHeader: () => r };
  await handler({ method: 'GET', headers: { authorization: auth } } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
}

describe('morning summary', () => {
  it('fails closed', async () => {
    expect((await run('Bearer x')).statusCode).toBe(401);
  });

  it('stays quiet when nothing happened', async () => {
    expect((await run()).body).toMatchObject({ ok: true, sent: false });
    expect(send).not.toHaveBeenCalled();
  });

  it('sends one email to Anadi with the day, no client contact details', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', name: 'Jo Bloggs', kind: 'first_bug', answers: {}, source: 'bit' });
    await mem.store.postFeed({ bot: 'bit', kind: 'new_ticket', title: 'A-1001 · First-bug review · a.example', action: 'open' });
    expect((await run()).body).toMatchObject({ ok: true, sent: true });
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('me@example.com');
    expect(mail.subject).toMatch(/^Morning: 1 new ticket/);
    expect(mail.html).toContain('A-1001 · record the video and reply');
    expect(mail.html).toContain('https://anadithakur.in/admin');
    expect(mail.html).not.toContain('jo@example.com');
    expect(mail.html).not.toContain('Jo Bloggs');
  });
});
