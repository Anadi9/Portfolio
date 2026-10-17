import { describe, expect, it } from 'vitest';
import { age, parseHash, snoozeHours, timeLeft } from './view';

const created = '2026-10-18T00:00:00Z';
const at = (h: number) => new Date(Date.parse(created) + h * 3_600_000);

describe('timeLeft', () => {
  it('counts down to the 24 h promise', () => {
    expect(timeLeft(created, at(2))).toEqual({ label: '22h left', tone: 'ok' });
    expect(timeLeft(created, at(18.5))).toEqual({ label: '5h 30m left', tone: 'warn' });
    expect(timeLeft(created, at(23.9))).toEqual({ label: '6m left', tone: 'warn' });
    expect(timeLeft(created, at(25))).toEqual({ label: 'LATE 1h', tone: 'late' });
  });
});

describe('snoozeHours', () => {
  it('3 hours, tomorrow 09:00 IST, a week', () => {
    const now = new Date('2026-10-18T10:00:00Z'); // 15:30 IST
    expect(snoozeHours('3h', now)).toBe(3);
    expect(snoozeHours('week', now)).toBe(168);
    // tomorrow 09:00 IST = 2026-10-19T03:30Z → 17.5h, rounded up
    expect(snoozeHours('tomorrow', now)).toBe(18);
  });
  it('never asks for less than an hour', () => {
    expect(snoozeHours('tomorrow', new Date('2026-10-19T03:20:00Z'))).toBeGreaterThanOrEqual(1);
  });
});

describe('parseHash', () => {
  it('reads card and ticket hashes', () => {
    expect(parseHash('#card-abc')).toEqual({ card: 'abc' });
    expect(parseHash('#A-1001')).toEqual({ ticket: 'A-1001' });
    expect(parseHash('')).toEqual({});
    expect(parseHash('#<script>')).toEqual({});
  });
});

describe('age', () => {
  it('says how old a card is', () => {
    const now = new Date('2026-10-18T12:00:00Z');
    expect(age('2026-10-18T11:59:30Z', now)).toBe('just now');
    expect(age('2026-10-18T11:15:00Z', now)).toBe('45m ago');
    expect(age('2026-10-18T07:00:00Z', now)).toBe('5h ago');
    expect(age('2026-10-15T12:00:00Z', now)).toBe('3d ago');
  });
});
