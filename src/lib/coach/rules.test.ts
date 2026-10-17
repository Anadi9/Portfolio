import { describe, expect, it } from 'vitest';
import { AT_RISK_SHARE, dueFrom, keptRate, statusAt, weekStartIst } from './rules';

const openedAt = '2026-10-18T00:00:00Z';
const dueAt = '2026-10-19T00:00:00Z';
const at = (h: number, ms = 0) => new Date(Date.parse(openedAt) + h * 3_600_000 + ms);

describe('statusAt', () => {
  it('is at risk from 75% of the window', () => {
    expect(AT_RISK_SHARE).toBe(0.75);
    expect(statusAt({ openedAt, dueAt, status: 'open' }, at(18, -1))).toBe('open');
    expect(statusAt({ openedAt, dueAt, status: 'open' }, at(18))).toBe('at_risk');
  });
  it('is missed just past due', () => {
    expect(statusAt({ openedAt, dueAt, status: 'at_risk' }, at(24))).toBe('at_risk');
    expect(statusAt({ openedAt, dueAt, status: 'at_risk' }, at(24, 1))).toBe('missed');
    expect(statusAt({ openedAt, dueAt, status: 'open' }, at(30))).toBe('missed');
  });
  it('never changes a closed commitment', () => {
    expect(statusAt({ openedAt, dueAt, status: 'kept' }, at(30))).toBe('kept');
    expect(statusAt({ openedAt, dueAt, status: 'missed' }, at(1))).toBe('missed');
  });
});

describe('dueFrom', () => {
  it('adds the promise hours', () => {
    expect(dueFrom('first_bug_video', openedAt)).toBe('2026-10-19T00:00:00.000Z');
    expect(dueFrom('audit_report', new Date(openedAt))).toBe('2026-10-20T00:00:00.000Z');
  });
});

describe('keptRate', () => {
  it('counts closed commitments only', () => {
    expect(keptRate([{ status: 'open' }])).toEqual({ kept: 0, missed: 0, rate: null });
    expect(keptRate([{ status: 'kept' }, { status: 'kept' }, { status: 'kept' }, { status: 'missed' }, { status: 'at_risk' }])).toEqual({ kept: 3, missed: 1, rate: 0.75 });
  });
});

describe('weekStartIst', () => {
  it('is Monday 00:00 IST', () => {
    // Sunday 25 Oct 2026, 23:00 IST → week began Mon 19 Oct 00:00 IST = 18 Oct 18:30Z
    expect(weekStartIst(new Date('2026-10-25T17:30:00Z')).toISOString()).toBe('2026-10-18T18:30:00.000Z');
    // Monday 26 Oct, 00:30 IST → that Monday
    expect(weekStartIst(new Date('2026-10-25T19:00:00Z')).toISOString()).toBe('2026-10-25T18:30:00.000Z');
  });
});
