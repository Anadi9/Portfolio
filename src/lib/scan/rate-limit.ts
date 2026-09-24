/**
 * A best-effort, in-memory, per-IP limiter for `api/scan.ts`.
 *
 * It lives in one function instance, so a cold start or a second instance
 * resets it. That is the intent: it stops one visitor hammering the button or a
 * script looping on the endpoint, not a distributed attacker, and it costs no
 * storage. Nothing about the scan is kept, including who ran it.
 */

export type Limiter = { allow: (key: string) => boolean };

export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now): Limiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      // Keep the map from growing without bound on a long-lived instance.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (!v.some((at) => t - at < windowMs)) hits.delete(k);
      }
      return true;
    },
  };
}

/** The caller's IP as Vercel reports it, or a shared bucket if it doesn't. */
export function clientIp(headers: Record<string, string | string[] | undefined>): string {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const forwarded = pick(headers['x-forwarded-for']);
  const first = forwarded?.split(',')[0]?.trim();
  return first || pick(headers['x-real-ip'])?.trim() || 'unknown';
}
