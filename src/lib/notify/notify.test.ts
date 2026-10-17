import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../tickets/memory';
import type { TicketStore } from '../tickets/store';

const { sendMock, holder, background, processMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  holder: { store: null as unknown },
  background: vi.fn(),
  processMock: vi.fn(),
}));

vi.mock('../brief/background.js', () => ({ processInBackground: background }));
vi.mock('../brief/process.js', () => ({ processTicket: processMock }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('../tickets/store.js', async (orig) => ({ ...(await orig<typeof import('../tickets/store')>()), ticketStore: () => holder.store }));

import ticketHandler from '../../server/bit/ticket';
import notifyCron from '../../server/cron/notify';
import { dispatch } from './dispatch';
import { ANSWER_LABEL, renderNewTicketAdmin, replyBy } from './email';
import { ANSWER_KEYS } from '../bit/nodes';

type FakeRes = {
  statusCode?: number;
  headers: Record<string, string>;
  body?: unknown;
  status: (c: number) => FakeRes;
  json: (b: unknown) => FakeRes;
  setHeader: (k: string, v: string) => FakeRes;
};
function makeRes(): FakeRes {
  const res = { headers: {} } as FakeRes;
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  res.setHeader = (k, v) => ((res.headers[k] = v), res);
  return res;
}
let ipCounter = 0;
const post = async (body: unknown, ip = `10.0.0.${++ipCounter}`, method = 'POST') => {
  const res = makeRes();
  await ticketHandler({ method, body, headers: { 'x-forwarded-for': ip } } as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
};
const cron = async (authorization?: string, method = 'GET') => {
  const res = makeRes();
  await notifyCron({ method, headers: { authorization } } as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
};

const valid = {
  email: 'Sam@Example.com',
  name: 'Sam Lee',
  appUrl: 'myapp.lovable.app',
  kind: 'first_bug',
  answers: { symptom: 'login breaks' },
  boardOptIn: false,
  whatsappOptIn: false,
  hp: '',
};

const WA_ENV = {
  WHATSAPP_TOKEN: 'tok',
  WHATSAPP_PHONE_NUMBER_ID: '123',
  WHATSAPP_ALERT_TO: '919999999999',
  WHATSAPP_TEMPLATE_NEW_TICKET: 'new_ticket',
};

const ORIGINAL_ENV = { ...process.env };
let mem: ReturnType<typeof memoryTicketStore>;
const fetchMock = vi.fn();

beforeEach(() => {
  mem = memoryTicketStore();
  holder.store = mem.store;
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'x' } });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: 'k', RESCUE_INBOX: 'rescue@example.com' };
  for (const k of Object.keys(WA_ENV)) delete process.env[k];
  delete process.env.TICKETS_INBOX;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/bit/ticket', () => {
  it('rejects anything but POST', async () => {
    const res = await post(null, undefined, 'GET');
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  it('creates a numbered ticket and returns only the number', async () => {
    const res = await post(valid);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ number: 'A-1001' });
    expect(mem.tickets).toHaveLength(1);
    expect(mem.tickets[0]).toMatchObject({ source: 'bit', kind: 'first_bug' });
    expect((await post(valid)).body).toEqual({ number: 'A-1002' });
  });

  it('stores the stack answer when Bit sends one', async () => {
    expect((await post({ ...valid, stack: 'Replit' })).statusCode).toBe(200);
    expect(mem.tickets[0].stack).toBe('Replit');
  });

  it('drops a free-text stack silently and still saves the ticket', async () => {
    const res = await post({ ...valid, stack: 'John Smith https://x.com' });
    expect(res.statusCode).toBe(200);
    expect(mem.tickets[0].stack ?? null).toBeNull();
  });

  it('accepts a JSON string body', async () => {
    expect((await post(JSON.stringify(valid))).statusCode).toBe(200);
  });

  it('emails Anadi and sends the receipt only to the visitor, with the 24-hour promise', async () => {
    await post(valid);
    expect(sendMock).toHaveBeenCalledTimes(2);
    const [admin, receipt] = sendMock.mock.calls.map((c) => c[0]);
    expect(admin).toMatchObject({ to: 'rescue@example.com', replyTo: 'sam@example.com' });
    expect(admin.subject).toContain('A-1001');
    expect(receipt).toMatchObject({ to: 'sam@example.com' });
    expect(receipt.html).toContain('A-1001');
    expect(receipt.html).toContain('24 hours');
    // The visitor's receipt never goes to the inbox, and the admin mail never to the visitor.
    expect(sendMock.mock.calls.filter((c) => c[0].to === 'sam@example.com')).toHaveLength(1);
  });

  it('uses TICKETS_INBOX ahead of RESCUE_INBOX', async () => {
    process.env.TICKETS_INBOX = 'tickets@example.com';
    await post(valid);
    expect(sendMock.mock.calls[0][0].to).toBe('tickets@example.com');
  });

  it('omits the 24-hour promise for other kinds', async () => {
    await post({ ...valid, kind: 'question' });
    expect(sendMock.mock.calls[1][0].html).not.toContain('24 hours');
  });

  it('skips WhatsApp without env, and records it as skipped', async () => {
    await post(valid);
    expect(fetchMock).not.toHaveBeenCalled();
    const wa = mem.notifications.find((n) => n.channel === 'whatsapp');
    expect(wa).toMatchObject({ status: 'skipped', attempts: 1 });
  });

  it('sends the WhatsApp template with env', async () => {
    Object.assign(process.env, WA_ENV);
    await post({ ...valid, appUrl: 'https://my-very-long-subdomain.example.com/' + 'x'.repeat(200) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
    expect(init.headers.Authorization).toBe('Bearer tok');
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({
      messaging_product: 'whatsapp',
      to: '919999999999',
      type: 'template',
      template: { name: 'new_ticket', language: { code: 'en' } },
    });
    const params = payload.template.components[0].parameters;
    expect(payload.template.components[0].type).toBe('body');
    expect(params.map((p: { type: string }) => p.type)).toEqual(['text', 'text', 'text']);
    expect(params[0].text).toBe('A-1001');
    expect(params[1].text).toBe('first_bug');
    expect(params[2].text.length).toBeLessThanOrEqual(60);
    expect(mem.notifications.find((n) => n.channel === 'whatsapp')?.status).toBe('sent');
  });

  it('still returns the number when sends fail, and leaves the rows for the cron', async () => {
    sendMock.mockRejectedValue(new Error('resend down'));
    const res = await post(valid);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ number: 'A-1001' });
    const email = mem.notifications.filter((n) => n.channel === 'email');
    expect(email.every((n) => n.status === 'pending' && n.attempts === 1)).toBe(true);
  });

  it('answers 501 when the store is missing', async () => {
    holder.store = null;
    const res = await post(valid);
    expect(res.statusCode).toBe(501);
    expect(res.body).toEqual({ error: 'tickets not configured' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('answers a silent 200 to the honeypot and saves nothing', async () => {
    const res = await post({ ...valid, hp: 'bot' });
    expect(res.statusCode).toBe(200);
    expect(mem.tickets).toHaveLength(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('400s with the failing field', async () => {
    const res = await post({ ...valid, email: 'nope' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: 'email' });
    expect((await post({ ...valid, kind: 'bogus' })).statusCode).toBe(400);
    expect((await post({ ...valid, answers: { a: 'x'.repeat(9000) } })).body).toMatchObject({ field: 'answers' });
    expect(mem.tickets).toHaveLength(0);
  });

  it('rate-limits per IP', async () => {
    const ip = '203.0.113.9';
    for (let i = 0; i < 5; i++) expect((await post(valid, ip)).statusCode).toBe(200);
    expect((await post(valid, ip)).statusCode).toBe(429);
    expect((await post(valid, '203.0.113.10')).statusCode).toBe(200);
  });

  it('does not let a visitor inject HTML into the admin email', () => {
    const { html } = renderNewTicketAdmin({ number: 'A-1', kind: 'first_bug', name: '<script>x</script>', email: 'a@b.co', answers: { q: '<img onerror=1>' } });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('hung backend', () => {
  it('returns { number } when the inline dispatch never resolves', async () => {
    vi.useFakeTimers();
    try {
      const store = { ...mem.store, enqueueNotifications: () => new Promise<never>(() => {}) };
      holder.store = store;
      const pending = post(valid);
      await vi.advanceTimersByTimeAsync(4100);
      const res = await pending;
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ number: 'A-1001' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('policy', () => {
  it('stores draft kinds as message drafts and never sends them', async () => {
    const t = await mem.store.createTicket({ email: 'a@b.co', kind: 'question', answers: {}, source: 'bit' });
    const rows = await mem.store.enqueueNotifications([
      { ticketId: t.id, channel: 'email', template: 'quote', payload: { body: 'It is $349.', to: 'a@b.co' } },
    ]);
    const out = await dispatch(mem.store, rows, { resend: { emails: { send: sendMock } }, fetch: fetchMock, env: { ...WA_ENV } });
    expect(sendMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mem.messages).toMatchObject([{ ticketId: t.id, direction: 'out', kind: 'quote', status: 'draft', body: 'It is $349.', channel: 'email' }]);
    expect(out.drafted).toBe(1);
    expect(mem.notifications[0].status).toBe('skipped');
  });

  it('sends a stage_change email to the client', async () => {
    const t = await mem.store.createTicket({ email: 'a@b.co', kind: 'audit', answers: {}, source: 'bit' });
    const rows = await mem.store.enqueueNotifications([
      { ticketId: t.id, channel: 'email', template: 'stage_change', payload: { number: t.number, stage: 'fixing', to: 'a@b.co', name: 'Ann' } },
    ]);
    await dispatch(mem.store, rows, { resend: { emails: { send: sendMock } }, fetch: fetchMock, env: {} });
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: 'a@b.co' });
    expect(sendMock.mock.calls[0][0].subject).toContain('being fixed');
  });
});

describe('GET /api/cron/notify', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 's3cret';
  });

  it('is closed without the secret, and fails closed if none is configured', async () => {
    expect((await cron()).statusCode).toBe(401);
    expect((await cron('Bearer wrong')).statusCode).toBe(401);
    delete process.env.CRON_SECRET;
    expect((await cron('Bearer undefined')).statusCode).toBe(401);
  });

  it('answers 501 without a store', async () => {
    holder.store = null;
    expect((await cron('Bearer s3cret')).statusCode).toBe(501);
  });

  it('retries pending rows and caps attempts at 3', async () => {
    Object.assign(process.env, WA_ENV);
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: { message: 'meta down' } }) });
    await post(valid); // attempt 1 inline (whatsapp fails, emails send)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await cron('Bearer s3cret')).body).toMatchObject({ processed: 1, failed: 1 }); // attempt 2
    expect((await cron('Bearer s3cret')).body).toMatchObject({ processed: 1, failed: 1 }); // attempt 3
    const res = await cron('Bearer s3cret'); // nothing left
    expect(res.body).toMatchObject({ processed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const wa = mem.notifications.find((n) => n.channel === 'whatsapp')!;
    expect(wa).toMatchObject({ status: 'failed', attempts: 3 });
    expect(wa.lastError).toContain('meta down');
    expect(JSON.stringify(wa)).not.toContain('tok');
  });

  it('does not resend what already went out', async () => {
    await post(valid);
    sendMock.mockClear();
    await cron('Bearer s3cret');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('TicketStore type', () => {
  it('memory store satisfies the interface', () => {
    const s: TicketStore = mem.store;
    expect(typeof s.pendingNotifications).toBe('function');
  });
});

describe('admin ticket email', () => {
  it('renders answer keys as labels', () => {
    const { html } = renderNewTicketAdmin({
      number: 'A-1',
      kind: 'first_bug',
      answers: { live: 'Launching within 30 days', when: 'This month', users: 'Real users or a client', impact: 'It’s embarrassing' },
    });
    for (const l of ['Live status', 'Timeline', 'Users', 'Impact']) expect(html).toContain(l);
    expect(html).not.toContain('>live<');
  });

  it('keeps unknown answer keys as they are', () => {
    expect(renderNewTicketAdmin({ number: 'A-1', kind: 'audit', answers: { mystery: 'x' } }).html).toContain('mystery');
  });

  it('shows reply-by in IST', () => {
    expect(replyBy('2026-10-17T18:13:00Z')).toBe('Sun 18 Oct, 23:43 IST');
    const { html } = renderNewTicketAdmin({ number: 'A-1', kind: 'first_bug', createdAt: '2026-10-17T18:13:00Z' });
    expect(html).toContain('Reply by');
    expect(html).toContain('Sun 18 Oct, 23:43 IST');
  });

  it('labels every Bit answer key', () => {
    for (const k of ANSWER_KEYS) expect(ANSWER_LABEL[k], k).toBeTruthy();
  });

  it('flags a WhatsApp number with no country code', () => {
    expect(renderNewTicketAdmin({ number: 'A-1', kind: 'audit', whatsapp: '7466914279' }).html).toContain('7466914279 (no country code)');
    const ok = renderNewTicketAdmin({ number: 'A-1', kind: 'audit', whatsapp: '+917466914279' }).html;
    expect(ok).toContain('+917466914279');
    expect(ok).not.toContain('no country code');
  });
});

describe('ticket background work', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 's3cret';
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('posts a new-ticket card and starts the brief in the background', async () => {
    background.mockClear();
    const res = await post(valid);
    expect(res.statusCode).toBe(200);
    const t = mem.tickets.at(-1)!;
    expect(background).toHaveBeenCalledWith(mem.store, t.id);
    expect(mem.feed.at(-1)).toMatchObject({ bot: 'bit', kind: 'new_ticket', action: 'open', ticketId: t.id });
    expect(mem.feed.at(-1)!.title).toContain(t.number);
    expect(mem.feed.at(-1)!.title).toContain('myapp.lovable.app');
  });

  it('the cron backfills up to 5 tickets that have no brief', async () => {
    for (let i = 0; i < 7; i++) await mem.store.createTicket({ email: `x${i}@example.com`, kind: 'audit', answers: {}, source: 'bit' });
    processMock.mockReset();
    processMock.mockResolvedValue('done');
    const res = await cron('Bearer s3cret');
    expect(res.body).toMatchObject({ ok: true, briefed: 5 });
    expect(processMock).toHaveBeenCalledTimes(5);
  });
});
