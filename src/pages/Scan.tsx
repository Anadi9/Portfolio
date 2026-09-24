import { useRef, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { track } from '@vercel/analytics';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, mono, px, rule, s, sectionY } from '@/components/portfolio/tokens';
import { parseScanInput } from '@/lib/scan/validate';
import type { Finding, ScanReport, Severity } from '@/lib/scan/report';

/**
 * `/scan`: the free Supabase security check.
 *
 * Most apps built with Lovable, Bolt, Cursor and v0 sit on Supabase, and the
 * commonest serious problem in them is a table with Row Level Security off.
 * This page lets a founder see that for themselves in half a minute, using the
 * anon key that is already public in their frontend bundle, and hands anyone
 * with a finding to `/rescue/audit` with the database symptom pre-ticked.
 *
 * The inputs are validated here with the same `parseScanInput` the function
 * runs. That matters for one case above all: a pasted `service_role` key is
 * refused in the browser and cleared from the field, so it never reaches the
 * network.
 *
 * Visual language is `/rescue/audit`'s: paper ground, ink plates, the same
 * header and the same `data-rescue-*` responsive hooks in portfolio.css.
 */

const TITLE = 'Free Supabase security check · Vibe Code Rescue';
const DESCRIPTION =
  'Find out in 30 seconds whether your Supabase tables are readable by anyone on the internet. Paste your project URL and public anon key. Nothing is stored, no row data is read back.';

const AUDIT = '/rescue/audit?s=1';
const AUDIT_PLAIN = '/rescue/audit';
const GITHUB = 'https://github.com/Anadi9';
const LINKEDIN = 'https://www.linkedin.com/in/anadi-thakur-92163316b/';

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
const code: CSSProperties = { font: `500 0.92em/1 ${mono}`, color: p.ink };
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

type Field = 'url' | 'key';
type Status =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'done'; report: ScanReport }
  | { kind: 'failed'; message: string };

const SEVERITY: Record<Severity, { label: string; tag: string; color: string }> = {
  critical: { label: 'Open to anyone', tag: 'CRITICAL', color: p.error },
  warning: { label: 'Worth a look', tag: 'WARNING', color: p.gold },
  ok: { label: 'Looks fine', tag: 'OK', color: p.dim },
};

const CHECKS = [
  'Which tables and views your public API lists',
  'Whether each one hands rows to a visitor who isn’t logged in, and how many',
  'Which storage buckets are public',
];

const NEVER = [
  'Read back any row. Only the count, from a response header.',
  'Write, update or delete anything',
  'Store your URL, your key or the results',
  'Accept a service_role or secret key',
];

const Check = ({ color = p.gold, size = 14 }: { color?: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const Cross = ({ color, size = 12 }: { color: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square">
    <path d="M5 5l14 14M19 5L5 19" />
  </svg>
);

/** Backticked spans in finding text (`profiles`) set as code. */
const withCode = (text: string): ReactNode =>
  text.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} style={code}>
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );

const FieldBlock = ({ id, title, note, error, children }: { id: string; title: string; note?: ReactNode; error?: string; children: ReactNode }) => (
  <div style={{ display: 'grid', gap: s[3] }}>
    <label htmlFor={id} style={fieldLabel}>
      {title}
    </label>
    {children}
    {note && (
      <p id={`${id}-note`} style={hint}>
        {note}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} role="alert" style={{ ...hint, color: p.error }}>
        {error}
      </p>
    )}
  </div>
);

function FindingRow({ f }: { f: Finding }) {
  const sev = SEVERITY[f.severity];
  return (
    <li style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[4], padding: px(s[5], 0), borderBottom: `${rule.hair}px solid ${p.rule}` }}>
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          boxSizing: 'border-box',
          border: `${rule.base}px solid ${sev.color}`,
          background: f.severity === 'critical' ? sev.color : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {f.severity === 'ok' ? <Check color={sev.color} size={12} /> : <Cross color={f.severity === 'critical' ? '#fff' : sev.color} />}
      </span>
      <div style={{ display: 'grid', gap: s[2], minWidth: 0 }}>
        <span style={{ font: `600 16px/1.35 ${display}`, color: p.ink, overflowWrap: 'anywhere' }}>{f.title}</span>
        <p style={{ ...body, fontSize: 14 }}>{f.detail}</p>
        {f.fix && (
          <p style={{ ...body, fontSize: 14, color: p.ink }}>
            <span style={{ ...label(10, 700, 0.14), color: sev.color === p.dim ? p.body : sev.color }}>FIX · </span>
            {withCode(f.fix)}
          </p>
        )}
      </div>
    </li>
  );
}

