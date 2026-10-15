import { describe, expect, it } from 'vitest';
import { builderMailto, range, total } from './builder';

describe('package builder', () => {
  it('sums one-off ranges and keeps Care monthly', () => {
    const t = total(['sprint', 'care']);
    expect(range(t)).toBe('$1,500–$2,500');
    expect(t.monthly).toBe(299);
    expect(t.credit).toBe(0);
  });

  it('credits the audit once a fix or build is picked with it', () => {
    const t = total(['paudit', 'rescue']);
    expect(t.credit).toBe(349);
    expect(range(t)).toBe('$3,000–$6,000');
  });

  it('charges the audit alone, and only Care when only Care is picked', () => {
    expect(range(total(['paudit']))).toBe('$349');
    expect(range(total(['paudit', 'care']))).toBe('$349');
    expect(range(total(['care']))).toBe('');
  });

  it('writes the picks and totals into the email', () => {
    const m = decodeURIComponent(builderMailto(['paudit', 'aifeat', 'care']));
    expect(m).toContain('- AI build: $2,000–$8,000');
    expect(m).toContain('One-off: $2,000–$8,000 (audit credited, -$349)');
    expect(m).toContain('Monthly: $299/mo');
  });
});
