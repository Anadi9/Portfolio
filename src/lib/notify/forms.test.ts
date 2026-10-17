import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { memoryTicketStore } from '../tickets/memory';

const { sendMock, holder } = vi.hoisted(() => ({ sendMock: vi.fn(), holder: { store: null as unknown } }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('../tickets/store.js', async (orig) => ({ ...(await orig<typeof import('../tickets/store')>()), ticketStore: () => holder.store }));

import auditHandler from '../../../api/audit';
import rescueHandler from '../../../api/rescue-audit';

const call = async (handler: typeof auditHandler, body: unknown) => {
  const res: { statusCode?: number; body?: unknown } & Record<string, unknown> = {};
  const r = {
    status: (c: number) => ((res.statusCode = c), r),
    json: (b: unknown) => ((res.body = b), r),
    setHeader: () => r,
  };
  await handler({ method: 'POST', body, headers: {} } as unknown as VercelRequest, r as unknown as VercelResponse);
  return res;
};

const auditBody = {
  type: 'both', name: 'Sam', business: 'Clinic', url: 'clinic.example.com', sells: 'dental care', market: 'US', email: 'sam@example.com',
};
const rescueBody = { appUrl: 'myapp.lovable.app', tool: 'Lovable', symptoms: [0, 2], notes: 'help', email: 'f@example.com' };

const ORIGINAL_ENV = { ...process.env };
let mem: ReturnType<typeof memoryTicketStore>;

beforeEach(() => {
  mem = memoryTicketStore();
  holder.store = mem.store;
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'x' } });
  process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: 'k', RESCUE_INBOX: 'me@example.com' };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('audit forms create a best-effort ticket', () => {
  it('audit: ticket without contact details in answers, and no extra emails', async () => {
    const res = await call(auditHandler, auditBody);
    expect(res.statusCode).toBe(200);
    expect(mem.tickets[0]).toMatchObject({ source: 'audit_form', kind: 'audit', boardOptIn: false, whatsappOptIn: false });
    expect(JSON.stringify(mem.tickets[0].answers)).not.toContain('sam@example.com');
    expect(mem.tickets[0].answers).not.toHaveProperty('name');
    expect(sendMock).toHaveBeenCalledTimes(2); // lead + confirmation only
  });

  it('app form: first_bug ticket from app_form with readable symptoms', async () => {
    expect((await call(rescueHandler, rescueBody)).statusCode).toBe(200);
    expect(mem.tickets[0]).toMatchObject({ source: 'app_form', kind: 'first_bug', stack: 'Lovable' });
    expect(mem.tickets[0].answers.symptoms).toHaveLength(2);
    expect(JSON.stringify(mem.tickets[0].answers)).not.toContain('f@example.com');
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['audit', auditHandler, auditBody],
    ['app', rescueHandler, rescueBody],
  ] as const)('%s: unaffected when the store is missing', async (_n, handler, body) => {
    holder.store = null;
    const res = await call(handler, body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it.each([
    ['audit', auditHandler, auditBody],
    ['app', rescueHandler, rescueBody],
  ] as const)('%s: unaffected when the ticket write throws', async (_n, handler, body) => {
    holder.store = { createTicket: async () => { throw new Error('db down'); } };
    const res = await call(handler, body);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('no ticket when the lead email fails', async () => {
    sendMock.mockResolvedValueOnce({ error: { message: 'down' } });
    expect((await call(auditHandler, auditBody)).statusCode).toBe(502);
    expect(mem.tickets).toHaveLength(0);
  });

  it.each([
    ['audit', auditHandler, auditBody],
    ['app', rescueHandler, rescueBody],
  ] as const)('%s: a hung ticket write cannot delay or fail the response', async (_n, handler, body) => {
    vi.useFakeTimers();
    try {
      holder.store = { createTicket: () => new Promise(() => {}) };
      const pending = call(handler, body);
      await vi.advanceTimersByTimeAsync(2600);
      const res = await pending;
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('a URL over the 500 cap (the form allows 500 plus the added https://) is truncated to the cap and the ticket is still created', async () => {
    const url = 'myapp.lovable.app/' + 'a'.repeat(480); // 500 chars typed, 508 once normalised
    expect((await call(rescueHandler, { ...rescueBody, appUrl: url })).statusCode).toBe(200);
    expect(mem.tickets).toHaveLength(1);
    expect(mem.tickets[0].appUrl).toHaveLength(500);
    expect(mem.tickets[0].answers.appUrlTruncated).toBe(true);
  });
});
