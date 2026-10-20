/**
 * The pure parts of Bit's in-chat ticket form: validation, the request body,
 * what each API response means, and the chat state that follows. The component
 * (`components/home/BitTicketForm.tsx`) only collects input and calls `fetch`.
 *
 * Nothing here invents a ticket number. A number is shown only when the API
 * returned one; every other outcome falls back to the real paths (first-bug
 * form, email to Anadi) and says the request was not saved.
 */
import { FIRST_BUG, mailto, type Answers, type ChatState, type Message } from './chat';

export type FormKind = 'first_bug' | 'question';

export type TicketForm = {
  email: string;
  name: string;
  appUrl: string;
  whatsappOptIn: boolean;
  whatsapp: string;
};

export const EMPTY_FORM: TicketForm = { email: '', name: '', appUrl: '', whatsappOptIn: false, whatsapp: '' };

/** Field ids shared with the API's `{ field }` errors. */
export type FormField = 'email' | 'name' | 'appUrl' | 'whatsapp';
export type FormErrors = Partial<Record<FormField | 'form', string>>;

export const LIMITS = { name: 120, appUrl: 480, whatsapp: 40 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateForm(kind: FormKind, f: TicketForm): FormErrors {
  const e: FormErrors = {};
  const email = f.email.trim();
  if (!email) e.email = 'Add your email so Anadi can reply.';
  else if (!EMAIL.test(email) || email.length > 254) e.email = 'That email doesn’t look right.';
  if (kind === 'first_bug' && !f.appUrl.trim()) e.appUrl = 'Add a link to your app so Anadi knows where to look.';
  if (f.appUrl.trim().length > LIMITS.appUrl) e.appUrl = 'That link is too long.';
  if (f.name.trim().length > LIMITS.name) e.name = 'That name is too long.';
  if (f.whatsappOptIn) {
    const digits = f.whatsapp.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15 || f.whatsapp.trim().length > LIMITS.whatsapp) e.whatsapp = 'Add your WhatsApp number with country code, e.g. +1 555 123 4567.';
  }
  return e;
}

export type TicketPayload = {
  email: string;
  name?: string;
  appUrl?: string;
  kind: FormKind;
  answers: Record<string, unknown>;
  budget?: string;
  stack?: string;
  whatsappOptIn: boolean;
  whatsapp?: string;
  hp: string;
};

/** `question` is what the visitor typed to reach the contact ending, if anything. */
export function buildPayload(kind: FormKind, ans: Answers, f: TicketForm, question?: string): TicketPayload {
  const answers: Record<string, unknown> = { ...ans };
  if (question?.trim()) answers.question = question.trim().slice(0, 1000);
  const p: TicketPayload = {
    email: f.email.trim(),
    kind,
    answers,
    whatsappOptIn: f.whatsappOptIn,
    hp: '',
  };
  if (f.name.trim()) p.name = f.name.trim();
  if (f.appUrl.trim()) p.appUrl = f.appUrl.trim();
  if (ans.budget) p.budget = ans.budget;
  // "How was it built?". "Not sure" says nothing.
  if (ans.stack && ans.stack !== 'Not sure') p.stack = ans.stack.slice(0, 120);
  if (f.whatsappOptIn && f.whatsapp.trim()) p.whatsapp = f.whatsapp.trim();
  return p;
}

export type Outcome =
  | { type: 'ok'; number: string }
  /** The API rejected a field: show `error` next to it and stay in the form. */
  | { type: 'field'; field: FormField | 'form'; error: string }
  /** Rate limited: stay in the form, ask to wait. */
  | { type: 'retry'; error: string }
  /** Not saved (501, 5xx, network error, or a 200 without a number): offer the real fallbacks. */
  | { type: 'fallback' };

const FIELDS: readonly string[] = ['email', 'name', 'appUrl', 'whatsapp'];

/** `status` 0 means the request never got an answer (network error, timeout). */
export function parseResponse(status: number, body: unknown): Outcome {
  const b = (body && typeof body === 'object' ? body : {}) as { number?: unknown; error?: unknown; field?: unknown };
  const error = typeof b.error === 'string' ? b.error : '';
  if (status === 200) return typeof b.number === 'string' && /^A-\d+$/.test(b.number) ? { type: 'ok', number: b.number } : { type: 'fallback' };
  if (status === 400) {
    const field = typeof b.field === 'string' && FIELDS.includes(b.field) ? (b.field as FormField) : 'form';
    return { type: 'field', field, error: error || 'Something in the form needs another look.' };
  }
  if (status === 429) return { type: 'retry', error: error || 'Too many requests from here. Give it a minute and try again.' };
  return { type: 'fallback' };
}

const withoutForm = (log: Message[]) => log.filter((m) => m.who !== 'form');

/** The chat after a final outcome. `field` and `retry` leave the chat alone (the form shows the message). */
export function applyOutcome(state: ChatState, kind: FormKind, outcome: Outcome, email: string): ChatState {
  if (outcome.type === 'field' || outcome.type === 'retry') return state;
  if (outcome.type === 'ok') {
    const next =
      kind === 'first_bug'
        ? 'Anadi will review your app and send you a short video with the first bug he finds, within 24 hours.'
        : 'Anadi reads every request himself and will reply by email.';
    return {
      ...state,
      log: [
        ...withoutForm(state.log),
        { who: 'bit', text: `Done. Your ticket is ${outcome.number}. I'll email a receipt to ${email}.` },
        { who: 'bit', text: next },
      ],
    };
  }
  const subject = kind === 'first_bug' ? 'My first bug, free' : 'A question for Anadi';
  return {
    ...state,
    log: [
      ...withoutForm(state.log),
      { who: 'bit', text: 'Sorry, I couldn’t save your request just now, so nothing has been sent. You can still reach Anadi directly:' },
      {
        who: 'links',
        links: [
          { label: 'Send my app link', to: { href: FIRST_BUG } },
          { label: 'Email Anadi', to: { href: mailto(subject, state.ans) } },
        ],
      },
    ],
  };
}

/** The form is live only while it is the last form in the log and the chat is still at its ending. */
export function activeFormIndex(state: ChatState): number {
  if (state.node !== 'qurl' && state.node !== 'contact' && state.node !== 'quote') return -1;
  for (let i = state.log.length - 1; i >= 0; i--) if (state.log[i].who === 'form') return i;
  return -1;
}

/** What the visitor typed to reach the contact ending (the last thing they said before it). */
export function questionFor(state: ChatState): string | undefined {
  if (state.node !== 'contact') return undefined;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const m = state.log[i];
    if (m.who === 'you') return m.text;
  }
  return undefined;
}
