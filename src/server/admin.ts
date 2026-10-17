import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { checkPassword, COOKIE, PENDING_COOKIE, PENDING_SECONDS, readCookie, SESSION_SECONDS, signSession, signToken, verifySession, verifyToken } from '../lib/admin/session.js';
import { webauthn, type Party, type PasskeyDeps } from '../lib/admin/passkey.js';
import { hasPlaceholder, joinDraft } from '../lib/brief/draft.js';
import { dispatch } from '../lib/notify/dispatch.js';
import { sendClientMessage, type ResendLike } from '../lib/notify/email.js';
import { liveDeps } from '../lib/notify/live.js';
import { withErrorLog } from '../lib/monitoring/with-error-log.js';
import { clientIp, createRateLimiter } from '../lib/scan/rate-limit.js';
import { ticketStore, type TicketStore } from '../lib/tickets/store.js';
import { keepCommitment, onReplySent, onStageEntered, onTaskDone } from '../lib/coach/hooks.js';
import { gate } from '../lib/coach/stages.js';
import { computeNumbers } from '../lib/command/numbers.js';
import { awaySummary, pickToday } from '../lib/command/today.js';
import { parsePlan, summarisePlan } from '../lib/command/plan.js';
import { MASTER_PLAN_MD } from '../data/plan.generated.js';
import { pushConfigured } from '../lib/command/push.js';
import { scanLead } from '../lib/brief/scan.js';
import { fromLeadScan } from '../lib/engine/adapters.js';
import { combine } from '../lib/engine/combine.js';
import { draftReport } from '../lib/engine/report.js';
import { planInvoices } from '../lib/money/invoices.js';
import { TICKET_STAGES } from '../lib/tickets/types.js';

/**
 * POST /api/admin — the command centre's API, for Anadi only.
 *
 * Body `{ op, ... }`. `login` checks ADMIN_EMAIL and ADMIN_PASSWORD. With no
 * passkey registered it sets the signed, HttpOnly, SameSite=Strict session
 * cookie (scoped to /api/admin); with one, it starts the passkey step and
 * `passkeyLogin` sets the session. Every other op needs the session cookie. JSON only, so a cross-site form can't post here. Missing
 * ADMIN_PASSWORD or ADMIN_SESSION_SECRET → 501 for everything.
 *
 * Nothing is sent to a client except `stage` (the automatic stage email) and
 * `send` (a draft Anadi approved, refused while a placeholder is left).
 * `stage` answers 409 with the blockers while Coach's gate is closed.
 */

/** Stages whose entry doesn't email the client (the video reply is the message). */
const SILENT_STAGES = new Set(['inbox', 'bug_review']);

