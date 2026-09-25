import { join } from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildKitArchive } from '../src/lib/kit/archive.js';
import { KIT } from '../src/lib/kit/product.js';
import { getSession, isPaidKitSession, isSessionId } from '../src/lib/kit/stripe.js';

/**
 * GET /api/production-kit-download?session_id=cs_…
 *
 * The download link on the thank-you page and in the delivery email. The
 * Checkout Session id is the credential: it is unguessable, Stripe is asked on
 * every request whether it was paid, and only a paid session stamped as the kit
 * gets the zip. Anyone the buyer forwards the link to can download it too, which
 * for a $19 (₹1,599) folder of Markdown is the right trade against accounts and passwords.
 *
 * The kit folder reaches the function through `includeFiles` in `vercel.json`;
 * the path below is read at runtime, so file tracing can't see it on its own.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(501).send('Downloads are not configured yet.');

  const id = req.query.session_id;
  if (!isSessionId(id)) return res.status(400).send('That download link is incomplete. Use the link from your email.');

  let session;
  try {
    session = await getSession(key, id);
  } catch (err) {
    console.error('[kit] session lookup failed', err);
    return res.status(502).send('Couldn’t confirm the purchase just now. Try the link again in a minute.');
  }
  if (!session || !isPaidKitSession(session)) {
    return res.status(403).send('This link isn’t for a completed purchase of the kit.');
  }

  const zip = buildKitArchive(join(process.cwd(), 'products', KIT.archive));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${KIT.archive}.zip"`);
  res.setHeader('Content-Length', String(zip.byteLength));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  return res.status(200).send(Buffer.from(zip));
}
