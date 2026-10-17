import { describe, expect, it } from 'vitest';
import { briefPrompt, fallbackBrief, writeBrief, type BriefInput } from './brief';
import { failing, replying } from '../bit/mock-models';
import type { Attempt } from '../bit/ai';

const scanOk = {
  ok: true as const,
  url: 'https://a.example/',
  readiness: { score: 41, topFixes: [{ id: 'render', label: 'Content is not in the HTML', fix: 'Prerender' }] },
  headers: { present: [], missing: ['Content-Security-Policy'] },
  ms: 900,
};

const input: BriefInput = {
  kind: 'first_bug',
  stack: 'Lovable + Supabase',
  appUrl: 'https://a.example',
  answers: { live: 'Live with users', impact: 'Mail me at jo@x.com or +91 98765 43210' },
  budget: null,
  scan: scanOk,
};

const good = {
  summary: 'Booking app on Lovable with live users.',
  stack: 'Lovable, Supabase',
  situation: 'Live, users complaining.',
  topRisk: 'Pages render empty for crawlers.',
  risks: ['No CSP'],
  redFlags: [],
  approach: 'Prerender, add headers.',
  likelyPackage: 'Launch-ready sprint',
  missingInfo: ['Repo access'],
  questions: ['Can you share the repo?'],
};

const on = { BIT_AI: 'on', AI_GATEWAY_API_KEY: 'test' };
const att = (...models: ReturnType<typeof replying>[]): Attempt[] => models.map((m, i) => ({ label: `m${i}`, model: m }));

describe('briefPrompt', () => {
  it('carries the app, the answers and the scan, never contact details', () => {
    const p = briefPrompt(input);
    expect(p).toContain('https://a.example');
    expect(p).toContain('Live with users');
    expect(p).toContain('Content is not in the HTML');
    expect(p).not.toContain('jo@x.com');
    expect(p).not.toContain('98765');
  });
});

describe('fallbackBrief', () => {
  it('uses the top scan fix as the top risk', () => {
    expect(fallbackBrief(input)).toMatchObject({ source: 'fallback', topRisk: 'Content is not in the HTML' });
  });
  it('says why there is no scan', () => {
    const b = fallbackBrief({ ...input, scan: { ok: false, url: null, error: 'no app link', ms: 0 } });
    expect(b.topRisk).toBe('Not scanned: no app link');
  });
});

describe('writeBrief', () => {
  it('falls back when AI is off', async () => {
    expect((await writeBrief(input, att(replying(good)), {})).source).toBe('fallback');
  });

  it('returns the model brief', async () => {
    const b = await writeBrief(input, att(replying(good)), on);
    expect(b).toMatchObject({ source: 'ai', model: 'm0', topRisk: good.topRisk, likelyPackage: 'Launch-ready sprint' });
  });

  it('uses the fallback model when the first fails', async () => {
    expect((await writeBrief(input, att(failing(), replying(good)), on)).model).toBe('m1');
  });

  it('drops any field or item that names an amount', async () => {
    const b = await writeBrief(
      input,
      att(replying({ ...good, approach: 'Charge $500 for this', risks: ['No CSP', 'Costs ₹2000 a month'], likelyPackage: 'Something made up' })),
      on,
    );
    expect(b.approach).toBe('');
    expect(b.risks).toEqual(['No CSP']);
    expect(b.likelyPackage).toBe('unknown');
  });

  it('falls back when both models fail', async () => {
    expect((await writeBrief(input, att(failing(), failing()), on)).source).toBe('fallback');
  });
});
