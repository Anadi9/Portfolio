/** Test-only mock models for Bit's AI (the SDK's `MockLanguageModelV4`, per its testing docs). Never imported by the app. */
import { MockLanguageModelV4 } from 'ai/test';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** A model that answers with this JSON (the SDK parses it against the reply schema). */
export const replying = (reply: unknown) =>
  new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: typeof reply === 'string' ? reply : JSON.stringify(reply) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
  });

export const failing = () =>
  new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error('provider down');
    },
  });

/** A model that never answers, until the call is aborted. */
export const hanging = () =>
  new MockLanguageModelV4({
    doGenerate: ({ abortSignal }) =>
      new Promise((_, reject) => abortSignal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })),
  });
