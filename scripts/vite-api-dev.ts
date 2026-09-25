import { existsSync, readdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { loadEnv, type Plugin } from 'vite';

/**
 * Serves `api/*.ts` and `api/<folder>/*.ts` from the Vite dev server, so `npm run dev` can exercise the
 * checkout, the download and the webhook without `vercel dev`.
 *
 * It fills in the slice of Vercel's request/response helpers these functions
 * use (`req.query`, `req.body`, `res.status().json()/.send()`) and nothing more.
 * `.env.local` and friends are loaded into `process.env` the way Vercel would
 * provide them, and so are the `x-forwarded-*` headers Vercel's edge adds. A function exporting `config.api.bodyParser = false` (the Stripe
 * webhook) gets the untouched stream, since its signature is over the raw bytes.
 * Dev only: production still runs these as Vercel Functions.
 */
export function vercelApiDev(): Plugin {
  return {
    name: 'vercel-api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const found = resolveFunction(join(server.config.root, 'api'), url.pathname);
        if (!found) return next();
        const { file, params } = found;

        try {
          // Vercel's edge always sets these; the checkout builds its return URLs from them.
          req.headers['x-forwarded-proto'] ??= 'http';
          req.headers['x-forwarded-host'] ??= req.headers.host;
          const mod = await server.ssrLoadModule(file);
          const vreq = Object.assign(req, { query: { ...Object.fromEntries(url.searchParams), ...params }, cookies: {} });
          if (mod.config?.api?.bodyParser !== false) Object.assign(vreq, { body: await parseBody(req) });
          await mod.default(vreq, helpers(res));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          next(err);
        }
      });
    },
  };
}

/**
 * `/api/scan` → `api/scan.ts`; `/api/kit/prices` → `api/kit/prices.ts`, or
 * `api/kit/[action].ts` with `action=prices`, the way Vercel resolves a
 * dynamic segment. One folder deep is all the site uses.
 */
function resolveFunction(apiDir: string, pathname: string): { file: string; params: Record<string, string> } | null {
  const m = /^\/api\/([\w-]+)(?:\/([\w-]+))?\/?$/.exec(pathname);
  if (!m) return null;
  const [, first, second] = m;
  if (!second) {
    const file = join(apiDir, `${first}.ts`);
    return existsSync(file) ? { file, params: {} } : null;
  }
  const exact = join(apiDir, first, `${second}.ts`);
  if (existsSync(exact)) return { file: exact, params: {} };
  const dir = join(apiDir, first);
  const dynamic = existsSync(dir) ? readdirSync(dir).find((f) => /^\[\w+\]\.ts$/.test(f)) : undefined;
  return dynamic ? { file: join(dir, dynamic), params: { [dynamic.slice(1, -4)]: second } } : null;
}

function helpers(res: ServerResponse) {
  const vres = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return vres;
    },
    json(body: unknown) {
      if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
      return vres;
    },
    send(body: unknown) {
      if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
        if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'application/octet-stream');
        res.end(body);
      } else if (typeof body === 'object' && body !== null) {
        return vres.json(body);
      } else {
        if (!res.hasHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(String(body ?? ''));
      }
      return vres;
    },
  });
  return vres;
}

async function parseBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  const type = req.headers['content-type'] ?? '';
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
