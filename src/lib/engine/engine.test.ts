import { describe, expect, it } from 'vitest';
import { fromDpdp, fromLeadScan, fromSupabaseScan, fromTeardown } from './adapters';
import { combine, SEVERITY_WEIGHT } from './combine';
import type { LeadScan } from '../brief/scan';

const lead: LeadScan = {
  ok: true,
  url: 'https://a.example/',
  readiness: { score: 40, topFixes: [{ id: 'render', label: 'Content is not in the HTML', fix: 'Prerender' }, { id: 'meta', label: 'Weak titles' }] },
  headers: { present: ['X-Content-Type-Options'], missing: ['Content-Security-Policy', 'Strict-Transport-Security'] },
  ms: 1,
};

describe('adapters', () => {
  it('maps the lead scan to visibility and security', () => {
    const f = fromLeadScan(lead);
    expect(f.filter((x) => x.area === 'visibility').map((x) => x.title)).toEqual(['Content is not in the HTML', 'Weak titles']);
    expect(f.filter((x) => x.area === 'security').map((x) => x.title)).toEqual(['Missing security header: Content-Security-Policy', 'Missing security header: Strict-Transport-Security']);
    expect(f[0]).toMatchObject({ severity: 'high', source: 'readiness', fix: 'Prerender' });
    expect(fromLeadScan({ ok: false, url: null, error: 'x', ms: 0 })).toEqual([]);
  });

  it('maps a Supabase scan, keeping only problems', () => {
    const f = fromSupabaseScan({
      project: 'p', checkedAt: '', tables: { found: 2, checked: 2, truncated: false }, buckets: null, counts: { critical: 1, warning: 1, ok: 1 },
      findings: [
        { severity: 'critical', area: 'table', subject: 'users', title: 'users is readable by anyone', detail: 'd', fix: 'Enable RLS' },
        { severity: 'warning', area: 'storage', subject: 'b', title: 'Public bucket', detail: 'd', fix: null },
        { severity: 'ok', area: 'table', subject: 'x', title: 'fine', detail: 'd', fix: null },
      ],
    });
    expect(f.map((x) => [x.severity, x.area, x.title])).toEqual([
      ['critical', 'security', 'users is readable by anyone'],
      ['medium', 'security', 'Public bucket'],
    ]);
  });

  it('maps DPDP gaps by weight and teardown thinnest sections', () => {
    const d = fromDpdp({ gaps: [{ q: 'Do you show a consent notice?', fix: 'Add one', weight: 3 }, { q: 'Do you have a retention rule?', fix: 'Set one', weight: 1 }] });
    expect(d.map((x) => [x.severity, x.area])).toEqual([['high', 'privacy'], ['low', 'privacy']]);
    const t = fromTeardown({ thinnest: { ranked: [7, 4], tied: [], tiedScore: 0 }, sectionScores: { 7: 10, 4: 40 } as Record<number, number> });
    expect(t.map((x) => x.title)).toEqual(['Thin: Failure modes (10/100)', 'Thin: Architecture (40/100)']);
  });
});

describe('combine', () => {
  it('ranks by weight, scores each area, and leaves unchecked areas null', () => {
    const r = combine([...fromLeadScan(lead), { area: 'security', severity: 'critical', title: 'Open table', detail: '', fix: null, source: 'supabase' }]);
    expect(r.findings[0].title).toBe('Open table');
    expect(r.top).toHaveLength(3);
    expect(r.areas.privacy).toEqual({ score: null, count: 0 });
    expect(r.areas.reliability.score).toBeNull();
    expect(r.areas.security.count).toBe(3);
    expect(r.areas.security.score).toBe(100 - (SEVERITY_WEIGHT.critical + 2 * SEVERITY_WEIGHT.medium) * 5);
    expect(r.overall).not.toBeNull();
  });

  it('has no overall score with no input', () => {
    expect(combine([])).toMatchObject({ overall: null, top: [] });
  });
});
