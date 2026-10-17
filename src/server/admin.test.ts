import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../lib/tickets/memory';
import { createAdminHandler } from './admin';
import { signSession } from '../lib/admin/session';
import { joinDraft } from '../lib/brief/draft';

const SECRET = 's'.repeat(32);
const env = { ADMIN_EMAIL: 'anadi@example.com', ADMIN_PASSWORD: 'open sesame', ADMIN_SESSION_SECRET: SECRET, TICKETS_INBOX: 'me@example.com' };

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
    const res = await call({ op: 'login', email: 'Anadi@Example.com', password: 'open sesame' });
    expect(res.statusCode).toBe(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/^admin_session=/);
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin', 'Max-Age=43200']) expect(cookie).toContain(flag);
  });

  it('refuses a wrong password', async () => {
    const res = await call({ op: 'login', email: 'anadi@example.com', password: 'nope' });
    expect(res.statusCode).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('rate-limits login attempts per IP', async () => {
    const res: Res[] = [];
    for (let i = 0; i < 6; i++) {
      const r: Res = { headers: {} };
      const rr = { status: (c: number) => ((r.statusCode = c), rr), json: () => rr, setHeader: () => rr };
      await handler({ method: 'POST', body: { op: 'login', email: 'anadi@example.com', password: 'x' }, headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' } } as unknown as VercelRequest, rr as unknown as VercelResponse);
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
    await bare({ method: 'POST', body: { op: 'login', email: 'anadi@example.com', password: 'x' }, headers: { 'content-type': 'application/json' } } as unknown as VercelRequest, r as unknown as VercelResponse);
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
    await mem.store.completeTask(t.id, 'next_step');
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

describe('/api/admin gates and Coach ops', () => {
  it('refuses a stage change while the gate is closed', async () => {
    const t = await mem.store.createTicket(ticketInput);
    await mem.store.addTasks(t.id, 'inbox', [{ key: 'first_reply', owner: 'anadi', title: 'Send the first reply', doneWhen: 'Sent' }]);
    const res = await call({ op: 'stage', id: t.id, stage: 'audit' }, { cookie: authed() });
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ error: 'gate closed', blockers: ['Not done: Send the first reply'] });
    expect(mem.tickets[0].stage).toBe('inbox');
    expect(send).not.toHaveBeenCalled();
  });

  it('a miss needs a reason before any move, then the move goes through', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const c = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: '2026-01-01T00:00:00Z' });
    await mem.store.updateCommitment(c.id, { status: 'missed' });
    expect((await call({ op: 'stage', id: t.id, stage: 'closed' }, { cookie: authed() })).statusCode).toBe(409);
    expect((await call({ op: 'missReason', id: t.id, commitmentId: c.id, reason: '' }, { cookie: authed() })).statusCode).toBe(400);
    expect((await call({ op: 'missReason', id: t.id, commitmentId: c.id, reason: 'Client’s site was down all day' }, { cookie: authed() })).statusCode).toBe(200);
    expect(mem.commitments[0]).toMatchObject({ status: 'missed', missReason: 'Client’s site was down all day' });
    expect(mem.events.map((e) => e.type)).toContain('miss_reason');
    expect((await call({ op: 'stage', id: t.id, stage: 'closed' }, { cookie: authed() })).statusCode).toBe(200);
  });

  it('only a missed commitment takes a reason, and a missed one can’t be kept', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const open = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: '2030-01-01T00:00:00Z' });
    expect((await call({ op: 'missReason', id: t.id, commitmentId: open.id, reason: 'x' }, { cookie: authed() })).statusCode).toBe(409);
    await mem.store.updateCommitment(open.id, { status: 'missed' });
    expect((await call({ op: 'keep', id: t.id, commitmentId: open.id }, { cookie: authed() })).statusCode).toBe(409);
    expect((await call({ op: 'keep', id: t.id, commitmentId: 'nope' }, { cookie: authed() })).statusCode).toBe(404);
  });

  it('marks a task done and keeps a commitment by hand', async () => {
    const t = await mem.store.createTicket(ticketInput);
    await mem.store.setStage(t.id, 'audit');
    await mem.store.addTasks(t.id, 'audit', [{ key: 'audit_report', owner: 'anadi', title: 'Send the report', doneWhen: 'Sent' }]);
    const c = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'audit_report', dueAt: '2030-01-01T00:00:00Z' });
    expect((await call({ op: 'taskDone', id: t.id, key: 'audit_report' }, { cookie: authed() })).statusCode).toBe(200);
    expect(mem.commitments[0].status).toBe('kept');
    expect((await call({ op: 'taskDone', id: t.id, key: 'audit_report' }, { cookie: authed() })).statusCode).toBe(404);
    const d = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'daily_update', dueAt: '2030-01-01T00:00:00Z' });
    expect((await call({ op: 'keep', id: t.id, commitmentId: d.id }, { cookie: authed() })).statusCode).toBe(200);
    expect(mem.commitments.find((x) => x.id === d.id)!.status).toBe('kept');
    void c;
  });
});

