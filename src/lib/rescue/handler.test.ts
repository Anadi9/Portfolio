import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../../../api/rescue-audit';

/**
 * `api/rescue-audit.ts`, tested with local fakes and a mocked `resend`, for
 * the same reason and in the same place as the teardown handler's tests:
 * nothing under `api/` may be anything but a function entrypoint.
 */

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

type FakeRes = {
  statusCode?: number;
  headers: Record<string, string>;
  body?: unknown;
  status: (code: number) => FakeRes;
  json: (body: unknown) => FakeRes;
  setHeader: (key: string, value: string) => FakeRes;
};

function makeRes(): FakeRes {
  const res = { headers: {} } as FakeRes;
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.setHeader = (k, v) => ((res.headers[k] = v), res);
  return res;
}

const call = async (method: string, body: unknown) => {
  const res = makeRes();
  await handler({ method, body } as unknown as VercelRequest, res as unknown as VercelResponse);
  return res;
};

const valid = { appUrl: 'my-app.lovable.app', tool: 'Bolt', symptoms: [0], notes: '', email: 'f@example.com' };

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'x' } });
  process.env.RESEND_API_KEY = 'test_key';
  process.env.RESCUE_INBOX = 'me@example.com';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('rescue-audit', () => {
  it('rejects anything but POST', async () => {
    const res = await call('GET', null);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
  });

  it('501s without a key and sends nothing', async () => {
    delete process.env.RESEND_API_KEY;
    expect((await call('POST', valid)).statusCode).toBe(501);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('answers a filled honeypot with a silent 200', async () => {
    const res = await call('POST', { ...valid, hp: 'spam' });
    expect(res.statusCode).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('400s with the failing field', async () => {
    const res = await call('POST', { ...valid, appUrl: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ field: 'appUrl' });
  });

  it('sends the lead to the inbox with reply-to, then the confirmation to the visitor', async () => {
    const res = await call('POST', JSON.stringify(valid));
    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0]).toMatchObject({ to: 'me@example.com', replyTo: 'f@example.com' });
    expect(sendMock.mock.calls[1][0]).toMatchObject({ to: 'f@example.com' });
    expect((res.body as { due: string }).due).toMatch(/^\d{4}-/);
  });

  it('502s when the lead fails, and does not confirm a request nobody received', async () => {
    sendMock.mockResolvedValueOnce({ error: { message: 'down' } });
    expect((await call('POST', valid)).statusCode).toBe(502);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('still 200s when only the confirmation fails', async () => {
    sendMock.mockResolvedValueOnce({ data: { id: 'x' } }).mockRejectedValueOnce(new Error('down'));
    expect((await call('POST', valid)).statusCode).toBe(200);
  });
});
