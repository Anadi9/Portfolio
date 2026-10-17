import { runCheck, safeGet } from '../readiness/check.js';
import { checkHeaders, type HeaderCheck } from '../scorecard/summary.js';
import { withTimeout } from '../notify/timeout.js';

/**
 * The outside-in look at a lead's app, run once when the ticket arrives: the
 * AI-readiness check and the security headers on the homepage. Fetches only
 * through the SSRF-guarded `safeGet`, never throws, and gives up after 15 s.
 */

export type LeadScan =
  | {
      ok: true;
      url: string;
      readiness: { score: number; topFixes: { id: string; label: string; fix?: string }[] };
      /** null when the homepage answered the readiness check but not the header fetch. */
      headers: HeaderCheck | null;
      ms: number;
    }
  | { ok: false; url: string | null; error: string; ms: number };

const SCAN_MS = 15_000;

const withScheme = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

export async function scanLead(
  appUrl: string | null,
  deps: { runCheck?: typeof runCheck; safeGet?: typeof safeGet } = {},
): Promise<LeadScan> {
  const started = Date.now();
  const ms = () => Date.now() - started;
  const raw = appUrl?.trim();
  if (!raw) return { ok: false, url: null, error: 'no app link', ms: 0 };
  const url = withScheme(raw);
  const check = deps.runCheck ?? runCheck;
  const get = deps.safeGet ?? safeGet;

  const work = Promise.all([
    check(url),
    get(url).then(
      (page) => checkHeaders(page.headers),
      () => null,
    ),
  ]);
  const done = await withTimeout(work, SCAN_MS, 'lead scan');
  if (!done) return { ok: false, url, error: 'scan timed out', ms: ms() };

  const [result, headers] = done;
  if ('error' in result) return { ok: false, url, error: result.error, ms: ms() };
  return {
    ok: true,
    url: result.report.url,
    readiness: {
      score: result.report.score,
      topFixes: result.report.topFixes.map(({ id, label, fix }) => (fix ? { id, label, fix } : { id, label })),
    },
    headers,
    ms: ms(),
  };
}
