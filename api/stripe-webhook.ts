import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { processEvent, type KitEvent } from '../src/lib/kit/fulfil.js';
import { kitStore } from '../src/lib/kit/store.js';
import { fetchCatalog, listLineItems, verifyStripeSignature, type Catalog } from '../src/lib/kit/stripe.js';

/**
 * POST /api/stripe-webhook
 *
 * Records what a buyer paid for and emails them their downloads link; marks an
 * order refunded when Stripe refunds it in full. The logic is `processEvent`
 * in src/lib/kit/fulfil.ts; this file checks the signature and wires in
 * Stripe, Supabase and Resend.
 *
 * The body parser is off because the signature is over the raw bytes. Stripe
 * retries anything that isn't a 2xx, for up to three days, so every failure
 * returns 500: a missing env var or a database outage delays a delivery rather
 * than losing it. Events: checkout.session.completed,
 * checkout.session.async_payment_succeeded, charge.refunded.
 */

export const config = { api: { bodyParser: false } };

const FROM = 'Anadi Thakur <rescue@anadithakur.in>';
const INBOX_FALLBACK = 'anadithakur99@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[kit] STRIPE_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'not configured' });
  }

  const raw = await readRaw(req);
  const sig = req.headers['stripe-signature'];
  if (!verifyStripeSignature(raw, Array.isArray(sig) ? sig[0] : sig, secret)) {
    return res.status(400).json({ error: 'bad signature' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const tokenSecret = process.env.KIT_TOKEN_SECRET;
  const store = kitStore();
  if (!stripeKey || !resendKey || !tokenSecret || !store) {
    console.error('[kit] webhook not configured', { stripe: !!stripeKey, resend: !!resendKey, token: !!tokenSecret, db: !!store });
    return res.status(500).json({ error: 'not configured' });
  }

  const event = JSON.parse(raw) as KitEvent;
  const resend = new Resend(resendKey);
  const inbox = process.env.RESCUE_INBOX || INBOX_FALLBACK;
  let catalog: Promise<Catalog> | undefined;

  try {
    const outcome = await processEvent(event, {
      store,
      tokenSecret,
      lineItems: (id) => listLineItems(stripeKey, id),
      fullPrice: async (currency) => (await (catalog ??= fetchCatalog(stripeKey))).prices[currency].full,
      async send(mail, idempotencyKey) {
        const sent = await resend.emails.send({ from: FROM, replyTo: inbox, ...mail }, { idempotencyKey });
        if (sent.error) throw new Error(`resend: ${sent.error.message}`);
      },
      async notify(subject, text, idempotencyKey) {
        try {
          await resend.emails.send({ from: FROM, to: inbox, subject, text }, { idempotencyKey });
        } catch (err) {
          console.warn('[kit] notice failed', err);
        }
      },
    });
    return res.status(200).json({ received: true, duplicate: outcome === 'duplicate' });
  } catch (err) {
    console.error('[kit] webhook handling failed', event.type, event.id, err);
    return res.status(500).json({ error: 'handler error' });
  }
}

async function readRaw(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString('utf8');
}
