import type { Notification } from '../tickets/types.js';

/**
 * Email templates and the Resend adapter for the ticket pipeline.
 * Every value that came from a visitor goes through `esc` before it reaches
 * HTML; nothing is interpolated raw.
 */

export const FROM = 'Anadi Thakur <tickets@anadithakur.in>';
export const INBOX_FALLBACK = 'anadithakur99@gmail.com';

export type ResendLike = {
  emails: { send: (msg: Record<string, unknown>) => Promise<{ error?: unknown } | { data?: unknown; error?: unknown }> };
};

export type SendResult = { status: 'sent' | 'skipped' | 'failed'; error?: string };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const text = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const KIND_LABEL: Record<string, string> = {
  first_bug: 'First-bug review',
  audit: 'Audit',
  build: 'Build with AI',
  care: 'Care',
  question: 'Question',
  teardown: 'Recorded teardown',
};

const STAGE_LABEL: Record<string, string> = {
  inbox: 'in my inbox',
  bug_review: 'in first-bug review',
  audit: 'in the audit',
  fixing: 'being fixed',
  live: 'live',
  closed: 'closed',
};

export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind;

const row = (k: string, v: string) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${v}</td></tr>`;

const shell = (inner: string) => `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${inner}</div>`;

function answerRows(answers: unknown): string {
  if (!answers || typeof answers !== 'object') return '';
  return Object.entries(answers as Record<string, unknown>)
    .slice(0, 30)
    .map(([k, v]) => {
      const value = typeof v === 'string' ? v : JSON.stringify(v);
      return row(k.slice(0, 60), `<span style="white-space:pre-wrap">${esc((value ?? '').slice(0, 1000))}</span>`);
    })
    .join('');
}

export function renderNewTicketAdmin(p: Record<string, unknown>): { subject: string; html: string } {
  const number = text(p.number, 20);
  const kind = text(p.kind, 40);
  const appUrl = text(p.appUrl);
  return {
    subject: `New ticket ${number}: ${kindLabel(kind)}`,
    html: shell(
      `<h2 style="margin:0 0 12px">New ticket ${esc(number)}</h2>
<table style="border-collapse:collapse">
${row('Kind', esc(kindLabel(kind)))}
${row('Source', esc(text(p.source, 40)))}
${row('Name', esc(text(p.name, 120)) || '<em>not given</em>')}
${row('Email', esc(text(p.email, 254)))}
${row('WhatsApp', esc(text(p.whatsapp, 40)) || '<em>not given</em>')}
${row('App', appUrl ? esc(appUrl) : '<em>not given</em>')}
${row('Budget', esc(text(p.budget, 120)) || '<em>not given</em>')}
${row('Board', p.boardOptIn === true ? 'opted in' : 'not opted in')}
${answerRows(p.answers)}
</table>`,
    ),
  };
}

export function renderTicketReceipt(p: Record<string, unknown>): { subject: string; html: string } {
  const number = text(p.number, 20);
  const kind = text(p.kind, 40);
  const first = text(p.name, 120).split(/\s+/)[0];
  const promise =
    kind === 'first_bug'
      ? `<p>I'll send your first-bug video within <strong>24 hours</strong>. It's free, and you owe nothing after it.</p>`
      : `<p>I'll read it and reply by email, usually within a working day.</p>`;
  return {
    subject: `Got it: your ticket is ${number}`,
    html: shell(
      `<p>${first ? `Hi ${esc(first)},` : 'Hi,'}</p>
<p>Your request is in. Your ticket number is <strong>${esc(number)}</strong> (${esc(kindLabel(kind))}). It is only a label so we can both refer to it; it doesn't give anyone access to anything.</p>
${promise}
<p>Reply to this email if you want to add something.</p>
<p>Anadi</p>`,
    ),
  };
}

export function renderStageChange(p: Record<string, unknown>): { subject: string; html: string } {
  const number = text(p.number, 20);
  const stage = text(p.stage, 40);
  const first = text(p.name, 120).split(/\s+/)[0];
  return {
    subject: `Update on ${number}: ${STAGE_LABEL[stage] ?? stage}`,
    html: shell(
      `<p>${first ? `Hi ${esc(first)},` : 'Hi,'}</p>
<p>Ticket <strong>${esc(number)}</strong> is now ${esc(STAGE_LABEL[stage] ?? stage)}.</p>
<p>Reply to this email with any questions.</p>
<p>Anadi</p>`,
    ),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sends one email notification row. Missing key => skipped; a bad address => skipped. */
export async function sendEmailNotification(
  row: Notification,
  resend: ResendLike | null,
  env: Record<string, string | undefined>,
): Promise<SendResult> {
  if (!resend) return { status: 'skipped', error: 'RESEND_API_KEY not set' };
  const p = row.payload;
  const inbox = env.TICKETS_INBOX || env.RESCUE_INBOX || INBOX_FALLBACK;

  let to: string;
  let rendered: { subject: string; html: string };
  let replyTo: string | undefined;
  if (row.template === 'new_ticket_admin') {
    to = inbox;
    rendered = renderNewTicketAdmin(p);
    const visitor = text(p.email, 254);
    if (EMAIL.test(visitor)) replyTo = visitor;
  } else if (row.template === 'ticket_receipt' || row.template === 'stage_change') {
    to = text(p.to, 254);
    if (!EMAIL.test(to)) return { status: 'skipped', error: 'no recipient email' };
    rendered = row.template === 'ticket_receipt' ? renderTicketReceipt(p) : renderStageChange(p);
    replyTo = inbox;
  } else {
    return { status: 'skipped', error: `no email template for ${row.template}` };
  }

  const sent = await resend.emails.send({ from: FROM, to, ...(replyTo ? { replyTo } : {}), subject: rendered.subject, html: rendered.html });
  if (sent.error) {
    const e = sent.error as { message?: string };
    return { status: 'failed', error: String(e.message ?? 'send failed').slice(0, 300) };
  }
  return { status: 'sent' };
}
