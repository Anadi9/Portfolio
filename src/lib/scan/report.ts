/**
 * The `/scan` report: how each probe's response is classified and how the
 * findings are worded.
 *
 * Nothing here ever sees row data. A table probe is summarised by its HTTP
 * status and its `Content-Range` header (`0-0/1234`, `*\/0`), which PostgREST
 * sends when asked for `Prefer: count=exact`. The body is never read.
 *
 * Pure, so the page can import the types and the tests can pin the wording.
 */

export type Severity = 'critical' | 'warning' | 'ok';

export const SEVERITIES: readonly Severity[] = ['critical', 'warning', 'ok'];

export type TableStatus =
  /** 200 with at least one row visible to an anonymous visitor. */
  | 'exposed'
  /** 200 with nothing visible: RLS is filtering, or the table is empty. */
  | 'empty'
  /** 401/403: the anon role has no grant on it. */
  | 'protected'
  /** Timeout, 5xx, anything else: no conclusion. */
  | 'unknown';

export type TableProbe = { table: string; status: TableStatus; rows: number | null };

export type BucketProbe = { name: string; public: boolean };

export type Finding = {
  severity: Severity;
  area: 'table' | 'storage' | 'schema';
  subject: string;
  title: string;
  detail: string;
  fix: string | null;
  /** Row count visible to anon, for exposed tables. Never any row content. */
  rows?: number | null;
};

export type ScanReport = {
  project: string;
  checkedAt: string;
  tables: { found: number; checked: number; truncated: boolean };
  /** null when the bucket list isn't visible to anon (which is fine). */
  buckets: number | null;
  counts: Record<Severity, number>;
  findings: Finding[];
};

/**
 * `Content-Range` → the total count. `0-0/57` → 57, `*\/0` → 0. `*` totals
 * (count not computed) and garbage return null.
 */
export function parseContentRange(header: string | null | undefined): number | null {
  if (!header) return null;
  const m = /^\s*(?:\d+-\d+|\*)\/(\d+|\*)\s*$/.exec(header);
  if (!m || m[1] === '*') return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) ? n : null;
}

/** Whether the range says at least one row came back (`0-0/…` vs `*\/…`). */
function rangeHasRows(header: string | null | undefined): boolean {
  return !!header && /^\s*\d+-\d+\//.test(header);
}

export function classifyTable(table: string, status: number, contentRange: string | null): TableProbe {
  if (status === 401 || status === 403) return { table, status: 'protected', rows: null };
  if (status === 200 || status === 206) {
    const total = parseContentRange(contentRange);
    if (total !== null) return { table, status: total > 0 ? 'exposed' : 'empty', rows: total };
    // No usable total: fall back to whether the one-row page had a row in it.
    return rangeHasRows(contentRange) ? { table, status: 'exposed', rows: null } : { table, status: 'empty', rows: 0 };
  }
  return { table, status: 'unknown', rows: null };
}

/**
 * Table and view names from PostgREST's OpenAPI document. Its `paths` has one
 * entry per relation the role can see (`/profiles`), plus `/` and `/rpc/<fn>`
 * for functions, which are skipped.
 */
