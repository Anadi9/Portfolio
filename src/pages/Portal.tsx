import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Seo } from '@/components/Seo';
import { Bit } from '@/components/brand/Bit';
import { PaperPage, SiteHeader } from '@/components/site/kit';
import { kindLabel } from '@/lib/notify/email';
import { JOURNEY, type ClientTicket } from '@/lib/portal/view';
import { TICKET_STAGES, type TicketStage } from '@/lib/tickets/types';
import '@/styles/home.css';

/**
 * `/portal`: a client's own requests. Sign-in is a link emailed by
 * `/api/portal` (token in the URL fragment, so it never reaches a server log).
 * The prerendered HTML is the sign-in form only; ticket data arrives after
 * sign-in, through the API, scoped to the signed-in client.
 */

type Summary = Pick<ClientTicket, 'id' | 'number' | 'kind' | 'stage' | 'appUrl' | 'createdAt' | 'updatedAt'>;
type State = 'checking' | 'out' | 'sent' | 'in';

async function api<T>(body: Record<string, unknown>): Promise<{ status: number; data: T & { error?: string } }> {
  try {
    const res = await fetch('/api/portal', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, data: (await res.json().catch(() => ({}))) as T & { error?: string } };
  } catch {
    return { status: 0, data: { error: 'Network error. Try again.' } as T & { error?: string } };
  }
}

