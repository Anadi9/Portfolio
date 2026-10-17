/**
 * Bit's AI answer for one typed question: the model call, its fallback model,
 * and every check between the model's output and the visitor.
 *
 * The contract is `{ answer, route }`. The answer must pass the price guard
 * (`prices.ts`); the route must be one of the chat's flow starts (`AI_ROUTES`),
 * or the keyword route (`classify`) replaces it. Any failure — provider error,
 * timeout, empty or over-long answer, an unpublished price — returns a reason
 * instead, and the chat falls back to its scripted reply.
 *
 * Privacy: the model gets the question (emails and phone numbers masked), the
 * chat node and the button answers. Nothing typed into the ticket form, and
 * nothing here logs the question.
 */
import { gateway, generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { systemPrompt } from './knowledge.js';
import { AI_ROUTES, ANSWER_KEYS, isAiRoute, MAX_QUESTION, NODE_IDS, type AiRoute } from './nodes.js';
import { guardPrices } from './prices.js';
import { classify } from './route.js';

/** Small, fast, structured-output model on the AI Gateway; doesn't train on prompts. */
export const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5';
/** Groq-served on the AI Gateway (routing pinned to Groq below); doesn't train on prompts. */
export const DEFAULT_FALLBACK_MODEL = 'openai/gpt-oss-20b';

/** Whole budget for an answer, both models included. */
export const TIMEOUT_MS = 8000;
/** The primary's share, so a hung primary still leaves the fallback time to answer. */
export const PRIMARY_TIMEOUT_MS = 5000;
/** The prompt asks for 80; past this the answer is dropped, not cut mid-sentence. */
export const MAX_WORDS = 100;

const answerShape = Object.fromEntries(ANSWER_KEYS.map((k) => [k, z.string().trim().max(80).optional()])) as Record<
  (typeof ANSWER_KEYS)[number],
  z.ZodOptional<z.ZodString>
>;

/** The request body. Unknown answer keys are dropped, so nothing but button labels can reach the model. */
export const AskBodySchema = z.object({
  question: z.string().trim().min(1, 'Type a question first.').max(MAX_QUESTION, 'That question is too long.'),
  node: z.enum(NODE_IDS).optional(),
  answers: z.object(answerShape).strip().optional(),
  count: z.number().int().min(0).max(1000).default(0),
  hp: z.string().optional(),
});

export type AskInput = z.infer<typeof AskBodySchema>;

/** What the model must return. `route` is a plain string so a bad route costs the route, not the answer. */
export const ReplySchema = z.object({
  answer: z.string().describe('The reply to the visitor: plain, friendly English, at most 80 words, no markdown.'),
  route: z.string().describe(`Where the chat continues. Exactly one of: ${AI_ROUTES.join(', ')}.`),
});

type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]['providerOptions']>;

export type Attempt = { label: string; model: LanguageModel; providerOptions?: ProviderOptions };

export type AskResult =
  | { ok: true; answer: string; route: AiRoute; routeFrom: 'model' | 'keywords'; model: string }
  | { ok: false; reason: 'guard' | 'too_long' | 'empty' | 'timeout' | 'error'; model?: string };

/** Env, read once per request. On Vercel the gateway can authenticate with OIDC instead of a key. */
export function aiConfig(env: Record<string, string | undefined> = process.env) {
  const auth = Boolean(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim() || env.VERCEL === '1');
  return {
    on: env.BIT_AI === 'on' && auth,
    model: env.BIT_AI_MODEL?.trim() || DEFAULT_MODEL,
    fallbackModel: env.BIT_AI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL,
  };
}

/** Both providers through the AI Gateway; the fallback is pinned to Groq. Neither may train on the prompt. */
export function gatewayAttempts(cfg: { model: string; fallbackModel: string }): Attempt[] {
  const base = { disallowPromptTraining: true, tags: ['bit-ask'] };
  return [
    { label: cfg.model, model: gateway(cfg.model), providerOptions: { gateway: base } },
    { label: `${cfg.fallbackModel} (groq)`, model: gateway(cfg.fallbackModel), providerOptions: { gateway: { ...base, only: ['groq'] } } },
  ];
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;

/** Mask contact details someone typed into the question anyway. Prices (`$1,500–$2,500`) don't match `PHONE`: they have no long digit runs. */
export function redact(q: string): string {
  return q.replace(EMAIL, '[email]').replace(PHONE, (m) => (m.replace(/\D/g, '').length >= 9 ? '[phone]' : m));
}

export function userPrompt(input: Pick<AskInput, 'question' | 'node' | 'answers'>): string {
  const answers = ANSWER_KEYS.filter((k) => input.answers?.[k]).map((k) => `${k}: ${input.answers![k]}`);
  return [
    `Visitor's question: """${redact(input.question)}"""`,
    `Where they are in the chat: ${input.node ?? 'start'}`,
    `Buttons they tapped so far: ${answers.length ? answers.join('; ') : 'none'}`,
  ].join('\n');
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The keyword route for a question, as an AI route (`tour` isn't one; the menu is). */
export function keywordRoute(question: string): AiRoute {
  const n = classify(question).node;
  return isAiRoute(n) ? n : 'start';
}

/** Check one model output. Exported for tests; `answerQuestion` is the entry point. */
export function vet(output: { answer?: string; route?: string }, question: string, model: string): AskResult {
  const answer = (output.answer ?? '').replace(/\s+/g, ' ').trim();
  if (!answer) return { ok: false, reason: 'empty', model };
  if (words(answer) > MAX_WORDS) return { ok: false, reason: 'too_long', model };
  if (!guardPrices(answer).ok) return { ok: false, reason: 'guard', model };
  const route = (output.route ?? '').trim();
  return isAiRoute(route)
    ? { ok: true, answer, route, routeFrom: 'model', model }
    : { ok: true, answer, route: keywordRoute(question), routeFrom: 'keywords', model };
}

/**
 * Ask the primary model, then the fallback on an error or the primary's
 * timeout. A model that answers but fails the checks is not retried: the
 * scripted reply is the safer fallback for a bad answer.
 */
export async function answerQuestion(
  input: Pick<AskInput, 'question' | 'node' | 'answers'>,
  attempts: Attempt[],
  timing: { totalMs?: number; primaryMs?: number } = {},
): Promise<AskResult> {
  const total = AbortSignal.timeout(timing.totalMs ?? TIMEOUT_MS);
  const instructions = systemPrompt();
  const prompt = userPrompt(input);
  let last: AskResult = { ok: false, reason: 'error' };

  for (const [i, attempt] of attempts.entries()) {
    if (total.aborted) return { ok: false, reason: 'timeout', model: last.model };
    const signal = i === 0 ? AbortSignal.any([total, AbortSignal.timeout(timing.primaryMs ?? PRIMARY_TIMEOUT_MS)]) : total;
    try {
      const { output } = await generateText({
        model: attempt.model,
        instructions,
        prompt,
        output: Output.object({ name: 'BitReply', schema: ReplySchema }),
        maxOutputTokens: 400,
        maxRetries: 0,
        abortSignal: signal,
        providerOptions: attempt.providerOptions,
      });
      return vet(output, input.question, attempt.label);
    } catch {
      last = { ok: false, reason: signal.aborted ? 'timeout' : 'error', model: attempt.label };
    }
  }
  return last;
}
