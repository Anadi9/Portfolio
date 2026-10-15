import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { TerminalHead } from '@/components/brand/BitHead';
import { Seo } from '@/components/Seo';
import { c, display, heading, label, px, rule, s } from '@/components/brand/tokens';
import AppAuditForm from '@/components/audit/AppAuditForm';
import { PaperPage, SiteHeader, Check, body, cta, lead, p, section, split } from '@/components/site/kit';
import { LEGAL_PATHS } from '@/data/legal';
import { breadcrumbs, graph, service } from '@/lib/schema';
import { trackRescue } from '@/lib/rescue/track';
import {
  AUDIT_TYPES,
  MARKETS,
  TURNAROUND_HOURS,
  TYPE_LABEL,
  WORRIES_MAX,
  dueBy,
  formatDue,
  parseAuditIntake,
  parseTypeParam,
  type AuditIntake,
  type AuditType,
  type Market,
} from '@/lib/audit/intake';

/**
 * `/audit`: the one free-audit form behind every service's CTA.
 *
 * Service pages link here with `?type=ai|dpdp|app`, which pre-selects the
 * chooser (read after mount: the prerendered HTML has no query string). `app`
 * swaps in the Production Readiness form, which asks different questions and posts
 * to its own function; every other type uses the positioning doc's fields and
 * posts to `/api/audit`. `/rescue/audit` 301s to `?type=app`.
 *
 * Validation runs `parseAuditIntake` in the browser, the same function the
 * server runs. A request that lands fires `audit_submitted` with the type
 * only, never the URL, name or email.
 */

const PATH = '/audit';
const TITLE = 'Find Your App’s First Bug, Free · Anadi Thakur';
const DESCRIPTION =
  'Send your app link and get its biggest risk found free: reliability and security, search & AI visibility, or privacy & compliance. No access needed, no call.';
const EMAIL = 'anadithakur99@gmail.com';

const jsonLd = graph([
  {
    ...service({
      path: PATH,
      name: 'Free first-bug review: reliability, search & AI visibility, privacy',
      description: DESCRIPTION,
      serviceType: 'Free audit',
      offers: [{ name: 'First-bug review', description: 'Your app’s biggest risk, found free', min: 0, currency: 'USD' }],
    }),
  },
  breadcrumbs([{ name: 'First bug free', path: PATH }], 'https://anadithakur.in/audit#breadcrumb'),
]);

/** The chooser, in the order a visitor scans it. */
const CHOICES: { type: AuditType; hint: string }[] = [
  { type: 'app', hint: 'Something’s breaking, or you’re about to launch' },
  { type: 'ai', hint: 'Can Google and AI assistants find and recommend you?' },
  { type: 'dpdp', hint: 'Consent, notices and data requests (GDPR · CCPA · DPDP)' },
  { type: 'both', hint: 'Visibility and privacy together' },
  { type: 'unsure', hint: 'Not sure? All three areas get checked' },
];

const fieldLabel: CSSProperties = { ...label(11, 700, 0.14), color: p.ink };
const hint: CSSProperties = { margin: 0, font: `400 13px/1.45 ${display}`, color: p.dim };
const ERROR = '#B3261E';
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
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

const Field = ({ id, title, optional, note, error, children }: { id: string; title: string; optional?: boolean; note?: ReactNode; error?: string; children: ReactNode }) => (
  <div style={{ display: 'grid', gap: s[3] }}>
    <label htmlFor={id} style={fieldLabel}>
      {title}
      {optional && <span style={{ color: p.dim }}> · OPTIONAL</span>}
    </label>
    {children}
    {note && <p style={hint}>{note}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" style={{ ...hint, color: ERROR , display: 'flex', alignItems: 'center', gap: s[2] }}>
        <TerminalHead face="error" size={40} label="" className="th-inline" />
        {error}
      </p>
    )}
  </div>
);

