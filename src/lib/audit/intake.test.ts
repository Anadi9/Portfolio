import { describe, expect, it } from 'vitest';
import {
  normalizePhone,
  parseAuditIntake,
  parseTypeParam,
  renderAuditConfirmEmail,
  renderAuditLeadEmail,
} from './intake';

const valid = {
  type: 'ai',
  name: 'Priya Shah',
  business: 'Leaf & Co',
  url: 'leafandco.in',
  sells: 'organic skincare',
  market: 'India',
  email: 'priya@leafandco.in',
  whatsapp: '',
  worries: '',
};

describe('parseTypeParam', () => {
  it('accepts the five audit types and nothing else', () => {
    expect(parseTypeParam('ai')).toBe('ai');
    expect(parseTypeParam('dpdp')).toBe('dpdp');
    expect(parseTypeParam('app')).toBe('app');
    expect(parseTypeParam('AI')).toBeNull();
    expect(parseTypeParam(null)).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('keeps the country code and strips formatting', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('(415) 555-0134')).toBe('4155550134');
  });
  it('rejects letters and implausible lengths', () => {
    expect(normalizePhone('call me')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });
});

describe('parseAuditIntake', () => {
  it('accepts a complete request and normalises the URL', () => {
    const r = parseAuditIntake(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.intake.url).toBe('https://leafandco.in/');
      expect(r.intake.whatsapp).toBeNull();
    }
  });

  it('refuses app audits, which belong to the rescue intake', () => {
    expect(parseAuditIntake({ ...valid, type: 'app' })).toMatchObject({ ok: false, field: 'type' });
  });

  it('reports the topmost missing field first', () => {
    expect(parseAuditIntake({ ...valid, name: '', email: '' })).toMatchObject({ ok: false, field: 'name' });
    expect(parseAuditIntake({ ...valid, url: 'javascript:alert(1)' })).toMatchObject({ ok: false, field: 'url' });
    expect(parseAuditIntake({ ...valid, market: 'Mars' })).toMatchObject({ ok: false, field: 'market' });
    expect(parseAuditIntake({ ...valid, email: 'nope' })).toMatchObject({ ok: false, field: 'email' });
  });

  it('validates WhatsApp only when given', () => {
    expect(parseAuditIntake({ ...valid, whatsapp: 'abc' })).toMatchObject({ ok: false, field: 'whatsapp' });
    const r = parseAuditIntake({ ...valid, whatsapp: '+91 98765 43210' });
    expect(r.ok && r.intake.whatsapp).toBe('+919876543210');
  });

  it('caps the free-text fields', () => {
    expect(parseAuditIntake({ ...valid, sells: 'x'.repeat(161) })).toMatchObject({ ok: false, field: 'sells' });
    expect(parseAuditIntake({ ...valid, worries: 'x'.repeat(2001) })).toMatchObject({ ok: false, field: 'worries' });
  });
});

describe('emails', () => {
  const r = parseAuditIntake({ ...valid, type: 'dpdp', business: '<b>Leaf</b>', whatsapp: '+91 98765 43210' });
  if (!r.ok) throw new Error('fixture invalid');
  const due = new Date('2026-10-15T12:00:00Z');

  it('escapes visitor input in the lead and links WhatsApp', () => {
    const { subject, html } = renderAuditLeadEmail(r.intake, due);
    expect(subject).toContain('DPDP Readiness');
    expect(html).toContain('&lt;b&gt;Leaf&lt;/b&gt;');
    expect(html).not.toContain('<b>Leaf</b>');
    expect(html).toContain('https://wa.me/919876543210');
  });

  it('greets by first name and lists what this type of report covers', () => {
    const { subject, html } = renderAuditConfirmEmail(r.intake, due);
    expect(subject).toMatch(/^Got it, Priya:/);
    expect(html).toContain('May 2027');
    expect(html).toContain('used only to send this report');
  });
});
