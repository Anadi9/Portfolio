import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/production-kit-checkout: retired.
 *
 * The single-product checkout. The product page now sells packs through
 * `/api/kit/checkout`; this answers 410 so an old tab's Buy button gets a clear
 * error instead of a charge at a price that no longer exists. Earlier buyers'
 * download links are `/api/production-kit-download`, which is unchanged.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(410).json({ error: 'This checkout has moved. Reload the page to pick your packs.' });
}
