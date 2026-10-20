import { describe, expect, it } from 'vitest';
import { builderMailto, pickedPackages } from './builder';

describe('package builder', () => {
  it('lists the picks in the homepage order', () => {
    expect(pickedPackages(['care', 'sprint']).map((p) => p.id)).toEqual(['sprint', 'care']);
    expect(pickedPackages([])).toEqual([]);
  });

  it('publishes no price but the audit', () => {
    for (const p of pickedPackages(['paudit', 'sprint', 'rescue', 'aifeat', 'mvp', 'care'])) {
      if (p.id === 'paudit') expect(p.price).toBe('$349');
      else expect(p.price).not.toMatch(/\d/);
    }
  });

  it('writes the picks into the email and asks for a quote, with no amounts', () => {
    const m = decodeURIComponent(builderMailto(['paudit', 'aifeat', 'care']));
    expect(m).toContain('- Production audit\n- AI build\n- Care plan');
    expect(m).toContain('Please send me a fixed quote.');
    expect(m).not.toMatch(/\$/);
  });
});
