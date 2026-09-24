import { describe, expect, it } from 'vitest';
import { decodeKey, parseScanInput, validateProjectUrl } from './validate';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload: unknown) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJl`;

describe('validateProjectUrl', () => {
  it.each([
    ['https://abcdefghijklmnopqrst.supabase.co', 'abcdefghijklmnopqrst'],
    ['https://abcdefghijklmnopqrst.supabase.co/', 'abcdefghijklmnopqrst'],
    ['  https://ABCDEFGHIJKLMNOPQRST.supabase.co/rest/v1/?x=1  ', 'abcdefghijklmnopqrst'],
    ['abcdefghijklmnopqrst.supabase.co', 'abcdefghijklmnopqrst'],
  ])('accepts %s and keeps only the origin', (raw, ref) => {
    expect(validateProjectUrl(raw)).toEqual({ ok: true, origin: `https://${ref}.supabase.co`, ref });
  });

  it.each([
    ['http', 'http://abcd.supabase.co'],
    ['lookalike suffix', 'https://abcd.supabase.co.evil.com'],
    ['lookalike label', 'https://abcd.evilsupabase.co'],
    ['bare apex', 'https://supabase.co'],
    ['dashboard', 'https://supabase.com/dashboard/project/abcd'],
    ['nested subdomain', 'https://x.abcd.supabase.co'],
    ['credentials', 'https://user:pw@abcd.supabase.co'],
    ['credential trick', 'https://abcd.supabase.co@evil.com'],
    ['port', 'https://abcd.supabase.co:8443'],
    ['trailing dot', 'https://abcd.supabase.co.'],
    ['other host', 'https://localhost'],
    ['ip', 'https://169.254.169.254'],
    ['javascript', 'javascript:alert(1)'],
    ['file', 'file:///etc/passwd'],
    ['empty', '   '],
    ['non-string', 42],
  ])('rejects %s', (_, raw) => {
    expect(validateProjectUrl(raw).ok).toBe(false);
  });
});

describe('decodeKey', () => {
  it('accepts an anon JWT and reads its ref', () => {
    expect(decodeKey(jwt({ iss: 'supabase', ref: 'abcd', role: 'anon' }))).toEqual({ ok: true, kind: 'jwt', role: 'anon', ref: 'abcd' });
  });

  it('refuses service_role and says never to paste it', () => {
    const r = decodeKey(jwt({ ref: 'abcd', role: 'service_role' }));
    expect(r).toMatchObject({ ok: false, code: 'service_role' });
    expect(r.ok === false && r.error).toMatch(/don’t paste it/);
  });

  it('accepts a publishable key and refuses a secret one', () => {
    expect(decodeKey('sb_publishable_abcdefgh12345678')).toMatchObject({ ok: true, kind: 'publishable' });
    expect(decodeKey('sb_secret_abcdefgh12345678')).toMatchObject({ ok: false, code: 'secret' });
  });

  it('refuses a JWT whose role is not anon', () => {
    expect(decodeKey(jwt({ role: 'authenticated' }))).toMatchObject({ ok: false, code: 'not_anon' });
    expect(decodeKey(jwt({}))).toMatchObject({ ok: false, code: 'not_anon' });
  });

  it.each([
    ['empty', ''],
    ['one part', 'eyJhbGciOi'],
    ['two parts', 'a.b'],
    ['empty part', 'a..c'],
    ['bad base64', 'a.!!!.c'],
    ['not JSON', `a.${Buffer.from('nope').toString('base64url')}.c`],
    ['JSON scalar', `a.${Buffer.from('7').toString('base64url')}.c`],
  ])('rejects malformed: %s', (_, raw) => {
    expect(decodeKey(raw).ok).toBe(false);
  });
});

describe('parseScanInput', () => {
  const url = 'https://abcd.supabase.co';

  it('returns the normalised input', () => {
    const key = jwt({ ref: 'abcd', role: 'anon' });
    expect(parseScanInput({ url, key: ` ${key} ` })).toEqual({
      ok: true,
      input: { origin: url, ref: 'abcd', key, kind: 'jwt' },
    });
  });

  it('refuses a key from another project', () => {
    expect(parseScanInput({ url, key: jwt({ ref: 'other', role: 'anon' }) })).toMatchObject({ ok: false, field: 'key', code: 'wrong_project' });
  });

  it('reports the url before the key', () => {
    expect(parseScanInput({ url: 'https://evil.com', key: '' })).toMatchObject({ ok: false, field: 'url' });
    expect(parseScanInput(null)).toMatchObject({ ok: false, field: 'url' });
  });
});
