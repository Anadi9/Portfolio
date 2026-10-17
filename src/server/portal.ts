import { randomBytes } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { readCookie, signToken, verifyToken } from '../lib/admin/session.js';
import { FROM, INBOX_FALLBACK, type ResendLike } from '../lib/notify/email.js';
import { liveDeps } from '../lib/notify/live.js';
import { withErrorLog } from '../lib/monitoring/with-error-log.js';
import { clientView } from '../lib/portal/view.js';
import { clientIp, createRateLimiter } from '../lib/scan/rate-limit.js';
import { ticketStore, type TicketStore } from '../lib/tickets/store.js';

/**
 * POST /api/portal — the client portal's API.
 *
 * `requestLink` emails a 15-minute, single-use sign-in link to a known client
 * and answers the same 200 for anyone, so it can't be used to find out who is
 * a client. `verify` turns the link into a 7-day `portal_session` cookie that
 * names the client. Every read is scoped to that client in code, and only
 * `clientView` output leaves the server. JSON only; PORTAL_SESSION_SECRET
 * missing → 501.
 */

const COOKIE = 'portal_session';
const SESSION_SECONDS = 7 * 24 * 3600;
const LINK_SECONDS = 15 * 60;
const PORTAL_URL = 'https://anadithakur.in/portal';

const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('requestLink'), email: z.string().trim().toLowerCase().email().max(254) }),
  z.object({ op: z.literal('verify'), token: z.string().min(10).max(2000) }),
  z.object({ op: z.literal('tickets') }),
  z.object({ op: z.literal('ticket'), id: z.string().min(1).max(80) }),
  z.object({ op: z.literal('logout') }),
]);

export type PortalDeps = { store: () => TicketStore | null; env: Record<string, string | undefined>; resend: ResendLike | null };

const cookie = (value: string, maxAge: number) => `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/api/portal; Max-Age=${maxAge}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Per-email cap on sign-in emails, per function instance: 3 an hour. */
function emailLimiter(limit = 3, windowMs = 3_600_000) {
  const sent = new Map<string, number[]>();
  return (email: string) => {
    const now = Date.now();
    const recent = (sent.get(email) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) return false;
    sent.set(email, [...recent, now]);
    return true;
  };
}

export function createPortalHandler(deps: PortalDeps) {
  const ipLimiter = createRateLimiter(5, 60_000);
  const perEmail = emailLimiter();

  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }
    const secret = deps.env.PORTAL_SESSION_SECRET;
    if (!secret) return res.status(501).json({ error: 'portal not configured' });
    if (!String(req.headers?.['content-type'] ?? '').includes('application/json')) return res.status(415).json({ error: 'json only' });
    const store = deps.store();
    if (!store) return res.status(501).json({ error: 'tickets not configured' });

    const parsed = Op.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid request' });
    const body = parsed.data;

    if (body.op === 'requestLink') {
      if (!ipLimiter.allow(clientIp(req.headers ?? {}))) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
      const email = body.email as string;
      const client = await store.clientByEmail(email);
      if (client && deps.resend && perEmail(email)) {
        const nonce = randomBytes(18).toString('base64url');
        await store.createPortalLink(nonce, email);
        const token = signToken({ kind: 'portal_link', nonce, clientId: client.id }, secret, LINK_SECONDS);
        const link = `${PORTAL_URL}#token=${encodeURIComponent(token)}`;
        const sent = await deps.resend.emails.send({
          from: FROM,
          to: email,
          replyTo: deps.env.TICKETS_INBOX || deps.env.RESCUE_INBOX || INBOX_FALLBACK,
          subject: 'Your sign-in link',
          text: `Sign in to see your requests: ${link}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.\n\nAnadi`,
          html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a"><p><a href="${esc(link)}">Sign in to see your requests</a></p><p>The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</p><p>Anadi</p></div>`,
        });
        if (sent.error) console.error('[portal] link email failed', JSON.stringify(sent.error));
      }
      return res.status(200).json({ ok: true });
    }

    if (body.op === 'verify') {
      if (!ipLimiter.allow(clientIp(req.headers ?? {}))) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
      const claims = verifyToken(body.token, secret, 'portal_link');
      if (!claims || typeof claims.nonce !== 'string' || !(await store.usePortalLink(claims.nonce))) {
        return res.status(401).json({ error: 'This link has expired or was already used. Ask for a new one.' });
      }
      res.setHeader('Set-Cookie', cookie(signToken({ kind: 'portal', clientId: claims.clientId }, secret, SESSION_SECONDS), SESSION_SECONDS));
      return res.status(200).json({ ok: true });
    }

    const session = verifyToken(readCookie(req.headers?.cookie, COOKIE), secret, 'portal');
    const clientId = typeof session?.clientId === 'string' ? session.clientId : null;
    if (!clientId) return res.status(401).json({ error: 'Sign in again.' });

    switch (body.op) {
      case 'logout':
        res.setHeader('Set-Cookie', cookie('', 0));
        return res.status(200).json({ ok: true });
      case 'tickets': {
        const rows = await store.ticketsForClient(clientId);
        return res.status(200).json({ tickets: rows.map(({ id, number, kind, stage, appUrl, createdAt, updatedAt }) => ({ id, number, kind, stage, appUrl, createdAt, updatedAt })) });
      }
      case 'ticket': {
        const t = await store.getTicket(body.id);
        if (!t || t.clientId !== clientId) return res.status(404).json({ error: 'not found' });
        return res.status(200).json({ ticket: clientView(t) });
      }
    }
  };
}

export default withErrorLog(
  'portal',
  createPortalHandler({
    store: ticketStore,
    env: process.env,
    get resend() {
      return liveDeps().resend;
    },
  }),
);
