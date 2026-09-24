import { describe, expect, it } from 'vitest';
import { QUESTIONS, SECTIONS } from './questions';
import { report } from './report';
import { renderEmail } from './email';

const all = (i: number) => QUESTIONS.map(() => i);

describe('renderEmail: subject', () => {
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

describe('renderEmail: body', () => {
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

  it('links to the free audit exactly once', () => {
    const matches = html.match(/https:\/\/anadithakur\.in\/rescue\/audit/g) ?? [];
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

describe('renderEmail: undecided', () => {
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

describe('renderEmail: the attached copy', () => {
  const model = report(all(1));
  const { html, attachment } = renderEmail(model, new Date('2026-09-03T00:00:00Z'));

  it('names the file after the document reference', () => {
    expect(attachment.filename).toBe('wrapper-test-WT-13-033-D.html');
    // Nothing a filesystem or a mail client has to quote.
    expect(attachment.filename).toMatch(/^[A-Za-z0-9.-]+\.html$/);
  });

  it('is a standalone document, not a fragment', () => {
    expect(attachment.html).toMatch(/^<!doctype html>/i);
    expect(attachment.html).toContain('</html>');
  });

  it('carries the same findings as the body', () => {
    for (const q of QUESTIONS) {
      expect(attachment.html).toContain(q.findings[1]);
    }
  });

  it('carries the same masthead as the body: reference, verdict, score', () => {
    expect(attachment.html).toContain('WT-13/033-D');
    expect(html).toContain('WT-13/033-D');
    expect(attachment.html).toContain('03 SEP 2026');
    expect(attachment.html).toContain(`${model.result.score}<span>/100</span>`);
  });

  it('contains no script tag', () => {
    expect(attachment.html).not.toMatch(/<script/i);
  });

  it('escapes hostile content in findings', () => {
    const base = report(all(1));
    const { attachment } = renderEmail({
      result: base.result,
      sections: base.sections.map((s, i) =>
        i === 0 ? { ...s, findings: ['<script>alert(1)</script> & "xss"'] } : s,
      ),
    });
    expect(attachment.html).not.toContain('<script>alert(1)</script>');
    expect(attachment.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('is offered in the body, and the body offers no download of its own', () => {
    expect(html).toContain('attached to this email');
    expect(html).toContain(attachment.filename);
    // The file lives in the inbox. Nothing in the body links to a copy on the site.
    expect(html).not.toMatch(/href="[^"]*\.html"/i);
  });
});
