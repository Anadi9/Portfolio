import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRateLimiter, clientIp, type Limiter } from '../scan/rate-limit.js';
import { aiConfig, answerQuestion, AskBodySchema, gatewayAttempts, type Attempt } from './ai.js';
import { MAX_AI_REPLIES } from './nodes.js';

/**
 * POST /api/bit/ask — `api/bit/ask.ts` is this handler wrapped in `withErrorLog`.
 *
 * 200 { answer, route }       an AI answer that passed every check
 * 200 { fallback: reason }    the model failed, timed out or broke a rule; the chat uses its scripted reply
 * 400 { error, field } | 405 | 429 { error } | 501 { error: 'ai answers not configured' }
 *
 * Logs one line per answer: route, latency, model and outcome. Never the question.
 */

type Deps = {
  env?: Record<string, string | undefined>;
  attempts?: (cfg: ReturnType<typeof aiConfig>) => Attempt[];
  timing?: { totalMs?: number; primaryMs?: number };
  perMinute?: Limiter;
  perHour?: Limiter;
  now?: () => number;
  log?: (line: string) => void;
};

export function createAskHandler(deps: Deps = {}) {
  /** 10 questions a minute per IP: one visitor typing fast, not a script. */
  const perMinute = deps.perMinute ?? createRateLimiter(10, 60_000);
  /** 30 AI answers an hour per IP: five conversations' worth at the 6-answer cap, enforced even if the client lies. */
  const perHour = deps.perHour ?? createRateLimiter(30, 3_600_000);
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.info(line));

  return async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method not allowed' });
    }
    res.setHeader('Cache-Control', 'no-store');

    const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
    const hp = (body as { hp?: unknown } | null)?.hp;
    if (typeof hp === 'string' && hp.length > 0) return res.status(200).json({ fallback: 'hp' });

    const cfg = aiConfig(deps.env ?? process.env);
    if (!cfg.on) return res.status(501).json({ error: 'ai answers not configured' });

    const ip = clientIp(req.headers ?? {});
    if (!perMinute.allow(ip)) return res.status(429).json({ error: 'Too many questions from here. Give it a minute.' });

    const parsed = AskBodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message ?? 'invalid request', field: String(issue?.path[0] ?? '') });
    }
    if (parsed.data.count >= MAX_AI_REPLIES) return res.status(429).json({ error: 'AI answer limit reached for this chat.' });
    if (!perHour.allow(ip)) return res.status(429).json({ error: 'AI answer limit reached for now.' });

    const started = now();
    const result = await answerQuestion(parsed.data, (deps.attempts ?? gatewayAttempts)(cfg), deps.timing);
    const ms = now() - started;
    if ('answer' in result) {
      log(`[bit-ask] ${JSON.stringify({ outcome: 'answer', route: result.route, routeFrom: result.routeFrom, model: result.model, ms })}`);
      return res.status(200).json({ answer: result.answer, route: result.route });
    }
    log(`[bit-ask] ${JSON.stringify({ outcome: result.reason, model: result.model ?? null, ms })}`);
    return res.status(200).json({ fallback: result.reason });
  };
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