describe('/api/admin numbers', () => {
  it('returns the numbers', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const c = await mem.store.openCommitment({ ticketId: t.id, promiseId: 'first_bug_video', dueAt: '2030-01-01T00:00:00Z' });
    await mem.store.updateCommitment(c.id, { status: 'kept' });
    const res = await call({ op: 'numbers' }, { cookie: authed() });
    expect(res.body.numbers).toMatchObject({ promisesKept: { kept: 1, missed: 0, rate: 1 }, pipeline: { inbox: 1 } });
  });
});

describe('/api/admin today and away', () => {
  it('lists today’s items and what happened since a time', async () => {
    const t = await mem.store.createTicket(ticketInput);
    const today = await call({ op: 'today' }, { cookie: authed() });
    expect(today.body.items).toMatchObject([{ key: `reply:${t.id}`, ticketId: t.id }]);
    const away = await call({ op: 'away', since: '2000-01-01T00:00:00Z' }, { cookie: authed() });
    expect(away.body.away).toMatchObject({ newTickets: 1, any: true });
    expect((await call({ op: 'away', since: 'yesterday' }, { cookie: authed() })).statusCode).toBe(400);
  });
});

describe('/api/admin plan', () => {
  it('returns the master plan as data', async () => {
    const res = await call({ op: 'plan' }, { cookie: authed() });
    expect(res.body.phases.length).toBeGreaterThan(5);
    expect(res.body.phases[0].phase).toMatch(/^Phase 0/);
    expect(res.body.next.length).toBeLessThanOrEqual(3);
  });
});

describe('/api/admin helper', () => {
  it('gives a card to the helper', async () => {
    const c = await mem.store.postFeed({ bot: 'bit', kind: 'new_ticket', title: 'x', action: 'open' });
    expect((await call({ op: 'helper', feedId: c.id }, { cookie: authed() })).statusCode).toBe(200);
    expect(mem.feed[0].assignee).toBe('helper');
  });
});

describe('/api/admin push', () => {
  it('needs VAPID keys for the public key, and saves subscriptions', async () => {
    expect((await call({ op: 'pushKey' }, { cookie: authed() })).statusCode).toBe(501);
    const withKeys = createAdminHandler({ store: () => mem.store, env: { ...env, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: 'mailto:a@b.c' }, resend: null, delay: async () => {} });
    handler = withKeys;
    expect((await call({ op: 'pushKey' }, { cookie: authed() })).body).toEqual({ key: 'pub' });
    const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };
    expect((await call({ op: 'pushSubscribe', ...sub }, { cookie: authed() })).statusCode).toBe(200);
    expect(await mem.store.pushSubscriptions()).toHaveLength(1);
    expect((await call({ op: 'pushSubscribe', ...sub, endpoint: 'http://insecure.example/x' }, { cookie: authed() })).statusCode).toBe(400);
    await call({ op: 'pushUnsubscribe', endpoint: sub.endpoint }, { cookie: authed() });
    expect(await mem.store.pushSubscriptions()).toHaveLength(0);
  });
});