const Chip = ({ name, on, error, onChange, children }: { name: string; on: boolean; error?: boolean; onChange: () => void; children: ReactNode }) => (
  <label
    data-audit-chip
    style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: s[2],
      minHeight: 44,
      padding: px(0, s[5]),
      border: `${rule.base}px solid ${error ? ERROR : c.ink}`,
      background: on ? c.ink : '#fff',
      color: on ? c.accent : p.ink,
      font: `600 14px/1 ${display}`,
      cursor: 'pointer',
    }}
  >
    <input type="radio" name={name} checked={on} onChange={onChange} style={visuallyHidden} />
    {on && <Check color={c.accent} size={13} />}
    {children}
  </label>
);

type Form = { name: string; business: string; url: string; sells: string; market: Market | ''; email: string; whatsapp: string; worries: string };
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; due: Date; name: string; email: string } | { kind: 'failed' };

const LeadForm = ({ type }: { type: Exclude<AuditType, 'app'> }) => {
  const [form, setForm] = useState<Form>({ name: '', business: '', url: '', sells: '', market: '', email: '', whatsapp: '', worries: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof AuditIntake, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [due, setDue] = useState<string | null>(null);

  useEffect(() => {
    setDue(formatDue(dueBy(new Date())));
    // The AI Readiness Checker hands its URL over as `?url=`, so it isn't typed twice.
    const handed = new URLSearchParams(window.location.search).get('url');
    if (handed && handed.length <= 500) setForm((f) => ({ ...f, url: handed }));
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseAuditIntake({ ...form, type });
    if (parsed.ok === false) {
      setErrors({ [parsed.field]: parsed.error });
      document.getElementById(`au-${parsed.field}`)?.focus();
      return;
    }
    setErrors({});
    setStatus({ kind: 'sending' });
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.intake, hp: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { due?: string; field?: keyof AuditIntake; error?: string };
      if (res.status === 400 && data.field) {
        setErrors({ [data.field]: data.error });
        setStatus({ kind: 'idle' });
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      trackRescue('audit_submitted', { tool: type, symptoms: 0 });
      setStatus({ kind: 'sent', due: data.due ? new Date(data.due) : dueBy(new Date()), name: parsed.intake.name.split(/\s+/)[0], email: parsed.intake.email });
      window.scrollTo({ top: 0 });
    } catch {
      setStatus({ kind: 'failed' });
    }
  };

  const describedBy = (field: keyof AuditIntake) => (errors[field] ? `au-${field}-error` : undefined);
  const textInput = (field: keyof Form & keyof AuditIntake, placeholder: string, extra: Partial<JSX.IntrinsicElements['input']> = {}) => (
    <input
      id={`au-${field}`}
      type="text"
      placeholder={placeholder}
      value={form[field]}
      onChange={(e) => set(field, e.target.value as Form[typeof field])}
      aria-invalid={!!errors[field] || undefined}
      aria-describedby={describedBy(field)}
      style={{ ...input, borderColor: errors[field] ? ERROR : c.ink }}
      {...extra}
    />
  );

  if (status.kind === 'sent') {
    return (
      <div style={{ display: 'grid', gap: s[6], maxWidth: '60ch' }} aria-live="polite">
        <TerminalHead face="fixed" motion="hop" size={80} label="Done" />
        <h2 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
          Got it, {status.name}. <span style={{ color: p.gold }}>Report by {formatDue(status.due)}.</span>
        </h2>
        <p style={lead}>
          I&apos;ll send your report to <strong style={{ color: p.ink }}>{status.email}</strong> within {TURNAROUND_HOURS} hours,
          usually sooner. A confirmation is on its way now. If you&apos;d like to talk it through, just reply to that email
          and we&apos;ll book a 20-minute call. No pressure either way.
        </p>
        <div style={{ display: 'grid', gap: s[3], padding: px(s[6], s[6]), background: p.panel }}>
          <span style={{ ...label(10, 700, 0.16), color: p.body }}>WHILE YOU WAIT</span>
          <p style={{ ...body, color: p.ink }}>
            {type === 'dpdp' ? (
              <>
                Score yourself on the <Link to="/dpdp/check" className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>DPDP self-check</Link>. It takes 3 minutes and the report will build on it.
              </>
            ) : (
              <>
                Run your site through the <Link to="/ai-readiness" className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>AI Readiness Checker</Link>. It shows in 10 seconds what AI crawlers can read.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: s[7], minWidth: 0 }}>
      <Field id="au-name" title="YOUR NAME" error={errors.name}>
        {textInput('name', 'Priya Shah', { autoComplete: 'name' })}
      </Field>
      <Field id="au-business" title="BUSINESS NAME" error={errors.business}>
        {textInput('business', 'Leaf & Co', { autoComplete: 'organization' })}
      </Field>
      <Field id="au-url" title="WEBSITE OR APP LINK" error={errors.url}>
        {textInput('url', 'yourbusiness.com', { inputMode: 'url', autoComplete: 'url', autoCapitalize: 'none', spellCheck: false })}
      </Field>
      <Field id="au-sells" title="WHAT DO YOU SELL, IN ONE LINE?" error={errors.sells} note='For example "organic skincare" or "dental clinic in Pune".'>
        {textInput('sells', 'organic skincare')}
      </Field>
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'grid', gap: s[3] }} aria-describedby={describedBy('market')}>
        <legend style={{ ...fieldLabel, padding: 0, marginBottom: s[3] }}>WHERE ARE YOUR CUSTOMERS?</legend>
        <div id="au-market" tabIndex={-1} style={{ display: 'flex', flexWrap: 'wrap', gap: s[2], outline: 'none' }}>
          {MARKETS.map((m) => (
            <Chip key={m} name="market" on={form.market === m} error={!!errors.market} onChange={() => set('market', m)}>
              {m}
            </Chip>
          ))}
        </div>
        {errors.market && (
          <p id="au-market-error" role="alert" style={{ ...hint, color: ERROR , display: 'flex', alignItems: 'center', gap: s[2] }}>
            <TerminalHead face="error" size={40} label="" className="th-inline" />
            {errors.market}
          </p>
        )}
      </fieldset>
      <Field id="au-email" title="EMAIL" error={errors.email}>
        {textInput('email', 'you@business.com', { type: 'email', inputMode: 'email', autoComplete: 'email' })}
      </Field>
      <Field id="au-whatsapp" title="WHATSAPP" optional error={errors.whatsapp} note="With the country code. Only if you'd rather get a quick message when the report is ready.">
        {textInput('whatsapp', '+91 98765 43210', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
      </Field>
      <Field id="au-worries" title="ANYTHING YOU'RE WORRIED ABOUT?" optional error={errors.worries}>
        <textarea
          id="au-worries"
          rows={4}
          maxLength={WORRIES_MAX}
          value={form.worries}
          onChange={(e) => set('worries', e.target.value)}
          aria-describedby={describedBy('worries')}
          style={{ ...input, resize: 'vertical', minHeight: 110 }}
        />
      </Field>

      {/* Honeypot, off-screen as on the other forms. */}
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
        <button type="submit" disabled={status.kind === 'sending'} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]), border: 0, cursor: 'pointer', opacity: status.kind === 'sending' ? 0.6 : 1 }}>
          {status.kind === 'sending' ? (
            <>
              <TerminalHead face="think" size={28} label="" />
              <span role="status">Sending…</span>
            </>
          ) : (
            'Send me my free check'
          )}
          <span aria-hidden>→</span>
        </button>
        <p style={hint}>
          I only check what&apos;s publicly visible. Your details are used only to send your report
          {due ? `, by ${due}` : ''}.{' '}
          <Link to={LEGAL_PATHS.privacy} className="pf-underline" style={{ color: p.ink }}>
            Privacy notice
          </Link>
          .
        </p>
        {status.kind === 'failed' && (
          <p role="alert" style={{ ...body, color: ERROR, display: 'flex', alignItems: 'flex-start', gap: s[3] }}>
            <TerminalHead face="error" size={40} label="" />
            <span>
              That didn&apos;t go through, and it&apos;s my end, not yours. Email your link to{' '}
              <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Free audit: ${TYPE_LABEL[type]}`)}&body=${encodeURIComponent(form.url)}`} style={{ color: ERROR, fontWeight: 600 }}>
                {EMAIL}
              </a>{' '}
              and the same {TURNAROUND_HOURS} hours applies.
            </span>
          </p>
        )}
      </div>
    </form>
  );
};

