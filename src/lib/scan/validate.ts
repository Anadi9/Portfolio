/**
 * Input validation for the `/scan` Supabase security check.
 *
 * Both functions run twice: in the browser, so a pasted `service_role` key is
 * refused before it ever leaves the visitor's machine, and in `api/scan.ts`,
 * which is the check that actually counts. Pure and dependency-free so Node's
 * ESM resolver can load it from the function.
 *
 * The URL check is the function's SSRF guard. The server fetches whatever
 * origin this returns, so it accepts exactly one shape, `https://<ref>.supabase.co`,
 * with no port, no credentials and a single label in front of `supabase.co`.
 * Only the origin is ever returned: a pasted path or query string is dropped.
 */

export type UrlResult = { ok: true; origin: string; ref: string } | { ok: false; error: string };

export type KeyKind = 'jwt' | 'publishable';

export type KeyResult =
  | { ok: true; kind: KeyKind; role: string; ref: string | null }
  | { ok: false; error: string; code: 'empty' | 'malformed' | 'service_role' | 'secret' | 'not_anon' };

/** A Supabase project ref: lowercase letters and digits, one DNS label. */
const REF = /^[a-z0-9]{1,63}$/;

export function validateProjectUrl(raw: unknown): UrlResult {
  if (typeof raw !== 'string') return { ok: false, error: 'Paste your Supabase project URL.' };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Paste your Supabase project URL.' };
  if (trimmed.length > 300) return { ok: false, error: 'That URL is too long to be a Supabase project URL.' };

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: 'That doesn’t look like a URL. It should look like https://abcd1234.supabase.co' };
  }

  if (url.protocol !== 'https:') return { ok: false, error: 'Use the https:// address of your project.' };
  if (url.username || url.password) return { ok: false, error: 'Remove the username or password from the URL.' };
  if (url.port) return { ok: false, error: 'Supabase project URLs don’t have a port. Paste the plain https:// address.' };

  const host = url.hostname.toLowerCase();
  const suffix = '.supabase.co';
  const ref = host.endsWith(suffix) ? host.slice(0, -suffix.length) : '';
  if (!ref || !REF.test(ref)) {
    return {
      ok: false,
      error:
        'This only checks Supabase-hosted projects, whose URL looks like https://abcd1234.supabase.co. You’ll find it in Project Settings → API.',
    };
  }

  return { ok: true, origin: `https://${host}`, ref };
}

/** base64url → string, in the browser and in Node (both have `atob`). */
function b64urlDecode(part: string): string | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(part)) return null;
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export const SERVICE_ROLE_ERROR =
  'That’s your service_role key. It bypasses every security rule on your database, so don’t paste it here or anywhere else, and if it’s in your frontend code, treat it as leaked: rotate it in Supabase now. This check only needs the anon (public) key.';

export const SECRET_KEY_ERROR =
  'That’s a Supabase secret key (sb_secret_…). It bypasses every security rule, so don’t paste it here or anywhere else, and if it’s in your frontend code, rotate it now. This check only needs the publishable or anon key.';

/**
 * Reads the key's role without verifying it. Verification is Supabase's job
 * and happens on every request the scan makes; this only decides whether the
 * scan should run at all.
 *
 * Accepts the legacy anon JWT and the newer `sb_publishable_…` key. Refuses
 * `service_role` JWTs and `sb_secret_…` keys outright.
 */
export function decodeKey(raw: unknown): KeyResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, code: 'empty', error: 'Paste your anon (public) key.' };
  }
  const key = raw.trim();

  if (key.startsWith('sb_secret_')) return { ok: false, code: 'secret', error: SECRET_KEY_ERROR };
  if (key.startsWith('sb_publishable_')) {
    if (!/^sb_publishable_[A-Za-z0-9_-]{8,200}$/.test(key)) {
      return { ok: false, code: 'malformed', error: 'That publishable key looks cut off. Copy it again from Project Settings → API.' };
    }
    return { ok: true, kind: 'publishable', role: 'anon', ref: null };
  }

  const malformed = {
    ok: false as const,
    code: 'malformed' as const,
    error: 'That doesn’t look like a Supabase anon key. It’s a long string starting with eyJ, in Project Settings → API.',
  };
  if (key.length > 4096) return malformed;
  const parts = key.split('.');
  if (parts.length !== 3 || parts.some((p) => !p)) return malformed;
  const json = b64urlDecode(parts[1]);
  if (json === null) return malformed;

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return malformed;
  }
  if (!payload || typeof payload !== 'object') return malformed;

  const { role, ref } = payload as { role?: unknown; ref?: unknown };
  if (role === 'service_role') return { ok: false, code: 'service_role', error: SERVICE_ROLE_ERROR };
  if (role !== 'anon') {
    return {
      ok: false,
      code: 'not_anon',
      error: 'That key isn’t an anon key. Use the anon (public) key from Project Settings → API, the one your frontend already uses.',
    };
  }
  return { ok: true, kind: 'jwt', role, ref: typeof ref === 'string' ? ref : null };
}

export type ScanInput = { origin: string; ref: string; key: string; kind: KeyKind };

export type InputResult = { ok: true; input: ScanInput } | { ok: false; field: 'url' | 'key'; error: string; code?: string };

/** Both checks, plus the one that needs both: the key must belong to this project. */
export function parseScanInput(body: unknown): InputResult {
  const b = (body && typeof body === 'object' ? body : {}) as { url?: unknown; key?: unknown };
  const url = validateProjectUrl(b.url);
  if (url.ok === false) return { ok: false, field: 'url', error: url.error };
  const key = decodeKey(b.key);
  if (key.ok === false) return { ok: false, field: 'key', error: key.error, code: key.code };
  if (key.ref && key.ref !== url.ref) {
    return {
      ok: false,
      field: 'key',
      code: 'wrong_project',
      error: `That key belongs to a different project (${key.ref}), not ${url.ref}. Copy both from the same project’s API settings.`,
    };
  }
  return { ok: true, input: { origin: url.origin, ref: url.ref, key: (b.key as string).trim(), kind: key.kind } };
}
