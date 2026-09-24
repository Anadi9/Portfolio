/**
 * The Vibe Code Rescue audit request: what the form collects, what the server
 * accepts, and the two emails it produces.
 *
 * The homepage (`/`, the rescue offer; `/rescue` 301s there) promises an audit
 * of the visitor's actual app ("send your app link or repo") with a
 * plain-English report inside 48 hours. This module is what makes that promise
 * literal: the link is required, the deadline is computed once here and quoted
 * identically on the page and in both emails, and the symptom list is the same
 * array the homepage tally renders, so a ticked row arrives in the inbox as the
 * sentence the visitor actually ticked.
 *
 * Order in `SYMPTOMS` is load-bearing twice over. The tally hands ticks to the
 * form as indices (`?s=0,3`), and the catch-all "The audit" row is written to
 * read as the last line of the list, so new symptoms go in above it.
 *
 * Pure and dependency-free, because `api/rescue-audit.ts` loads it under
 * Node's ESM resolver as well as the browser loading it through Vite.
 */

export const SYMPTOMS = [
  { line: "Users sign up, then can't log in.", area: 'Auth' },
  { line: 'Your Supabase tables are open to anyone who knows where to look.', area: 'Database' },
  { line: 'It works locally but breaks on Vercel.', area: 'Deployment' },
  { line: 'Every new prompt fixes one thing and breaks two others.', area: 'Stability' },
  // Lovable and Bolt ship client-rendered SPAs: a crawler that doesn't run
  // JavaScript, which includes most AI answer engines, gets an empty <div>.
  { line: "Google and ChatGPT can't see it.", area: 'Visibility' },
  { line: "You're scared to show it to real customers.", area: 'The audit' },
] as const;

export const TOOLS = ['Lovable', 'Bolt', 'Cursor', 'v0', 'Replit', 'Something else'] as const;
export type Tool = (typeof TOOLS)[number];

/** The turnaround the homepage quotes. */
export const TURNAROUND_HOURS = 48;

export const NOTES_MAX = 2000;

export type Intake = {
  appUrl: string;
  repoUrl: string | null;
  tool: Tool;
  /** Indices into `SYMPTOMS`, sorted and unique. */
  symptoms: number[];
  notes: string;
  email: string;
};

export type Parsed = { ok: true; intake: Intake } | { ok: false; field: keyof Intake; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Accepts what people actually paste: `myapp.lovable.app`, a full URL, or one
 * with trailing spaces. Returns a normalised https URL, or null. Only http(s)
 * with a dotted host passes, so `javascript:` and `localhost` never reach an
 * email as a link.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.') || url.hostname.endsWith('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** `?s=0,3` from the homepage tally, tolerant of junk: bad entries are dropped. */
export function parseSymptomParam(param: string | null): number[] {
  if (!param) return [];
  const picked = param
    .split(',')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < SYMPTOMS.length);
  return [...new Set(picked)].sort((a, b) => a - b);
}

export function parseIntake(body: unknown): Parsed {
  const b = (body ?? {}) as Record<string, unknown>;

  const appUrl = typeof b.appUrl === 'string' ? normalizeUrl(b.appUrl) : null;
  if (!appUrl) return { ok: false, field: 'appUrl', error: 'Add the link to your live app.' };

  let repoUrl: string | null = null;
  if (typeof b.repoUrl === 'string' && b.repoUrl.trim()) {
    repoUrl = normalizeUrl(b.repoUrl);
    if (!repoUrl) return { ok: false, field: 'repoUrl', error: "That repo link doesn't look right." };
  }

  const tool = TOOLS.find((t) => t === b.tool);
  if (!tool) return { ok: false, field: 'tool', error: 'Pick the tool you built it with.' };

  const rawSymptoms = Array.isArray(b.symptoms) ? b.symptoms : [];
  if (
    rawSymptoms.length > SYMPTOMS.length ||
    !rawSymptoms.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < SYMPTOMS.length)
  ) {
    return { ok: false, field: 'symptoms', error: 'Invalid symptoms.' };
  }
  const symptoms = [...new Set(rawSymptoms as number[])].sort((x, y) => x - y);

  const notes = typeof b.notes === 'string' ? b.notes.trim() : '';
  if (notes.length > NOTES_MAX) return { ok: false, field: 'notes', error: `Keep it under ${NOTES_MAX} characters.` };

  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (email.length > 254 || !EMAIL.test(email)) {
    return { ok: false, field: 'email', error: "That doesn't look like an email address." };
  }

  return { ok: true, intake: { appUrl, repoUrl, tool, symptoms, notes, email } };
}

