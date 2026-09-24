import { describe, expect, it } from 'vitest';
import {
  SYMPTOMS,
  dueBy,
  formatDue,
  normalizeUrl,
  parseIntake,
  parseSymptomParam,
  renderConfirmEmail,
  renderLeadEmail,
  type Intake,
} from './intake';

const valid = () => ({
  appUrl: 'my-app.lovable.app',
  repoUrl: '',
  tool: 'Lovable',
  symptoms: [2, 0, 2],
  notes: '  login loops  ',
  email: 'founder@example.com',
});

describe('normalizeUrl', () => {
  it('adds https to a bare host', () => {
    expect(normalizeUrl(' my-app.lovable.app ')).toBe('https://my-app.lovable.app/');
  });
  it.each(['javascript:alert(1)', 'localhost:3000', 'ftp://x.com', '', 'not a url', 'http://nodot'])('rejects %s', (raw) => {
    expect(normalizeUrl(raw)).toBeNull();
  });
});

describe('SYMPTOMS', () => {
  it('includes the visibility symptom and keeps the catch-all last', () => {
    const areas = SYMPTOMS.map((sym) => sym.area);
    expect(areas).toContain('Visibility');
    expect(areas[areas.length - 1]).toBe('The audit');
    expect(new Set(SYMPTOMS.map((sym) => sym.line)).size).toBe(SYMPTOMS.length);
  });
});

describe('parseSymptomParam', () => {
  it('keeps valid indices, sorted and unique, and drops junk', () => {
    expect(parseSymptomParam('3,0,3,x,-1,99,1.5')).toEqual([0, 3]);
    expect(parseSymptomParam(null)).toEqual([]);
  });

  it('accepts every row up to the last and nothing past it', () => {
    const last = SYMPTOMS.length - 1;
    const visibility = SYMPTOMS.findIndex((sym) => sym.area === 'Visibility');
    expect(parseSymptomParam(`${visibility},${last},${last + 1}`)).toEqual([visibility, last]);
  });
});

describe('parseIntake', () => {
  it('normalises a valid submission', () => {
    const r = parseIntake(valid());
    expect(r).toEqual({
      ok: true,
      intake: {
        appUrl: 'https://my-app.lovable.app/',
        repoUrl: null,
        tool: 'Lovable',
        symptoms: [0, 2],
        notes: 'login loops',
        email: 'founder@example.com',
      },
    });
  });

  it.each([
    ['appUrl', { appUrl: '' }],
    ['repoUrl', { repoUrl: 'javascript:1' }],
    ['tool', { tool: 'Webflow' }],
    ['symptoms', { symptoms: [SYMPTOMS.length] }],
    ['notes', { notes: 'x'.repeat(2001) }],
    ['email', { email: 'nope' }],
  ])('names %s as the failing field', (field, patch) => {
    const r = parseIntake({ ...valid(), ...patch });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.field).toBe(field);
  });

  it('accepts every symptom ticked at once', () => {
    const all = SYMPTOMS.map((_, i) => i);
    const r = parseIntake({ ...valid(), symptoms: [...all].reverse() });
    expect(r.ok && r.intake.symptoms).toEqual(all);
  });

  it('survives a null body', () => {
    expect(parseIntake(null).ok).toBe(false);
  });
});

describe('deadline', () => {
  it('is 48 hours out and quoted in Eastern time', () => {
    const due = dueBy(new Date('2026-09-23T19:00:00Z'));
    expect(due.toISOString()).toBe('2026-09-25T19:00:00.000Z');
    expect(formatDue(due)).toBe('Fri 25 Sep, 3pm EST');
  });
});

describe('emails', () => {
  const intake: Intake = {
    appUrl: 'https://my-app.lovable.app/',
    repoUrl: null,
    tool: 'Lovable',
    symptoms: [1],
    notes: '<script>alert(1)</script>',
    email: 'founder@example.com',
  };
  const due = new Date('2026-09-25T19:00:00Z');

  it('lead email carries the host, the deadline and the ticked sentence, with notes escaped', () => {
    const { subject, html } = renderLeadEmail(intake, due);
    expect(subject).toContain('my-app.lovable.app');
    expect(subject).toContain('Fri 25 Sep, 3pm EST');
    expect(html).toContain(SYMPTOMS[1].line);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('lead email names the visibility symptom by its area', () => {
    const visibility = SYMPTOMS.findIndex((sym) => sym.area === 'Visibility');
    const { html } = renderLeadEmail({ ...intake, symptoms: [visibility] }, due);
    expect(html).toContain('(Visibility)');
    expect(html).toContain('can&#39;t see it');
  });

  it('confirmation quotes the same deadline and asks for the repo when none was shared', () => {
    const { subject, html } = renderConfirmEmail(intake, due);
    expect(subject).toContain('Fri 25 Sep, 3pm EST');
    expect(html).toContain('reply with the repo link');
  });
});
