import { describe, expect, it } from 'vitest';
import { gate, STAGE_RULES, type GateInput } from './stages';
import { promiseHours } from '../../data/promises';
import { TICKET_STAGES } from '../tickets/types';

const tasksFor = (stage: GateInput['stage'], done: boolean) =>
  STAGE_RULES[stage].tasks.map((t) => ({ key: t.key, stage, status: done ? ('done' as const) : ('open' as const) }));

describe('STAGE_RULES', () => {
  it('covers every stage and only promises with deadlines', () => {
    for (const s of TICKET_STAGES) {
      expect(STAGE_RULES[s]).toBeDefined();
      for (const p of STAGE_RULES[s].commitments) expect(() => promiseHours(p)).not.toThrow();
    }
  });
  it('gives every task an owner and a done-when', () => {
    for (const s of TICKET_STAGES) for (const t of STAGE_RULES[s].tasks) expect(t.doneWhen.length).toBeGreaterThan(5);
  });
});

describe('gate', () => {
  it('blocks on the stage’s open tasks', () => {
    const g = gate({ stage: 'audit', to: 'fixing', tasks: tasksFor('audit', false), commitments: [] });
    expect(g.ok).toBe(false);
    expect(g.blockers).toHaveLength(3);
    expect(gate({ stage: 'audit', to: 'fixing', tasks: tasksFor('audit', true), commitments: [] }).ok).toBe(true);
  });

  it('ignores tasks from other stages', () => {
    expect(gate({ stage: 'fixing', to: 'live', tasks: [...tasksFor('audit', false), ...tasksFor('fixing', true)], commitments: [] }).ok).toBe(true);
  });

  it('blocks on a miss with no reason, even when closing', () => {
    const missed = { promiseId: 'first_bug_video' as const, status: 'missed' as const, missReason: null };
    const g = gate({ stage: 'inbox', to: 'closed', tasks: tasksFor('inbox', false), commitments: [missed] });
    expect(g.ok).toBe(false);
    expect(g.blockers).toEqual(['Write a reason for the missed promise: Free first-bug video']);
    expect(gate({ stage: 'inbox', to: 'closed', tasks: tasksFor('inbox', false), commitments: [{ ...missed, missReason: 'Client app was down all day' }] }).ok).toBe(true);
  });

  it('lets a ticket close with open tasks', () => {
    expect(gate({ stage: 'audit', to: 'closed', tasks: tasksFor('audit', false), commitments: [] }).ok).toBe(true);
  });

  it('blocks moving backwards only on misses', () => {
    expect(gate({ stage: 'fixing', to: 'audit', tasks: tasksFor('fixing', false), commitments: [] }).ok).toBe(true);
  });
});
