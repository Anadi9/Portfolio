import { kindLabel } from '../notify/email.js';
import { promiseHours } from '../../data/promises.js';
import type { TicketKind } from '../tickets/types.js';
import type { Brief } from './brief.js';

/**
 * The first reply Anadi sends, drafted from the brief with no AI. It stays a
 * draft: Anadi records the video, fills the price and sends it from /admin,
 * which refuses to send while a placeholder is left.
 */

export const VIDEO_PLACEHOLDER = '[PASTE LOOM LINK]';
export const PRICE_PLACEHOLDER = '[PRICE]';

const MAX_BODY = 1500;

export const hasPlaceholder = (body: string) => body.includes('[PASTE') || body.includes('[ANADI') || body.includes(PRICE_PLACEHOLDER);

export function draftFirstReply(input: {
  number: string;
  kind: TicketKind;
  name: string | null;
  appUrl: string | null;
  brief: Brief;
}): { subject: string; body: string } {
  const hi = input.name?.trim() ? `Hi ${input.name.trim()},` : 'Hi,';
  const app = input.appUrl?.trim() || 'your app';

  if (input.kind === 'first_bug') {
    const body = [
      hi,
      '',
      `I looked at ${app}. The biggest risk I found: ${input.brief.topRisk || 'see the video'}`,
      '',
      `Here's a short video walking through it: ${VIDEO_PLACEHOLDER}`,
      '',
      `Fixed price to fix it: ${PRICE_PLACEHOLDER}`,
      '',
      `If you'd like the full picture first, the $349 production audit checks everything and is credited 100% toward the fix if you book within ${promiseHours('audit_credit') / 24} days.`,
      '',
      'Reply to this email with any questions.',
      '',
      'Anadi',
    ].join('\n');
    return { subject: `Your first bug: ${app} (${input.number})`, body: body.slice(0, MAX_BODY) };
  }

  const questions = input.brief.questions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`);
  const body = [
    hi,
    '',
    `Thanks for your ${kindLabel(input.kind).toLowerCase()} request (${input.number}). A few questions so I can scope it properly:`,
    '',
    ...(questions.length ? questions : ['1. What is the one thing that must work first?']),
    '',
    'Anadi',
  ].join('\n');
  return { subject: `Your request ${input.number}: a few questions`, body: body.slice(0, MAX_BODY) };
}

/** `messages` has no subject column, so a stored draft is `Subject: …` + blank line + body. */
export const joinDraft = (d: { subject: string; body: string }) => `Subject: ${d.subject.replace(/\s+/g, ' ').trim()}\n\n${d.body}`;

export function splitDraft(stored: string): { subject: string; body: string } {
  const m = /^Subject: (.*)\n\n([\s\S]*)$/.exec(stored);
  return m ? { subject: m[1], body: m[2] } : { subject: '', body: stored };
}