describe('/api/admin email check and passkey', () => {
  const fake = () => ({
    registrationOptions: vi.fn().mockResolvedValue({ challenge: 'reg-challenge', rp: { id: 'localhost' } }),
    verifyRegistration: vi.fn().mockResolvedValue({ id: 'cred-123456789', publicKey: 'pk', counter: 0, transports: ['internal'] }),
    authenticationOptions: vi.fn().mockResolvedValue({ challenge: 'auth-challenge' }),
    verifyAuthentication: vi.fn().mockResolvedValue({ newCounter: 5 }),
  });
  const cookieFrom = (res: Res, name: string) => {
    const all = ([] as string[]).concat(res.headers['set-cookie'] as string | string[]);
    const c = all.find((x) => x.startsWith(`${name}=`));
    return c ? c.split(';')[0] : undefined;
  };

  it('refuses the right password with the wrong email', async () => {
    expect((await call({ op: 'login', email: 'someone@else.com', password: 'open sesame' })).statusCode).toBe(401);
  });

  it('is not configured without ADMIN_EMAIL', async () => {
    handler = createAdminHandler({ store: () => mem.store, env: { ...env, ADMIN_EMAIL: '' }, resend: null, delay: async () => {} });
    expect((await call({ op: 'login', email: 'anadi@example.com', password: 'open sesame' })).statusCode).toBe(501);
  });

  it('registers a passkey, then requires it to log in', async () => {
    const pk = fake();
    handler = createAdminHandler({ store: () => mem.store, env, resend: null, delay: async () => {}, passkeys: pk });

    const opts = await call({ op: 'passkeyOptions' }, { cookie: authed() });
    expect(opts.body.options).toMatchObject({ challenge: 'reg-challenge' });
    const pending = cookieFrom(opts, 'admin_pending')!;
    expect(pending).toBeTruthy();
    expect((await call({ op: 'passkeyRegister', response: { id: 'x' } }, { cookie: authed() })).statusCode).toBe(400); // no pending cookie
    const reg = await call({ op: 'passkeyRegister', response: { id: 'x' } }, { cookie: `${authed()}; ${pending}` });
    expect(reg.statusCode).toBe(200);
    expect(pk.verifyRegistration.mock.calls[0][2]).toBe('reg-challenge');
    expect((await call({ op: 'passkeys' }, { cookie: authed() })).body.passkeys).toMatchObject([{ id: 'cred-123456789' }]);

    // Password alone no longer gives a session.
    const login = await call({ op: 'login', email: 'anadi@example.com', password: 'open sesame' });
    expect(login.statusCode).toBe(200);
    expect(login.body).toMatchObject({ passkey: true, options: { challenge: 'auth-challenge' } });
    expect(cookieFrom(login, 'admin_session')).toBeUndefined();
    const loginPending = cookieFrom(login, 'admin_pending')!;
    // The pending cookie is not a session.
    expect((await call({ op: 'feed' }, { cookie: loginPending.replace('admin_pending', 'admin_session') })).statusCode).toBe(401);

    const done = await call({ op: 'passkeyLogin', response: { id: 'cred-123456789' } }, { cookie: loginPending });
    expect(done.statusCode).toBe(200);
    expect(cookieFrom(done, 'admin_session')).toBeTruthy();
    expect((await mem.store.passkeys())[0].counter).toBe(5);
  });

  it('refuses a passkey login without the pending cookie, with an unknown key, or a failed check', async () => {
    const pk = fake();
    handler = createAdminHandler({ store: () => mem.store, env, resend: null, delay: async () => {}, passkeys: pk });
    await mem.store.savePasskey({ id: 'cred-123456789', publicKey: 'pk', counter: 0, transports: [] });
    expect((await call({ op: 'passkeyLogin', response: { id: 'cred-123456789' } })).statusCode).toBe(401);
    const login = await call({ op: 'login', email: 'anadi@example.com', password: 'open sesame' });
    const pending = cookieFrom(login, 'admin_pending')!;
    expect((await call({ op: 'passkeyLogin', response: { id: 'other-credential' } }, { cookie: pending })).statusCode).toBe(401);
    pk.verifyAuthentication.mockResolvedValueOnce(null);
    expect((await call({ op: 'passkeyLogin', response: { id: 'cred-123456789' } }, { cookie: pending })).statusCode).toBe(401);
  });

  it('removes a passkey', async () => {
    await mem.store.savePasskey({ id: 'cred-123456789', publicKey: 'pk', counter: 0, transports: [] });
    expect((await call({ op: 'passkeyRemove', id: 'cred-123456789' }, { cookie: authed() })).statusCode).toBe(200);
    expect(await mem.store.passkeys()).toEqual([]);
  });
});

describe('/api/admin plan without a database', () => {
  it('still answers', async () => {
    handler = createAdminHandler({ store: () => null, env, resend: null, delay: async () => {} });
    expect((await call({ op: 'plan' }, { cookie: authed() })).statusCode).toBe(200);
  });
});

describe('/api/admin draftReport', () => {
  it('runs the engine and saves a report draft with a card', async () => {
    const scan = vi.fn().mockResolvedValue({ ok: true, url: 'https://a.example/', readiness: { score: 40, topFixes: [{ id: 'r', label: 'Content is not in the HTML' }] }, headers: { present: [], missing: ['Content-Security-Policy'] }, ms: 1 });
    handler = createAdminHandler({ store: () => mem.store, env, resend: null, delay: async () => {}, scan });
    const t = await mem.store.createTicket({ ...ticketInput, kind: 'audit' });
    const res = await call({ op: 'draftReport', id: t.id }, { cookie: authed() });
    expect(res.statusCode).toBe(200);
    expect(scan).toHaveBeenCalledWith('a.example');
    expect(mem.messages).toMatchObject([{ kind: 'audit_report', status: 'draft' }]);
    expect(mem.messages[0].body).toContain('Content is not in the HTML');
    expect(mem.feed.at(-1)).toMatchObject({ kind: 'draft_ready', action: 'approve_send', ref: mem.messages[0].id });
    expect((await call({ op: 'draftReport', id: 'nope' }, { cookie: authed() })).statusCode).toBe(404);
  });
});
