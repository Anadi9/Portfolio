import { CSP_ALIASES, EXPECTED_HEADERS } from './headers.js';

/**
 * Pure: turns the readiness report and a header check into the compact,
 * JSON-safe summary stored in `scorecard_runs.results` and served by
 * `/api/scorecard`. Nothing here fetches.
 */

type FindingLike = { id: string; label: string; status: 'pass' | 'warn' | 'fail' };
type ReportLike = { score: number; findings: FindingLike[] };

/** `reportOnly` lists headers sent only in report-only mode: seen, but not enforced. They are in neither `present` nor `missing`. */
export type HeaderCheck = { present: string[]; missing: string[]; reportOnly?: string[] };

export type ScorecardSummary = {
  version: 1;
  ranAt: string;
  site: string;
  /** Null when the readiness analysis could not run; `readinessError` then says why. */
  readiness: { score: number; passed: string[]; warned: string[]; failed: string[] } | null;
  readinessError?: string;
  /** Null when the site could not be fetched. */
  headers: HeaderCheck | null;
  headersError?: string;
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
  const reportOnly: string[] = [];
  for (const name of expected) {
    if (has(name)) present.push(name);
    else if (name === 'Content-Security-Policy' && CSP_ALIASES.some(has)) reportOnly.push(name);
    else missing.push(name);
  }
  return reportOnly.length ? { present, missing, reportOnly } : { present, missing };
}

export function summarise(input: {
  ranAt: Date | string;
  site: string;
  report: ReportLike | null;
  readinessError?: string;
  headers: HeaderCheck | null;
  headersError?: string;
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
    ...(input.headersError ? { headersError: input.headersError } : {}),
  };
}

export type CardState = { kind: 'none' } | { kind: 'ok' } | { kind: 'missing'; reason: string };

/** What a card should show: no run at all, the data, or a run whose check did not produce data. */
export function cardState(run: ScorecardSummary | null, part: 'readiness' | 'headers'): CardState {
  if (!run) return { kind: 'none' };
  if (run[part]) return { kind: 'ok' };
  const err = part === 'readiness' ? run.readinessError : run.headersError;
  return { kind: 'missing', reason: err ? `The last scan could not run this check: ${err}` : 'The last scan could not run this check.' };
}

/** Narrow unknown stored JSON back to a summary; anything else is treated as no run. */
export function asSummary(v: unknown): ScorecardSummary | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  return o.version === 1 && typeof o.ranAt === 'string' ? (o as unknown as ScorecardSummary) : null;
}
