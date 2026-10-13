import { describe, expect, it } from 'vitest';
import { checkUrl, isPrivateAddress } from './url';

describe('checkUrl', () => {
  it('accepts a bare domain and adds https', () => {
    expect(checkUrl('leafandco.in')).toMatchObject({ ok: true, url: 'https://leafandco.in/', origin: 'https://leafandco.in' });
  });

  it.each([
    'localhost',
    'http://localhost:3000',
    'http://127.0.0.1',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/',
    'printer.local',
    'https://user:pass@site.com',
    'https://site.com:8443',
    'ftp://site.com',
    'javascript:alert(1)',
    'intranet',
  ])('refuses %s', (raw) => {
    expect(checkUrl(raw).ok).toBe(false);
  });
});

describe('isPrivateAddress', () => {
  it.each(['10.0.0.1', '172.16.5.4', '192.168.1.1', '127.0.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    'treats %s as private',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(['8.8.8.8', '76.76.21.21', '2606:4700::1111', '172.32.0.1'])('treats %s as public', (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
