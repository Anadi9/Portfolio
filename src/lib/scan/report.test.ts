import { describe, expect, it } from 'vitest';
import { bucketsFromResponse, buildReport, classifyTable, parseContentRange, tablesFromSpec } from './report';
import { createRateLimiter, clientIp } from './rate-limit';

describe('parseContentRange', () => {
  it.each([
    ['0-0/57', 57],
    ['*/0', 0],
    ['0-0/1', 1],
    ['0-0/*', null],
    ['', null],
    [null, null],
    ['bytes 0-0/5', null],
  ])('%s → %s', (h, n) => {
    expect(parseContentRange(h)).toBe(n);
  });
});

describe('classifyTable', () => {
  it('rows visible → exposed with the count', () => {
    expect(classifyTable('profiles', 200, '0-0/1234')).toEqual({ table: 'profiles', status: 'exposed', rows: 1234 });
    expect(classifyTable('profiles', 206, '0-0/3')).toMatchObject({ status: 'exposed', rows: 3 });
  });

  it('nothing visible → empty', () => {
    expect(classifyTable('orders', 200, '*/0')).toEqual({ table: 'orders', status: 'empty', rows: 0 });
  });

  it('falls back to the range when the total is missing', () => {
    expect(classifyTable('t', 200, '0-0/*')).toMatchObject({ status: 'exposed', rows: null });
    expect(classifyTable('t', 200, null)).toMatchObject({ status: 'empty' });
  });

  it('401 and 403 → protected; anything else → unknown', () => {
    expect(classifyTable('t', 401, null).status).toBe('protected');
    expect(classifyTable('t', 403, null).status).toBe('protected');
    expect(classifyTable('t', 500, null).status).toBe('unknown');
    expect(classifyTable('t', 404, null).status).toBe('unknown');
  });
});

describe('tablesFromSpec', () => {
  it('lists relations, skips the root and rpc, dedupes and sorts', () => {
    const spec = { paths: { '/': {}, '/profiles': {}, '/rpc/do_thing': {}, '/orders': {}, '/profiles/': {} } };
    expect(tablesFromSpec(spec)).toEqual(['orders', 'profiles']);
  });

  it('tolerates junk', () => {
    expect(tablesFromSpec(null)).toEqual([]);
    expect(tablesFromSpec({ paths: 'x' })).toEqual([]);
  });
});

describe('bucketsFromResponse', () => {
  it('keeps name and public flag only', () => {
    expect(bucketsFromResponse([{ id: 'a', name: 'avatars', public: true, owner: 'x' }, { name: 'docs', public: false }, null, {}])).toEqual([
      { name: 'avatars', public: true },
      { name: 'docs', public: false },
    ]);
    expect(bucketsFromResponse({ error: 'x' })).toEqual([]);
  });
});

describe('buildReport', () => {
  const now = new Date('2026-09-24T10:00:00Z');

  it('ranks critical first, largest exposure first, and counts by severity', () => {
    const r = buildReport({
      project: 'abcd',
      now,
      found: 5,
      schemaVisible: true,
      probes: [
        { table: 'notes', status: 'exposed', rows: 3 },
        { table: 'profiles', status: 'exposed', rows: 900 },
        { table: 'orders', status: 'empty', rows: 0 },
        { table: 'secrets', status: 'protected', rows: null },
      ],
      buckets: [
        { name: 'avatars', public: true },
        { name: 'invoices', public: false },
      ],
    });
    expect(r.findings.map((f) => f.subject)).toEqual(['profiles', 'notes', 'avatars', 'invoices', 'orders', 'secrets']);
    expect(r.counts).toEqual({ critical: 2, warning: 1, ok: 3 });
    expect(r.tables).toEqual({ found: 5, checked: 4, truncated: true });
    expect(r.buckets).toBe(2);
    expect(r.checkedAt).toBe('2026-09-24T10:00:00.000Z');
    expect(r.findings[0].title).toBe('Anyone can read profiles (900 rows)');
    expect(r.findings[0].fix).toContain('Enable RLS on `profiles`');
    expect(r.findings[0].fix).toContain('auth.uid()');
  });

  it('says so when the schema is hidden', () => {
    const r = buildReport({ project: 'abcd', now, found: 0, schemaVisible: false, probes: [], buckets: null });
    expect(r.counts).toEqual({ critical: 0, warning: 0, ok: 1 });
    expect(r.findings[0].area).toBe('schema');
    expect(r.buckets).toBeNull();
  });
});

describe('rate limiter', () => {
  it('allows `limit` per window per key', () => {
    let t = 0;
    const l = createRateLimiter(2, 1000, () => t);
    expect([l.allow('a'), l.allow('a'), l.allow('a'), l.allow('b')]).toEqual([true, true, false, true]);
    t = 1001;
    expect(l.allow('a')).toBe(true);
  });

  it('reads the first forwarded IP', () => {
    expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })).toBe('1.2.3.4');
    expect(clientIp({ 'x-real-ip': '5.6.7.8' })).toBe('5.6.7.8');
    expect(clientIp({})).toBe('unknown');
  });
});
