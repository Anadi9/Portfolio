import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'vite-react-ssg';
import { FIRST_BUG, mailto, type Answers } from '@/lib/bit/chat';
import {
  buildPayload,
  EMPTY_FORM,
  LIMITS,
  parseResponse,
  validateForm,
  type FormErrors,
  type FormField,
  type FormKind,
  type Outcome,
  type TicketForm,
} from '@/lib/bit/submit';
import { trackRescue } from '@/lib/rescue/track';

/**
 * Bit's in-chat ticket form. Collects the fields, posts to `/api/bit/ticket`
 * and hands the outcome to the chat; the rules live in `lib/bit/submit`.
 * Opt-ins start off. The honeypot is a visually hidden field real people never reach.
 */

const REQUEST_TIMEOUT_MS = 15_000;

async function send(kind: FormKind, ans: Answers, f: TicketForm, question?: string): Promise<Outcome> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('/api/bit/ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(kind, ans, f, question)),
      signal: ctl.signal,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* a non-JSON answer is handled by the status */
    }
    return parseResponse(res.status, body);
  } catch {
    return parseResponse(0, null);
  } finally {
    clearTimeout(timer);
  }
}

export function BitTicketForm({
  kind,
  ans,
  question,
  onOutcome,
}: {
  kind: FormKind;
  ans: Answers;
  question?: string;
  onOutcome: (o: Outcome, email: string) => void;
}) {
  const uid = useId();
  const [f, setF] = useState<TicketForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const [hp, setHp] = useState('');
  const refs = useRef<Partial<Record<FormField, HTMLInputElement | null>>>({});
  const focusField = useRef<FormField | null>(null);
  const id = (n: string) => `${uid}-${n}`;
  const set = <K extends keyof TicketForm>(k: K, v: TicketForm[K]) => setF((p) => ({ ...p, [k]: v }));
  const first = kind === 'first_bug';

  // The form appears as Bit's reply after a pick: move focus to its first field.
  useEffect(() => {
    refs.current.email?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (focusField.current) {
      refs.current[focusField.current]?.focus();
      focusField.current = null;
    }
  }, [errors]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found = validateForm(kind, f);
    const bad = (['email', 'appUrl', 'name', 'whatsapp'] as const).find((k) => found[k]);
    if (bad) {
      focusField.current = bad;
      return setErrors(found);
    }
    setErrors({});
    setBusy(true);
    trackRescue('cta_click', { page: 'home', location: `bit:ticket-${kind}` });
    // A filled honeypot is sent as-is: the API answers 200 without a number and we fall back.
    const out = hp ? parseResponse(200, { ok: true }) : await send(kind, ans, f, question);
    setBusy(false);
    if (out.type === 'field') {
      focusField.current = out.field === 'form' ? null : out.field;
      return setErrors({ [out.field]: out.error });
    }
    if (out.type === 'retry') return setErrors({ form: out.error });
    onOutcome(out, f.email.trim());
  };

  const field = (name: FormField, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="hq-tf">
      <label htmlFor={id(name)}>{label}</label>
      <input
        id={id(name)}
        ref={(el) => (refs.current[name] = el)}
        value={f[name]}
        onChange={(e) => set(name, e.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? id(`${name}-err`) : undefined}
        disabled={busy}
        {...props}
      />
      {errors[name] && (
        <span id={id(`${name}-err`)} className="hq-tf-err" role="alert">
          {errors[name]}
        </span>
      )}
    </div>
  );

  return (
    <form className="hq-tform" onSubmit={submit} noValidate aria-label={first ? 'Open a first-bug ticket' : 'Send Anadi your question'}>
      {field('email', 'Your email (required)', { type: 'email', autoComplete: 'email', inputMode: 'email', maxLength: 254, placeholder: 'you@company.com' })}
      {first && field('appUrl', 'Your app link (required)', { type: 'text', autoComplete: 'url', inputMode: 'url', maxLength: LIMITS.appUrl, placeholder: 'myapp.com' })}
      {!first && field('appUrl', 'Your app link (optional)', { type: 'text', autoComplete: 'url', inputMode: 'url', maxLength: LIMITS.appUrl, placeholder: 'myapp.com' })}
      {field('name', 'Your name (optional)', { type: 'text', autoComplete: 'name', maxLength: LIMITS.name })}

      <label className="hq-tf-check">
        <input type="checkbox" checked={f.whatsappOptIn} onChange={(e) => set('whatsappOptIn', e.target.checked)} disabled={busy} />
        <span>Anadi may message me on WhatsApp about this request</span>
      </label>
      {f.whatsappOptIn && field('whatsapp', 'WhatsApp number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: LIMITS.whatsapp, placeholder: '+1 555 123 4567' })}

      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden className="hq-hp">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      {errors.form && (
        <p className="hq-tf-err" role="alert" style={{ margin: 0 }}>
          {errors.form}
        </p>
      )}
      <div className="hq-tform-actions">
        <button type="submit" className="bq-btn" disabled={busy} aria-busy={busy || undefined}>
          {busy ? 'Sending…' : first ? 'Open my ticket' : 'Send to Anadi'}
        </button>
      </div>
      <p className="hq-tform-note">
        I’ll keep your details to answer this request. <Link to="/privacy">Privacy</Link>.
      </p>
      <p className="hq-tform-note">
        Rather skip the chat? <Link to={FIRST_BUG}>Use the first-bug form</Link> or{' '}
        <a href={mailto(first ? 'My first bug, free' : 'A question for Anadi', ans)}>email Anadi</a>.
      </p>
    </form>
  );
}
