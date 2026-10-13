/**
 * The AI Readiness Checker's input check, run in the browser for a fast error
 * and in `api/ai-readiness.ts` as the check that counts.
 *
 * This is the first half of the function's SSRF guard: only a public-looking
 * http(s) URL on the default port, with a dotted hostname, no credentials and
 * no IP literal in a private, loopback or link-local range gets through. The
 * second half is in `check.ts`, which resolves the name and refuses private
 * addresses before every fetch, redirects included.
 *
 * Pure and dependency-free.
 */

export type UrlCheck = { ok: true; url: string; origin: string } | { ok: false; error: string };

/** IPv4 ranges a public fetch must never reach. */
export function isPrivateIPv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

/** IPv6 loopback, unspecified, unique-local, link-local, and v4-mapped private addresses. */
export function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::1' || v === '::') return true;
  if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v)) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
  return mapped ? isPrivateIPv4(mapped[1]) : false;
}

export const isPrivateAddress = (ip: string) => (ip.includes(':') ? isPrivateIPv6(ip) : isPrivateIPv4(ip));

export function checkUrl(raw: unknown): UrlCheck {
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'Paste your website address.' };
  const trimmed = raw.trim();
  if (trimmed.length > 500) return { ok: false, error: 'That address is too long.' };

  let url: URL;
  try {
    // A scheme is `x://` or one of the colon-only ones; `localhost:8080` is a host and port, not a scheme.
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^(javascript|data|file|mailto|blob|about):/i.test(trimmed);
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: 'That doesn’t look like a web address. Try something like yourbusiness.com' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, error: 'Use an http or https address.' };
  if (url.username || url.password) return { ok: false, error: 'Remove the username or password from the address.' };
  if (url.port && url.port !== '80' && url.port !== '443') return { ok: false, error: 'Use the public address of your site, without a port.' };

  const host = url.hostname.toLowerCase();
  if (host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return { ok: false, error: 'Use your site’s domain name, not an IP address.' };
  }
  if (!host.includes('.') || host.endsWith('.') || host.endsWith('.local') || host.endsWith('.internal') || host === 'localhost') {
    return { ok: false, error: 'Use your site’s public domain, like yourbusiness.com' };
  }

  url.hash = '';
  return { ok: true, url: url.toString(), origin: url.origin };
}
