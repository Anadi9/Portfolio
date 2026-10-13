import { lookup } from 'node:dns/promises';
import { analyze, type Report } from './analyze.js';
import { checkUrl, isPrivateAddress } from './url.js';

/**
 * Server-only: fetches what the AI Readiness Checker reads (the page, its
 * robots.txt, llms.txt and sitemap) and hands it to `analyze`.
 *
 * The second half of the SSRF guard lives here. Before every request,
 * including each redirect hop, the hostname is re-validated by `checkUrl` and
 * resolved, and any private, loopback or link-local address refuses the
 * fetch. Redirects are followed by hand for that reason, at most three.
 * Every fetch has a timeout and a byte cap, sends no cookies or credentials,
 * and nothing fetched is stored or logged.
 *
 * Residual risk, accepted: a hostile DNS server could answer the lookup with
 * a public address and the fetch with a private one (rebinding). The function
 * holds no secrets and the responses it returns are reduced to a score and a
 * handful of facts, never the raw body, which limits what that could reveal.
 */

const UA = 'Mozilla/5.0 (compatible; AnadiReadinessCheck/1.0; +https://anadithakur.in/ai-readiness)';
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

export class BlockedError extends Error {}

async function assertPublic(raw: string): Promise<URL> {
  const checked = checkUrl(raw);
  if (checked.ok === false) throw new BlockedError(checked.error);
  const url = new URL(checked.url);
  const addrs = await lookup(url.hostname, { all: true }).catch(() => {
    throw new BlockedError('That domain doesn’t resolve. Check the spelling.');
  });
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new BlockedError('That address points at a private network, so it can’t be checked.');
  }
  return url;
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

type Fetched = { url: string; status: number; type: string; body: string };

/** GET with manual, re-validated redirects. Throws `BlockedError` for anything the guard refuses. */
export async function safeGet(start: string): Promise<Fetched> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublic(current);
    const res = await fetch(url, {
      redirect: 'manual',
      credentials: 'omit',
      headers: { 'User-Agent': UA, Accept: 'text/html,text/plain,application/xml;q=0.9,*/*;q=0.5' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      current = new URL(location, url).toString();
      continue;
    }
    return { url: url.toString(), status: res.status, type: res.headers.get('content-type') ?? '', body: await readCapped(res) };
  }
  throw new BlockedError('That address redirects too many times.');
}

/** A secondary file: its body when it answers 2xx with something that isn't an HTML page, else null. */
async function optional(url: string, accept: (f: Fetched) => boolean): Promise<string | null> {
  try {
    const f = await safeGet(url);
    return f.status >= 200 && f.status < 300 && accept(f) ? f.body : null;
  } catch {
    return null;
  }
}

/** A soft 404 (an SPA serving index.html for every path) must not count as the file existing. */
const notHtml = (f: Fetched) => !/text\/html/i.test(f.type) && !/^\s*<(!doctype|html)/i.test(f.body);

export type CheckResult = { ok: true; report: Report } | { ok: false; status: number; error: string };

export async function runCheck(raw: string): Promise<CheckResult> {
  let page: Fetched;
  try {
    page = await safeGet(raw);
  } catch (err) {
    if (err instanceof BlockedError) return { ok: false, status: 400, error: err.message };
    return { ok: false, status: 502, error: 'Couldn’t reach that site within 8 seconds. Check the address, or try again.' };
  }
  if (page.status === 401 || page.status === 403 || page.status === 429) {
    return {
      ok: false,
      status: 502,
      error: `That site turned the checker away (${page.status}). If its firewall blocks automated visits, it may be blocking AI crawlers too, which is worth a free audit to confirm.`,
    };
  }
  if (page.status >= 400) {
    return { ok: false, status: 502, error: `That page answered with an error (${page.status}), so there’s nothing to check yet.` };
  }

  const origin = new URL(page.url).origin;
  const [robots, llms, sitemap] = await Promise.all([
    optional(`${origin}/robots.txt`, notHtml),
    optional(`${origin}/llms.txt`, notHtml),
    optional(`${origin}/sitemap.xml`, (f) => /<(urlset|sitemapindex)\b/i.test(f.body)),
  ]);

  return {
    ok: true,
    report: analyze({ finalUrl: page.url, status: page.status, html: page.body, robots, llms, sitemapFound: sitemap !== null }),
  };
}
