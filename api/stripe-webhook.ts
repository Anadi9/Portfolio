import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { renderKitEmail } from '../src/lib/kit/email.js';
import { downloadUrl } from '../src/lib/kit/product.js';
import { isPaidKitSession, verifyStripeSignature, type KitSession } from '../src/lib/kit/stripe.js';

/**
 * POST /api/stripe-webhook
 *
 * Emails the buyer their download link once Stripe reports the payment. The
 * thank-you page already shows the link; this is the copy for the buyer who
 * closed the tab, and the only copy for one whose card settled late
 * (`async_payment_succeeded`).
 *
 * The body parser is off because the signature is over the raw bytes. Stripe
 * retries anything that isn't a 2xx, so a failed send returns 500 to get another
 * attempt, and the Resend idempotency key (the session id) makes sure a retry
 * after a send that did land doesn't email the buyer twice. Anadi gets a copy of
 * each sale; that one is best effort.
 */

export const config = { api: { bodyParser: false } };

const FROM = 'Anadi Thakur <rescue@anadithakur.in>';
const INBOX_FALLBACK = 'anadithakur99@gmail.com';
const DELIVER_ON = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  if (!secret || !resendKey) {
    console.error('[kit] webhook not configured', { secret: !!secret, resend: !!resendKey });
    return res.status(500).json({ error: 'not configured' });
  }

  const raw = await readRaw(req);
  const sig = req.headers['stripe-signature'];
  if (!verifyStripeSignature(raw, Array.isArray(sig) ? sig[0] : sig, secret)) {
    return res.status(400).json({ error: 'bad signature' });
  }

  const event = JSON.parse(raw) as { type: string; data: { object: KitSession } };
  const session = event.data.object;
  // Anything else Stripe sends here is acknowledged and ignored.
  if (!DELIVER_ON.has(event.type) || !isPaidKitSession(session)) return res.status(200).json({ ok: true });

  const to = session.customer_details?.email;
  if (!to || !session.success_url) {
    console.error('[kit] paid session without email or success_url', session.id);
    return res.status(200).json({ ok: true });
  }

  const link = downloadUrl(new URL(session.success_url).origin, session.id);
  const email = renderKitEmail(link);
  const resend = new Resend(resendKey);

  try {
    const sent = await resend.emails.send(
      { from: FROM, to, replyTo: process.env.RESCUE_INBOX || INBOX_FALLBACK, ...email },
      { idempotencyKey: `kit-delivery/${session.id}` },
    );
    if (sent.error) throw sent.error;
  } catch (err) {
    console.error('[kit] delivery send failed', session.id, err);
    return res.status(500).json({ error: 'send failed' });
  }

  try {
    await resend.emails.send(
      {
        from: FROM,
        to: process.env.RESCUE_INBOX || INBOX_FALLBACK,
        subject: `Kit sale: ${to}`,
        text: `${to} bought the Production Kit.\nSession: ${session.id}\nDownload: ${link}`,
      },
      { idempotencyKey: `kit-sale/${session.id}` },
    );
  } catch (err) {
    console.warn('[kit] sale notice failed', err);
  }

  return res.status(200).json({ ok: true });
}

async function readRaw(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}
