import { describe, expect, it } from 'vitest';
import { nextIndex, CARTRIDGES } from './picker';
import { optionsFor } from './chat';
import { guardPrices } from './prices';

describe('service picker', () => {
  it('moves with the arrow keys and stops at the ends', () => {
    expect(nextIndex(0, 'ArrowRight', 5)).toBe(1);
    expect(nextIndex(4, 'ArrowRight', 5)).toBe(4);
    expect(nextIndex(0, 'ArrowLeft', 5)).toBe(0);
    expect(nextIndex(3, 'ArrowDown', 5)).toBe(4);
    expect(nextIndex(3, 'ArrowUp', 5)).toBe(2);
    expect(nextIndex(2, 'Home', 5)).toBe(0);
    expect(nextIndex(2, 'End', 5)).toBe(4);
    expect(nextIndex(2, 'x', 5)).toBeNull();
  });

  it('starts the chat on a real first option, quoting published prices only', () => {
    const starts = optionsFor('start').map((o) => o.label);
    for (const c of CARTRIDGES) {
      expect(starts, c.name).toContain(c.start);
      expect(guardPrices(c.price).ok, c.price).toBe(true);
    }
  });
});
