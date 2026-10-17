/**
 * Whether Bit's AI answers can run, from env alone. Kept apart from `ai.ts`
 * (which loads the AI SDK) so the health check can share the exact rule.
 * On Vercel the gateway can authenticate with OIDC instead of a key.
 */
type Env = Record<string, string | undefined>;

export const aiAuthAvailable = (env: Env): boolean => Boolean(env.AI_GATEWAY_API_KEY?.trim() || env.VERCEL_OIDC_TOKEN?.trim() || env.VERCEL === '1');

export const aiEnabled = (env: Env): boolean => env.BIT_AI === 'on' && aiAuthAvailable(env);
