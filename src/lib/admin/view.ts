import { PROMISES, promiseHours } from '../../data/promises';

/** Pure helpers for the /admin page, kept here so they can be tested without a browser. */

export type Tone = 'ok' | 'warn' | 'late';

const HOUR = 3_600_000;

const span = (ms: number) => {
  const mins = Math.round(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Time left on the first-bug promise; red under 6 hours, LATE past it. */
export function timeLeft(createdAt: string, now = new Date(), hours = promiseHours('first_bug_video')): { label: string; tone: Tone } {
  const left = Date.parse(createdAt) + hours * HOUR - now.getTime();
  if (left < 0) return { label: `LATE ${span(-left)}`, tone: 'late' };
  return { label: `${span(left)} left`, tone: left < 6 * HOUR ? 'warn' : 'ok' };
}

export type SnoozeChoice = '3h' | 'tomorrow' | 'week';

/** Hours until the snooze ends. "Tomorrow" is 09:00 IST the next day. */
export function snoozeHours(choice: SnoozeChoice, now = new Date()): number {
  if (choice === '3h') return 3;
  if (choice === 'week') return 168;
  const IST = 5.5 * HOUR;
  const local = new Date(now.getTime() + IST);
  const target = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 9, 0) - IST;
  return Math.max(1, Math.ceil((target - now.getTime()) / HOUR));
}

/** `#card-<id>` scrolls to a card; `#A-1001` opens a ticket. Anything else is ignored. */
export function parseHash(hash: string): { card?: string; ticket?: string } {
  const h = hash.replace(/^#/, '');
  const card = /^card-([\w-]{1,80})$/.exec(h);
  if (card) return { card: card[1] };
  if (/^A-\d{1,9}$/.test(h)) return { ticket: h };
  return {};
}

export function age(iso: string, now = new Date()): string {
  const ms = now.getTime() - Date.parse(iso);
  if (ms < 60_000) return 'just now';
  if (ms < HOUR) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)}h ago`;
  return `${Math.floor(ms / (24 * HOUR))}d ago`;
}

export function promiseLabel(id: string): string {
  return (PROMISES as Record<string, { what: string } | undefined>)[id]?.what ?? id;
}

export function dueLabel(dueAt: string, now = new Date()): string {
  const ms = Date.parse(dueAt) - now.getTime();
  return ms >= 0 ? `due in ${span(ms)}` : `${span(-ms)} overdue`;
}
