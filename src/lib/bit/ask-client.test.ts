import { describe, expect, it, vi } from 'vitest';
import { askPayload, canAskAi, readAskResponse, requestAiAnswer } from './ask-client';
import { answerWith, ask, asking, choose, initial, NODES, optionsFor, type ChatState, type Option } from './chat';
import { AI_ROUTES, MAX_AI_REPLIES, NODE_IDS } from './nodes';

const pick = (state: ChatState, label: string) => choose(state, optionsFor(state.node).find((o) => o.label === label) as Option) as ChatState;

describe('node ids', () => {
  it('match the chat’s nodes exactly, and AI routes are flow starts', () => {
    expect([...NODE_IDS].sort()).toEqual(Object.keys(NODES).sort());
    for (const r of AI_ROUTES) expect(NODE_IDS).toContain(r);
    for (const r of ['qurl', 'notyet', 'recProd', 'q3', 'prod2']) expect(AI_ROUTES).not.toContain(r);
  });
});

describe('readAskResponse', () => {
  it('takes only a 200 with a non-empty answer and an AI route', () => {
    expect(readAskResponse(200, { answer: ' Hi there. ', route: 'prod' })).toEqual({ type: 'answer', reply: { answer: 'Hi there.', route: 'prod' } });
    expect(readAskResponse(200, { answer: 'Hi', route: 'qurl' })).toEqual({ type: 'fallback' });
    expect(readAskResponse(200, { answer: '', route: 'prod' })).toEqual({ type: 'fallback' });
    expect(readAskResponse(200, { fallback: 'guard' })).toEqual({ type: 'fallback' });
    expect(readAskResponse(200, null)).toEqual({ type: 'fallback' });
  });

  it('turns AI off on 501 and falls back on everything else', () => {
    expect(readAskResponse(501, { error: 'ai answers not configured' })).toEqual({ type: 'off' });
    for (const s of [400, 429, 500, 502, 504]) expect(readAskResponse(s, { answer: 'x', route: 'prod' })).toEqual({ type: 'fallback' });
  });
});

describe('requestAiAnswer', () => {
  const payload = askPayload(initial(), 'my login is broken', 0);
  const json = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('POSTs the payload and reads the answer', async () => {
    const f = json(200, { answer: 'Yes.', route: 'prod' });
    expect(await requestAiAnswer(payload, { fetchImpl: f })).toEqual({ type: 'answer', reply: { answer: 'Yes.', route: 'prod' } });
    const [url, init] = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(url).toBe('/api/bit/ask');
    expect(JSON.parse(init.body as string)).toEqual({ question: 'my login is broken', node: 'start', answers: {}, count: 0, hp: '' });
  });

  it('falls back on a network error, a non-JSON body or a timeout', async () => {
    expect(await requestAiAnswer(payload, { fetchImpl: vi.fn(async () => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch })).toEqual({ type: 'fallback' });
    expect(await requestAiAnswer(payload, { fetchImpl: vi.fn(async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch })).toEqual({ type: 'fallback' });
    const slow = vi.fn(
      (_: string, init: RequestInit) => new Promise<Response>((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted')))),
    ) as unknown as typeof fetch;
    expect(await requestAiAnswer(payload, { fetchImpl: slow, timeoutMs: 20 })).toEqual({ type: 'fallback' });
  });
});

describe('askPayload', () => {
  it('sends the question (capped at 500), the node, the button answers and the count — nothing else', () => {
    let s = pick(initial(), 'Something’s breaking in my app');
    s = pick(s, 'Replit');
    const p = askPayload(s, `  ${'x'.repeat(600)}  `, 2);
    expect(Object.keys(p).sort()).toEqual(['answers', 'count', 'hp', 'node', 'question']);
    expect(p.question).toHaveLength(500);
    expect(p).toMatchObject({ node: 'prod2', answers: { stack: 'Replit' }, count: 2, hp: '' });
  });

  it('stops asking after the cap or once the API said AI is off', () => {
    expect(canAskAi(0, false)).toBe(true);
    expect(canAskAi(MAX_AI_REPLIES - 1, false)).toBe(true);
    expect(canAskAi(MAX_AI_REPLIES, false)).toBe(false);
    expect(canAskAi(0, true)).toBe(false);
  });
});

describe('AI answer → chat state', () => {
  it('shows the question while waiting', () => {
    const s = asking(initial(), '  how much is care?  ');
    expect(s.log.at(-1)).toEqual({ who: 'you', text: 'how much is care?' });
    expect(s.node).toBe('start');
  });

  it('says the answer as Bit, marked AI, then continues at the routed node with its buttons', () => {
    const s = answerWith(initial(), 'how much is care?', { answer: 'Care is $299/mo, month to month.', route: 'care' });
    expect(s.node).toBe('care');
    expect(s.log.slice(-3)).toEqual([
      { who: 'you', text: 'how much is care?' },
      { who: 'bit', text: 'Care is $299/mo, month to month.', ai: true },
      { who: 'bit', text: expect.stringContaining('Care keeps a live app healthy') },
    ]);
    expect(optionsFor(s.node).map((o) => o.label)).toContain('Start Care');
  });

  it('keeps the button answers so far, and drops the menu’s greeting or the contact opener like typed routing does', () => {
    let s = pick(initial(), 'Something’s breaking in my app');
    s = pick(s, 'Replit');
    const toMenu = answerWith(s, 'what do you do?', { answer: 'Anadi fixes apps.', route: 'start' });
    expect(toMenu.ans).toEqual({ stack: 'Replit' });
    expect(toMenu.log.at(-1)).toEqual({ who: 'bit', text: 'Anadi fixes apps.', ai: true });

    const toAnadi = answerWith(initial(), 'are you free in May?', { answer: 'Anadi will answer that himself.', route: 'contact' });
    expect(toAnadi.log.slice(-2)).toEqual([
      { who: 'bit', text: 'Anadi will answer that himself.', ai: true },
      { who: 'form', kind: 'question' },
    ]);
  });

  it('matches the scripted path’s shape, so a fallback looks the same minus the AI label', () => {
    const scripted = ask(initial(), 'my login is broken') as ChatState;
    const ai = answerWith(initial(), 'my login is broken', { answer: 'Sounds like a production problem. A few quick taps:', route: 'prod' });
    expect(ai.node).toBe(scripted.node);
    expect(ai.log.map((m) => (m.who === 'bit' ? { ...m, ai: undefined } : m))).toEqual(scripted.log.map((m) => (m.who === 'bit' ? { ...m, ai: undefined } : m)));
  });
});
