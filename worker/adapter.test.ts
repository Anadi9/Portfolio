import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describe, expect, it } from 'vitest';
import { runVercelHandler } from './adapter';

const URL_ = 'https://anadithakur.in/api/test?a=1&b=2';

function post(body: string, type: string, headers: Record<string, string> = {}) {
  return new Request(URL_, { method: 'POST', body, headers: { 'content-type': type, ...headers } });
}

describe('runVercelHandler', () => {
  it('parses a JSON body', async () => {
    let seen: unknown;
    await runVercelHandler((req, res) => {
      seen = req.body;
      res.status(200).json({});
    }, post('{"x":1,"y":["a"]}', 'application/json'));
    expect(seen).toEqual({ x: 1, y: ['a'] });
  });

  it('parses a urlencoded body', async () => {
    let seen: unknown;
    await runVercelHandler((req, res) => {
      seen = req.body;
      res.status(200).end();
    }, post('a=1&b=two', 'application/x-www-form-urlencoded'));
    expect(seen).toEqual({ a: '1', b: 'two' });
  });

  it('raw mode yields the exact bytes', async () => {
    const text = '{"a":"₹1,599"}';
    let raw = '';
    let body: unknown = 'unset';
    await runVercelHandler(
      async (req, res) => {
        body = req.body;
        const chunks: Buffer[] = [];
        for await (const c of req as unknown as AsyncIterable<Buffer>) chunks.push(c);
        raw = Buffer.concat(chunks).toString('utf8');
        res.status(200).end();
      },
      post(text, 'application/json'),
      { raw: true },
    );
    expect(raw).toBe(text);
    expect(body).toBeUndefined();
  });

  it('merges search params with route params', async () => {
    let q: unknown;
    await runVercelHandler(
      (req, res) => {
        q = req.query;
        res.status(200).end();
      },
      new Request('https://anadithakur.in/api/x?route=evil&a=1'),
      { query: { route: 'scan' } },
    );
    expect(q).toEqual({ route: 'scan', a: '1' });
  });

  it('lowercases header names', async () => {
    let h: unknown;
    await runVercelHandler(
      (req, res) => {
        h = req.headers['x-custom-thing'];
        res.status(200).end();
      },
      new Request(URL_, { headers: { 'X-Custom-Thing': 'v' } }),
    );
    expect(h).toBe('v');
  });

  it('overwrites forwarded headers from the trusted values', async () => {
    let h: VercelRequest['headers'] = {};
    await runVercelHandler(
      (req, res) => {
        h = req.headers;
        res.status(200).end();
      },
      new Request(URL_, { headers: { 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '1.1.1.1', 'cf-ipcountry': 'XX', 'x-vercel-ip-country': 'XX' } }),
      { clientIp: '9.9.9.9', country: 'IN' },
    );
    expect(h['x-forwarded-for']).toBe('9.9.9.9');
    expect(h['x-real-ip']).toBe('9.9.9.9');
    expect(h['x-vercel-ip-country']).toBe('IN');
    expect(h['cf-ipcountry']).toBe('IN');
    expect(h['x-forwarded-host']).toBe('anadithakur.in');
    expect(h['x-forwarded-proto']).toBe('https');
  });

  it('drops client-sent country and forwarded headers when no trusted value exists', async () => {
    let h: VercelRequest['headers'] = {};
    await runVercelHandler(
      (req, res) => {
        h = req.headers;
        res.status(200).end();
      },
      new Request(URL_, { headers: { 'x-forwarded-for': '1.1.1.1', 'x-vercel-ip-country': 'IN' } }),
    );
    expect(h['x-forwarded-for']).toBeUndefined();
    expect(h['x-vercel-ip-country']).toBeUndefined();
  });

  it('status + json', async () => {
    const r = await runVercelHandler((_req, res) => res.status(201).json({ ok: true }), new Request(URL_));
    expect(r.status).toBe(201);
    expect(r.headers.get('content-type')).toContain('application/json');
    expect(await r.json()).toEqual({ ok: true });
  });

  it('send(Buffer) is octet-stream and byte-exact', async () => {
    const bytes = Buffer.from([0, 1, 2, 250, 255]);
    const r = await runVercelHandler((_req, res) => res.status(200).send(bytes), new Request(URL_));
    expect(r.headers.get('content-type')).toBe('application/octet-stream');
    expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);
  });

  it('send(string) is text/html', async () => {
    const r = await runVercelHandler((_req, res) => res.status(403).send('No.'), new Request(URL_));
    expect(r.status).toBe(403);
    expect(r.headers.get('content-type')).toContain('text/html');
    expect(await r.text()).toBe('No.');
  });

  it('keeps a content type the handler set', async () => {
    const r = await runVercelHandler((_req, res: VercelResponse) => {
      res.setHeader('Content-Type', 'application/zip');
      res.status(200).send(Buffer.from('zip'));
    }, new Request(URL_));
    expect(r.headers.get('content-type')).toBe('application/zip');
  });

  it('emits every Set-Cookie value', async () => {
    const r = await runVercelHandler((_req, res) => {
      res.setHeader('Set-Cookie', ['a=1; Path=/', 'b=2; Path=/']);
      res.status(200).json({});
    }, new Request(URL_));
    expect(r.headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=2; Path=/']);
  });

  it('reads back headers it set', async () => {
    let got: unknown;
    let has = false;
    await runVercelHandler((_req, res) => {
      res.setHeader('Allow', 'POST');
      got = res.getHeader('allow');
      has = res.hasHeader('ALLOW');
      res.status(405).end();
    }, new Request(URL_));
    expect(got).toBe('POST');
    expect(has).toBe(true);
  });

  it('500 when the handler never responds', async () => {
    const r = await runVercelHandler(() => undefined, new Request(URL_));
    expect(r.status).toBe(500);
  });

  it('500 when the handler throws', async () => {
    const r = await runVercelHandler(async () => {
      throw new Error('boom');
    }, new Request(URL_));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: 'internal error' });
  });

  it('keeps the first response when the handler responds and then throws', async () => {
    const r = await runVercelHandler(async (_req, res) => {
      res.status(200).json({ ok: true });
      throw new Error('late');
    }, new Request(URL_));
    expect(r.status).toBe(200);
  });

  it('HEAD has no body', async () => {
    const r = await runVercelHandler((_req, res) => res.status(200).send('hello'), new Request(URL_, { method: 'HEAD' }));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('');
  });

  it('statusCode assignment works like Node', async () => {
    const r = await runVercelHandler((_req, res) => {
      res.statusCode = 204;
      res.end();
    }, new Request(URL_));
    expect(r.status).toBe(204);
  });
});
