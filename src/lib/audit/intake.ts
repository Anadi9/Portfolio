/**
 * The free audit request for AI Visibility and DPDP readiness: what `/audit`
 * collects for those two services, what `api/audit.ts` accepts, and the two
 * emails it sends. App audits (Production Readiness) keep their own intake in
 * `lib/rescue/intake.ts`, because that form asks different questions (the
 * build tool, symptoms, a repo) and already works.
 *
 * Fields are the positioning doc's form, minus the audit type when it is
 * `app`. Everything collected is used for one thing, sending the report, and
 * the form says so; under the DPDP Act that purpose limit is the point, so do
 * not add fields "for later" here.
 *
 * Pure and dependency-free, because `api/audit.ts` loads it under Node's ESM
 * resolver as well as the browser loading it through Vite.
 */
import { formatDue, normalizeUrl } from '../rescue/intake.js';

export { dueBy, formatDue, normalizeUrl, TURNAROUND_HOURS } from '../rescue/intake.js';

/** The audit types `/audit?type=` accepts. `app` is routed to the rescue form, not to this intake. */
export const AUDIT_TYPES = ['ai', 'dpdp', 'both', 'app', 'unsure'] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

/** The ones this module handles. */
export const LEAD_TYPES = ['ai', 'dpdp', 'both', 'unsure'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const TYPE_LABEL: Record<AuditType, string> = {
  ai: 'Search & AI visibility',
  dpdp: 'Privacy & compliance',
  both: 'Visibility + privacy',
  app: 'Reliability & security',
  unsure: 'Not sure, check everything',
};

export const MARKETS = ['India', 'US', 'Global'] as const;
export type Market = (typeof MARKETS)[number];

export const WORRIES_MAX = 2000;

export type AuditIntake = {
  type: LeadType;
  name: string;
  business: string;
  url: string;
  sells: string;
  market: Market;
  email: string;
  whatsapp: string | null;
  worries: string;
};

export type AuditParsed = { ok: true; intake: AuditIntake } | { ok: false; field: keyof AuditIntake; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `?type=` from a service page's CTA. Anything unknown means "let them choose". */
export function parseTypeParam(param: string | null): AuditType | null {
  return AUDIT_TYPES.find((t) => t === param) ?? null;
}

/** Digits, spaces, dashes, brackets and one leading +; 8 to 15 digits, which covers India and the US with or without a country code. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s()-]{8,24}$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  return (trimmed.startsWith('+') ? '+' : '') + digits;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max + 1) : '');

export function parseAuditIntake(body: unknown): AuditParsed {
  const b = (body ?? {}) as Record<string, unknown>;

  // In the form's order, so the field focused on an error is the topmost wrong one.
  const type = LEAD_TYPES.find((t) => t === b.type);
  if (!type) return { ok: false, field: 'type', error: 'Pick which audit you want.' };

  const name = text(b.name, 100);
  if (!name) return { ok: false, field: 'name', error: 'Add your name.' };
  if (name.length > 100) return { ok: false, field: 'name', error: 'Keep it under 100 characters.' };

  const business = text(b.business, 120);
  if (!business) return { ok: false, field: 'business', error: 'Add the business name.' };
  if (business.length > 120) return { ok: false, field: 'business', error: 'Keep it under 120 characters.' };

  const url = typeof b.url === 'string' ? normalizeUrl(b.url) : null;
  if (!url) return { ok: false, field: 'url', error: 'Add the link to your website or app.' };

  const sells = text(b.sells, 160);
  if (!sells) return { ok: false, field: 'sells', error: 'One line is enough, like "organic skincare".' };
  if (sells.length > 160) return { ok: false, field: 'sells', error: 'Keep it to one line.' };

  const market = MARKETS.find((m) => m === b.market);
  if (!market) return { ok: false, field: 'market', error: 'Pick where your customers are.' };

  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (email.length > 254 || !EMAIL.test(email)) {
    return { ok: false, field: 'email', error: "That doesn't look like an email address." };
  }

  let whatsapp: string | null = null;
  if (typeof b.whatsapp === 'string' && b.whatsapp.trim()) {
    whatsapp = normalizePhone(b.whatsapp);
    if (!whatsapp) return { ok: false, field: 'whatsapp', error: "That number doesn't look right. Include the country code." };
  }

  const worries = typeof b.worries === 'string' ? b.worries.trim() : '';
  if (worries.length > WORRIES_MAX) return { ok: false, field: 'worries', error: `Keep it under ${WORRIES_MAX} characters.` };

  return { ok: true, intake: { type, name, business, url, sells, market, email, whatsapp, worries } };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const hostOf = (url: string) => new URL(url).hostname;

const wrap = (inner: string) =>
  `<div style="font:15px/1.55 Helvetica,Arial,sans-serif;color:#0a0a0a;max-width:560px">${inner}</div>`;

/** What the report covers, per type, quoted in the receipt. */
const COVERS: Record<LeadType, string[]> = {
  ai: [
    '10 real customer questions asked in ChatGPT, Gemini and Perplexity',
    'Who AI recommends instead of you',
    'Your AI readability score',
    'The top 3 fixes, ranked by impact',
  ],
  dpdp: [
    'What your app and website do today with personal data',
    'Where that falls short of the DPDP Act and Rules',
    'What to build first before May 2027',
  ],
  both: [
    'Whether ChatGPT, Gemini and Perplexity recommend you, and who they name instead',
    'Your AI readability score',
    'Where your app falls short of the DPDP Act and Rules',
    'The fixes to make first, across both',
  ],
  unsure: [
    'Whether AI tools recommend your business',
    'Whether your app is ready for India’s data law',
    'Whether your app holds up in production',
    'Which of these is worth fixing first',
  ],
};

/** The lead, to Anadi. Reply-To is the visitor, so answering it answers them. */
export function renderAuditLeadEmail(intake: AuditIntake, due: Date): { subject: string; html: string } {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
  const wa = intake.whatsapp
    ? `<a href="https://wa.me/${esc(intake.whatsapp.replace('+', ''))}">${esc(intake.whatsapp)}</a>`
    : '<em>Not given</em>';

  return {
    subject: `${TYPE_LABEL[intake.type]} audit: ${intake.business} (${hostOf(intake.url)}), due ${formatDue(due)}`,
    html: wrap(
      `<h2 style="margin:0 0 12px">New ${esc(TYPE_LABEL[intake.type])} audit request</h2>
<table style="border-collapse:collapse">
${row('Name', esc(intake.name))}
${row('Business', esc(intake.business))}
${row('Site', `<a href="${esc(intake.url)}">${esc(intake.url)}</a>`)}
${row('Sells', esc(intake.sells))}
${row('Customers in', esc(intake.market))}
${row('Email', esc(intake.email))}
${row('WhatsApp', wa)}
${row('Report due', `<strong>${esc(formatDue(due))}</strong>`)}
</table>
<h3 style="margin:20px 0 4px">What they're worried about</h3>
<p style="white-space:pre-wrap">${intake.worries ? esc(intake.worries) : '<em>Nothing added.</em>'}</p>`,
    ),
  };
}

/** The receipt, to the visitor. It restates exactly what was promised and nothing more. */
export function renderAuditConfirmEmail(intake: AuditIntake, due: Date): { subject: string; html: string } {
  const first = intake.name.split(/\s+/)[0];
  return {
    subject: `Got it, ${first}: your audit of ${intake.business} lands by ${formatDue(due)}`,
    html: wrap(
      `<p>Hi ${esc(first)},</p>
<p>Thanks for asking. I'll look at <strong>${esc(hostOf(intake.url))}</strong> myself, using only what's publicly visible, and send your report to this address by <strong>${esc(formatDue(due))}</strong>. It covers:</p>
<ul>${COVERS[intake.type].map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
<p>You'll get a short video walkthrough and a one-page report in plain English. If something is worth fixing, it ends with one fixed price. If nothing is, I'll tell you that too, and you owe nothing either way.</p>
<p>If you'd like to talk it through when it arrives, just reply. No pressure either way.</p>
<p>Anadi<br><span style="color:#6b6b6b">anadithakur.in</span></p>
<p style="color:#6b6b6b;font-size:12px">You're getting this because you asked for a free first-bug review at anadithakur.in/audit. Your details are used only to send this report. Reply "delete" and I'll erase them.</p>`,
    ),
  };
}
