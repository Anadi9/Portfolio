import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { dueBy, parseAuditIntake, renderAuditConfirmEmail, renderAuditLeadEmail } from '../src/lib/audit/intake.js';

/**
 * POST /api/audit
 *
 * The `/audit` form for AI Visibility and DPDP audits. App audits post to
 * `/api/rescue-audit` instead. Same contract as that function, for the same
 * reasons: the lead to Anadi goes first and must succeed, or the visitor is
 * told it failed and given the mailto fallback; the confirmation goes second
 * and a failure there is only logged.
 *
 * Nothing is stored and the visitor is not added to any audience. The email
 * pair is the whole record, which is what the form's "used only to send your
 * report" line promises.
 */

const FROM = 'Anadi Thakur <audit@anadithakur.in>';
const INBOX_FALLBACK = 'anadithakur99@gmail.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[audit] RESEND_API_KEY not set: request not delivered');
    return res.status(501).json({ error: 'email not configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;

  // Honeypot: the same silent 200 a person gets.
  const hp = (body as { hp?: unknown } | null)?.hp;
  if (typeof hp === 'string' && hp.length > 0) {
    return res.status(200).json({ ok: true });
  }

  const parsed = parseAuditIntake(body);
  if (parsed.ok === false) {
    return res.status(400).json({ error: parsed.error, field: parsed.field });
  }

  const { intake } = parsed;
  const due = dueBy(new Date());
  const resend = new Resend(key);
  const lead = renderAuditLeadEmail(intake, due);

  try {
    const sent = await resend.emails.send({
      from: FROM,
      to: process.env.RESCUE_INBOX || INBOX_FALLBACK,
      replyTo: intake.email,
      subject: lead.subject,
      html: lead.html,
    });
    if (sent.error) {
      console.error('[audit] lead send failed', sent.error);
      return res.status(502).json({ error: 'send failed' });
    }
  } catch (err) {
    console.error('[audit] lead send threw', err);
    return res.status(502).json({ error: 'send failed' });
  }

  const confirm = renderAuditConfirmEmail(intake, due);
  try {
    const sent = await resend.emails.send({ from: FROM, to: intake.email, subject: confirm.subject, html: confirm.html });
    if (sent.error) console.warn('[audit] confirmation send failed', sent.error);
  } catch (err) {
    console.warn('[audit] confirmation send threw', err);
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
