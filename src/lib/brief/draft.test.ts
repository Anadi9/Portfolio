import { describe, expect, it } from 'vitest';
import { draftFirstReply, hasPlaceholder, VIDEO_PLACEHOLDER, PRICE_PLACEHOLDER } from './draft';
import type { Brief } from './brief';

const brief: Brief = {
  summary: 's',
  stack: 'Lovable',
  situation: 'live',
  topRisk: 'Pages render empty for crawlers.',
  risks: [],
  redFlags: [],
  approach: 'a',
  likelyPackage: 'unknown',
  missingInfo: [],
  questions: ['Can you share the repo?', 'Who are the users?', 'When do you launch?', 'A fourth?'],
  source: 'ai',
};

describe('draftFirstReply', () => {
  it('drafts the first-bug reply', () => {
    const d = draftFirstReply({ number: 'A-1001', kind: 'first_bug', name: 'Adi', appUrl: 'antasignal.vercel.app', brief });
    expect(d.subject).toBe('Your first bug: antasignal.vercel.app (A-1001)');
    expect(d.body.startsWith('Hi Adi,')).toBe(true);
    expect(d.body).toContain(brief.topRisk);
    expect(d.body).toContain(VIDEO_PLACEHOLDER);
    expect(d.body).toContain(PRICE_PLACEHOLDER);
    expect(d.body).toContain('$349');
    expect(d.body).toContain('credited');
    expect(d.body.trimEnd().endsWith('Anadi')).toBe(true);
    expect(d.body.length).toBeLessThanOrEqual(1500);
  });

  it('greets without a name', () => {
    expect(draftFirstReply({ number: 'A-1', kind: 'first_bug', name: null, appUrl: null, brief }).body.startsWith('Hi,')).toBe(true);
  });

  it('asks questions for other kinds', () => {
    const d = draftFirstReply({ number: 'A-2', kind: 'build', name: 'Jo', appUrl: null, brief });
    expect(d.body).not.toContain(VIDEO_PLACEHOLDER);
    expect(d.body).toContain('Can you share the repo?');
    expect(d.body).toContain('When do you launch?');
    expect(d.body).not.toContain('A fourth?');
    expect(d.subject).toContain('A-2');
  });

  it('spots unfilled placeholders', () => {
    expect(hasPlaceholder(`x ${VIDEO_PLACEHOLDER}`)).toBe(true);
    expect(hasPlaceholder(`x ${PRICE_PLACEHOLDER}`)).toBe(true);
    expect(hasPlaceholder('All filled in. See [1].')).toBe(false);
  });
});
