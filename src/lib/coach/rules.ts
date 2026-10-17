import { promiseHours, type PromiseId } from '../../data/promises.js';

/**
 * Coach's clock. A commitment is at risk once 75% of its window has gone and
 * missed one millisecond after it's due. Kept and missed are final: a miss is
 * never rewritten, only explained.
 */

export type CommitmentStatus = 'open' | 'at_risk' | 'kept' | 'missed';

export const AT_RISK_SHARE = 0.75;

const HOUR = 3_600_000;

export function statusAt(c: { openedAt: string; dueAt: string; status: CommitmentStatus }, now: Date): CommitmentStatus {
  if (c.status === 'kept' || c.status === 'missed') return c.status;
  const opened = Date.parse(c.openedAt);
  const due = Date.parse(c.dueAt);
  const t = now.getTime();
  if (t > due) return 'missed';
  if (t - opened >= AT_RISK_SHARE * (due - opened)) return 'at_risk';
  return 'open';
}

export function dueFrom(promise: PromiseId, from: Date | string): string {
  const start = typeof from === 'string' ? Date.parse(from) : from.getTime();
  return new Date(start + promiseHours(promise) * HOUR).toISOString();
}

/** Share of closed commitments that were kept; null until one has closed. */
export function keptRate(cs: { status: CommitmentStatus }[]): { kept: number; missed: number; rate: number | null } {
  const kept = cs.filter((c) => c.status === 'kept').length;
  const missed = cs.filter((c) => c.status === 'missed').length;
  return { kept, missed, rate: kept + missed ? kept / (kept + missed) : null };
}

const IST = 5.5 * HOUR;

/** Monday 00:00 in India, as a UTC instant: the start of the five-a-week window. */
export function weekStartIst(now: Date): Date {
  const local = new Date(now.getTime() + IST);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - sinceMonday) - IST);
}
