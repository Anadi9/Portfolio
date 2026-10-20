import type { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { aiConfig, answerQuestion, AskBodySchema, DEFAULT_FALLBACK_MODEL, DEFAULT_MODEL, gatewayAttempts, redact, userPrompt, vet, type Attempt } from './ai';
import { systemPrompt } from './knowledge';
import { failing, hanging, replying } from './mock-models';
import { AI_ROUTES } from './nodes';

const attempts = (...models: MockLanguageModelV4[]): Attempt[] => models.map((model, i) => ({ label: i === 0 ? 'primary' : 'fallback', model }));
const input = { question: 'Can you fix my Supabase login?' };

describe('answerQuestion', () => {
  it('returns the answer and the model’s route when both are good', async () => {
    const primary = replying({ answer: 'Yes. Anadi fixes login and access rules all the time. Start with the free first-bug video.', route: 'prod' });
    const r = await answerQuestion(input, attempts(primary, failing()));
    expect(r).toEqual({ ok: true, answer: expect.stringContaining('free first-bug video'), route: 'prod', routeFrom: 'model', model: 'primary' });
    expect(primary.doGenerateCalls).toHaveLength(1);
  });

  it('sends the grounded system prompt and a structured-output request', async () => {
    const primary = replying({ answer: 'Hi.', route: 'start' });
    await answerQuestion(input, attempts(primary));
    const call = primary.doGenerateCalls[0];
    expect(JSON.stringify(call.prompt)).toContain('Price list (the only prices that exist)');
    expect(call.responseFormat).toMatchObject({ type: 'json' });
  });

  it('keeps the answer but swaps an unknown or mid-flow route for the keyword route', async () => {
    for (const route of ['checkout', 'qurl', 'recProd', '']) {
      const r = await answerQuestion(input, attempts(replying({ answer: 'Anadi can help with that.', route })));
      expect(r, route).toMatchObject({ ok: true, answer: 'Anadi can help with that.', route: 'prod', routeFrom: 'keywords' });
    }
  });

  it('maps a keyword route of "tour" to the menu', async () => {
    const r = await answerQuestion({ question: 'show me around' }, attempts(replying({ answer: 'Sure.', route: 'nope' })));
    expect(r).toMatchObject({ ok: true, route: 'start', routeFrom: 'keywords' });
  });

  it('rejects an answer with an unpublished price and does not retry it', async () => {
    const fallback = replying({ answer: 'Fine.', route: 'start' });
    const r = await answerQuestion(input, attempts(replying({ answer: 'That fix is about $900.', route: 'prod' }), fallback));
    expect(r).toEqual({ ok: false, reason: 'guard', model: 'primary' });
    expect(fallback.doGenerateCalls).toHaveLength(0);
  });

  it('rejects rupee amounts, empty answers and answers far over 80 words', async () => {
    expect(await answerQuestion(input, attempts(replying({ answer: 'About ₹29,000.', route: 'prod' })))).toMatchObject({ ok: false, reason: 'guard' });
    expect(await answerQuestion(input, attempts(replying({ answer: '   ', route: 'prod' })))).toMatchObject({ ok: false, reason: 'empty' });
    expect(await answerQuestion(input, attempts(replying({ answer: 'word '.repeat(101), route: 'prod' })))).toMatchObject({ ok: false, reason: 'too_long' });
  });

  it('falls back to the second model when the first errors', async () => {
    const fallback = replying({ answer: 'Anadi can look at it.', route: 'hunt' });
    const r = await answerQuestion(input, attempts(failing(), fallback));
    expect(r).toMatchObject({ ok: true, route: 'hunt', model: 'fallback' });
  });

  it('treats output that doesn’t match the schema as an error and tries the fallback', async () => {
    const r = await answerQuestion(input, attempts(replying('not json at all'), replying({ answer: 'Hi.', route: 'start' })));
    expect(r).toMatchObject({ ok: true, model: 'fallback' });
  });

  it('falls back when the first model times out', async () => {
    const r = await answerQuestion(input, attempts(hanging(), replying({ answer: 'Hi.', route: 'start' })), { totalMs: 1000, primaryMs: 30 });
    expect(r).toMatchObject({ ok: true, model: 'fallback' });
  });

  it('gives up with "timeout" when the whole budget runs out', async () => {
    const started = Date.now();
    const r = await answerQuestion(input, attempts(hanging(), hanging()), { totalMs: 60, primaryMs: 30 });
    expect(r).toEqual({ ok: false, reason: 'timeout', model: 'fallback' });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('gives up with "error" when both models fail', async () => {
    expect(await answerQuestion(input, attempts(failing(), failing()))).toEqual({ ok: false, reason: 'error', model: 'fallback' });
  });
});

describe('vet', () => {
  it('collapses whitespace in the answer', () => {
    expect(vet({ answer: ' Hello\n\nthere ', route: 'start' }, 'hi', 'm')).toMatchObject({ ok: true, answer: 'Hello there' });
  });
});

describe('privacy of what reaches the model', () => {
  it('masks emails and phone numbers in the question, but not prices', () => {
    expect(redact('mail me at jo@example.com or +1 (555) 123-4567')).toBe('mail me at [email] or [phone]');
    expect(redact('is it $1,500–$2,500 or 2–3 weeks?')).toBe('is it $1,500–$2,500 or 2–3 weeks?');
  });

  it('sends only the question, the node and known button answers', () => {
    const body = AskBodySchema.parse({
      question: 'How much is the audit? I’m jo@example.com',
      node: 'prod2',
      answers: { stack: 'Replit', budget: 'Not sure yet', email: 'jo@example.com', appUrl: 'https://secret.app' },
      count: 1,
    });
    expect(body.answers).toEqual({ stack: 'Replit', budget: 'Not sure yet' });
    const p = userPrompt(body);
    expect(p).toContain('stack: Replit; budget: Not sure yet');
    expect(p).toContain('Where they are in the chat: prod2');
    expect(p).not.toMatch(/jo@example\.com|secret\.app/);
  });

  it('caps the question at 500 characters and refuses unknown nodes', () => {
    expect(AskBodySchema.safeParse({ question: 'x'.repeat(501) }).success).toBe(false);
    expect(AskBodySchema.safeParse({ question: 'x'.repeat(500) }).success).toBe(true);
    expect(AskBodySchema.safeParse({ question: 'hi', node: 'admin' }).success).toBe(false);
    expect(AskBodySchema.safeParse({ question: '   ' }).success).toBe(false);
  });
});

describe('system prompt', () => {
  const p = systemPrompt();

  it('is grounded in the page’s facts and pricing rules', () => {
    for (const s of ['$349', 'Launch-ready sprint', 'Fixed quote', 'The Wrapper Test', 'Is Bit a real person?']) expect(p).toContain(s);
    const facts = p.slice(p.indexOf('Price list'));
    for (const s of ['$1,500', '$299', '$149', 'refund', 'credited', 'half']) expect(facts).not.toContain(s);
    expect(p).toMatch(/The audit is the only priced item/);
    expect(p).toMatch(/Never talk about payment terms, deposits, invoices, refunds or credits/);
    expect(p).toMatch(/never give a custom quote/i);
    expect(p).toMatch(/at most 80 words/);
  });

  it('lists every route the model may pick', () => {
    for (const r of AI_ROUTES) expect(p).toContain(`- ${r}: `);
  });
});

describe('config', () => {
  it('is off without BIT_AI=on, or without a key or OIDC', () => {
    expect(aiConfig({}).on).toBe(false);
    expect(aiConfig({ AI_GATEWAY_API_KEY: 'k' }).on).toBe(false);
    expect(aiConfig({ BIT_AI: 'on' }).on).toBe(false);
    expect(aiConfig({ BIT_AI: 'yes', AI_GATEWAY_API_KEY: 'k' }).on).toBe(false);
    expect(aiConfig({ BIT_AI: 'on', AI_GATEWAY_API_KEY: 'k' }).on).toBe(true);
    expect(aiConfig({ BIT_AI: 'on', VERCEL_OIDC_TOKEN: 't' }).on).toBe(true);
    expect(aiConfig({ BIT_AI: 'on', VERCEL: '1' }).on).toBe(true);
  });

  it('reads both model ids from env, with defaults', () => {
    expect(aiConfig({})).toMatchObject({ model: DEFAULT_MODEL, fallbackModel: DEFAULT_FALLBACK_MODEL });
    expect(aiConfig({ BIT_AI_MODEL: 'google/gemini-3.1-flash-lite', BIT_AI_FALLBACK_MODEL: 'openai/gpt-oss-120b' })).toMatchObject({
      model: 'google/gemini-3.1-flash-lite',
      fallbackModel: 'openai/gpt-oss-120b',
    });
  });

  it('routes through the gateway, pins the fallback to Groq and refuses prompt training on both', () => {
    const [primary, fallback] = gatewayAttempts({ model: DEFAULT_MODEL, fallbackModel: DEFAULT_FALLBACK_MODEL });
    expect(primary.providerOptions).toEqual({ gateway: { disallowPromptTraining: true, tags: ['bit-ask'] } });
    expect(fallback.providerOptions).toEqual({ gateway: { disallowPromptTraining: true, tags: ['bit-ask'], only: ['groq'] } });
    expect(fallback.label).toBe(`${DEFAULT_FALLBACK_MODEL} (groq)`);
  });
});
