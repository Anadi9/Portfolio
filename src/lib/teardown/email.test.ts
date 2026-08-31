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

  it('escapes hostile content in findings', () => {
    // Verify that the esc() function is load-bearing by injecting a hostile
    // string and confirming it is escaped in the output.
    const HOSTILE = '<script>alert(1)</script> & "xss"';
    const baseModel = report(all(1));
    const model = {
      result: baseModel.result,
      sections: baseModel.sections.map((s, i) =>
        i === 0 ? { ...s, findings: [HOSTILE] } : s
      ),
    };
    const { html } = renderEmail(model);

    // Assert raw dangerous content is NOT present
    expect(html).not.toContain('<script>alert(1)</script>');
    // Assert escaped forms ARE present
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;xss&quot;');
    // Assert the document structure is still valid (no unescaped injection)
    expect(html).not.toMatch(/<(?!!|\/?(html|head|body|meta|title|div|p|h1|h2|h3|span|a|table|tr|td|strong|hr)\b)/i);
  });
});

describe('renderEmail — undecided', () => {
  it('renders the undecidedLine paragraph when undecidedCount > 0', () => {
    const { html } = renderEmail(report(all(3)));
    // Text unique to the undecidedLine block
    expect(html).toContain('13 of 13 answers were');
    expect(html).toContain('recorded separately from low');
  });

  it('does not render the undecidedLine paragraph when undecidedCount === 0', () => {
    const { html } = renderEmail(report(all(0)));
    // Text unique to the undecidedLine block should NOT appear
    expect(html).not.toContain('recorded separately from low');
  });
});
