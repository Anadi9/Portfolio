/**
 * The master plan as data: every checkbox under a `## Phase …` or
 * `## Running alongside …` heading. Coach's weekly review and /admin's Plan
 * tab read it from `src/data/plan.generated.ts`.
 */

export type PlanItem = { phase: string; text: string; done: boolean };

const clean = (s: string) => s.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();

export function parsePlan(md: string): PlanItem[] {
  const items: PlanItem[] = [];
  let phase: string | null = null;
  let current: PlanItem | null = null;
  for (const line of md.split('\n')) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      phase = /^(Phase \d+|Running alongside)\b/.test(h[1]) ? clean(h[1]) : null;
      current = null;
      continue;
    }
    if (!phase) continue;
    const box = /^- \[( |x)\] (.*)$/.exec(line);
    if (box) {
      current = { phase, text: box[2], done: box[1] === 'x' };
      items.push(current);
    } else if (current && /^\s{2,}\S/.test(line)) current.text += ` ${line.trim()}`;
    else current = null;
  }
  return items.map((i) => ({ ...i, text: clean(i.text) }));
}

export function summarisePlan(items: PlanItem[]) {
  const phases: { phase: string; done: number; total: number }[] = [];
  for (const i of items) {
    let p = phases.find((x) => x.phase === i.phase);
    if (!p) phases.push((p = { phase: i.phase, done: 0, total: 0 }));
    p.total += 1;
    if (i.done) p.done += 1;
  }
  return { phases, next: items.filter((i) => !i.done).slice(0, 3) };
}
