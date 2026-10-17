import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Bit, Coach, COACH_GREEN } from './Bit';
import { c } from './tokens';

describe('Coach', () => {
  it('is Bit with the red body swapped for the site green', () => {
    const bit = renderToStaticMarkup(createElement(Bit, { pose: 'calm', size: 36 }));
    const coach = renderToStaticMarkup(createElement(Coach, { pose: 'calm', size: 36 }));
    expect(COACH_GREEN).toBe(c.signal);
    expect(bit).toContain(c.shell);
    expect(coach).not.toContain(c.shell);
    expect(coach).toContain(COACH_GREEN);
    expect(coach.split(COACH_GREEN).join(c.shell)).toBe(bit);
  });
});
