import { Resend } from 'resend';
import type { NotifyDeps } from './dispatch.js';
import type { FetchLike } from './whatsapp.js';

/** Real dependencies: Resend only if keyed, global fetch resolved at call time. */
export function liveDeps(env: Record<string, string | undefined> = process.env): NotifyDeps {
  const key = env.RESEND_API_KEY;
  return {
    resend: key ? (new Resend(key) as unknown as NotifyDeps['resend']) : null,
    fetch: ((url, init) => fetch(url, init)) as FetchLike,
    env,
  };
}
