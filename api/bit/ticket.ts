import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { liveDeps, submitTicket } from '../../src/lib/notify/ticket.js';
import { withErrorLog } from '../../src/lib/monitoring/with-error-log.js';
import { clientIp, createRateLimiter } from '../../src/lib/scan/rate-limit.js';
import { ticketStore } from '../../src/lib/tickets/store.js';
import { NewTicketSchema } from '../../src/lib/tickets/types.js';
import { BUILD_STACKS } from '../../src/lib/bit/stacks.js';

/**
 * POST /api/bit/ticket
 *
 * Bit's chat form. Saves a ticket (client upserted by email), queues the
 * admin email, the visitor's receipt and the WhatsApp alert, and sends those
 * rows now. Once the ticket is saved, a failed notification never fails the
 * request; the daily cron retries it.
 *
 * 200 { number } | 400 { error, field } | 405 | 429 | 501 { error: 'tickets not configured' }
 */

const limiter = createRateLimiter(5, 60_000);

const BodySchema = NewTicketSchema.pick({
  email: true,
  name: true,
  appUrl: true,
  kind: true,
  answers: true,
  budget: true,
  boardOptIn: true,
  whatsappOptIn: true,
  whatsapp: true,
})
  .extend({
    hp: z.string().optional(),
    // Bit sends one of its fixed answers; anything else is dropped, not rejected.
    stack: z.enum(BUILD_STACKS).optional().catch(undefined),
  })
  .refine((b) => JSON.stringify(b.answers).length <= 8000, { path: ['answers'], message: 'answers too long' });

export default withErrorLog('bit-ticket', async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;

  // Honeypot: the same silent 200 a person gets.
  const hp = (body as { hp?: unknown } | null)?.hp;
  if (typeof hp === 'string' && hp.length > 0) return res.status(200).json({ ok: true });

  if (!limiter.allow(clientIp(req.headers ?? {}))) {
    return res.status(429).json({ error: 'Too many requests from here. Give it a minute and try again.' });
  }

  const store = ticketStore();
  if (!store) return res.status(501).json({ error: 'tickets not configured' });

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ error: issue?.message ?? 'invalid request', field: String(issue?.path[0] ?? '') });
  }

  const { hp: _hp, ...fields } = parsed.data;
  void _hp;
  let ticket;
  try {
    ticket = await submitTicket(store, { ...fields, source: 'bit' }, { admin: true, receipt: true, whatsapp: true }, liveDeps());
  } catch (err) {
    console.error('[bit-ticket] save failed', err);
    return res.status(500).json({ error: 'could not save the ticket' });
  }
  return res.status(200).json({ number: ticket.number });
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
