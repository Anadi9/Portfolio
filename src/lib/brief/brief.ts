import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiConfig, gatewayAttempts, redact, type Attempt } from '../bit/ai.js';
import { aiEnabled } from '../bit/ai-env.js';
import { guardPrices, priceTable } from '../bit/prices.js';
import { PRICE_GROUPS } from '../../data/bitsQuestFacts.js';
import type { TicketKind } from '../tickets/types.js';
import type { LeadScan } from './scan.js';

/**
 * The brief Anadi reads before replying to a lead: what they have, what's
 * wrong, what to ask. The model writes words only. It never sees the client's
 * name, email, phone or company, and any field that names an amount is
 * dropped, so a price can only ever come from Anadi.
 */

export const BriefSchema = z.object({
  summary: z.string(),
  stack: z.string(),
  situation: z.string(),
  topRisk: z.string(),
  risks: z.array(z.string()),
  redFlags: z.array(z.string()),
  approach: z.string(),
  likelyPackage: z.string(),
  missingInfo: z.array(z.string()),
  questions: z.array(z.string()),
});

export type Brief = z.infer<typeof BriefSchema> & { source: 'ai' | 'fallback'; model?: string };

export type BriefInput = {
  kind: TicketKind;
  stack: string | null;
  appUrl: string | null;
  answers: Record<string, unknown>;
  budget: string | null;
  scan: LeadScan;
};

const MAX_TEXT = 400;
const MAX_ITEMS = 5;
const TOTAL_MS = 20_000;
const PRIMARY_MS = 12_000;

const PACKAGES = PRICE_GROUPS.flatMap((g) => g.packages.map((p) => p.name));

/** Any currency sign or amount at all: the brief talks scope, never money. */
const MONEY = /[$₹€£]|\b(?:usd|inr|rs\.?|rupees?|dollars?)\b/i;
const clean = (s: unknown) => {
  const t = typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
  return t && (MONEY.test(t) || !guardPrices(t).ok) ? '' : t;
};
const cleanList = (a: unknown) => (Array.isArray(a) ? a.map(clean).filter(Boolean).slice(0, MAX_ITEMS) : []);

function tidy(raw: z.infer<typeof BriefSchema>, source: Brief['source'], model?: string): Brief {
  const pkg = PACKAGES.find((p) => p.toLowerCase() === raw.likelyPackage?.trim().toLowerCase());
  return {
    summary: clean(raw.summary),
    stack: clean(raw.stack),
    situation: clean(raw.situation),
    topRisk: clean(raw.topRisk),
    risks: cleanList(raw.risks),
    redFlags: cleanList(raw.redFlags),
    approach: clean(raw.approach),
    likelyPackage: pkg ?? 'unknown',
    missingInfo: cleanList(raw.missingInfo),
    questions: cleanList(raw.questions),
    source,
    ...(model ? { model } : {}),
  };
}

const answerLines = (answers: Record<string, unknown>) =>
  Object.entries(answers ?? {})
    .slice(0, 30)
    .map(([k, v]) => `${k}: ${redact(typeof v === 'string' ? v : JSON.stringify(v)).slice(0, 300)}`);

function scanLines(scan: LeadScan): string[] {
  if ('error' in scan) return [`Scan: not available (${scan.error})`];
  const lines = [`AI-readiness score: ${scan.readiness.score}/100`];
  for (const f of scan.readiness.topFixes) lines.push(`- ${f.label}${f.fix ? `: ${f.fix}` : ''}`);
  if (scan.headers) lines.push(`Missing security headers: ${scan.headers.missing.join(', ') || 'none'}`);
  return lines;
}

export function briefPrompt(input: BriefInput): string {
  return [
    `Request type: ${input.kind}`,
    `Stack: ${input.stack ? redact(input.stack) : 'unknown'}`,
    `App: ${input.appUrl ?? 'not given'}`,
    `Budget band they picked: ${input.budget ? redact(input.budget) : 'not given'}`,
    'Their answers:',
    ...answerLines(input.answers),
    '',
    'Outside-in scan of the app:',
    ...scanLines(input.scan),
  ].join('\n');
}

const SYSTEM = [
  'You are a senior engineer who reviews apps built with AI tools (Lovable, Bolt, Cursor, Claude Code) before they launch.',
  'Write a short internal brief for Anadi, who will reply to this lead. Plain English, no hype.',
  'Rank risks by business impact. Say "unknown" rather than guess.',
  'Never state a price, an amount or a discount. likelyPackage must be exactly one of these names, or "unknown":',
  PACKAGES.join(', '),
  'Packages, for scope only:',
  priceTable(),
  `Each text field at most ${MAX_TEXT} characters; each list at most ${MAX_ITEMS} items.`,
].join('\n');

export function fallbackBrief(input: BriefInput): Brief {
  const scan = input.scan;
  const topRisk = 'error' in scan ? `Not scanned: ${scan.error}` : (scan.readiness.topFixes[0]?.label ?? 'No issue found by the outside-in scan');
  return tidy(
    {
      summary: `${input.kind} request${input.stack ? ` (${input.stack})` : ''}${input.appUrl ? ` for ${input.appUrl}` : ''}.`,
      stack: input.stack ?? 'unknown',
      situation: answerLines(input.answers).join('; ') || 'No answers given.',
      topRisk,
      risks: 'error' in scan ? [] : scan.readiness.topFixes.map((f) => f.label),
      redFlags: [],
      approach: 'unknown',
      likelyPackage: 'unknown',
      missingInfo: input.appUrl ? [] : ['App link'],
      questions: ['What is the one thing that must work before launch?', 'Can you share repo or read-only access?'],
    },
    'fallback',
  );
}

export async function writeBrief(
  input: BriefInput,
  attempts?: Attempt[],
  env: Record<string, string | undefined> = process.env,
): Promise<Brief> {
  if (!aiEnabled(env)) return fallbackBrief(input);
  const list = attempts ?? gatewayAttempts(aiConfig(env), 'lead-brief');
  const total = AbortSignal.timeout(TOTAL_MS);
  const prompt = briefPrompt(input);
  for (const [i, attempt] of list.entries()) {
    if (total.aborted) break;
    const signal = i === 0 ? AbortSignal.any([total, AbortSignal.timeout(PRIMARY_MS)]) : total;
    try {
      const { output } = await generateText({
        model: attempt.model,
        instructions: SYSTEM,
        prompt,
        output: Output.object({ name: 'LeadBrief', schema: BriefSchema }),
        maxOutputTokens: 1200,
        maxRetries: 0,
        abortSignal: signal,
        providerOptions: attempt.providerOptions,
      });
      return tidy(output, 'ai', attempt.label);
    } catch {
      // next attempt, then the fallback
    }
  }
  return fallbackBrief(input);
}
