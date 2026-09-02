import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { renderEmail } from '../src/lib/teardown/email';
import { report } from '../src/lib/teardown/report';
import { isValidAnswers } from '../src/lib/teardown/score';

/**
 * POST /api/teardown-report
 *
 * Takes raw answers and an address; re-runs the same pure modules the browser
 * ran and sends the result. It never accepts a scored report from the client:
 * the answers are thirteen small integers, which means the payload can be
 * validated exhaustively, and there is exactly one implementation of the
 * scoring in the system.
 *
 * Imports are relative, not `@/`-aliased: Vite resolves that alias, the
 * function bundler does not.
 *
 * Known limitation, accepted in the spec: there is no per-IP throttle, because
 * doing it properly needs shared state we deliberately have not built. The
 * honeypot and the strict payload check are the mitigations, and the blast
 * radius is one unsolicited, non-malicious email per request. If it is ever
 * actually abused the fix is Vercel KV and a counter, contained to this file.
 */

const FROM = 'Anadi Thakur <teardown@anadithakur.in>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!key) {
    // A preview deploy without secrets still serves the page and the in-browser
    // report. Only the copy in the inbox is missing, and the client already
    // degrades to a quiet line for exactly this case.
    console.warn('[teardown] RESEND_API_KEY not set: no email sent');
    return res.status(501).json({ error: 'email not configured' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const { answers, email, hp } = (body ?? {}) as { answers?: unknown; email?: unknown; hp?: unknown };

  // Honeypot: silence, not a signal. A bot that fills it gets the same 200 a
  // person gets, and learns nothing about why no mail arrived.
  if (typeof hp === 'string' && hp.length > 0) {
    return res.status(200).json({ ok: true });
  }

  if (!isValidAnswers(answers)) {
    return res.status(400).json({ error: 'invalid answers' });
  }
  if (typeof email !== 'string' || email.length > 254 || !EMAIL.test(email)) {
    return res.status(400).json({ error: 'invalid email' });
  }

  const { subject, html } = renderEmail(report(answers));
  const resend = new Resend(key);

  try {
    const sent = await resend.emails.send({ from: FROM, to: email, subject, html });
    if (sent.error) {
      console.error('[teardown] send failed', sent.error);
      return res.status(502).json({ error: 'send failed' });
    }
  } catch (err) {
    console.error('[teardown] send threw', err);
    return res.status(502).json({ error: 'send failed' });
  }

  // The list is a side effect. A failure here must not fail the request, since the
  // send is what the reader asked for and it has already happened.
  if (audienceId) {
    try {
      await resend.contacts.create({ email, audienceId, unsubscribed: false });
    } catch (err) {
      console.warn('[teardown] audience add failed', err);
    }
  }

  return res.status(200).json({ ok: true });
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
