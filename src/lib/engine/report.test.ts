import { describe, expect, it } from 'vitest';
import { draftReport } from './report';
import { combine } from './combine';
import { hasPlaceholder } from '../brief/draft';

const result = combine(
  [
    { area: 'security', severity: 'critical', title: 'users table is readable by anyone', detail: 'Anon can read 1,200 rows.', fix: 'Enable RLS on users.', source: 'headers' },
    { area: 'visibility', severity: 'high', title: 'Content is not in the HTML', detail: 'Score 40/100.', fix: 'Prerender.', source: 'readiness' },
  ],
  ['security', 'visibility'],
);

describe('draftReport', () => {
  it('writes a ranked, plain-English skeleton that cannot be sent as is', () => {
    const d = draftReport({ number: 'A-1001', appUrl: 'a.example', result });
    expect(d.subject).toBe('Your production audit: a.example (A-1001)');
    expect(d.body).toContain('1. users table is readable by anyone');
    expect(d.body.indexOf('users table')).toBeLessThan(d.body.indexOf('Content is not in the HTML'));
    expect(d.body).toContain('Fix: Enable RLS on users.');
    expect(d.body).toContain('Security');
    expect(d.body).toContain('Search and AI visibility');
    expect(d.body).toMatch(/Not checked in this report: Reliability, Privacy \(GDPR · CCPA · DPDP\), Product depth/);
    expect(d.body).toContain('[ANADI: confirm or remove]');
    expect(d.body).toContain('[PRICE]');
    expect(d.body).toContain('Fixed quote to fix the above: [PRICE].');
    expect(d.body).not.toMatch(/credited|refund/);
    expect(hasPlaceholder(d.body)).toBe(true);
  });

  it('says so when nothing was found', () => {
    const d = draftReport({ number: 'A-2', appUrl: null, result: combine([], ['visibility']) });
    expect(d.body).toContain('No real issues found');
    expect(d.body).toContain('nothing needs fixing right now');
    expect(d.body).not.toMatch(/refund/);
  });
});
