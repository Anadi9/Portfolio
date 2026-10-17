/**
 * The chat's side of `/api/bit/ask`: what to send, and what each response
 * means. The component only calls `requestAiAnswer` and applies the outcome.
 *
 * Only an answer with a usable route is shown. Everything else — 501 (AI off),
 * 429, 4xx/5xx, a network error, a timeout, `{ fallback }` — sends the chat
 * down its scripted keyword path, as if the AI didn't exist.
 */
import type { Answers, ChatState } from './chat';
import { isAiRoute, MAX_AI_REPLIES, MAX_QUESTION, type AiRoute } from './nodes';

export type AiAnswer = { answer: string; route: AiRoute };

/** `off`: the server has no AI configured (501) or the chat's cap is spent; stop asking for this conversation. */
export type AskOutcome = { type: 'answer'; reply: AiAnswer } | { type: 'off' } | { type: 'fallback' };

export type AskPayload = { question: string; node: ChatState['node']; answers: Answers; count: number; hp: string };

/** The request body: the question (capped), where the chat is, the button answers, and how many AI answers this chat has had. */
export function askPayload(state: ChatState, question: string, count: number): AskPayload {
  return { question: question.trim().slice(0, MAX_QUESTION), node: state.node, answers: state.ans, count, hp: '' };
}

export const canAskAi = (count: number, off: boolean) => !off && count < MAX_AI_REPLIES;

export function readAskResponse(status: number, body: unknown): AskOutcome {
  if (status === 501) return { type: 'off' };
  if (status !== 200 || !body || typeof body !== 'object') return { type: 'fallback' };
  const { answer, route } = body as { answer?: unknown; route?: unknown };
  if (typeof answer !== 'string' || !answer.trim() || !isAiRoute(route)) return { type: 'fallback' };
  return { type: 'answer', reply: { answer: answer.trim(), route } };
}

/** POST the question. Never throws; a slow server counts as a fallback after `timeoutMs`. */
export async function requestAiAnswer(
  payload: AskPayload,
  { fetchImpl = fetch, timeoutMs = 10_000, signal }: { fetchImpl?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<AskOutcome> {
  // One controller for both the timeout and the caller's signal (`AbortSignal.any` is too new for some browsers).
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const stop = () => ctl.abort();
  signal?.addEventListener('abort', stop);
  try {
    const res = await fetchImpl('/api/bit/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    const body = await res.json().catch(() => null);
    return readAskResponse(res.status, body);
  } catch {
    return { type: 'fallback' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', stop);
  }
}
