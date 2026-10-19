import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, toCloudflareStatic } from './cf-static.mjs';

const vercel = JSON.parse(readFileSync(join(import.meta.dirname, '../../vercel.json'), 'utf8'));
const out = toCloudflareStatic(vercel);
const lines = out.redirects.split('\n');

describe('toCloudflareStatic: redirects', () => {
  it('keeps the plain permanent redirects', () => {
    expect(lines).toContain('/work-with-me / 301');
    expect(lines).toContain('/rescue/audit /audit?type=app 301');
    expect(lines).toContain('/rescue /production-ready 301');
  });

  it('turns the downloads rewrite into a 200 rewrite', () => {
    expect(lines).toContain('/kit/downloads/:token /kit/downloads/_ 200');
  });

  it('skips every host-conditioned rule (the Worker and a Redirect Rule handle those)', () => {
    expect(out.skipped).toHaveLength(vercel.redirects.filter((r: { has?: unknown }) => r.has).length);
    expect(out.redirects).not.toContain('portfolio.anadithakur.in');
  });

  it('puts the specific /rescue/audit before /rescue', () => {
    expect(lines.indexOf('/rescue/audit /audit?type=app 301')).toBeLessThan(lines.indexOf('/rescue /production-ready 301'));
  });
});

describe('toCloudflareStatic: headers', () => {
  const blocks = out.headers.split('\n\n');
  const block = (path: string) => blocks.find((b) => b.split('\n')[0] === path) ?? '';

  it('maps /(.*) to /* with all six security headers', () => {
    const all = block('/*');
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(all).toContain(`  ${k}: ${v}`);
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(6);
  });

  it('maps /kit/(.*) to /kit/*', () => {
    expect(block('/kit/*')).toContain('  X-Robots-Tag: noindex');
  });

  it('keeps the exact-path blocks', () => {
    expect(block('/admin')).toContain('  Cache-Control: no-store');
    expect(block('/portal')).toContain('  X-Robots-Tag: noindex, nofollow');
    expect(block('/admin-sw.js')).toContain('  Cache-Control: no-cache');
  });

  it('allows the Cloudflare analytics beacon in the CSP, and no Vercel script host', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy-Report-Only'];
    expect(csp).toContain('https://static.cloudflareinsights.com');
    expect(csp).toContain('https://cloudflareinsights.com');
    expect(csp).not.toContain('vercel-scripts');
  });
});

describe('toCloudflareStatic: limits', () => {
  it('throws on a pattern it cannot translate', () => {
    expect(() => toCloudflareStatic({ headers: [{ source: '/(a|b)', headers: [] }] })).toThrow(/translate/);
  });
});