const summarize = (r: ScanReport) =>
  `Check complete: ${r.counts.critical} critical, ${r.counts.warning} ${r.counts.warning === 1 ? 'warning' : 'warnings'}, ${r.counts.ok} fine.`;

function Results({ report, onReset }: { report: ScanReport; onReset: () => void }) {
  const problems = report.counts.critical + report.counts.warning;
  const groups = (['critical', 'warning', 'ok'] as const).filter((sev) => report.counts[sev] > 0);
  const onCta = () => track('scan_cta_click', { critical: report.counts.critical, warning: report.counts.warning });

  return (
    <div style={{ display: 'grid', gap: s[8] }}>
      <div style={{ display: 'grid', gap: s[4] }}>
        <p style={eyebrow}>RESULTS · {report.project}.supabase.co</p>
        <h2 tabIndex={-1} id="scan-results-title" style={{ margin: 0, ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch', outline: 'none' }}>
          {report.counts.critical > 0 ? (
            <>
              {report.counts.critical} {report.counts.critical === 1 ? 'table is' : 'tables are'}{' '}
              <span style={{ color: p.error }}>open to the internet.</span>
            </>
          ) : problems > 0 ? (
            <>
              No open tables. <span style={{ color: p.gold }}>A few things to check.</span>
            </>
          ) : (
            <>
              Nothing open. <span style={{ color: p.gold }}>Nicely done.</span>
            </>
          )}
        </h2>
        <p style={body}>
          Checked {report.tables.checked} of {report.tables.found} {report.tables.found === 1 ? 'table' : 'tables'} the public API lists
          {report.buckets !== null ? `, and ${report.buckets} storage ${report.buckets === 1 ? 'bucket' : 'buckets'}` : ''}.
          {report.tables.truncated && ' The first 40, alphabetically: the rest weren’t checked.'} Nothing about this check was saved.
        </p>
      </div>

      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: `${rule.base}px solid ${c.ink}` }}>
        {(['critical', 'warning', 'ok'] as const).map((sev, i) => (
          <div key={sev} style={{ padding: px(s[5], s[5]), borderLeft: i ? `${rule.hair}px solid ${p.rule}` : 0, display: 'grid', gap: s[2] }}>
            <dt style={{ ...label(10, 700, 0.14), color: p.body }}>{SEVERITY[sev].tag}</dt>
            <dd style={{ margin: 0, ...heading('d6'), color: report.counts[sev] && sev !== 'ok' ? SEVERITY[sev].color : p.ink }}>
              {report.counts[sev]}
            </dd>
          </div>
        ))}
      </dl>

      {groups.map((sev) => (
        <section key={sev} aria-labelledby={`scan-g-${sev}`} style={{ display: 'grid', gap: s[2] }}>
          <h3 id={`scan-g-${sev}`} style={{ margin: 0, ...label(11, 700, 0.14), color: sev === 'ok' ? p.body : SEVERITY[sev].color }}>
            {SEVERITY[sev].label.toUpperCase()} · {report.counts[sev]}
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.hair}px solid ${p.rule}` }}>
            {report.findings
              .filter((f) => f.severity === sev)
              .map((f) => (
                <FindingRow key={`${f.area}:${f.subject}`} f={f} />
              ))}
          </ul>
        </section>
      ))}

      {problems > 0 ? (
        <div style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
          <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>VIBE CODE RESCUE</span>
          <p style={{ margin: 0, ...heading('d5'), textTransform: 'uppercase', maxWidth: '20ch' }}>
            Want these closed <span style={{ color: c.mark }}>without breaking the app?</span>
          </p>
          <p style={{ ...body, color: c.bright }}>
            RLS policies written by hand, tested against your real users and flows, so logged-in people still see their own
            data and nobody else sees it. The audit is free and covers auth and deploys too; the fix is one fixed price.
          </p>
          <Link to={AUDIT} onClick={onCta} className="pf-nudge pf-nudge-lg" style={{ ...cta, background: c.accent, color: c.ink, justifySelf: 'start' }}>
            GET THESE FIXED — FREE AUDIT<span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: s[4], padding: px(s[7], s[7]), background: p.panel }}>
          <span style={{ ...label(10, 700, 0.16), color: p.body }}>WHAT THIS DOESN’T COVER</span>
          <p style={{ ...body, color: p.ink }}>
            Your database is closed to strangers, which puts you ahead of most AI-built apps. The other places they break are
            auth flows, deploys and performance. If any of those keep you up, the free audit looks at all of it.
          </p>
          <Link to={AUDIT_PLAIN} onClick={onCta} className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink, justifySelf: 'start' }}>
            FREE PRODUCTION AUDIT →
          </Link>
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        className="pf-underline"
        style={{ ...label(11, 700, 0.14), color: p.ink, background: 'none', border: 0, padding: 0, cursor: 'pointer', justifySelf: 'start' }}
      >
        ← CHECK ANOTHER PROJECT
      </button>
    </div>
  );
}

export default function Scan() {
  const [form, setForm] = useState({ url: '', key: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const resultsRef = useRef<HTMLDivElement>(null);

  const set = (key: Field, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const fail = (field: Field, error: string, code?: string) => {
    setErrors({ [field]: error });
    // A secret key should not sit in a text field a moment longer than it has to.
    if (code === 'service_role' || code === 'secret') setForm((f) => ({ ...f, key: '' }));
    document.getElementById(`scan-${field}`)?.focus();
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseScanInput(form);
    if (parsed.ok === false) {
      fail(parsed.field, parsed.error, parsed.code);
      return;
    }
    setErrors({});
    setStatus({ kind: 'scanning' });
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.input.origin, key: parsed.input.key }),
      });
      const data = (await res.json().catch(() => ({}))) as { report?: ScanReport; error?: string; field?: Field; code?: string };
      if (res.ok && data.report) {
        setStatus({ kind: 'done', report: data.report });
        track('scan_run', { critical: data.report.counts.critical, warning: data.report.counts.warning });
        requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.getElementById('scan-results-title')?.focus({ preventScroll: true });
        });
        return;
      }
      if (data.field && data.error) {
        setStatus({ kind: 'idle' });
        fail(data.field, data.error, data.code);
        return;
      }
      setStatus({
        kind: 'failed',
        message: data.error ?? 'The check didn’t finish. Give it a moment and try again.',
      });
    } catch {
      setStatus({ kind: 'failed', message: 'The check didn’t finish. Check your connection and try again.' });
    }
  };

  const reset = () => {
    setStatus({ kind: 'idle' });
    setForm({ url: '', key: '' });
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      document.getElementById('scan-url')?.focus();
    });
  };

  const describedBy = (field: Field) => [`scan-${field}-note`, errors[field] ? `scan-${field}-error` : ''].filter(Boolean).join(' ');
  const scanning = status.kind === 'scanning';

  return (
    <div style={{ background: p.bg, color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/scan" type="website" />

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
          <div data-rescue-split style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: s[10], alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: s[10], minWidth: 0 }}>
              <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: s[8] }} aria-busy={scanning}>
                <div style={{ display: 'grid', gap: s[5] }}>
                  <p style={eyebrow}>FREE SUPABASE SECURITY CHECK · 30 SECONDS</p>
                  <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
                    Is your database <span style={{ color: p.gold }}>open to the internet?</span>
                  </h1>
                  <p style={{ ...body, font: `400 17px/1.5 ${display}`, maxWidth: '52ch' }}>
                    Apps built with Lovable, Bolt, Cursor and v0 often ship with Row Level Security off, which means anyone
                    can download your users table. Paste two things from your Supabase dashboard and find out whether yours
                    is one of them.
                  </p>
                </div>

                <FieldBlock
                  id="scan-url"
                  title="PROJECT URL"
                  error={errors.url}
                  note={
                    <>
                      Supabase → Project Settings → API. It looks like <span style={code}>https://abcd1234.supabase.co</span>
                    </>
                  }
                >
                  <input
                    id="scan-url"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="https://abcd1234.supabase.co"
                    value={form.url}
                    onChange={(e) => set('url', e.target.value)}
                    aria-invalid={!!errors.url || undefined}
                    aria-describedby={describedBy('url')}
                    style={{ ...input, borderColor: errors.url ? p.error : c.ink }}
                  />
                </FieldBlock>

                <FieldBlock
                  id="scan-key"
                  title="ANON (PUBLIC) KEY"
                  error={errors.key}
                  note={
                    <>
                      Same page, labelled <span style={code}>anon</span> <span style={code}>public</span> (or a{' '}
                      <span style={code}>sb_publishable_</span> key). It’s already inside your app’s JavaScript, where
                      anyone can find it. That’s by design, and it’s why RLS matters. Never paste the{' '}
                      <span style={code}>service_role</span> key, here or anywhere.
                    </>
                  }
                >
                  <textarea
                    id="scan-key"
                    rows={3}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                    value={form.key}
                    onChange={(e) => set('key', e.target.value)}
                    aria-invalid={!!errors.key || undefined}
                    aria-describedby={describedBy('key')}
                    style={{ ...input, resize: 'vertical', minHeight: 96, font: `400 14px/1.4 ${mono}`, wordBreak: 'break-all' }}
                  />
                </FieldBlock>

                <div style={{ display: 'grid', gap: s[4], justifyItems: 'start' }}>
                  <button type="submit" disabled={scanning} className="pf-nudge pf-nudge-lg" style={{ ...cta, opacity: scanning ? 0.6 : 1 }}>
                    {scanning ? 'CHECKING…' : 'RUN THE CHECK'}
                    <span aria-hidden>→</span>
                  </button>
                  <p style={hint}>Free. No signup. Reads counts, never rows. Nothing is stored.</p>
                  {status.kind === 'failed' && (
                    <p role="alert" style={{ ...body, color: p.error }}>
                      {status.message}
                    </p>
                  )}
                </div>
              </form>

              {/* The live region carries one sentence; focus moves to the results heading for the rest. */}
              <p aria-live="polite" role="status" style={visuallyHidden}>
                {scanning ? 'Checking your project…' : status.kind === 'done' ? summarize(status.report) : ''}
              </p>
              <div ref={resultsRef} style={{ scrollMarginTop: s[6], minWidth: 0 }}>
                {scanning && <p style={{ ...hint, ...label(11, 700, 0.14) }}>CHECKING YOUR TABLES…</p>}
                {status.kind === 'done' && <Results report={status.report} onReset={reset} />}
              </div>
            </div>

            <aside style={{ display: 'grid', gap: s[6], position: 'sticky', top: s[6] }}>
              <div style={{ display: 'grid', gap: s[5], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
                <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>WHAT IT CHECKS</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
                  {CHECKS.map((t) => (
                    <li key={t} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[3], alignItems: 'start' }}>
                      <span style={{ marginTop: 3 }}>
                        <Check color={c.mark} size={13} />
                      </span>
                      <span style={{ font: `400 14px/1.5 ${display}`, color: c.bright }}>{t}</span>
                    </li>
                  ))}
                </ul>
                <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk, marginTop: s[3] }}>WHAT IT NEVER DOES</span>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[4] }}>
                  {NEVER.map((t) => (
                    <li key={t} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: s[3], alignItems: 'start' }}>
                      <span style={{ marginTop: 4 }}>
                        <Cross color={c.dimOnInk} size={11} />
                      </span>
                      <span style={{ font: `400 14px/1.5 ${display}`, color: c.bright }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ ...hint, color: p.body }}>
                It asks your database exactly what a stranger with your public key could ask, and nothing more.
              </p>
            </aside>
          </div>
        </section>
      </main>

      <footer
        data-rescue-footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: s[6],
          padding: px(s[8], gutter, s[10]),
          background: c.ink,
          borderTop: `${rule.hair}px solid ${c.rule}`,
        }}
      >
        <span style={{ ...label(11, 700, 0.12), color: '#fff' }}>© 2026 ANADI THAKUR</span>
        <nav aria-label="Elsewhere" style={{ display: 'flex', gap: s[6], flexWrap: 'wrap' }}>
          <Link to="/" className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            VIBE CODE RESCUE
          </Link>
          <a href={GITHUB} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            GITHUB ↗
          </a>
          <a href={LINKEDIN} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            LINKEDIN ↗
          </a>
        </nav>
      </footer>
    </div>
  );
}