const Audit = () => {
  const [type, setType] = useState<AuditType | null>(null);

  useEffect(() => {
    const t = parseTypeParam(new URLSearchParams(window.location.search).get('type'));
    if (t) setType(t);
  }, []);

  const choose = (t: AuditType) => {
    setType(t);
    // Keep the URL in step so a reload or a shared link keeps the choice. `s` (app symptoms) survives.
    const params = new URLSearchParams(window.location.search);
    params.set('type', t);
    window.history.replaceState(null, '', `${PATH}?${params.toString()}`);
  };

  return (
    <PaperPage header={<SiteHeader page="audit" />}>
      <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />
      <section style={{ ...section, borderTop: 'none', paddingTop: s[10] }} data-rescue-hpad>
        <div data-rescue-split style={{ ...split('7fr 4fr'), alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: s[8], minWidth: 0 }}>
            <div style={{ display: 'grid', gap: s[5] }}>
              <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase' }}>
                Find your app&apos;s <span style={{ color: p.gold }}>first bug, free.</span>
              </h1>
              <p style={lead}>
                Takes 2 minutes. Back within {TURNAROUND_HOURS} hours. Then, if you want everything checked, the $349
                production audit is credited in full toward the fix.
              </p>
            </div>

            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ ...fieldLabel, padding: 0, marginBottom: s[4] }}>WHAT SHOULD BIT LOOK AT?</legend>
              <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: s[3] }}>
                {CHOICES.filter((ch) => AUDIT_TYPES.includes(ch.type)).map((ch) => {
                  const on = type === ch.type;
                  return (
                    <label
                      key={ch.type}
                      data-audit-chip
                      style={{
                        position: 'relative',
                        display: 'grid',
                        gap: s[2],
                        padding: px(s[5], s[5]),
                        border: `${rule.base}px solid ${c.ink}`,
                        background: on ? c.ink : '#fff',
                        color: on ? c.accent : p.ink,
                        cursor: 'pointer',
                      }}
                    >
                      <input type="radio" name="audit-type" checked={on} onChange={() => choose(ch.type)} style={visuallyHidden} />
                      <span style={{ display: 'flex', alignItems: 'center', gap: s[2], font: `600 15px/1.25 ${display}` }}>
                        {on && <Check color={c.accent} size={13} />}
                        {TYPE_LABEL[ch.type]}
                      </span>
                      <span style={{ font: `400 13px/1.4 ${display}`, color: on ? c.bright : p.dim }}>{ch.hint}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {type === null && <p style={{ ...body, color: p.dim }}>Pick one above and the form appears here.</p>}
            {type === 'app' && <AppAuditForm />}
            {type !== null && type !== 'app' && <LeadForm key={type} type={type} />}
          </div>

          <aside style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff', position: 'sticky', top: s[6] }}>
            <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>WHAT HAPPENS NEXT</span>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[5] }}>
              {[
                ['First bug, on video', `Within ${TURNAROUND_HOURS} hours: a short video of the biggest risk, in plain English, with the fixed price to fix it.`],
                ['Audit, if you want it', '$349 for everything checked and ranked. Credited 100% toward the fix; nothing found means a full refund.'],
                ['Pay when it’s live', 'Fixes are fixed-price: half to start, the rest once it works. No sales call unless you ask.'],
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
          </aside>
        </div>
      </section>
    </PaperPage>
  );
};

export default Audit;