export function dueBy(now: Date): Date {
  return new Date(now.getTime() + TURNAROUND_HOURS * 3600_000);
}

/**
 * "Thu 25 Sep, 3pm EST". Always US Eastern, because that is the clock the
 * homepage hours card is quoted in, and a deadline in the reader's own zone
 * on the page but Eastern in the email would read as two different promises.
 */
export function formatDue(due: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    hour12: true,
  }).formatToParts(due);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')}, ${get('hour')}${get('dayPeriod').toLowerCase()} EST`;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const hostOf = (url: string) => new URL(url).hostname;

const wrap = (inner: string) =>
  `<div style="font:15px/1.55 Helvetica,Arial,sans-serif;color:#0a0a0a;max-width:560px">${inner}</div>`;

/** The lead, to Anadi. Reply-To is the visitor, so answering it answers them. */
export function renderLeadEmail(intake: Intake, due: Date): { subject: string; html: string } {
  const symptomList = intake.symptoms.length
    ? `<ul>${intake.symptoms.map((i) => `<li>${esc(SYMPTOMS[i].line)} <em>(${SYMPTOMS[i].area})</em></li>`).join('')}</ul>`
    : '<p><em>None ticked.</em></p>';
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b6b6b;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>`;

  return {
    subject: `Rescue audit: ${hostOf(intake.appUrl)} (${intake.tool}), due ${formatDue(due)}`,
    html: wrap(
      `<h2 style="margin:0 0 12px">New audit request</h2>
<table style="border-collapse:collapse">
${row('App', `<a href="${esc(intake.appUrl)}">${esc(intake.appUrl)}</a>`)}
${row('Repo', intake.repoUrl ? `<a href="${esc(intake.repoUrl)}">${esc(intake.repoUrl)}</a>` : '<em>Not shared</em>')}
${row('Built with', esc(intake.tool))}
${row('Email', esc(intake.email))}
${row('Report due', `<strong>${esc(formatDue(due))}</strong>`)}
</table>
<h3 style="margin:20px 0 4px">Symptoms</h3>${symptomList}
<h3 style="margin:20px 0 4px">In their words</h3>
<p style="white-space:pre-wrap">${intake.notes ? esc(intake.notes) : '<em>Nothing added.</em>'}</p>`,
    ),
  };
}

/** The receipt, to the visitor. It restates exactly what was promised and nothing more. */
export function renderConfirmEmail(intake: Intake, due: Date): { subject: string; html: string } {
  const host = hostOf(intake.appUrl);
  return {
    subject: `Got it: your audit of ${host} lands by ${formatDue(due)}`,
    html: wrap(
      `<p>Hi,</p>
<p>Thanks for sending <strong>${esc(host)}</strong>. I'll go through it myself and send a plain-English report to this address by <strong>${esc(formatDue(due))}</strong>:</p>
<ul>
<li><strong>Fix now</strong>: what's broken or exposed today</li>
<li><strong>Risky</strong>: what will break once real users arrive</li>
<li><strong>Can wait</strong>: what's fine for launch</li>
</ul>
<p>If there's something worth fixing, the report ends with one fixed price for it. If there isn't, I'll tell you that too, and you owe nothing either way.</p>
${
  intake.repoUrl
    ? '<p>If the repo is private, add <strong>Anadi9</strong> on GitHub as a read-only collaborator. You can remove access the moment we are done.</p>'
    : "<p>You didn't share a repo, which is fine: I'll audit what's reachable from the live app. If you want a deeper look, reply with the repo link and add <strong>Anadi9</strong> on GitHub as a read-only collaborator.</p>"
}
<p>Anything else I should know? Just reply to this email.</p>
<p>Anadi<br><span style="color:#6b6b6b">Vibe Code Rescue · anadithakur.in</span></p>`,
    ),
  };
}
