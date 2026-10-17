import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Anadi's `/admin` session: a signed expiry, nothing else. The cookie holds
 * `base64url({exp}).base64url(hmac)`; there is one user, so there is no id.
 */

export const SESSION_SECONDS = 12 * 60 * 60;
export const COOKIE = 'admin_session';

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export const PENDING_COOKIE = 'admin_pending';
export const PENDING_SECONDS = 5 * 60;

type Claims = { exp: number; kind: 'session' | 'pending'; [k: string]: unknown };

/** A signed, expiring token. `kind` keeps a pending (passkey challenge) token from ever passing as a session. */
export function signToken(claims: Omit<Claims, 'exp'>, secret: string, ttlSeconds: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(now / 1000) + ttlSeconds })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function signSession(secret: string, now = Date.now()): string {
  return signToken({ kind: 'session' }, secret, SESSION_SECONDS, now);
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The token's claims when it is genuine, unexpired and of this kind; otherwise null. */
export function verifyToken(token: string | undefined, secret: string, kind: Claims['kind'], now = Date.now()): Claims | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, mac] = parts;
  if (!same(mac, sign(payload, secret))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<Claims>;
    return typeof claims.exp === 'number' && claims.exp * 1000 > now && claims.kind === kind ? (claims as Claims) : null;
  } catch {
    return null;
  }
}

export function verifySession(token: string | undefined, secret: string, now = Date.now()): boolean {
  return verifyToken(token, secret, 'session', now) !== null;
}

/** SHA-256 both sides first, so the comparison is constant-time whatever the lengths. */
export function checkPassword(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/** The cookie value from a `Cookie` header. */
export function readCookie(header: string | string[] | undefined, name = COOKIE): string | undefined {
  const raw = Array.isArray(header) ? header.join('; ') : header ?? '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}
