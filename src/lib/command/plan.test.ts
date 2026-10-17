import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePlan, summarisePlan } from './plan';
import { MASTER_PLAN_MD } from '../../data/plan.generated';

const md = `# Master plan

## Rules
- [ ] not a phase item

## Phase 2: the promise list

- [x] Done thing.
- [ ] Open thing
      that wraps.

## Phase 3: command centre v1 (\`/admin\`)

- [ ] **Bold** item.

## Running alongside: search and AI visibility

- [x] Search Console.
- [ ] llms-full.txt.
`;

describe('parsePlan', () => {
  it('reads phase items, joining wrapped lines', () => {
    expect(parsePlan(md)).toEqual([
      { phase: 'Phase 2: the promise list', text: 'Done thing.', done: true },
      { phase: 'Phase 2: the promise list', text: 'Open thing that wraps.', done: false },
      { phase: 'Phase 3: command centre v1 (/admin)', text: 'Bold item.', done: false },
      { phase: 'Running alongside: search and AI visibility', text: 'Search Console.', done: true },
      { phase: 'Running alongside: search and AI visibility', text: 'llms-full.txt.', done: false },
    ]);
  });

  it('summarises per phase and the next three', () => {
    const s = summarisePlan(parsePlan(md));
    expect(s.phases).toEqual([
      { phase: 'Phase 2: the promise list', done: 1, total: 2 },
      { phase: 'Phase 3: command centre v1 (/admin)', done: 0, total: 1 },
      { phase: 'Running alongside: search and AI visibility', done: 1, total: 2 },
    ]);
    expect(s.next.map((i) => i.text)).toEqual(['Open thing that wraps.', 'Bold item.', 'llms-full.txt.']);
  });
});

describe('plan.generated.ts', () => {
  it('matches docs/master-plan.md (run node scripts/generate-plan.mjs)', () => {
    expect(MASTER_PLAN_MD).toBe(readFileSync('docs/master-plan.md', 'utf8'));
  });
});
