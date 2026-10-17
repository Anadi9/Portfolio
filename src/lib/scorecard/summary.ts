import { CSP_ALIASES, EXPECTED_HEADERS } from './headers.js';

/**
 * Pure: turns the readiness report and a header check into the compact,
 * JSON-safe summary stored in `scorecard_runs.results` and served by
 * `/api/scorecard`. Nothing here fetches.
 */

type FindingLike = { id: string; label: string; status: 'pass' | 'warn' | 'fail' };
type ReportLike = { score: number; findings: FindingLike[] };

export type HeaderCheck = { present: string[]; missing: string[] };

export type ScorecardSummary = {
  version: 1;
  ranAt: string;
  site: string;
  /** Null when the readiness analysis could not run; `readinessError` then says why. */
  readiness: { score: number; passed: string[]; warned: string[]; failed: string[] } | null;
  readinessError?: string;
  /** Null when the site could not be fetched. */
  headers: HeaderCheck | null;
};

/** Case-insensitive; accepts a `Headers` or a plain name → value map. */
export function checkHeaders(
  got: { has(name: string): boolean } | Record<string, unknown>,
  expected: readonly string[] = EXPECTED_HEADERS,
): HeaderCheck {
  const has = (name: string) => {
    if (typeof (got as { has?: unknown }).has === 'function') return (got as { has(n: string): boolean }).has(name);
    const lower = name.toLowerCase();
    return Object.keys(got).some((k) => k.toLowerCase() === lower && got[k as keyof typeof got] != null);
  };
  const present: string[] = [];
  const missing: string[] = [];
  for (const name of expected) {
    const aliases = name === 'Content-Security-Policy' ? [name, ...CSP_ALIASES] : [name];
    (aliases.some(has) ? present : missing).push(name);
  }
  return { present, missing };
}

export function summarise(input: {
  ranAt: Date | string;
  site: string;
  report: ReportLike | null;
  readinessError?: string;
  headers: HeaderCheck | null;
}): ScorecardSummary {
  const ranAt = typeof input.ranAt === 'string' ? input.ranAt : input.ranAt.toISOString();
  const by = (status: FindingLike['status']) => input.report?.findings.filter((f) => f.status === status).map((f) => f.label) ?? [];
  return {
    version: 1,
    ranAt,
    site: input.site,
    readiness: input.report ? { score: input.report.score, passed: by('pass'), warned: by('warn'), failed: by('fail') } : null,
    ...(input.readinessError ? { readinessError: input.readinessError } : {}),
    headers: input.headers,
  };
}

/** Narrow unknown stored JSON back to a summary; anything else is treated as no run. */
export function asSummary(v: unknown): ScorecardSummary | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return o.version === 1 && typeof o.ranAt === 'string' ? (o as unknown as ScorecardSummary) : null;
}