const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('login'), email: z.string().max(254), password: z.string().max(200) }),
  z.object({ op: z.literal('passkeyLogin'), response: z.object({ id: z.string().min(1).max(400) }).passthrough() }),
  z.object({ op: z.literal('passkeyOptions') }),
  z.object({ op: z.literal('passkeyRegister'), response: z.object({ id: z.string().min(1).max(400) }).passthrough() }),
  z.object({ op: z.literal('passkeys') }),
  z.object({ op: z.literal('passkeyRemove'), id: z.string().min(1).max(400) }),
  z.object({ op: z.literal('logout') }),
  z.object({ op: z.literal('feed') }),
  z.object({ op: z.literal('numbers') }),
  z.object({ op: z.literal('today') }),
  z.object({ op: z.literal('plan') }),
  z.object({ op: z.literal('pushKey') }),
  z.object({
    op: z.literal('pushSubscribe'),
    endpoint: z.string().url().max(1000).refine((u) => u.startsWith('https://'), 'https only'),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
  z.object({ op: z.literal('pushUnsubscribe'), endpoint: z.string().max(1000) }),
  z.object({ op: z.literal('away'), since: z.string().datetime({ offset: true }) }),
  z.object({ op: z.literal('done'), feedId: z.string().min(1).max(80) }),
  z.object({ op: z.literal('helper'), feedId: z.string().min(1).max(80) }),
  z.object({ op: z.literal('snooze'), feedId: z.string().min(1).max(80), hours: z.number().min(1).max(168) }),
  z.object({ op: z.literal('list'), stage: z.enum(TICKET_STAGES).optional() }),
  z.object({ op: z.literal('get'), id: z.string().min(1).max(80) }),
  z.object({ op: z.literal('stage'), id: z.string().min(1).max(80), stage: z.enum(TICKET_STAGES) }),
  z.object({ op: z.literal('saveDraft'), id: z.string().min(1).max(80), messageId: z.string().min(1).max(80), subject: z.string().max(200), body: z.string().max(5000) }),
  z.object({ op: z.literal('draftReport'), id: z.string().min(1).max(80) }),
  z.object({
    op: z.literal('planInvoices'),
    id: z.string().min(1).max(80),
    work: z.enum(['audit', 'fix', 'build']),
    priceCents: z.number().int().positive().max(100_000_000).optional(),
    currency: z.enum(['usd', 'inr']),
    teardownPaidAt: z.string().datetime({ offset: true }).optional(),
  }),
  z.object({ op: z.literal('invoices'), id: z.string().min(1).max(80) }),
  z.object({ op: z.literal('invoiceStatus'), id: z.string().min(1).max(80), invoiceId: z.string().min(1).max(80), status: z.enum(['planned', 'sent', 'paid', 'void']), stripeInvoiceId: z.string().max(100).optional() }),
  z.object({ op: z.literal('taskDone'), id: z.string().min(1).max(80), key: z.string().min(1).max(60) }),
  z.object({ op: z.literal('keep'), id: z.string().min(1).max(80), commitmentId: z.string().min(1).max(80) }),
  z.object({ op: z.literal('missReason'), id: z.string().min(1).max(80), commitmentId: z.string().min(1).max(80), reason: z.string().trim().min(1).max(1000) }),
  z.object({ op: z.literal('send'), id: z.string().min(1).max(80), messageId: z.string().min(1).max(80), subject: z.string().min(1).max(200), body: z.string().min(1).max(5000) }),
]);

export type AdminDeps = {
  store: () => TicketStore | null;
  env: Record<string, string | undefined>;
  resend: ResendLike | null;
  /** The fixed pause after a wrong password. */
  delay: (ms: number) => Promise<void>;
  passkeys?: PasskeyDeps;
  /** The outside-in scan the report engine runs; injectable for tests. */
  scan?: typeof scanLead;
};

const cookie = (value: string, maxAge: number, name = COOKIE) =>
  `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}`;

const one = (h: string | string[] | undefined) => (Array.isArray(h) ? h[0] : h)?.split(',')[0]?.trim();

/** Where the passkey ceremony happens: ADMIN_RP_ID / ADMIN_ORIGIN, else the request's own host. */
function partyOf(req: VercelRequest, env: Record<string, string | undefined>): Party {
  const host = one(req.headers?.['x-forwarded-host']) || one(req.headers?.host) || 'anadithakur.in';
  const hostname = host.replace(/:\d+$/, '');
  const proto = one(req.headers?.['x-forwarded-proto']) || (hostname === 'localhost' ? 'http' : 'https');
  return { rpID: env.ADMIN_RP_ID || hostname, origin: env.ADMIN_ORIGIN || `${proto}://${host}` };
}

const sameEmail = (given: string, expected: string) => checkPassword(given.trim().toLowerCase(), expected.trim().toLowerCase());

