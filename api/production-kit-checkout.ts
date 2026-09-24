import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createKitCheckout } from '../src/lib/kit/stripe.js';

/**
 * POST /api/production-kit-checkout
 *
 * The Buy button. Creates a Stripe Checkout Session for the kit and returns its
 * URL for the page to send the visitor to. The return URLs are built from the
 * host the request came in on, so a preview deployment's checkout comes back to
 * that preview rather than to production.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[kit] STRIPE_SECRET_KEY not set: checkout unavailable');
    return res.status(501).json({ error: 'checkout not configured' });
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const origin = `${proto}://${host}`;

  try {
    const { url } = await createKitCheckout(key, origin);
    return res.status(200).json({ url });
  } catch (err) {
    console.error('[kit] checkout failed', err);
    return res.status(502).json({ error: 'checkout failed' });
  }
}
