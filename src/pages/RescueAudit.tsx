import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { PORTFOLIO_ORIGIN, Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import {
  NOTES_MAX,
  SYMPTOMS,
  TOOLS,
  TURNAROUND_HOURS,
  dueBy,
  formatDue,
  parseIntake,
  parseSymptomParam,
  type Intake,
  type Tool,
} from '@/lib/rescue/intake';
import { trackRescue } from '@/lib/rescue/track';

/**
 * `/rescue/audit`: the free production audit that every CTA on the homepage
 * promises. The homepage is the rescue offer (`/`; the old `/rescue` 301s
 * there), so "back" from here is `/`.
 *
 * Those CTAs used to point at `/teardown`, the Wrapper Test: a self-graded quiz
 * about AI product defensibility. That broke the page's promise at the one
 * moment it was being taken up (send your link, I look at it, you get a ranked
 * report in 48 hours). This page takes the link, so the audit is of the
 * visitor's app and not of their answers.
 *
 * Validation runs `parseIntake` in the browser, the same function the server
 * runs, so the two can never disagree about what is acceptable. Symptoms ticked
 * in the homepage tally arrive as `?s=0,3` and are pre-ticked here. They are
 * read after mount, because the prerendered HTML has no query string.
 *
 * The deadline is shown as "within 48 hours" in the prerender and resolved to
 * a date on mount; once submitted it is the server's date, the same one both
 * emails quote.
 *
 * A request that lands fires `audit_submitted` (tool and symptom count, never
 * the URL or email) for the conversion count; `trackRescue` swallows any
 * analytics failure so it can never turn a sent request into an error.
 */

const TITLE = 'Free production audit · Vibe Code Rescue';
const DESCRIPTION =
  'Send your Lovable, Bolt, Cursor or v0 app and get a plain-English report of what is broken, what is risky and what can wait. Free, within 48 hours.';
const EMAIL = 'anadithakur99@gmail.com';

/** The free first step of the homepage's paid service, so a `Service` at price 0
 *  that points at it rather than a second copy of the whole offer. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Free production audit for AI-built apps',
  description: DESCRIPTION,
  url: 'https://anadithakur.in/rescue/audit',
  serviceType: 'Production readiness audit',
  areaServed: { '@type': 'Place', name: 'Worldwide' },
  provider: { '@id': `${PORTFOLIO_ORIGIN}/#person` },
  isRelatedTo: { '@id': 'https://anadithakur.in/#service' },
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const p = {
  bg: c.paper,
  ink: c.ink,
  body: '#4a4a4a',
  dim: c.dim,
  gold: c.markOnPaper,
  rule: 'rgba(10,10,10,.14)',
  panel: c.accent,
  picked: '#faf8f3',
  error: '#B3261E',
} as const;

const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: p.gold, margin: 0 };
const body: CSSProperties = { margin: 0, font: `400 15px/1.55 ${display}`, color: p.body, textWrap: 'pretty', maxWidth: '62ch' };
const fieldLabel: CSSProperties = { ...label(11, 700, 0.14), color: p.ink };
const hint: CSSProperties = { margin: 0, font: `400 13px/1.45 ${display}`, color: p.dim };
const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: px(s[4], s[5]),
  background: '#fff',
  border: `${rule.base}px solid ${c.ink}`,
  color: p.ink,
  font: `400 16px/1.3 ${display}`,
  borderRadius: 0,
};
const cta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: s[3],
  minHeight: 56,
  padding: px(0, s[7]),
  background: c.ink,
  color: c.accent,
  border: 0,
  ...label(11, 700, 0.12),
  textDecoration: 'none',
  cursor: 'pointer',
};
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

type Form = {
  appUrl: string;
  repoUrl: string;
  tool: Tool | '';
  symptoms: number[];
  notes: string;
  email: string;
};

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; due: Date; email: string; host: string } | { kind: 'failed' };

const Field = ({
  id,
  title,
  optional,
  note,
  error,
  children,
}: {
  id: string;
  title: string;
  optional?: boolean;
  note?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div style={{ display: 'grid', gap: s[3] }}>
    <label htmlFor={id} style={fieldLabel}>
      {title}
      {optional && <span style={{ color: p.dim }}> · OPTIONAL</span>}
    </label>
    {children}
    {note && <p style={hint}>{note}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" style={{ ...hint, color: p.error }}>
        {error}
      </p>
    )}
  </div>
);

const Check = ({ color = p.gold, size = 14 }: { color?: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

export default function RescueAudit() {
  const [form, setForm] = useState<Form>({ appUrl: '', repoUrl: '', tool: '', symptoms: [], notes: '', email: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof Intake, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [due, setDue] = useState<string | null>(null);

  useEffect(() => {
    const picked = parseSymptomParam(new URLSearchParams(window.location.search).get('s'));
    if (picked.length) setForm((f) => ({ ...f, symptoms: picked }));
    setDue(formatDue(dueBy(new Date())));
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleSymptom = (i: number) =>
    set('symptoms', form.symptoms.includes(i) ? form.symptoms.filter((n) => n !== i) : [...form.symptoms, i].sort((a, b) => a - b));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseIntake(form);
    if (parsed.ok === false) {
      setErrors({ [parsed.field]: parsed.error });
      document.getElementById(`ra-${parsed.field}`)?.focus();
      return;
    }
    setErrors({});
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/rescue-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.intake, hp: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { due?: string; field?: keyof Intake; error?: string };
      if (res.status === 400 && data.field) {
        setErrors({ [data.field]: data.error });
        setStatus({ kind: 'idle' });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      trackRescue('audit_submitted', { tool: parsed.intake.tool, symptoms: parsed.intake.symptoms.length });
      setStatus({
        kind: 'sent',
        due: data.due ? new Date(data.due) : dueBy(new Date()),
        email: parsed.intake.email,
        host: new URL(parsed.intake.appUrl).hostname,
      });
      window.scrollTo({ top: 0 });
    } catch {
      setStatus({ kind: 'failed' });
    }
  };

  const describedBy = (field: keyof Intake, extra?: string) =>
    [errors[field] ? `ra-${field}-error` : '', extra ?? ''].filter(Boolean).join(' ') || undefined;

  return (
    <div style={{ background: p.bg, color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/rescue/audit" type="website" jsonLd={jsonLd} />

      <header
        data-rescue-header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[4], gutter),
          borderBottom: `${rule.edge}px solid ${p.rule}`,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
          <span aria-hidden style={{ width: 22, height: 22, background: c.ink, display: 'block' }} />
          <span style={{ ...label(11, 700, 0.12), color: p.ink }}>ANADI THAKUR</span>
        </Link>
        <Link to="/" className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink }}>
          ← VIBE CODE RESCUE
        </Link>
      </header>

      <main style={{ flex: 1 }}>
        <section data-rescue-hpad style={{ containerType: 'inline-size', padding: px(s[10], gutter, sectionY.bottom) }}>
          {status.kind === 'sent' ? (
            <div style={{ display: 'grid', gap: s[6], maxWidth: '60ch' }} aria-live="polite">
              <p style={eyebrow}>REQUEST RECEIVED</p>
              <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
                Your report lands by <span style={{ color: p.gold }}>{formatDue(status.due)}.</span>
              </h1>
              <p style={{ ...body, font: `400 17px/1.5 ${display}` }}>
                I&apos;ll go through <strong style={{ color: p.ink }}>{status.host}</strong> myself and send it to{' '}
                <strong style={{ color: p.ink }}>{status.email}</strong>, ranked Fix now, Risky and Can wait. A
                confirmation is on its way to that address now. If it isn&apos;t there in a few minutes, check spam or email{' '}
                <a href={`mailto:${EMAIL}`} className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>
                  {EMAIL}
                </a>
                .
              </p>
              <div style={{ display: 'grid', gap: s[3], padding: px(s[6], s[6]), background: p.panel }}>
                <span style={{ ...label(10, 700, 0.16), color: p.body }}>WHILE YOU WAIT</span>
                <p style={{ ...body, color: p.ink }}>
                  Hold off on prompting fixes for auth or the database. Each prompt can move the problem somewhere
                  else, and I&apos;d rather audit the version your users are actually hitting.
                </p>
              </div>
              <Link to="/" className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink, justifySelf: 'start' }}>
                ← BACK TO VIBE CODE RESCUE
              </Link>
            </div>
          ) : (
            <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: s[10], alignItems: 'start' }}>
              <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: s[8], minWidth: 0 }}>
                <div style={{ display: 'grid', gap: s[5] }}>
                  <p style={eyebrow}>FREE PRODUCTION AUDIT · {TURNAROUND_HOURS} HOURS</p>
                  <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
                    Send me your app. <span style={{ color: p.gold }}>I&apos;ll tell you what breaks.</span>
                  </h1>
                  <p style={{ ...body, font: `400 17px/1.5 ${display}`, maxWidth: '50ch' }}>
                    I look at your live app myself, not a scanner, and send a plain-English report ranked Fix now, Risky
                    and Can wait. It takes about two minutes to fill in.
                  </p>
                </div>

                <Field id="ra-appUrl" title="YOUR LIVE APP" error={errors.appUrl} note="The link your users open. A preview link is fine.">
                  <input
                    id="ra-appUrl"
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="your-app.lovable.app"
                    value={form.appUrl}
                    onChange={(e) => set('appUrl', e.target.value)}
                    aria-invalid={!!errors.appUrl || undefined}
                    aria-describedby={describedBy('appUrl')}
                    style={{ ...input, borderColor: errors.appUrl ? p.error : c.ink }}
                  />
                </Field>

                <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: s[3] }} aria-describedby={describedBy('tool')}>
                  <legend style={{ ...fieldLabel, padding: 0, marginBottom: s[3] }}>BUILT WITH</legend>
                  <div id="ra-tool" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], outline: 'none' }}>
                    {TOOLS.map((t) => {
                      const on = form.tool === t;
                      return (
                        <label
                          key={t}
                          data-audit-chip
                          style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: s[2],
                            minHeight: 44,
                            padding: px(0, s[5]),
                            border: `${rule.base}px solid ${errors.tool ? p.error : c.ink}`,
                            background: on ? c.ink : '#fff',
                            color: on ? c.accent : p.ink,
                            font: `600 14px/1 ${display}`,
                            cursor: 'pointer',
                          }}
                        >
                          <input type="radio" name="tool" value={t} checked={on} onChange={() => set('tool', t)} style={visuallyHidden} />
                          {on && <Check color={c.accent} size={13} />}
                          {t}
                        </label>
                      );
                    })}
                  </div>
                  {errors.tool && (
                    <p id="ra-tool-error" role="alert" style={{ ...hint, color: p.error }}>
                      {errors.tool}
                    </p>
                  )}
                </fieldset>

                <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
                  <legend style={{ ...fieldLabel, padding: 0, marginBottom: s[3] }}>
                    WHAT&apos;S GOING WRONG <span style={{ color: p.dim }}>· TICK ANY</span>
                  </legend>
                  <div id="ra-symptoms" tabIndex={-1} style={{ borderTop: `${rule.hair}px solid ${p.rule}`, outline: 'none' }}>
                    {SYMPTOMS.map((sym, i) => {
                      const on = form.symptoms.includes(i);
                      return (
                        <label
                          key={sym.line}
                          data-audit-chip
                          style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: s[4],
                            minHeight: 60,
                            padding: px(s[3], s[4]),
                            borderBottom: `${rule.hair}px solid ${p.rule}`,
                            background: on ? p.picked : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <input type="checkbox" checked={on} onChange={() => toggleSymptom(i)} style={visuallyHidden} />
                          <span
                            aria-hidden
                            style={{
                              width: 22,
                              height: 22,
                              flexShrink: 0,
                              boxSizing: 'border-box',
                              border: `${rule.base}px solid ${c.ink}`,
                              background: on ? c.ink : 'transparent',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            {on && <Check color={c.accent} size={13} />}
                          </span>
                          <span style={{ flex: 1, font: `600 15px/1.35 ${display}` }}>{sym.line}</span>
                          <span data-rescue-area style={{ ...label(10, 700, 0.14), color: p.dim, whiteSpace: 'nowrap' }}>
                            {sym.area.toUpperCase()}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <Field
                  id="ra-notes"
                  title="ANYTHING ELSE"
                  optional
                  error={errors.notes}
                  note="The page that breaks, the error you see, what you were about to launch."
                >
                  <textarea
                    id="ra-notes"
                    rows={4}
                    maxLength={NOTES_MAX}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    aria-describedby={describedBy('notes')}
                    style={{ ...input, resize: 'vertical', minHeight: 110 }}
                  />
                </Field>

                <Field
                  id="ra-repoUrl"
                  title="REPO LINK"
                  optional
                  error={errors.repoUrl}
                  note="Not needed for the audit. If you share a private repo, you'll get instructions for read-only access."
                >
                  <input
                    id="ra-repoUrl"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="github.com/you/your-app"
                    value={form.repoUrl}
                    onChange={(e) => set('repoUrl', e.target.value)}
                    aria-invalid={!!errors.repoUrl || undefined}
                    aria-describedby={describedBy('repoUrl')}
                    style={{ ...input, borderColor: errors.repoUrl ? p.error : c.ink }}
                  />
                </Field>

                <Field id="ra-email" title="WHERE TO SEND THE REPORT" error={errors.email}>
                  <input
                    id="ra-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    aria-invalid={!!errors.email || undefined}
                    aria-describedby={describedBy('email')}
                    style={{ ...input, borderColor: errors.email ? p.error : c.ink }}
                  />
                </Field>

                {/* Honeypot. Off-screen rather than `display:none`, as on the teardown gate. */}
                <input
                  type="text"
                  name="company_website"
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
                />

                <div style={{ display: 'grid', gap: s[4], justifyItems: 'start' }}>
                  <button type="submit" disabled={status.kind === 'sending'} className="pf-nudge pf-nudge-lg" style={{ ...cta, opacity: status.kind === 'sending' ? 0.6 : 1 }}>
                    {status.kind === 'sending' ? 'SENDING…' : 'SEND FOR AUDIT'}
                    <span aria-hidden>→</span>
                  </button>
                  <p style={hint}>
                    Free. No call. Report by {due ?? `${TURNAROUND_HOURS} hours from now`}. I only use your email for this
                    audit.
                  </p>
                  {status.kind === 'failed' && (
                    <p role="alert" style={{ ...body, color: p.error }}>
                      That didn&apos;t go through, and it&apos;s my end, not yours. Email the link to{' '}
                      <a href={`mailto:${EMAIL}?subject=${encodeURIComponent('Rescue audit')}&body=${encodeURIComponent(form.appUrl)}`} style={{ color: p.error, fontWeight: 600 }}>
                        {EMAIL}
                      </a>{' '}
                      and the same {TURNAROUND_HOURS} hours applies.
                    </p>
                  )}
                </div>
              </form>

              <aside style={{ display: 'grid', gap: s[6], position: 'sticky', top: s[6] }}>
                <div style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
                  <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>WHAT HAPPENS NEXT</span>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[5] }}>
                    {[
                      ['Report', due ? `By ${due}. Fix now, Risky, Can wait, in plain English.` : `Within ${TURNAROUND_HOURS} hours. Fix now, Risky, Can wait, in plain English.`],
                      ['Fixed quote', 'If something needs fixing, the report ends with one price for all of it, from $499 depending on scope.'],
                      ['Your call', "Nothing worth fixing? I'll say so. No follow-up sequence, no pressure."],
                    ].map(([title, text], i) => (
                      <li key={title} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[4] }}>
                        <span style={{ ...label(11, 700, 0.12), color: c.mark }}>0{i + 1}</span>
                        <div style={{ display: 'grid', gap: s[1] }}>
                          <span style={{ font: `600 15px/1.3 ${display}` }}>{title}</span>
                          <span style={{ font: `400 14px/1.5 ${display}`, color: c.bright }}>{text}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
