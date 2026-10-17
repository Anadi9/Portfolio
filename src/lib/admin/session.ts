import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Anadi's `/admin` session: a signed expiry, nothing else. The cookie holds
 * `base64url({exp}).base64url(hmac)`; there is one user, so there is no id.
 */

export const SESSION_SECONDS = 12 * 60 * 60;
export const COOKIE = 'admin_session';

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function signSession(secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function verifySession(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, mac] = parts;
  if (!same(mac, sign(payload, secret))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof exp === 'number' && exp * 1000 > now;
  } catch {
    return false;
  }
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
