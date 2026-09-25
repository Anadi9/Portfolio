import type { IncomingHttpHeaders } from 'node:http';

/**
 * The visitor's country, from the header Vercel's edge adds to every request.
 * The browser never gets a say: it is what decides which currency the checkout
 * charges, so a client-supplied value would be a discount switch.
 *
 * Off Vercel (`npm run dev`) there is no such header, and `KIT_DEV_COUNTRY`
 * stands in for it so both prices can be tried locally. In production the
 * header is always present, so the fallback never applies there.
 */
export function visitorCountry(headers: IncomingHttpHeaders): string | undefined {
  const h = headers['x-vercel-ip-country'];
  return (Array.isArray(h) ? h[0] : h) || process.env.KIT_DEV_COUNTRY || undefined;
}
