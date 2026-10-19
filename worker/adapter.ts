import { Buffer } from 'node:buffer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Runs one of the site's Vercel-style handlers against a Fetch `Request` and
 * returns a Fetch `Response`, so the Worker can serve `api/` unchanged.
 *
 * It fills the same slice of Vercel's helpers that `scripts/vite-api-dev.ts`
 * fills for `npm run dev` (`req.query`, `req.body`, `res.status().json()/.send()`),
 * plus the Node basics the handlers touch (`setHeader`, `statusCode`, `end`).
 *
 * Trust: the forwarding headers are rebuilt from what Cloudflare itself says
 * (`clientIp`, `country`), never taken from the client. Rate limits key on
 * `x-forwarded-for` and the checkout picks the currency from the country, so a
 * client-sent value would be a bypass and a discount switch.
 */

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type HeaderValue = string | number | readonly string[];

export type RunOptions = {
  /** Route params (`route`, `action`, `job`); they win over the query string, as on Vercel. */
  query?: Record<string, string>;
  /** The handler reads the body itself (`config.api.bodyParser = false`): no `req.body`. */
  raw?: boolean;
  clientIp?: string;
  country?: string;
};

const UNTRUSTED = ['x-forwarded-for', 'x-real-ip', 'x-vercel-ip-country', 'cf-ipcountry', 'x-forwarded-host', 'x-forwarded-proto'];

export async function runVercelHandler(handler: Handler, request: Request, opts: RunOptions = {}): Promise<Response> {
  const url = new URL(request.url);
  const bytes = request.method === 'GET' || request.method === 'HEAD' ? new Uint8Array() : new Uint8Array(await request.arrayBuffer());

  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  for (const k of UNTRUSTED) delete headers[k];
  headers['x-forwarded-host'] = url.host;
  headers['x-forwarded-proto'] = url.protocol.replace(':', '');
  if (opts.clientIp) headers['x-forwarded-for'] = headers['x-real-ip'] = opts.clientIp;
  if (opts.country) headers['x-vercel-ip-country'] = headers['cf-ipcountry'] = opts.country;

  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    query: { ...Object.fromEntries(url.searchParams), ...opts.query },
    cookies: {},
    body: opts.raw ? undefined : parseBody(bytes, headers['content-type'] ?? ''),
    async *[Symbol.asyncIterator]() {
      if (bytes.byteLength) yield Buffer.from(bytes);
    },
  } as unknown as VercelRequest;

  const { res, done, sent } = createResponse(request.method === 'HEAD');

  try {
    await handler(req, res);
  } catch (err) {
    console.error('[worker] handler threw', url.pathname, err);
    if (!sent()) res.status(500).json({ error: 'internal error' });
  }
  if (!sent()) {
    console.error('[worker] handler returned without responding', url.pathname);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'internal error' }));
  }
  return done;
}

function parseBody(bytes: Uint8Array, type: string): unknown {
  if (!bytes.byteLength) return undefined;
  const raw = new TextDecoder().decode(bytes);
  if (type.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  return raw;
}

function createResponse(head: boolean) {
  const store = new Map<string, HeaderValue>();
  let finished = false;
  let resolve!: (r: Response) => void;
  const done = new Promise<Response>((r) => (resolve = r));

  const finish = (body?: Uint8Array | string) => {
    if (finished) return;
    finished = true;
    const out = new Headers();
    for (const [k, v] of store) {
      if (Array.isArray(v)) for (const item of v) out.append(k, item);
      else out.set(k, String(v));
    }
    const status = res.statusCode || 200;
    const noBody = head || status === 204 || status === 304;
    resolve(new Response(noBody || body === undefined ? null : body, { status, headers: out }));
  };

  const res = {
    statusCode: 200,
    get headersSent() {
      return finished;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    setHeader(name: string, value: HeaderValue) {
      store.set(name.toLowerCase(), value);
      return res;
    },
    getHeader(name: string) {
      return store.get(name.toLowerCase());
    },
    hasHeader(name: string) {
      return store.has(name.toLowerCase());
    },
    removeHeader(name: string) {
      store.delete(name.toLowerCase());
    },
    json(body: unknown) {
      if (!store.has('content-type')) store.set('content-type', 'application/json; charset=utf-8');
      finish(JSON.stringify(body));
      return res;
    },
    send(body: unknown) {
      if (body instanceof Uint8Array) {
        if (!store.has('content-type')) store.set('content-type', 'application/octet-stream');
        finish(body);
      } else if (typeof body === 'object' && body !== null) {
        return res.json(body);
      } else {
        if (!store.has('content-type')) store.set('content-type', 'text/html; charset=utf-8');
        finish(String(body ?? ''));
      }
      return res;
    },
    end(body?: Uint8Array | string) {
      finish(body);
      return res;
    },
  };

  return { res: res as unknown as VercelResponse, done, sent: () => finished };
}
