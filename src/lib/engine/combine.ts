import { AREAS, type Area, type EngineFinding, type Severity } from './types.js';

export const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 8, high: 4, medium: 2, low: 1 };

/** Each weight point costs an area 5 points out of 100. */
const PER_POINT = 5;

export type EngineResult = {
  findings: EngineFinding[];
  /** null when nothing checked that area: unchecked is not the same as clean. */
  areas: Record<Area, { score: number | null; count: number }>;
  overall: number | null;
  top: EngineFinding[];
};

export function combine(findings: EngineFinding[], checked: Area[] = []): EngineResult {
  const sorted = [...findings].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] || AREAS.indexOf(a.area) - AREAS.indexOf(b.area));
  const seen = new Set<Area>([...checked, ...findings.map((f) => f.area)]);
  const areas = Object.fromEntries(
    AREAS.map((area) => {
      const mine = findings.filter((f) => f.area === area);
      const lost = mine.reduce((n, f) => n + SEVERITY_WEIGHT[f.severity], 0) * PER_POINT;
      return [area, { score: seen.has(area) ? Math.max(0, 100 - lost) : null, count: mine.length }];
    }),
  ) as EngineResult['areas'];
  const scored = AREAS.map((a) => areas[a].score).filter((s): s is number => s !== null);
  return {
    findings: sorted,
    areas,
    overall: scored.length ? Math.round(scored.reduce((x, y) => x + y, 0) / scored.length) : null,
    top: sorted.slice(0, 3),
  };
}
