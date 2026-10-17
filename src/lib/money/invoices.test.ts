import { describe, expect, it } from 'vitest';
import { planInvoices, AUDIT_CENTS, TEARDOWN_CENTS } from './invoices';

const now = new Date('2026-10-20T00:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe('planInvoices', () => {
  it('uses the published prices', () => {
    expect(AUDIT_CENTS).toBe(34900);
    expect(TEARDOWN_CENTS).toBe(14900);
  });

  it('bills the audit, less a recent teardown', () => {
    expect(planInvoices({ work: 'audit', now })).toEqual([{ key: 'audit', label: 'Production audit', lines: [{ label: 'Production audit', cents: 34900 }], totalCents: 34900, afterConfirm: false }]);
    expect(planInvoices({ work: 'audit', now, teardownPaidAt: daysAgo(10) })[0]).toMatchObject({ totalCents: 20000, lines: [{ cents: 34900 }, { label: 'Recorded teardown credit', cents: -14900 }] });
    expect(planInvoices({ work: 'audit', now, teardownPaidAt: daysAgo(31) })[0].totalCents).toBe(34900);
  });

  it('splits a fix in half, credits a recent audit on the first, and holds the second for confirmation', () => {
    const [start, live] = planInvoices({ work: 'fix', priceCents: 200000, now, auditPaidAt: daysAgo(5) });
    expect(start).toMatchObject({ key: 'start', totalCents: 65100, afterConfirm: false, lines: [{ cents: 100000 }, { label: 'Production audit credit', cents: -34900 }] });
    expect(live).toMatchObject({ key: 'live', totalCents: 100000, afterConfirm: true });
  });

  it('carries a credit bigger than the first half into the second, never below zero', () => {
    const [start, live] = planInvoices({ work: 'fix', priceCents: 50000, now, auditPaidAt: daysAgo(1) });
    expect(start.totalCents).toBe(0);
    expect(live.totalCents).toBe(25000 - 9900);
  });

  it('puts an odd cent on the first half', () => {
    const [a, b] = planInvoices({ work: 'fix', priceCents: 150001, now });
    expect(a.totalCents + b.totalCents).toBe(150001);
    expect(a.totalCents).toBe(75001);
  });

  it('credits a teardown toward an AI build, not a fix', () => {
    expect(planInvoices({ work: 'build', priceCents: 400000, now, teardownPaidAt: daysAgo(3) })[0].totalCents).toBe(200000 - 14900);
    expect(planInvoices({ work: 'fix', priceCents: 400000, now, teardownPaidAt: daysAgo(3) })[0].totalCents).toBe(200000);
  });

  it('needs a price for fix and build work', () => {
    expect(() => planInvoices({ work: 'fix', now })).toThrow(/price/);
  });
});
