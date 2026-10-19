import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const site = config.headers.find((h) => h.source === '/(.*)');
const get = (key: string) => site?.headers.find((h) => h.key === key)?.value;

describe('site-wide security headers', () => {
  it('has a site-wide entry', () => {
    expect(site).toBeDefined();
  });

  it.each([
    ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    [
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    ],
    ['X-Frame-Options', 'DENY'],
  ])('%s', (key, value) => {
    expect(get(key)).toBe(value);
  });

  it('CSP is report-only and covers the third parties', () => {
    expect(get('Content-Security-Policy')).toBeUndefined();
    const csp = get('Content-Security-Policy-Report-Only') ?? '';
    for (const part of [
      "frame-ancestors 'none'",
      "default-src 'self'",
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://static.cloudflareinsights.com',
      'https://cloudflareinsights.com',
      'https://*.supabase.co',
    ]) {
      expect(csp).toContain(part);
    }
    expect(csp).not.toMatch(/report-(uri|to)/);
  });
});
