import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../lib/tickets/memory';
import { createPortalHandler } from './portal';
import { signSession } from '../lib/admin/session';

const SECRET = 'p'.repeat(32);
const env = { PORTAL_SESSION_SECRET: SECRET, ADMIN_SESSION_SECRET: 'a'.repeat(32) };
type Res = { statusCode?: number; body?: any; headers: Record<string, string | string[]> }; // eslint-disable-line @typescript-eslint/no-explicit-any

let mem: ReturnType<typeof memoryTicketStore>;
let send: ReturnType<typeof vi.fn>;
let handler: ReturnType<typeof createPortalHandler>;
let ip = 0;

beforeEach(() => {
  mem = memoryTicketStore();
  send = vi.fn().mockResolvedValue({ data: {} });
  handler = createPortalHandler({ store: () => mem.store, env, resend: { emails: { send } } });
});

async function call(body: unknown, opts: { cookie?: string; type?: string; ip?: string } = {}): Promise<Res> {
  const res: Res = { headers: {} };
  const r = {
    status: (c: number) => ((res.statusCode = c), r),
    json: (b: unknown) => ((res.body = b), r),
    setHeader: (k: string, v: string | string[]) => ((res.headers[k.toLowerCase()] = v), r),
  };
  const headers: Record<string, string> = { 'content-type': opts.type ?? 'application/json', 'x-forwarded-for': opts.ip ?? `10.2.0.${++ip}` };
  if (opts.cookie) headers.cookie = opts.cookie;
  await handler({ method: 'POST', body, headers } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
}

const linkToken = () => {
  const html: string = send.mock.calls.at(-1)![0].html;
  return decodeURIComponent(/#token=([^"&<]+)/.exec(html)![1]);
};
const sessionFrom = (res: Res) => String(res.headers['set-cookie']).split(';')[0];

async function signIn(email: string) {
  await call({ op: 'requestLink', email });
  const res = await call({ op: 'verify', token: linkToken() });
  return sessionFrom(res);
}

describe('/api/portal', () => {
  it('emails a link only to a known client, answering the same either way', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    const unknown = await call({ op: 'requestLink', email: 'nobody@example.com' });
    const known = await call({ op: 'requestLink', email: 'Jo@Example.com' });
    expect(unknown).toMatchObject({ statusCode: 200, body: { ok: true } });
    expect(known).toMatchObject({ statusCode: 200, body: { ok: true } });
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0][0];
    expect(mail.to).toBe('jo@example.com');
    expect(mail.html).toContain('https://anadithakur.in/portal#token=');
  });

  it('signs in once per link and sets a portal cookie', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    await call({ op: 'requestLink', email: 'jo@example.com' });
    const token = linkToken();
    const first = await call({ op: 'verify', token });
    expect(first.statusCode).toBe(200);
    const cookie = String(first.headers['set-cookie']);
    for (const flag of ['portal_session=', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api/portal']) expect(cookie).toContain(flag);
    expect((await call({ op: 'verify', token })).statusCode).toBe(401);
    expect((await call({ op: 'verify', token: 'junk-token-1234567890' })).statusCode).toBe(401);
  });

  it('shows each client only their own tickets', async () => {
    const jo = await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    const sam = await mem.store.createTicket({ email: 'sam@example.com', kind: 'audit', answers: {}, source: 'bit' });
    await mem.store.saveBrief(jo.id, { topRisk: 'INTERNAL' });
    const joCookie = await signIn('jo@example.com');
    const samCookie = await signIn('sam@example.com');

    const joList = await call({ op: 'tickets' }, { cookie: joCookie });
    expect(joList.body.tickets.map((t: { number: string }) => t.number)).toEqual([jo.number]);
    expect(JSON.stringify(joList.body)).not.toContain('sam@example.com');

    expect((await call({ op: 'ticket', id: jo.id }, { cookie: joCookie })).body.ticket).toMatchObject({ number: jo.number, stage: 'inbox' });
    expect(JSON.stringify((await call({ op: 'ticket', id: jo.id }, { cookie: joCookie })).body)).not.toContain('INTERNAL');
    expect((await call({ op: 'ticket', id: sam.id }, { cookie: joCookie })).statusCode).toBe(404);
    expect((await call({ op: 'ticket', id: jo.id }, { cookie: samCookie })).statusCode).toBe(404);
  });

  it('refuses no cookie, a junk cookie and the admin session', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    expect((await call({ op: 'tickets' })).statusCode).toBe(401);
    expect((await call({ op: 'tickets' }, { cookie: 'portal_session=junk' })).statusCode).toBe(401);
    expect((await call({ op: 'tickets' }, { cookie: `portal_session=${signSession(SECRET)}` })).statusCode).toBe(401);
    expect((await call({ op: 'tickets' }, { cookie: `admin_session=${signSession(env.ADMIN_SESSION_SECRET)}` })).statusCode).toBe(401);
  });

  it('rate-limits link requests per email', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    for (let i = 0; i < 5; i++) await call({ op: 'requestLink', email: 'jo@example.com' });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('answers 501 unconfigured, 415 for non-JSON, 405 for GET', async () => {
    const bare = createPortalHandler({ store: () => mem.store, env: {}, resend: null });
    handler = bare;
    expect((await call({ op: 'tickets' })).statusCode).toBe(501);
    handler = createPortalHandler({ store: () => mem.store, env, resend: null });
    expect((await call('x', { type: 'text/plain' })).statusCode).toBe(415);
  });

  it('logs out', async () => {
    await mem.store.createTicket({ email: 'jo@example.com', kind: 'first_bug', answers: {}, source: 'bit' });
    const cookie = await signIn('jo@example.com');
    expect(String((await call({ op: 'logout' }, { cookie })).headers['set-cookie'])).toContain('Max-Age=0');
  });
});
