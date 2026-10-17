import { describe, expect, it } from 'vitest';
import { checkPassword, signSession, signToken, verifySession, verifyToken, SESSION_SECONDS } from './session';

const secret = 'x'.repeat(32);
const t0 = Date.UTC(2026, 9, 18, 12);

describe('admin session', () => {
  it('verifies its own token until it expires', () => {
    const tok = signSession(secret, t0);
    expect(verifySession(tok, secret, t0 + 1000)).toBe(true);
    expect(verifySession(tok, secret, t0 + SESSION_SECONDS * 1000 - 1)).toBe(true);
    expect(verifySession(tok, secret, t0 + SESSION_SECONDS * 1000 + 1)).toBe(false);
  });

  it('rejects a token signed with another secret, tampered or malformed', () => {
    const tok = signSession(secret, t0);
    expect(verifySession(tok, 'y'.repeat(32), t0)).toBe(false);
    const [p, s] = tok.split('.');
    const forged = Buffer.from(JSON.stringify({ exp: 9_999_999_999 })).toString('base64url');
    expect(verifySession(`${forged}.${s}`, secret, t0)).toBe(false);
    expect(verifySession(`${p}.${s}x`, secret, t0)).toBe(false);
    expect(verifySession(undefined, secret, t0)).toBe(false);
    expect(verifySession('', secret, t0)).toBe(false);
    expect(verifySession('a.b.c', secret, t0)).toBe(false);
  });

  it('compares passwords in constant time', () => {
    expect(checkPassword('correct horse', 'correct horse')).toBe(true);
    expect(checkPassword('correct hors', 'correct horse')).toBe(false);
    expect(checkPassword('', 'correct horse')).toBe(false);
    expect(checkPassword('anything', '')).toBe(false);
  });
});

describe('pending tokens', () => {
  it('never pass as a session, and carry their claims', () => {
    const pending = signToken({ kind: 'pending', challenge: 'abc', purpose: 'login' }, secret, 300, t0);
    expect(verifySession(pending, secret, t0)).toBe(false);
    expect(verifyToken(pending, secret, 'pending', t0)).toMatchObject({ challenge: 'abc', purpose: 'login' });
    expect(verifyToken(pending, secret, 'pending', t0 + 301_000)).toBeNull();
    expect(verifyToken(signSession(secret, t0), secret, 'pending', t0)).toBeNull();
  });
});
