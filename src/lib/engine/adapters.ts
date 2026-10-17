import type { LeadScan } from '../brief/scan.js';
import type { ScanReport } from '../scan/report.js';
import type { EngineFinding, Severity } from './types.js';

/** Section names of the Wrapper Test (teardown), by id. Kept here so the engine has no UI imports. */
const TEARDOWN_SECTIONS: Record<number, string> = {
  1: 'Problem', 2: 'Requirements', 3: 'Constraints', 4: 'Architecture', 5: 'Data model',
  6: 'API contract', 7: 'Failure modes', 8: 'Tradeoffs', 9: 'Open questions',
};

export function fromLeadScan(scan: LeadScan): EngineFinding[] {
  if ('error' in scan) return [];
  const out: EngineFinding[] = scan.readiness.topFixes.map((f, i) => ({
    area: 'visibility',
    severity: i === 0 ? 'high' : 'medium',
    title: f.label,
    detail: `AI-readiness score ${scan.readiness.score}/100.`,
    fix: f.fix ?? null,
    source: 'readiness',
  }));
  for (const h of scan.headers?.missing ?? []) {
    out.push({ area: 'security', severity: 'medium', title: `Missing security header: ${h}`, detail: 'The homepage doesn’t send this header.', fix: `Send ${h} on every response.`, source: 'headers' });
  }
  return out;
}

export function fromSupabaseScan(report: ScanReport): EngineFinding[] {
  return report.findings
    .filter((f) => f.severity !== 'ok')
    .map((f) => ({ area: 'security', severity: f.severity === 'critical' ? 'critical' : 'medium', title: f.title, detail: f.detail, fix: f.fix, source: 'supabase' }));
}

const BY_WEIGHT: Record<number, Severity> = { 3: 'high', 2: 'medium', 1: 'low' };

export function fromDpdp(result: { gaps: { q?: string; title?: string; fix: string; weight: number }[] }): EngineFinding[] {
  return result.gaps.map((g) => ({
    area: 'privacy',
    severity: BY_WEIGHT[g.weight] ?? 'low',
    title: g.title ?? g.q ?? 'Privacy gap',
    detail: 'From the privacy self-check.',
    fix: g.fix,
    source: 'dpdp',
  }));
}

export function fromTeardown(result: { thinnest: { ranked: number[]; tied: number[]; tiedScore?: number }; sectionScores: Record<number, number> }): EngineFinding[] {
  return [...result.thinnest.ranked, ...result.thinnest.tied].map((id) => {
    const score = result.sectionScores[id] ?? 0;
    return {
      area: 'product',
      severity: score < 34 ? 'high' : 'medium',
      title: `Thin: ${TEARDOWN_SECTIONS[id] ?? `section ${id}`} (${score}/100)`,
      detail: 'From the Wrapper Test.',
      fix: null,
      source: 'teardown',
    };
  });
}
