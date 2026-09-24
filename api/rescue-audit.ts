import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { dueBy, parseIntake, renderConfirmEmail, renderLeadEmail } from '../src/lib/rescue/intake.js';

/**
 * POST /api/rescue-audit
 *
 * The `/rescue/audit` form. Unlike `/api/teardown-report`, the email here is not
 * a copy of something the reader already has: it is the request itself. So the
 * page awaits this call, and the order of the two sends matters. The lead to
 * Anadi goes first and must succeed, or the visitor is told it failed and given
 * the mailto fallback. The confirmation to the visitor goes second and a
 * failure there is logged, not surfaced: the request has already landed.
 *
 * The visitor is not added to the Resend audience. They asked for an audit,
 * not a newsletter.
 *
 * Imports carry explicit `.js` extensions for the same reason as the teardown
 * function; `serverless-imports.test.ts` asserts it.
 */

const FROM = 'Anadi Thakur <rescue@anadithakur.in>';
const INBOX_FALLBACK = 'anadithakur99@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[rescue] RESEND_API_KEY not set: request not delivered');
    return res.status(501).json({ error: 'email not configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;

  // Honeypot: the same silent 200 a person gets.
  const hp = (body as { hp?: unknown } | null)?.hp;
  if (typeof hp === 'string' && hp.length > 0) {
    return res.status(200).json({ ok: true });
  }

  const parsed = parseIntake(body);
  if (parsed.ok === false) {
    return res.status(400).json({ error: parsed.error, field: parsed.field });
  }

  const { intake } = parsed;
  const due = dueBy(new Date());
  const resend = new Resend(key);
  const lead = renderLeadEmail(intake, due);

  try {
    const sent = await resend.emails.send({
      from: FROM,
      to: process.env.RESCUE_INBOX || INBOX_FALLBACK,
      replyTo: intake.email,
      subject: lead.subject,
      html: lead.html,
    });
    if (sent.error) {
      console.error('[rescue] lead send failed', sent.error);
      return res.status(502).json({ error: 'send failed' });
    }
  } catch (err) {
    console.error('[rescue] lead send threw', err);
    return res.status(502).json({ error: 'send failed' });
  }

  const confirm = renderConfirmEmail(intake, due);
  try {
    const sent = await resend.emails.send({ from: FROM, to: intake.email, subject: confirm.subject, html: confirm.html });
    if (sent.error) console.warn('[rescue] confirmation send failed', sent.error);
  } catch (err) {
    console.warn('[rescue] confirmation send threw', err);
  }

  return res.status(200).json({ ok: true, due: due.toISOString() });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
