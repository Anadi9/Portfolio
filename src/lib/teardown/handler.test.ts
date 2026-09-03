import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { QUESTIONS } from './questions';
import handler from '../../../api/teardown-report';

/**
 * `api/teardown-report.ts` is the only server-side code and the only public
 * HTTP endpoint in the project. It needs no DOM: it is a plain async
 * function over `{ method, body }` plus a `res` exposing
 * `status`/`json`/`setHeader`, so it is tested here with local fakes and a
 * mocked `resend` module. No test in this file makes a real network call.
 *
 * It lives here rather than beside the handler because Vercel turns every file
 * under `api/` into a deployed function. As `api/teardown-report.test.ts` this
 * was live at `/api/teardown-report.test`, answering the public internet with a
 * 500: it imports `vitest`, which is a devDependency and absent at runtime.
 * Nothing under `api/` may be anything but a function entrypoint, which
 * `serverless-imports.test.ts` now asserts.
 */

const { sendMock, contactsCreateMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  contactsCreateMock: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
    contacts: { create: contactsCreateMock },
  })),
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
  const res = {} as FakeRes;
  res.headers = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
    return res;
  };
  return res;
}

const makeReq = (method: string, body: unknown): VercelRequest =>
  ({ method, body }) as unknown as VercelRequest;

const validAnswers = () => QUESTIONS.map(() => 0);

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockReset();
  contactsCreateMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: 'test-id' } });
  contactsCreateMock.mockResolvedValue({ data: { id: 'contact-id' } });
  process.env.RESEND_API_KEY = 'test_key';
  delete process.env.RESEND_AUDIENCE_ID;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('teardown-report: method', () => {
  it('rejects GET with 405 and sets Allow: POST', async () => {
    const res = makeRes();
    await handler(makeReq('GET', {}), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('POST');
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('teardown-report: configuration', () => {
  it('returns 501 when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(501);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('teardown-report: honeypot', () => {
  it('returns 200 with no Resend call when the honeypot is filled', async () => {
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: 'im-a-bot' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });
});

describe('teardown-report: payload validation', () => {
  it('rejects answers of the wrong length with 400', async () => {
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers().slice(1), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range option index with 400', async () => {
    const answers = validAnswers();
    answers[0] = 99;
    const res = makeRes();
    await handler(
      makeReq('POST', { answers, email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with 400', async () => {
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'not-an-email', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('parses a string body (Vercel may hand a string or an object)', async () => {
    const res = makeRes();
    const body = JSON.stringify({ answers: validAnswers(), email: 'reader@example.com', hp: '' });
    await handler(makeReq('POST', body), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unparseable string body with 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', '{not json'), res as unknown as VercelResponse);
    expect(res.statusCode).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('teardown-report: the attached copy', () => {
  it('sends the keepable document as a base64 attachment', async () => {
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);

    const [{ attachments }] = sendMock.mock.calls[0] as [
      { attachments: { filename: string; content: string }[] },
    ];
    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toMatch(/^wrapper-test-WT-13-\d{3}-[A-D]\.html$/);

    // Resend takes base64, not markup: a raw string here silently ships a
    // broken file, and only the reader would find out.
    const decoded = Buffer.from(attachments[0].content, 'base64').toString('utf8');
    expect(decoded).toMatch(/^<!doctype html>/i);
    expect(decoded).toContain('END OF REPORT');
  });
});

describe('teardown-report: Resend failures', () => {
  it('returns 502 when Resend returns an error', async () => {
    sendMock.mockResolvedValueOnce({ error: { message: 'bounced' } });
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(502);
  });

  it('returns 502 when Resend throws', async () => {
    sendMock.mockRejectedValueOnce(new Error('network down'));
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(502);
  });

  it('still returns 200 when the audience add fails: the send is the point, the list is a side effect', async () => {
    process.env.RESEND_AUDIENCE_ID = 'test-audience';
    contactsCreateMock.mockRejectedValueOnce(new Error('audience add failed'));
    const res = makeRes();
    await handler(
      makeReq('POST', { answers: validAnswers(), email: 'reader@example.com', hp: '' }),
      res as unknown as VercelResponse,
    );
    expect(res.statusCode).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(contactsCreateMock).toHaveBeenCalledTimes(1);
  });
});