export function createAdminHandler(deps: AdminDeps) {
  const loginLimiter = createRateLimiter(5, 60_000);

  return async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }
    const password = deps.env.ADMIN_PASSWORD;
    const secret = deps.env.ADMIN_SESSION_SECRET;
    const email = deps.env.ADMIN_EMAIL;
    if (!password || !secret || !email) return res.status(501).json({ error: 'admin not configured' });
    const pk = deps.passkeys ?? webauthn;
    if (!String(req.headers?.['content-type'] ?? '').includes('application/json')) return res.status(415).json({ error: 'json only' });

    const parsed = Op.safeParse(typeof req.body === 'string' ? safeJson(req.body) : req.body);
    const op = (req.body as { op?: unknown } | null)?.op;

    if (op === 'login') {
      if (!loginLimiter.allow(clientIp(req.headers ?? {}))) return res.status(429).json({ error: 'too many attempts' });
      if (!parsed.success || parsed.data.op !== 'login' || !(sameEmail(parsed.data.email, email) && checkPassword(parsed.data.password, password))) {
        await deps.delay(500);
        return res.status(401).json({ error: 'wrong email or password' });
      }
      // With a passkey registered, the password only opens the passkey step.
      const keys = (await deps.store()?.passkeys()) ?? [];
      if (keys.length) {
        const options = await pk.authenticationOptions(partyOf(req, deps.env), keys);
        res.setHeader('Set-Cookie', cookie(signToken({ kind: 'pending', purpose: 'login', challenge: options.challenge }, secret, PENDING_SECONDS), PENDING_SECONDS, PENDING_COOKIE));
        return res.status(200).json({ passkey: true, options });
      }
      res.setHeader('Set-Cookie', cookie(signSession(secret), SESSION_SECONDS));
      return res.status(200).json({ ok: true });
    }

    if (op === 'passkeyLogin') {
      if (!loginLimiter.allow(clientIp(req.headers ?? {}))) return res.status(429).json({ error: 'too many attempts' });
      const pending = verifyToken(readCookie(req.headers?.cookie, PENDING_COOKIE), secret, 'pending');
      const store = deps.store();
      const response = parsed.success && parsed.data.op === 'passkeyLogin' ? (parsed.data as { response: { id: string } }).response : null;
      if (!pending || pending.purpose !== 'login' || !response || !store) return res.status(401).json({ error: 'log in again' });
      const key = (await store.passkeys()).find((p) => p.id === response.id);
      const ok = key && (await pk.verifyAuthentication(partyOf(req, deps.env), response, String(pending.challenge), key));
      if (!key || !ok) {
        await deps.delay(500);
        return res.status(401).json({ error: 'passkey not recognised' });
      }
      await store.setPasskeyCounter(key.id, ok.newCounter);
      res.setHeader('Set-Cookie', [cookie(signSession(secret), SESSION_SECONDS), cookie('', 0, PENDING_COOKIE)]);
      return res.status(200).json({ ok: true });
    }

    if (!verifySession(readCookie(req.headers?.cookie), secret)) return res.status(401).json({ error: 'unauthorized' });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'invalid request' });
    if (parsed.data.op === 'plan') {
      // Read from the build, not the database, so it works before Supabase is set up.
      const items = parsePlan(MASTER_PLAN_MD);
      return res.status(200).json({ items, ...summarisePlan(items) });
    }
    const store = deps.store();
    if (!store) return res.status(501).json({ error: 'tickets not configured' });
    const body = parsed.data;

    switch (body.op) {
      case 'logout':
        res.setHeader('Set-Cookie', cookie('', 0));
        return res.status(200).json({ ok: true });

      case 'feed':
        return res.status(200).json({ items: await store.openFeed() });

      case 'passkeys':
        return res.status(200).json({ passkeys: (await store.passkeys()).map(({ id, createdAt }) => ({ id, createdAt })) });

      case 'passkeyOptions': {
        const options = await pk.registrationOptions(partyOf(req, deps.env), email, await store.passkeys());
        res.setHeader('Set-Cookie', cookie(signToken({ kind: 'pending', purpose: 'register', challenge: options.challenge }, secret, PENDING_SECONDS), PENDING_SECONDS, PENDING_COOKIE));
        return res.status(200).json({ options });
      }

      case 'passkeyRegister': {
        const pending = verifyToken(readCookie(req.headers?.cookie, PENDING_COOKIE), secret, 'pending');
        if (!pending || pending.purpose !== 'register') return res.status(400).json({ error: 'start again' });
        const cred = await pk.verifyRegistration(partyOf(req, deps.env), body.response, String(pending.challenge));
        if (!cred) return res.status(400).json({ error: 'passkey not verified' });
        await store.savePasskey(cred);
        res.setHeader('Set-Cookie', cookie('', 0, PENDING_COOKIE));
        return res.status(200).json({ ok: true });
      }

      case 'passkeyRemove':
        await store.removePasskey(body.id);
        return res.status(200).json({ ok: true });

      case 'numbers': {
        const [tickets, commitments] = await Promise.all([store.listTickets({ limit: 2000 }), store.allCommitments()]);
        return res.status(200).json({ numbers: computeNumbers({ tickets, commitments, now: new Date() }) });
      }

      case 'pushKey':
        return pushConfigured(deps.env) ? res.status(200).json({ key: deps.env.VAPID_PUBLIC_KEY }) : res.status(501).json({ error: 'push not configured' });

      case 'pushSubscribe':
        await store.savePushSubscription({ endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh as string, auth: body.keys.auth as string } });
        return res.status(200).json({ ok: true });

      case 'pushUnsubscribe':
        await store.removePushSubscription(body.endpoint);
        return res.status(200).json({ ok: true });

      case 'today':
      case 'away': {
        const now = new Date();
        const since = body.op === 'away' ? body.since : new Date(now.getTime() - 30 * 86_400_000).toISOString();
        const [tickets, commitments, feed] = await Promise.all([store.listTickets({ limit: 500 }), store.allCommitments(new Date(now.getTime() - 60 * 86_400_000).toISOString()), store.openFeed(now)]);
        return body.op === 'today'
          ? res.status(200).json({ items: pickToday({ tickets, commitments, feed, now }) })
          : res.status(200).json({ away: awaySummary({ since, tickets, commitments, feed }) });
      }

      case 'done':
        await store.markFeedDone(body.feedId);
        return res.status(200).json({ ok: true });

      case 'helper':
        await store.assignFeed(body.feedId, 'helper');
        return res.status(200).json({ ok: true });

      case 'snooze':
        await store.snoozeFeed(body.feedId, new Date(Date.now() + body.hours * 3_600_000));
        return res.status(200).json({ ok: true });

      case 'list':
        return res.status(200).json({ tickets: await store.listTickets({ stage: body.stage }) });

      case 'get': {
        const ticket = await store.getTicket(body.id);
        return ticket ? res.status(200).json({ ticket }) : res.status(404).json({ error: 'no such ticket' });
      }

      case 'stage': {
        const ticket = await store.getTicket(body.id);
        if (!ticket) return res.status(404).json({ error: 'no such ticket' });
        if (ticket.stage === body.stage) return res.status(200).json({ ok: true });
        const check = gate({ stage: ticket.stage, to: body.stage, tasks: ticket.tasks, commitments: ticket.commitments });
        if (!check.ok) return res.status(409).json({ error: 'gate closed', blockers: check.blockers });
        await store.setStage(ticket.id, body.stage);
        await store.addEvent(ticket.id, 'stage', { from: ticket.stage, to: body.stage });
        await onStageEntered(store, ticket, body.stage);
        if (!SILENT_STAGES.has(body.stage)) {
          const rows = await store.enqueueNotifications([
            {
              ticketId: ticket.id,
              channel: 'email',
              template: 'stage_change',
              payload: { number: ticket.number, stage: body.stage, name: ticket.client.name ?? '', to: ticket.client.email },
            },
          ]);
          await dispatch(store, rows, { ...liveDeps(deps.env), resend: deps.resend });
        }
        return res.status(200).json({ ok: true });
      }

      case 'planInvoices': {
        const ticket = await store.getTicket(body.id);
        if (!ticket) return res.status(404).json({ error: 'no such ticket' });
        if (body.work !== 'audit' && !body.priceCents) return res.status(400).json({ error: 'a fixed price is needed for fix and build work' });
        const auditPaidAt = ticket.tasks.find((x) => x.key === 'audit_paid' && x.status === 'done')?.doneAt ?? null;
        const plans = planInvoices({ work: body.work, priceCents: body.priceCents, now: new Date(), auditPaidAt, teardownPaidAt: body.teardownPaidAt ?? null });
        const invoices = await store.planInvoices(ticket.id, plans, body.currency);
        await store.addEvent(ticket.id, 'invoices_planned', { work: body.work, count: invoices.length });
        return res.status(200).json({ invoices });
      }

      case 'invoices':
        return res.status(200).json({ invoices: await store.invoicesFor(body.id) });

      case 'invoiceStatus': {
        const ticket = await store.getTicket(body.id);
        const inv = ticket && (await store.invoicesFor(ticket.id)).find((x) => x.id === body.invoiceId);
        if (!ticket || !inv) return res.status(404).json({ error: 'no such invoice' });
        const confirmed = ticket.tasks.some((x) => x.key === 'client_confirmed' && x.status === 'done');
        if (inv.afterConfirm && (body.status === 'sent' || body.status === 'paid') && !confirmed) {
          return res.status(409).json({ error: 'The second half is due only after the client confirms it works (tick "Client confirms it works" first).' });
        }
        await store.updateInvoice(inv.id, { status: body.status, ...(body.stripeInvoiceId !== undefined ? { stripeInvoiceId: body.stripeInvoiceId || null } : {}) });
        return res.status(200).json({ ok: true });
      }

      case 'draftReport': {
        const ticket = await store.getTicket(body.id);
        if (!ticket) return res.status(404).json({ error: 'no such ticket' });
        const scan = await (deps.scan ?? scanLead)(ticket.appUrl);
        const result = combine(fromLeadScan(scan), 'error' in scan ? [] : ['visibility', 'security']);
        const draft = draftReport({ number: ticket.number, appUrl: ticket.appUrl, result });
        const messageId = await store.saveDraftMessage(ticket.id, 'audit_report', joinDraft(draft), 'email');
        await store.postFeed({ ticketId: ticket.id, bot: 'bit', kind: 'draft_ready', title: `${ticket.number} · audit report drafted`, body: `${result.findings.length} findings; overall ${result.overall ?? '—'}/100`, action: 'approve_send', ref: messageId });
        return res.status(200).json({ ok: true, messageId, overall: result.overall });
      }

      case 'taskDone': {
        const ticket = await store.getTicket(body.id);
        if (!ticket || !(await store.completeTask(ticket.id, body.key))) return res.status(404).json({ error: 'no open task' });
        await onTaskDone(store, ticket, body.key);
        return res.status(200).json({ ok: true });
      }

      case 'keep':
      case 'missReason': {
        const ticket = await store.getTicket(body.id);
        const c = ticket?.commitments.find((x) => x.id === body.commitmentId);
        if (!ticket || !c) return res.status(404).json({ error: 'no such commitment' });
        if (body.op === 'keep') {
          if (c.status !== 'open' && c.status !== 'at_risk') return res.status(409).json({ error: `already ${c.status}` });
          await keepCommitment(store, ticket, c.id);
          await store.doneFeedFor(c.id);
          return res.status(200).json({ ok: true });
        }
        if (c.status !== 'missed') return res.status(409).json({ error: 'only a missed promise takes a reason' });
        await store.updateCommitment(c.id, { missReason: body.reason });
        await store.addEvent(ticket.id, 'miss_reason', { commitmentId: c.id, promiseId: c.promiseId });
        await store.doneFeedFor(c.id);
        return res.status(200).json({ ok: true });
      }

      case 'saveDraft': {
        const found = await findDraft(store, body.id, body.messageId);
        if ('error' in found) return res.status(found.status).json({ error: found.error });
        await store.updateMessage(body.messageId, { body: joinDraft({ subject: body.subject, body: body.body }) });
        return res.status(200).json({ ok: true });
      }

      case 'send': {
        if (hasPlaceholder(body.body) || hasPlaceholder(body.subject)) return res.status(400).json({ error: 'fill in the placeholders first' });
        const found = await findDraft(store, body.id, body.messageId);
        if ('error' in found) return res.status(found.status).json({ error: found.error });
        const { ticket } = found;
        const result = await sendClientMessage(deps.resend, deps.env, { to: ticket.client.email, subject: body.subject, body: body.body });
        if (result.status !== 'sent') return res.status(502).json({ error: result.error ?? 'not sent' });
        await store.updateMessage(body.messageId, { body: joinDraft({ subject: body.subject, body: body.body }), status: 'sent' });
        await store.addEvent(ticket.id, 'reply_sent', { messageId: body.messageId });
        await store.doneFeedFor(body.messageId);
        await onReplySent(store, ticket, found.message.kind);
        if (ticket.kind === 'first_bug' && ticket.stage === 'inbox') {
          await store.setStage(ticket.id, 'bug_review');
          await store.addEvent(ticket.id, 'stage', { from: 'inbox', to: 'bug_review' });
          await onStageEntered(store, ticket, 'bug_review');
        }
        return res.status(200).json({ ok: true });
      }
    }
  };
}

/** The ticket and its still-unsent draft, or why not. */
async function findDraft(store: TicketStore, ticketId: string, messageId: string) {
  const ticket = await store.getTicket(ticketId);
  const message = ticket?.messages.find((m) => m.id === messageId);
  if (!ticket || !message) return { error: 'no such message', status: 404 } as const;
  if (message.status === 'sent') return { error: 'already sent', status: 409 } as const;
  return { ticket, message };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default withErrorLog(
  'admin',
  createAdminHandler({
    store: ticketStore,
    env: process.env,
    // Read per request, so RESEND_API_KEY is picked up like everywhere else.
    get resend() {
      return liveDeps().resend;
    },
    delay: (ms) => new Promise((r) => setTimeout(r, ms)),
  }),
);
