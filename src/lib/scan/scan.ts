import type { ScanInput } from './validate.js';
import {
  buildReport,
  bucketsFromResponse,
  classifyTable,
  tablesFromSpec,
  type BucketProbe,
  type ScanReport,
  type TableProbe,
} from './report.js';

/**
 * Runs the `/scan` probes against one Supabase project, as the anon role.
 *
 * Every request is a read, every request goes to the origin `validate.ts`
 * produced (never to a URL taken from a response), and redirects are not
 * followed. Table probes ask for one row with `Prefer: count=exact` and read
 * only the status and `Content-Range`; the body is cancelled unread, so no row
 * content is ever held, returned or logged.
 *
 * `fetch` is injected so the handler test can fake Supabase.
 */

export const MAX_TABLES = 40;
export const REQUEST_TIMEOUT_MS = 5000;
export const BUDGET_MS = 20000;
const CONCURRENCY = 8;
/** PostgREST's OpenAPI document for a large schema is big, but not this big. */
const MAX_SPEC_BYTES = 5_000_000;

export type ScanOptions = {
  fetch?: typeof fetch;
  now?: () => Date;
  maxTables?: number;
  requestTimeoutMs?: number;
  budgetMs?: number;
};

export type ScanResult = { ok: true; report: ScanReport } | { ok: false; status: number; error: string; field?: 'url' | 'key' };

export async function runScan(input: ScanInput, opts: ScanOptions = {}): Promise<ScanResult> {
  const doFetch = opts.fetch ?? fetch;
  const now = opts.now ?? (() => new Date());
  const maxTables = opts.maxTables ?? MAX_TABLES;
  const perRequest = opts.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const deadline = Date.now() + (opts.budgetMs ?? BUDGET_MS);

  const headers: Record<string, string> = { apikey: input.key, Accept: 'application/openapi+json, application/json' };
  // The legacy anon key is a JWT and doubles as the bearer token. A publishable
  // key is not a JWT and goes in `apikey` only.
  if (input.kind === 'jwt') headers.Authorization = `Bearer ${input.key}`;

  const get = async (path: string, extra: Record<string, string> = {}): Promise<Response | null> => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(perRequest, remaining));
    try {
      return await doFetch(`${input.origin}${path}`, {
        method: 'GET',
        headers: { ...headers, ...extra },
        redirect: 'manual',
        signal: ctrl.signal,
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. The schema: which tables and views the anon role can see.
  const root = await get('/rest/v1/');
  if (!root) {
    return { ok: false, status: 502, field: 'url', error: 'Couldn’t reach that project. Check the URL, and that the project isn’t paused.' };
  }
  if (root.status === 401) {
    await discard(root);
    return {
      ok: false,
      status: 400,
      field: 'key',
      error: 'Supabase rejected that key for this project. Copy the anon (public) key again from Project Settings → API.',
    };
  }
  if (root.status === 404 || root.status >= 500 || (root.status >= 300 && root.status < 400)) {
    await discard(root);
    return { ok: false, status: 502, field: 'url', error: 'That project didn’t answer like a Supabase API. Check the URL, and that the project isn’t paused.' };
  }

  let schemaVisible = false;
  let tables: string[] = [];
  if (root.status === 200) {
    const spec = await readJson(root, MAX_SPEC_BYTES);
    if (spec !== undefined) {
      schemaVisible = true;
      tables = tablesFromSpec(spec);
    }
  } else {
    await discard(root);
  }

  // 2. Each table, as an anonymous visitor.
  const toCheck = tables.slice(0, maxTables);
  const probes: TableProbe[] = new Array(toCheck.length);
  let next = 0;
  const worker = async () => {
    while (next < toCheck.length) {
      const i = next++;
      const table = toCheck[i];
      const res = await get(`/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`, {
        Accept: 'application/json',
        Prefer: 'count=exact',
        Range: '0-0',
      });
      if (!res) {
        probes[i] = { table, status: 'unknown', rows: null };
        continue;
      }
      probes[i] = classifyTable(table, res.status, res.headers.get('content-range'));
      await discard(res);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toCheck.length) }, worker));

  // 3. Storage buckets. Metadata only: names and the public flag.
  let buckets: BucketProbe[] | null = null;
  const storage = await get('/storage/v1/bucket', { Accept: 'application/json' });
  if (storage && storage.status === 200) {
    const body = await readJson(storage, 1_000_000);
    buckets = body === undefined ? null : bucketsFromResponse(body);
  } else if (storage) {
    await discard(storage);
  }

  return {
    ok: true,
    report: buildReport({ project: input.ref, now: now(), found: tables.length, probes, schemaVisible, buckets }),
  };
}

async function discard(res: Response): Promise<void> {
  try {
    await res.body?.cancel();
  } catch {
    /* already consumed or closed */
  }
}

/** Parsed JSON, or undefined if it is too large or not JSON. */
async function readJson(res: Response, maxBytes: number): Promise<unknown> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await discard(res);
    return undefined;
  }
  try {
    const text = await res.text();
    if (text.length > maxBytes) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