const wrap: CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '48px var(--bq-gutter) 72px', display: 'grid', gap: 20 };
const card: CSSProperties = { border: 'var(--bq-border-thin)', background: 'var(--bq-panel)', padding: 18, display: 'grid', gap: 10 };
const btn: CSSProperties = { font: '600 15px/1 var(--bq-font-body)', minHeight: 44, padding: '0 18px', border: 'var(--bq-border-thin)', background: 'var(--bq-brand)', color: 'var(--bq-brand-text)', cursor: 'pointer', justifySelf: 'start' };
const quiet: CSSProperties = { ...btn, background: 'var(--bq-panel)', color: 'var(--bq-ink)' };
const small: CSSProperties = { margin: 0, font: '400 14px/1.5 var(--bq-font-body)', color: 'var(--bq-muted)' };
const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Portal() {
  const [state, setState] = useState<State>('checking');
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Summary[]>([]);
  const [open, setOpen] = useState<ClientTicket | null>(null);

  const loadTickets = useCallback(async () => {
    const r = await api<{ tickets: Summary[] }>({ op: 'tickets' });
    if (r.status === 200) {
      setTickets(r.data.tickets);
      setState('in');
    } else setState('out');
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    if (token) {
      // Drop the token from the address bar before anything else.
      window.history.replaceState(null, '', window.location.pathname);
      api({ op: 'verify', token }).then((r) => {
        if (r.status === 200) loadTickets();
        else {
          setError(r.data.error ?? 'This link didn’t work. Ask for a new one.');
          setState('out');
        }
      });
    } else loadTickets();
  }, [loadTickets]);

  return (
    <PaperPage header={<SiteHeader page="portal" />}>
      <Seo title="Your requests · Anadi Thakur" description="Sign in to see where your request is." path="/portal" type="website" robots="noindex, nofollow" />
      <section style={wrap} aria-labelledby="h-portal">
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
          <Bit pose="wave" size={54} />
          <h1 id="h-portal" style={{ margin: 0, font: '400 var(--bq-h2)/1 var(--bq-font-display)', textTransform: 'uppercase' }}>
            Your requests
          </h1>
        </div>
        {error && (
          <p role="alert" style={{ ...card, margin: 0, borderColor: 'var(--bq-brand)' }}>
            {error}
          </p>
        )}
        {state === 'checking' && <p style={small}>Loading…</p>}
        {state === 'out' && <RequestLink onSent={() => setState('sent')} />}
        {state === 'sent' && (
          <div style={card}>
            <p style={{ margin: 0, font: '600 18px var(--bq-font-body)' }}>Check your email.</p>
            <p style={small}>If that address has a request with us, a sign-in link is on its way. It works once and expires in 15 minutes.</p>
          </div>
        )}
        {state === 'in' && !open && (
          <>
            {tickets.length === 0 && <p style={small}>No requests yet.</p>}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await api<{ ticket: ClientTicket }>({ op: 'ticket', id: t.id });
                      if (r.status === 200) setOpen(r.data.ticket);
                      else if (r.status === 401) setState('out');
                    }}
                    style={{ ...card, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                  >
                    <b style={{ font: '600 17px var(--bq-font-body)' }}>
                      {t.number} · {kindLabel(t.kind)}
                    </b>
                    <span style={small}>
                      {JOURNEY[t.stage].label} · updated {date(t.updatedAt)}
                      {t.appUrl ? ` · ${t.appUrl}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              style={quiet}
              onClick={async () => {
                await api({ op: 'logout' });
                setState('out');
              }}
            >
              Sign out
            </button>
          </>
        )}
        {state === 'in' && open && <TicketView ticket={open} back={() => setOpen(null)} />}
      </section>
    </PaperPage>
  );
}

function RequestLink({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await api({ op: 'requestLink', email });
    setBusy(false);
    if (r.status === 200) onSent();
    else setMsg(r.data.error ?? 'Something went wrong. Try again.');
  };
  return (
    <form onSubmit={submit} style={card}>
      <label htmlFor="portal-email" style={{ font: '600 16px var(--bq-font-body)' }}>
        Your email
      </label>
      <p style={small}>The one you used for your request. We’ll email you a sign-in link; no password.</p>
      <input
        id="portal-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ font: '16px var(--bq-font-body)', minHeight: 44, padding: '0 12px', border: 'var(--bq-border-thin)', background: 'var(--bq-bg)', color: 'var(--bq-ink)' }}
      />
      {msg && (
        <p role="alert" style={{ ...small, color: 'var(--bq-brand)' }}>
          {msg}
        </p>
      )}
      <button type="submit" style={btn} disabled={busy || !email}>
        {busy ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}

function TicketView({ ticket, back }: { ticket: ClientTicket; back: () => void }) {
  const current = TICKET_STAGES.indexOf(ticket.stage);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <button type="button" style={quiet} onClick={back}>
        ← All requests
      </button>
      <div style={card}>
        <h2 style={{ margin: 0, font: '600 22px var(--bq-font-body)' }}>
          {ticket.number} · {kindLabel(ticket.kind)}
        </h2>
        <p style={small}>
          Opened {date(ticket.createdAt)}
          {ticket.appUrl ? ` · ${ticket.appUrl}` : ''}
        </p>
        <ol aria-label="Where your request is" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {TICKET_STAGES.map((s: TicketStage, i) => (
            <li key={s} aria-current={i === current ? 'step' : undefined} style={{ display: 'flex', gap: 10, alignItems: 'baseline', opacity: i > current ? 0.55 : 1 }}>
              <span aria-hidden style={{ font: '600 15px var(--bq-font-body)', color: i === current ? 'var(--bq-brand)' : 'var(--bq-ink)', minWidth: 18 }}>
                {i < current ? '✓' : i === current ? '●' : '○'}
              </span>
              <span>
                <b>{JOURNEY[s].label}</b>
                {i === current && <span style={{ ...small, display: 'block' }}>{JOURNEY[s].about}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {ticket.messages.length > 0 && (
        <div style={card}>
          <h2 style={{ margin: 0, font: '600 18px var(--bq-font-body)' }}>From Anadi</h2>
          {ticket.messages.map((m) => (
            <article key={m.at} style={{ borderTop: '1px solid var(--bq-rule)', paddingTop: 10 }}>
              <p style={small}>{date(m.at)}</p>
              {m.subject && <p style={{ margin: '4px 0', font: '600 15px var(--bq-font-body)' }}>{m.subject}</p>}
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', font: '15px/1.55 var(--bq-font-body)' }}>{m.body}</p>
            </article>
          ))}
        </div>
      )}
      <div style={card}>
        <h2 style={{ margin: 0, font: '600 18px var(--bq-font-body)' }}>What’s happened</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
          {ticket.timeline.map((e, i) => (
            <li key={i} style={small}>
              {date(e.at)} · {e.label}
            </li>
          ))}
        </ol>
        <p style={small}>Questions? Reply to any email from Anadi.</p>
      </div>
    </div>
  );
}
