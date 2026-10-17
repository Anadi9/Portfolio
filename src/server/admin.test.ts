import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../lib/tickets/memory';
import { createAdminHandler } from './admin';
import { signSession } from '../lib/admin/session';
import { joinDraft } from '../lib/brief/draft';

const SECRET = 's'.repeat(32);
const env = { ADMIN_PASSWORD: 'open sesame', ADMIN_SESSION_SECRET: SECRET, TICKETS_INBOX: 'me@example.com' };

type Res = { statusCode?: number; body?: any; headers: Record<string, string | string[]> }; // eslint-disable-line @typescript-eslint/no-explicit-any

let mem: ReturnType<typeof memoryTicketStore>;
let send: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createAdminHandler>;
let ip = 0;

beforeEach(() => {
  mem = memoryTicketStore();
  send = vi.fn().mockResolvedValue({ data: { id: 'e1' } });
  handler = createAdminHandler({ store: () => mem.store, env, resend: { emails: { send } }, delay: async () => {} });
});

async function call(body: unknown, opts: { cookie?: string; method?: string; type?: string } = {}): Promise<Res> {
  const res: Res = { headers: {} };
  const r = {
    status: (c: number) => ((res.statusCode = c), r),
    json: (b: unknown) => ((res.body = b), r),
    setHeader: (k: string, v: string | string[]) => ((res.headers[k.toLowerCase()] = v), r),
  };
  const headers: Record<string, string> = { 'content-type': opts.type ?? 'application/json', 'x-forwarded-for': `10.1.0.${++ip}` };
  if (opts.cookie) headers.cookie = opts.cookie;
  await handler({ method: opts.method ?? 'POST', body, headers } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
}

const authed = () => `admin_session=${signSession(SECRET)}`;
const ticketInput = { email: 'jo@example.com', name: 'Jo Bloggs', appUrl: 'a.example', kind: 'first_bug', answers: {}, source: 'bit' } as const;

describe('/api/admin auth', () => {
  it('logs in with the password and sets a strict cookie', async () => {
    const res = await call({ op: 'login', password: 'open sesame' });
    expect(res.statusCode).toBe(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^admin_session=/);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=43200']) expect(cookie).toContain(flag);
  });

  it('refuses a wrong password', async () => {
    const res = await call({ op: 'login', password: 'nope' });
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rate-limits login attempts per IP', async () => {
    const res: Res[] = [];
    for (let i = 0; i < 6; i++) {
      const r: Res = { headers: {} };
      const rr = { status: (c: number) => ((r.statusCode = c), rr), json: () => rr, setHeader: () => rr };
      await handler({ method: 'POST', body: { op: 'login', password: 'x' }, headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' } } as unknown as VercelRequest, rr as unknown as VercelResponse);
      res.push(r);
    }
    expect(res.at(-1)!.statusCode).toBe(429);
  });

  it('every other op needs a valid session', async () => {
    const expired = `admin_session=${signSession(SECRET, Date.now() - 13 * 3_600_000)}`;
    const forged = `admin_session=${signSession('z'.repeat(32))}`;
    for (const op of ['feed', 'list', 'get', 'done', 'snooze', 'stage', 'saveDraft', 'send', 'logout']) {
      for (const cookie of [undefined, 'admin_session=junk', expired, forged]) {
        const res = await call({ op, id: 'x' }, { cookie });
        expect(res.statusCode, `${op} ${cookie}`).toBe(401);
        expect(JSON.stringify(res.body ?? {})).not.toContain('jo@example.com');
      }
    }
  });

  it('answers 501 when not configured, 405 for GET, 415 for non-JSON', async () => {
    const bare = createAdminHandler({ store: () => mem.store, env: {}, resend: null, delay: async () => {} });
    const res: Res = { headers: {} };
    const r = { status: (c: number) => ((res.statusCode = c), r), json: () => r, setHeader: () => r };
    await bare({ method: 'POST', body: { op: 'login', password: 'x' }, headers: { 'content-type': 'application/json' } } as unknown as VercelRequest, r as unknown as VercelResponse);
    expect(res.statusCode).toBe(501);
    expect((await call({}, { method: 'GET' })).statusCode).toBe(405);
    expect((await call('op=login', { type: 'application/x-www-form-urlencoded' })).statusCode).toBe(415);
  });
});

describe('/api/admin operations', () => {
  it('lists the feed, marks done and snoozes', async () => {
    const a = await mem.store.postFeed({ bot: 'bit', kind: 'new_ticket', title: 'a', action: 'open' });
    const b = await mem.store.postFeed({ bot: 'bit', kind: 'new_ticket', title: 'b', action: 'open' });
    expect((await call({ op: 'feed' }, { cookie: authed() })).body.items).toHaveLength(2);
    expect((await call({ op: 'done', feedId: a.id }, { cookie: authed() })).statusCode).toBe(200);
    expect((await call({ op: 'snooze', feedId: b.id, hours: 3 }, { cookie: authed() })).statusCode).toBe(200);
    expect((await call({ op: 'feed' }, { cookie: authed() })).body.items).toHaveLength(0);
    expect((await call({ op: 'snooze', feedId: b.id, hours: 0 }, { cookie: authed() })).statusCode).toBe(400);
    expect((await call({ op: 'snooze', feedId: b.id, hours: 169 }, { cookie: authed() })).statusCode).toBe(400);
  });

  it('lists and gets tickets', async () => {
    const t = await mem.store.createTicket(ticketInput);
    expect((await call({ op: 'list' }, { cookie: authed() })).body.tickets[0]).toMatchObject({ number: t.number });
    expect((await call({ op: 'get', id: t.id }, { cookie: authed() })).body.ticket).toMatchObject({ number: t.number, client: { email: 'jo@example.com' } });
    expect((await call({ op: 'get', id: 'missing' }, { cookie: authed() })).statusCode).toBe(404);
  });

  it('moves a stage and emails the client only for client-facing stages', async () => {
    const t = await mem.store.createTicket(ticketInput);
    await call({ op: 'stage', id: t.id, stage: 'bug_review' }, { cookie: authed() });
    expect(send).not.toHaveBeenCalled();
    const res = await call({ op: 'stage', id: t.id, stage: 'audit' }, { cookie: authed() });
    expect(res.statusCode).toBe(200);
    expect(mem.tickets[0].stage).toBe('audit');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toBe('jo@example.com');
    expect(mem.events.filter((e) => e.type === 'stage').map((e) => e.data)).toEqual([
      { from: 'inbox', to: 'bug_review' },
      { from: 'bug_review', to: 'audit' },
    ]);
    expect((await call({ op: 'stage', id: t.id, stage: 'wat' }, { cookie: authed() })).statusCode).toBe(400);
  });

  it('saves an edited draft', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const mid = await mem.store.saveDraftMessage(t.id, 'first_reply', joinDraft({ subject: 'S', body: 'old' }), 'email');
    await call({ op: 'saveDraft', id: t.id, messageId: mid, subject: 'New S', body: 'new' }, { cookie: authed() });
    expect(mem.messages[0].body).toBe(joinDraft({ subject: 'New S', body: 'new' }));
  });

  it('refuses to send while placeholders remain', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const mid = await mem.store.saveDraftMessage(t.id, 'first_reply', 'x', 'email');
    for (const body of ['Video: [PASTE LOOM LINK]', 'Price: [PRICE]']) {
      expect((await call({ op: 'send', id: t.id, messageId: mid, subject: 'S', body }, { cookie: authed() })).statusCode).toBe(400);
    }
    expect(send).not.toHaveBeenCalled();
  });

  it('sends a draft, closes its card and moves a first bug to review', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const mid = await mem.store.saveDraftMessage(t.id, 'first_reply', 'x', 'email');
    await mem.store.postFeed({ ticketId: t.id, bot: 'bit', kind: 'draft_ready', title: 'd', action: 'approve_send', ref: mid });
    const res = await call({ op: 'send', id: t.id, messageId: mid, subject: 'Your first bug', body: 'Hi Jo,\n\nHere it is: https://loom.com/x\n\nFixed price: $1,500' }, { cookie: authed() });
    expect(res.statusCode).toBe(200);
    const mail = send.mock.calls[0][0];
    expect(mail).toMatchObject({ to: 'jo@example.com', subject: 'Your first bug', replyTo: 'me@example.com' });
    expect(mail.text).toContain('https://loom.com/x');
    expect(mem.messages[0]).toMatchObject({ status: 'sent' });
    expect(mem.messages[0].sentAt).not.toBeNull();
    expect(await mem.store.openFeed()).toEqual([]);
    expect(mem.tickets[0].stage).toBe('bug_review');
    expect(mem.events.map((e) => e.type)).toContain('reply_sent');
  });

  it('will not send a message from another ticket, or twice', async () => {
    const a = await mem.store.createTicket(ticketInput);
    const b = await mem.store.createTicket({ ...ticketInput, email: 'other@example.com' });
    const mid = await mem.store.saveDraftMessage(a.id, 'first_reply', 'x', 'email');
    expect((await call({ op: 'send', id: b.id, messageId: mid, subject: 'S', body: 'ok' }, { cookie: authed() })).statusCode).toBe(404);
    await call({ op: 'send', id: a.id, messageId: mid, subject: 'S', body: 'ok' }, { cookie: authed() });
    expect((await call({ op: 'send', id: a.id, messageId: mid, subject: 'S', body: 'ok' }, { cookie: authed() })).statusCode).toBe(409);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('logs out by clearing the cookie', async () => {
    const res = await call({ op: 'logout' }, { cookie: authed() });
    expect(String(res.headers['set-cookie'])).toContain('Max-Age=0');
  });
});

describe('/api/admin and Coach', () => {
  it('sending the first reply keeps the 24h promise and opens the next stage’s task', async () => {
    const t = await mem.store.createTicket(ticketInput);
    await mem.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: new Date(Date.now() + 3_600_000).toISOString() });
    await mem.store.addTasks(t.id, 'inbox', [{ key: 'first_reply', owner: 'anadi', title: 'Reply', doneWhen: 'Sent' }]);
    const mid = await mem.store.saveDraftMessage(t.id, 'first_reply', 'x', 'email');
    await call({ op: 'send', id: t.id, messageId: mid, subject: 'S', body: 'ok' }, { cookie: authed() });
    expect(mem.commitments[0].status).toBe('kept');
    expect(mem.tasks.find((x) => x.key === 'first_reply')!.status).toBe('done');
    expect(mem.tasks.find((x) => x.key === 'next_step')).toMatchObject({ stage: 'bug_review', status: 'open' });
  });
});
