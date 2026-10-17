import { describe, expect, it } from 'vitest';
import { ask, choose, initial, optionsFor, type ChatState, type Option } from './chat';
import { activeFormIndex, applyOutcome, buildPayload, EMPTY_FORM, parseResponse, questionFor, recalledTicket, rememberTicket, validateForm, type TicketForm } from './submit';

const pick = (state: ChatState, label: string): ChatState => choose(state, optionsFor(state.node).find((o) => o.label === label) as Option) as ChatState;
const atQurl = () => {
  let s = pick(initial(), 'Find my app’s first bug — free');
  for (const l of ['Let’s go', 'Live now', 'Paying customers', 'We lose money or users', 'This week']) s = pick(s, l);
  return s;
};
const form = (over: Partial<TicketForm> = {}): TicketForm => ({ ...EMPTY_FORM, email: 'sam@example.com', appUrl: 'myapp.com', ...over });

describe('validateForm', () => {
  it('needs an email, and an app link for the first-bug form', () => {
    expect(validateForm('first_bug', EMPTY_FORM)).toMatchObject({ email: expect.any(String), appUrl: expect.any(String) });
    expect(validateForm('first_bug', form())).toEqual({});
    expect(validateForm('first_bug', form({ email: 'nope' })).email).toMatch(/look right/);
  });
  it('the question form does not need an app link', () => {
    expect(validateForm('question', form({ appUrl: '' }))).toEqual({});
  });
  it('asks for a WhatsApp number only when that box is ticked', () => {
    expect(validateForm('question', form({ whatsappOptIn: true, whatsapp: '' })).whatsapp).toBeTruthy();
    expect(validateForm('question', form({ whatsappOptIn: true, whatsapp: '+1 555 123 4567' }))).toEqual({});
    expect(validateForm('question', form({ whatsappOptIn: false, whatsapp: '' }))).toEqual({});
  });
  it('flags values over the API caps', () => {
    expect(validateForm('first_bug', form({ appUrl: 'x'.repeat(481) })).appUrl).toBeTruthy();
  });
});

describe('buildPayload', () => {
  it('sends the answers, budget and opt-ins, with an empty honeypot, defaulting opt-ins off', () => {
    const p = buildPayload('first_bug', { live: 'Live now', budget: 'Under $2,000' }, form({ name: ' Sam ' }));
    expect(p).toEqual({
      email: 'sam@example.com', name: 'Sam', appUrl: 'myapp.com', kind: 'first_bug', answers: { live: 'Live now', budget: 'Under $2,000' },
      budget: 'Under $2,000', boardOptIn: false, whatsappOptIn: false, hp: '',
    });
  });
  it('includes the WhatsApp number only when opted in, and the typed question', () => {
    const on = buildPayload('question', {}, form({ whatsappOptIn: true, whatsapp: '+1 555 123 4567', boardOptIn: true }), 'do you do Rails?');
    expect(on).toMatchObject({ whatsapp: '+1 555 123 4567', whatsappOptIn: true, boardOptIn: true, answers: { question: 'do you do Rails?' } });
    expect(buildPayload('question', {}, form({ whatsappOptIn: false, whatsapp: '+1 555 123 4567' }))).not.toHaveProperty('whatsapp');
  });
});

describe('parseResponse', () => {
  it('200 with a number is the only success', () => {
    expect(parseResponse(200, { number: 'A-1042' })).toEqual({ type: 'ok', number: 'A-1042' });
  });
  it('200 without a number (honeypot) is not confirmed: fall back, never invent one', () => {
    expect(parseResponse(200, { ok: true })).toEqual({ type: 'fallback' });
    expect(parseResponse(200, { number: 'bogus' })).toEqual({ type: 'fallback' });
    expect(parseResponse(200, null)).toEqual({ type: 'fallback' });
  });
  it('400 puts the error next to its field', () => {
    expect(parseResponse(400, { error: 'Invalid email', field: 'email' })).toEqual({ type: 'field', field: 'email', error: 'Invalid email' });
    expect(parseResponse(400, { error: 'answers too long', field: 'answers' })).toMatchObject({ type: 'field', field: 'form' });
  });
  it('429 stays in the form; 501, 5xx and network errors fall back', () => {
    expect(parseResponse(429, { error: 'Slow down' })).toEqual({ type: 'retry', error: 'Slow down' });
    expect(parseResponse(501, { error: 'tickets not configured' })).toEqual({ type: 'fallback' });
    expect(parseResponse(500, {})).toEqual({ type: 'fallback' });
    expect(parseResponse(0, null)).toEqual({ type: 'fallback' });
  });
});

describe('chat state around the form', () => {
  it('the form is active at the qurl ending and gone after a pick elsewhere', () => {
    const s = atQurl();
    expect(activeFormIndex(s)).toBe(s.log.length - 1);
    expect(activeFormIndex(pick(s, 'Back to start'))).toBe(-1);
  });
  it('free text that Bit cannot place opens the question form with what was typed', () => {
    const s = ask(initial(), 'what is the meaning of life') as ChatState;
    expect(s.node).toBe('contact');
    expect(activeFormIndex(s)).toBeGreaterThan(-1);
    expect(questionFor(s)).toBe('what is the meaning of life');
  });
  it('success: removes the form and states the real number and what happens next', () => {
    const s = applyOutcome(atQurl(), 'first_bug', { type: 'ok', number: 'A-1042' }, 'sam@example.com');
    expect(s.log.some((m) => m.who === 'form')).toBe(false);
    const text = s.log.filter((m) => m.who === 'bit').map((m) => (m as { text: string }).text).join(' ');
    expect(text).toContain('A-1042');
    expect(text).toContain('within 24 hours');
  });
  it('501 / network / 200-without-number: says it was not saved and offers the app link and email', () => {
    const s = applyOutcome(atQurl(), 'first_bug', parseResponse(200, { ok: true }), 'sam@example.com');
    expect(s.log.some((m) => m.who === 'form')).toBe(false);
    expect(JSON.stringify(s.log)).not.toMatch(/A-\d{4}|Done\./);
    const links = s.log.at(-1);
    expect(links).toMatchObject({ who: 'links', links: [{ label: 'Send my app link', to: { href: '/audit?type=app' } }, { label: 'Email Anadi', to: { href: expect.stringMatching(/^mailto:/) } }] });
    expect(JSON.stringify(s.log)).toMatch(/couldn’t save/);
  });
  it('400 and 429 leave the chat untouched so the form can show the message', () => {
    const s = atQurl();
    expect(applyOutcome(s, 'first_bug', { type: 'field', field: 'email', error: 'x' }, 'a@b.co')).toBe(s);
    expect(applyOutcome(s, 'first_bug', { type: 'retry', error: 'x' }, 'a@b.co')).toBe(s);
  });
});

describe('remembering the visitor’s ticket', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { setItem: (k: string, v: string) => void m.set(k, v), getItem: (k: string) => m.get(k) ?? null };
  };
  it('round-trips a number and ignores junk', () => {
    const st = mem();
    rememberTicket('A-1042', st);
    expect(recalledTicket(st)).toBe('A-1042');
    st.setItem('bq-ticket', '<script>');
    expect(recalledTicket(st)).toBeNull();
  });
  it('never throws when storage is blocked', () => {
    const blocked = { setItem: () => { throw new Error('no'); }, getItem: () => { throw new Error('no'); } };
    expect(() => rememberTicket('A-1', blocked)).not.toThrow();
    expect(recalledTicket(blocked)).toBeNull();
  });
});
