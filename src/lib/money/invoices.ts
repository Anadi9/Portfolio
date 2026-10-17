import { promiseHours } from '../../data/promises.js';

/**
 * Invoice plans with the site's credits applied. Planned here, created in
 * Stripe by Anadi (this build doesn't write to Stripe).
 *
 * - Audit: $349, less the $149 teardown if paid within 30 days.
 * - Fix: half to start, half once it's live and the client confirms it works;
 *   the $349 audit is credited if paid within 30 days.
 * - AI build: the same two halves; the $149 teardown is credited instead.
 * A credit bigger than the first invoice carries into the second; no invoice
 * goes below zero.
 */

export const AUDIT_CENTS = 34900;
export const TEARDOWN_CENTS = 14900;

export type Work = 'audit' | 'fix' | 'build';
export type InvoicePlan = { key: 'audit' | 'start' | 'live'; label: string; lines: { label: string; cents: number }[]; totalCents: number; afterConfirm: boolean };

const within = (paidAt: string | null | undefined, days: number, now: Date) => !!paidAt && now.getTime() - Date.parse(paidAt) <= days * 86_400_000;

export function planInvoices(input: { work: Work; priceCents?: number; now: Date; auditPaidAt?: string | null; teardownPaidAt?: string | null }): InvoicePlan[] {
  const auditDays = promiseHours('audit_credit') / 24;
  const teardownDays = promiseHours('teardown_credit') / 24;
  const teardown = within(input.teardownPaidAt, teardownDays, input.now);

  if (input.work === 'audit') {
    const lines = [{ label: 'Production audit', cents: AUDIT_CENTS }];
    if (teardown) lines.push({ label: 'Recorded teardown credit', cents: -TEARDOWN_CENTS });
    return [{ key: 'audit', label: 'Production audit', lines, totalCents: Math.max(0, lines.reduce((n, l) => n + l.cents, 0)), afterConfirm: false }];
  }

  if (!input.priceCents || input.priceCents <= 0) throw new Error('a fixed price is needed for fix and build work');
  const name = input.work === 'fix' ? 'Fix' : 'AI build';
  const firstHalf = Math.ceil(input.priceCents / 2);
  const secondHalf = input.priceCents - firstHalf;
  const credit =
    input.work === 'fix' && within(input.auditPaidAt, auditDays, input.now)
      ? { label: 'Production audit credit', cents: AUDIT_CENTS }
      : input.work === 'build' && teardown
        ? { label: 'Recorded teardown credit', cents: TEARDOWN_CENTS }
        : null;

  const onFirst = credit ? Math.min(credit.cents, firstHalf) : 0;
  const onSecond = credit ? Math.min(credit.cents - onFirst, secondHalf) : 0;
  const start: InvoicePlan = {
    key: 'start',
    label: `${name}: first half`,
    lines: [{ label: `${name}, first half`, cents: firstHalf }, ...(onFirst ? [{ label: credit!.label, cents: -onFirst }] : [])],
    totalCents: firstHalf - onFirst,
    afterConfirm: false,
  };
  const live: InvoicePlan = {
    key: 'live',
    label: `${name}: second half (after you confirm it works)`,
    lines: [{ label: `${name}, second half`, cents: secondHalf }, ...(onSecond ? [{ label: `${credit!.label} (remainder)`, cents: -onSecond }] : [])],
    totalCents: secondHalf - onSecond,
    afterConfirm: true,
  };
  return [start, live];
}
