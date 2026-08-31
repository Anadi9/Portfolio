import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS } from './questions';
import { report } from './report';
import { renderEmail } from './email';

const all = (i: number) => QUESTIONS.map(() => i);

describe('renderEmail — subject', () => {
  it('carries the verdict and the score', () => {
    const { subject } = renderEmail(report(all(0)));
    expect(subject).toContain('REAL PRODUCT');
    expect(subject).toContain('100');
  });

  it('differs by band', () => {
    const a = renderEmail(report(all(0))).subject;
    const b = renderEmail(report(all(2))).subject;
    expect(a).not.toBe(b);
  });
});

describe('renderEmail — body', () => {
  const { html } = renderEmail(report(all(1)));

  it('contains all nine section titles', () => {
    for (const title of Object.values(SECTIONS)) {
      expect(html).toContain(title);
    }
  });

  it('contains every finding for the given answers', () => {
    for (const q of QUESTIONS) {
      expect(html).toContain(q.findings[1]);
    }
  });

  it('links to the paid teardown exactly once', () => {
    const matches = html.match(/https:\/\/anadithakur\.in\/work-with-me/g) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('contains no script tag', () => {
    expect(html).not.toMatch(/<script/i);
  });

  it('escapes any HTML-significant character in a finding', () => {
    // No finding should be able to break the document even if one gains a
    // bracket or ampersand later.
    expect(html).not.toMatch(/<(?!!|\/?(html|head|body|meta|title|div|p|h1|h2|h3|span|a|table|tr|td|strong|hr)\b)/i);
  });
});

describe('renderEmail — undecided', () => {
  it('marks an all-unknown run as undecided rather than as a low score alone', () => {
    const { html } = renderEmail(report(all(3)));
    expect(html.toLowerCase()).toContain('not decided yet');
  });
});