export function tablesFromSpec(spec: unknown): string[] {
  const paths = (spec as { paths?: unknown } | null)?.paths;
  if (!paths || typeof paths !== 'object') return [];
  const names: string[] = [];
  for (const key of Object.keys(paths)) {
    if (!key.startsWith('/') || key === '/') continue;
    const name = key.slice(1);
    if (!name || name.includes('/')) continue;
    names.push(name);
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

/** Buckets from `/storage/v1/bucket`. Anything unexpected is treated as none. */
export function bucketsFromResponse(body: unknown): BucketProbe[] {
  if (!Array.isArray(body)) return [];
  return body
    .filter((b): b is { name?: unknown; id?: unknown; public?: unknown } => !!b && typeof b === 'object')
    .map((b) => ({ name: String(b.name ?? b.id ?? ''), public: b.public === true }))
    .filter((b) => b.name);
}

const fmt = (n: number) => n.toLocaleString('en-US');

export function tableFinding(p: TableProbe): Finding {
  const t = `\`${p.table}\``;
  switch (p.status) {
    case 'exposed':
      return {
        severity: 'critical',
        area: 'table',
        subject: p.table,
        rows: p.rows,
        title:
          p.rows === null
            ? `Anyone can read ${p.table}`
            : `Anyone can read ${p.table} (${fmt(p.rows)} ${p.rows === 1 ? 'row' : 'rows'})`,
        detail:
          'Using only the public key from your frontend, a stranger can download this table. No login needed. If it’s meant to be public (a product list, blog posts) that’s fine, but make it a deliberate read-only policy rather than an open door.',
        fix: `Enable RLS on ${t} and add a select policy scoped to auth.uid() (or \`using (true)\` only if it’s genuinely public).`,
      };
    case 'empty':
      return {
        severity: 'ok',
        area: 'table',
        subject: p.table,
        rows: 0,
        title: `${p.table}: no rows visible`,
        detail:
          'An anonymous visitor gets nothing back. Either RLS is filtering every row (good) or the table is empty right now. If it’s empty, check RLS is on before real data lands.',
        fix: null,
      };
    case 'protected':
      return {
        severity: 'ok',
        area: 'table',
        subject: p.table,
        title: `${p.table}: locked`,
        detail: 'The public key is refused outright.',
        fix: null,
      };
    default:
      return {
        severity: 'warning',
        area: 'table',
        subject: p.table,
        title: `${p.table}: couldn’t check`,
        detail: 'The request timed out or errored, so this one is unknown rather than safe.',
        fix: `Run the check again, or look at ${t} in Supabase → Authentication → Policies.`,
      };
  }
}

export function bucketFinding(b: BucketProbe): Finding {
  if (b.public) {
    return {
      severity: 'warning',
      area: 'storage',
      subject: b.name,
      title: `Storage bucket ${b.name} is public`,
      detail:
        'Every file in it can be opened by anyone who has or guesses the link. Fine for logos and avatars, not for invoices, IDs or user uploads.',
      fix: `If \`${b.name}\` holds anything private, make it private and serve files through signed URLs.`,
    };
  }
  return {
    severity: 'ok',
    area: 'storage',
    subject: b.name,
    title: `Storage bucket ${b.name} is private`,
    detail: 'Files need a signed URL or a logged-in user with the right policy.',
    fix: null,
  };
}

export function buildReport(args: {
  project: string;
  now: Date;
  found: number;
  probes: TableProbe[];
  schemaVisible: boolean;
  buckets: BucketProbe[] | null;
}): ScanReport {
  const findings: Finding[] = [];

  if (!args.schemaVisible) {
    findings.push({
      severity: 'ok',
      area: 'schema',
      subject: 'schema',
      title: 'Table list is hidden from the public key',
      detail:
        'Your API doesn’t hand its table list to anonymous visitors, so this check couldn’t test tables one by one. That’s a good sign, not a guarantee.',
      fix: null,
    });
  } else if (args.found === 0) {
    findings.push({
      severity: 'ok',
      area: 'schema',
      subject: 'schema',
      title: 'No tables exposed to the public key',
      detail: 'The public API lists no tables or views for anonymous visitors.',
      fix: null,
    });
  }

  for (const p of args.probes) findings.push(tableFinding(p));
  for (const b of args.buckets ?? []) findings.push(bucketFinding(b));

  const rank: Record<Severity, number> = { critical: 0, warning: 1, ok: 2 };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity] || (b.rows ?? 0) - (a.rows ?? 0) || a.subject.localeCompare(b.subject));

  const counts: Record<Severity, number> = { critical: 0, warning: 0, ok: 0 };
  for (const f of findings) counts[f.severity]++;

  return {
    project: args.project,
    checkedAt: args.now.toISOString(),
    tables: { found: args.found, checked: args.probes.length, truncated: args.probes.length < args.found },
    buckets: args.buckets ? args.buckets.length : null,
    counts,
    findings,
  };
}
