import type { VercelRequest, VercelResponse } from '@vercel/node';
import { visitorCountry } from '../src/lib/kit/geo.js';
import { currencyFor } from '../src/lib/kit/product.js';

/**
 * GET /api/kit-price
 *
 * Which currency this visitor sees. The pages are prerendered in dollars; this
 * lets them swap in rupees for visitors from India. The amounts come from
 * `/api/kit/prices` (Stripe). The checkout makes the same currency decision on
 * its own, from the same header, so what this returns is display only. Per
 * visitor, so never cached by the CDN.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ currency: currencyFor(visitorCountry(req.headers)) });
}
