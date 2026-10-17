import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Head } from 'vite-react-ssg';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { Seo } from '@/components/Seo';
import { Bit, Coach } from '@/components/brand/Bit';
import { admin } from '@/lib/admin/client';
import { age, dueLabel, parseHash, promiseLabel, snoozeHours, timeLeft, type SnoozeChoice, type Tone } from '@/lib/admin/view';
import type { Commitment } from '@/lib/coach/types';
import type { Numbers } from '@/lib/command/numbers';
import type { AwaySummary, TodayItem } from '@/lib/command/today';
import type { PlanItem } from '@/lib/command/plan';
import { hasPlaceholder, splitDraft } from '@/lib/brief/draft';
import { ANSWER_LABEL, kindLabel } from '@/lib/notify/email';
import type { FeedItem } from '@/lib/feed/types';
import { TICKET_STAGES, type Message, type TicketDetail, type TicketRow, type TicketStage } from '@/lib/tickets/types';

/**
 * `/admin`: Anadi's command centre. The prerendered HTML is an empty shell
 * (noindex, not in the sitemap); everything else comes from `/api/admin`
 * after login, so no ticket data ever sits in a static file.
 *
 * Opens on the feed: one card per thing that needs Anadi, red Bit for client
 * news, green Coach for deadlines (Phase 4). Done and snoozed cards leave. The
 * Tickets tab has the list with the 24 h clock and the ticket view.
 */

const STAGE_LABEL: Record<TicketStage, string> = {
  inbox: 'Enquiry',
  bug_review: 'First-bug video',
  audit: 'Audit',
  fixing: 'Fix',
  live: 'Live',
  closed: 'Done',
};

const TONE: Record<Tone, string> = { ok: 'var(--bq-muted)', warn: 'var(--bq-brand)', late: 'var(--bq-brand)' };

const box: CSSProperties = { border: 'var(--bq-border-thin)', background: 'var(--bq-panel)', padding: 16, display: 'grid', gap: 10 };
const btn: CSSProperties = {
  font: '600 14px/1 var(--bq-font-body)',
  minHeight: 40,
  padding: '0 14px',
  border: 'var(--bq-border-thin)',
  background: 'var(--bq-panel)',
  color: 'var(--bq-ink)',
  cursor: 'pointer',
};
const primary: CSSProperties = { ...btn, background: 'var(--bq-brand)', color: 'var(--bq-brand-text)', borderColor: 'var(--bq-brand)' };
const small: CSSProperties = { margin: 0, font: '400 13px/1.4 var(--bq-font-body)', color: 'var(--bq-muted)' };
const h2: CSSProperties = { margin: 0, font: '600 18px/1.3 var(--bq-font-body)' };

type Auth = 'checking' | 'out' | 'in';
type View = { tab: 'feed' } | { tab: 'tickets' } | { tab: 'numbers' } | { tab: 'plan' } | { tab: 'settings' } | { tab: 'ticket'; id: string; focus?: string };

export default function Admin() {
  const [auth, setAuth] = useState<Auth>('checking');
  const [view, setView] = useState<View>({ tab: 'feed' });
  const [error, setError] = useState<string | null>(null);

  const guard = useCallback(<T,>(r: { ok: boolean; auth: boolean; error?: string; data?: T }) => {
    if (!r.auth) setAuth('out');
    else if (!r.ok) setError(r.error ?? 'Something went wrong.');
    return r.ok ? (r.data as T) : null;
  }, []);

  useEffect(() => {
    admin.feed().then((r) => setAuth(r.auth ? 'in' : 'out'));
    // Installable on the phone, and the target for push alerts. Scoped to /admin only.
    navigator.serviceWorker?.register('/admin-sw.js', { scope: '/admin' }).catch(() => {});
  }, []);

  return (
    <div className="bq-page" style={{ minHeight: '100vh', color: 'var(--bq-ink)' }}>
      <Seo title="Command centre" description="Private." path="/admin" type="website" robots="noindex, nofollow" />
      <Head>
        <link rel="manifest" href="/admin.webmanifest" />
        <meta name="theme-color" content="#121212" />
      </Head>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px var(--bq-gutter) 64px', display: 'grid', gap: 20 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Bit pose="calm" size={36} />
          <Coach pose="calm" size={36} />
          <h1 style={{ margin: 0, font: '400 34px/1 var(--bq-font-display)', textTransform: 'uppercase', flex: 1 }}>Command centre</h1>
          {auth === 'in' && (
            <button
              type="button"
              style={btn}
              onClick={async () => {
                await admin.logout();
                setAuth('out');
              }}
            >
              Log out
            </button>
          )}
        </header>

        {error && (
          <p role="alert" style={{ ...box, margin: 0, borderColor: 'var(--bq-brand)' }}>
            {error}{' '}
            <button type="button" style={{ ...btn, minHeight: 32 }} onClick={() => setError(null)}>
              Dismiss
            </button>
          </p>
        )}

        {auth === 'checking' && <p style={small}>Loading…</p>}
        {auth === 'out' && <Login onIn={() => setAuth('in')} />}
        {auth === 'in' && (
          <>
            <nav aria-label="Command centre" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <TabButton active={view.tab === 'feed'} onClick={() => setView({ tab: 'feed' })}>
                Feed
              </TabButton>
              <TabButton active={view.tab === 'tickets' || view.tab === 'ticket'} onClick={() => setView({ tab: 'tickets' })}>
                Tickets
              </TabButton>
              <TabButton active={view.tab === 'numbers'} onClick={() => setView({ tab: 'numbers' })}>
                Numbers
              </TabButton>
              <TabButton active={view.tab === 'plan'} onClick={() => setView({ tab: 'plan' })}>
                Plan
              </TabButton>
              <TabButton active={view.tab === 'settings'} onClick={() => setView({ tab: 'settings' })}>
                Settings
              </TabButton>
            </nav>
            {view.tab === 'feed' && <Away guard={guard} />}
            {view.tab === 'feed' && <Today guard={guard} open={(id) => setView({ tab: 'ticket', id })} />}
            {view.tab === 'feed' && <Feed guard={guard} open={(id, focus) => setView({ tab: 'ticket', id, focus })} />}
            {view.tab === 'numbers' && <NumbersView guard={guard} />}
            {view.tab === 'plan' && <PlanView guard={guard} />}
            {view.tab === 'settings' && <Settings guard={guard} />}
            {view.tab === 'tickets' && <Tickets guard={guard} open={(id) => setView({ tab: 'ticket', id })} />}
            {view.tab === 'ticket' && <TicketView id={view.id} focus={view.focus} guard={guard} back={() => setView({ tab: 'tickets' })} />}
          </>
        )}
      </div>
    </div>
  );
}

type Guard = <T>(r: { ok: boolean; auth: boolean; error?: string; data?: T }) => T | null;

function NumbersView({ guard }: { guard: Guard }) {
  const [n, setN] = useState<Numbers | null>(null);
  useEffect(() => {
    admin.numbers().then((r) => {
      const d = guard(r);
      if (d) setN(d.numbers);
    });
  }, [guard]);
  if (!n) return <p style={small}>Loading numbers…</p>;
  const rate = n.promisesKept.rate;
  const tiles: [string, string, string][] = [
    ['Promises kept', rate == null ? '—' : `${Math.round(rate * 100)}%`, `${n.promisesKept.kept} kept · ${n.promisesKept.missed} missed`],
    ['Average first reply', n.avgFirstReplyHours == null ? '—' : `${n.avgFirstReplyHours}h`, 'from ticket to first sent reply'],
    ['Tickets', String(n.ticketsLast7), `last 7 days · ${n.ticketsLast30} in 30 days`],
  ];
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {tiles.map(([label, value, note]) => (
          <div key={label} style={box}>
            <p style={small}>{label}</p>
            <p style={{ margin: 0, font: '400 44px/1 var(--bq-font-display)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
            <p style={small}>{note}</p>
          </div>
        ))}
      </div>
      <div style={box}>
        <h2 style={h2}>Pipeline</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
          {TICKET_STAGES.map((s) => (
            <li key={s} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bq-rule)', padding: '4px 0' }}>
              <span>{STAGE_LABEL[s]}</span>
              <b style={{ fontVariantNumeric: 'tabular-nums' }}>{n.pipeline[s]}</b>
            </li>
          ))}
        </ul>
        <p style={small}>Chats and paid work aren’t tracked yet: chats aren’t stored, and payments link to tickets later.</p>
      </div>
    </section>
  );
}

function PlanView({ guard }: { guard: Guard }) {
  const [plan, setPlan] = useState<{ items: PlanItem[]; phases: { phase: string; done: number; total: number }[]; next: PlanItem[] } | null>(null);
  useEffect(() => {
    admin.plan().then((r) => {
      const d = guard(r);
      if (d) setPlan(d);
    });
  }, [guard]);
  if (!plan) return <p style={small}>Loading the plan…</p>;
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={box}>
        <h2 style={h2}>Next</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {plan.next.map((i) => (
            <li key={i.text}>
              {i.text} <span style={small}>· {i.phase}</span>
            </li>
          ))}
        </ol>
      </div>
      {plan.phases.map((p) => (
        <details key={p.phase} style={box}>
          <summary style={{ cursor: 'pointer', font: '600 15px var(--bq-font-body)' }}>
            {p.phase} · {p.done}/{p.total}
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            {plan.items
              .filter((i) => i.phase === p.phase)
              .map((i) => (
                <li key={i.text} style={{ ...small, color: i.done ? 'var(--bq-muted)' : 'var(--bq-ink)', textDecoration: i.done ? 'line-through' : undefined }}>
                  {i.text}
                </li>
              ))}
          </ul>
        </details>
      ))}
    </section>
  );
}

const urlBase64ToBytes = (b64: string) => {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

function PhoneAlerts({ guard }: { guard: Guard }) {
  const [state, setState] = useState<'unknown' | 'unsupported' | 'off' | 'on' | 'working' | 'blocked'>('unknown');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('blocked');
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => setState(sub ? 'on' : 'off'));
  }, []);
  const enable = async () => {
    setState('working');
    const key = guard(await admin.pushKey());
    if (!key) return setState('off');
    if ((await Notification.requestPermission()) !== 'granted') return setState('blocked');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(key.key) });
    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    setState(guard(await admin.pushSubscribe({ endpoint: json.endpoint, keys: json.keys })) ? 'on' : 'off');
  };
  const disable = async () => {
    setState('working');
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) {
      await admin.pushUnsubscribe(sub.endpoint);
      await sub.unsubscribe();
    }
    setState('off');
  };
  return (
    <div style={box}>
      <h2 style={h2}>Phone alerts</h2>
      <p style={small}>Only urgent Coach cards (a promise at risk or missed) are pushed. Everything else waits for the feed and the 08:30 summary email.</p>
      {state === 'unsupported' && <p style={small}>This browser can’t receive push alerts. On iPhone, add /admin to the Home Screen first, then open it from there.</p>}
      {state === 'blocked' && <p style={small}>Notifications are blocked for this site in the browser settings.</p>}
      {state === 'off' && (
        <button type="button" style={{ ...primary, justifySelf: 'start' }} onClick={enable}>
          Enable phone alerts
        </button>
      )}
      {state === 'on' && (
        <button type="button" style={{ ...btn, justifySelf: 'start' }} onClick={disable}>
          Turn off alerts on this device
        </button>
      )}
      {state === 'working' && <p style={small}>Working…</p>}
    </div>
  );
}

function Passkeys({ guard }: { guard: Guard }) {
  const [keys, setKeys] = useState<{ id: string; createdAt: string }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const d = guard(await admin.passkeys());
    if (d) setKeys(d.passkeys);
  }, [guard]);
  useEffect(() => {
    load();
  }, [load]);
  const add = async () => {
    setMsg(null);
    const o = guard(await admin.passkeyOptions());
    if (!o) return;
    try {
      const response = await startRegistration({ optionsJSON: o.options as unknown as Parameters<typeof startRegistration>[0]['optionsJSON'] });
      if (guard(await admin.passkeyRegister(response))) {
        setMsg('Passkey added. From now on, logging in asks for it after the password.');
        load();
      }
    } catch {
      setMsg('Cancelled.');
    }
  };
  return (
    <div style={box}>
      <h2 style={h2}>Passkeys</h2>
      <p style={small}>With a passkey added, logging in needs your email, your password and this device’s Face ID, fingerprint or PIN.</p>
      {keys?.length ? (
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {keys.map((k) => (
            <li key={k.id} style={small}>
              Added {new Date(k.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
              <button
                type="button"
                style={{ ...btn, minHeight: 28 }}
                onClick={async () => {
                  if (window.confirm('Remove this passkey?') && guard(await admin.passkeyRemove(k.id))) load();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        keys && <p style={small}>None yet: password only.</p>
      )}
      <button type="button" style={{ ...primary, justifySelf: 'start' }} onClick={add}>
        Add a passkey on this device
      </button>
      {msg && <p style={small}>{msg}</p>}
    </div>
  );
}

function Settings({ guard }: { guard: Guard }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <Passkeys guard={guard} />
      <PhoneAlerts guard={guard} />
    </section>
  );
}

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" aria-pressed={active} onClick={onClick} style={active ? { ...btn, background: 'var(--bq-ink)', color: 'var(--bq-bg)' } : btn}>
    {children}
  </button>
);

function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await admin.login(email, password);
    if (!r.ok) {
      setBusy(false);
      return setMsg('error' in r && r.error === 'too many attempts' ? 'Too many attempts. Wait a minute.' : 'Wrong email or password.');
    }
    if (r.data.passkey && r.data.options) {
      try {
        const response = await startAuthentication({ optionsJSON: r.data.options as unknown as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
        const done = await admin.passkeyLogin(response);
        setBusy(false);
        return done.ok ? onIn() : setMsg('Passkey not recognised.');
      } catch {
        setBusy(false);
        return setMsg('Passkey cancelled. Log in again to retry.');
      }
    }
    setBusy(false);
    onIn();
  };
  return (
    <form onSubmit={submit} style={{ ...box, maxWidth: 360 }}>
      <label htmlFor="admin-email" style={h2}>
        Email
      </label>
      <input
        id="admin-email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ font: '16px var(--bq-font-body)', minHeight: 44, padding: '0 10px', border: 'var(--bq-border-thin)', background: 'var(--bq-bg)', color: 'var(--bq-ink)' }}
      />
      <label htmlFor="admin-pw" style={h2}>
        Password
      </label>
      <input
        id="admin-pw"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ font: '16px var(--bq-font-body)', minHeight: 44, padding: '0 10px', border: 'var(--bq-border-thin)', background: 'var(--bq-bg)', color: 'var(--bq-ink)' }}
      />
      {msg && (
        <p role="alert" style={{ ...small, color: 'var(--bq-brand)' }}>
          {msg}
        </p>
      )}
      <button type="submit" style={primary} disabled={busy || !password || !email}>
        {busy ? 'Checking…' : 'Log in'}
      </button>
    </form>
  );
}

const LAST_SEEN = 'admin:lastSeen';

const readLastSeen = () => {
  try {
    return window.localStorage.getItem(LAST_SEEN);
  } catch {
    return null;
  }
};

const writeLastSeen = (iso: string) => {
  try {
    window.localStorage.setItem(LAST_SEEN, iso);
  } catch {
    // private mode: the away card just won't remember
  }
};

/** "While you were away": what changed since this browser last opened /admin. */
function Away({ guard }: { guard: Guard }) {
  const [away, setAway] = useState<AwaySummary | null>(null);
  useEffect(() => {
    const since = readLastSeen();
    writeLastSeen(new Date().toISOString());
    if (!since) return;
    admin.away(since).then((r) => {
      const d = guard(r);
      if (d?.away.any) setAway(d.away);
    });
  }, [guard]);
  if (!away) return null;
  const parts = [
    away.newTickets && `${away.newTickets} new ticket${away.newTickets > 1 ? 's' : ''}`,
    away.briefsReady && `${away.briefsReady} brief${away.briefsReady > 1 ? 's' : ''} ready`,
    away.kept && `${away.kept} promise${away.kept > 1 ? 's' : ''} kept`,
    away.missed && `${away.missed} missed`,
    away.atRisk && `${away.atRisk} at risk now`,
    away.newCards && `${away.newCards} new card${away.newCards > 1 ? 's' : ''}`,
  ].filter(Boolean);
  return (
    <section aria-label="While you were away" style={{ ...box, gridTemplateColumns: 'auto 1fr', alignItems: 'center' }}>
      <Coach pose="wave" size={36} />
      <div>
        <p style={h2}>While you were away</p>
        <p style={small}>{parts.join(' · ')}</p>
      </div>
    </section>
  );
}

/** Never more than three things. */
function Today({ guard, open }: { guard: Guard; open: (ticketId: string) => void }) {
  const [items, setItems] = useState<TodayItem[] | null>(null);
  useEffect(() => {
    admin.today().then((r) => {
      const d = guard(r);
      if (d) setItems(d.items);
    });
  }, [guard]);
  if (!items) return null;
  return (
    <section aria-labelledby="h-today" style={box}>
      <h2 id="h-today" style={h2}>
        Today
      </h2>
      {items.length === 0 ? (
        <p style={small}>Nothing pressing. Good.</p>
      ) : (
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {items.map((i) => (
            <li key={i.key}>
              {i.ticketId ? (
                <button type="button" onClick={() => open(i.ticketId as string)} style={{ all: 'unset', cursor: 'pointer', textDecoration: 'underline', font: '600 15px var(--bq-font-body)' }}>
                  {i.title}
                </button>
              ) : (
                <b>{i.title}</b>
              )}
              <span style={{ ...small, display: 'block' }}>{i.why}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Feed({ guard, open }: { guard: Guard; open: (ticketId: string, focus?: string) => void }) {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [highlight, setHighlight] = useState<string | undefined>();

  const load = useCallback(async () => {
    const d = guard(await admin.feed());
    setFailed(!d);
    if (d) setItems(d.items);
  }, [guard]);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    // No Realtime (it would need the database opened to the browser): poll while the tab is visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!items) return;
    const { card } = parseHash(window.location.hash);
    if (!card) return;
    setHighlight(card);
    document.getElementById(`card-${card}`)?.scrollIntoView({ block: 'center' });
  }, [items]);

  const drop = (id: string) => setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);

  if (!items)
    return failed ? (
      <button type="button" style={{ ...btn, justifySelf: 'start' }} onClick={load}>
        Couldn’t load the feed. Retry
      </button>
    ) : (
      <p style={small}>Loading the feed…</p>
    );
  if (!items.length)
    return (
      <div style={{ ...box, justifyItems: 'center', textAlign: 'center', padding: 32 }}>
        <Bit pose="happy" size={54} />
        <p style={h2}>Nothing needs you.</p>
      </div>
    );

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
      {items.map((f) => (
        <li key={f.id} id={`card-${f.id}`}>
          <Card
            item={f}
            highlight={f.id === highlight}
            onOpen={() => f.ticketId && open(f.ticketId, f.action === 'approve_send' ? (f.ref ?? undefined) : undefined)}
            onDone={async () => {
              if (guard(await admin.done(f.id))) drop(f.id);
            }}
            onHelper={async () => {
              if (guard(await admin.helper(f.id))) setItems((xs) => xs?.map((x) => (x.id === f.id ? { ...x, assignee: 'helper' } : x)) ?? null);
            }}
            onSnooze={async (choice) => {
              if (guard(await admin.snooze(f.id, snoozeHours(choice)))) drop(f.id);
            }}
          />
        </li>
      ))}
    </ul>
  );
}

function Card({
  item,
  highlight,
  onOpen,
  onDone,
  onSnooze,
  onHelper,
}: {
  item: FeedItem;
  highlight: boolean;
  onOpen: () => void;
  onDone: () => void;
  onSnooze: (c: SnoozeChoice) => void;
  onHelper: () => void;
}) {
  const main =
    item.action === 'approve_send' ? (
      <button type="button" style={primary} onClick={onOpen} disabled={!item.ticketId}>
        Approve &amp; send
      </button>
    ) : item.action === 'open' ? (
      <button type="button" style={primary} onClick={onOpen} disabled={!item.ticketId}>
        Open
      </button>
    ) : null;
  return (
    <article
      style={{
        ...box,
        gridTemplateColumns: 'auto 1fr',
        alignItems: 'start',
        borderColor: item.urgent ? 'var(--bq-brand)' : undefined,
        boxShadow: highlight ? 'var(--bq-shadow-brand)' : undefined,
      }}
    >
      {item.bot === 'coach' ? <Coach pose="calm" size={36} label="Coach" /> : <Bit pose="calm" size={36} label="Bit" />}
      <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
        <p style={{ ...h2, overflowWrap: 'anywhere' }}>{item.title}</p>
        {item.body && <p style={{ ...small, color: 'var(--bq-body-text)' }}>{item.body}</p>}
        <p style={small}>
          {item.urgent ? 'Urgent · ' : ''}
          {item.assignee === 'helper' ? 'With helper · ' : ''}
          {age(item.createdAt)}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {main}
          {item.action === 'approve_send' && (
            <button type="button" style={btn} onClick={onOpen}>
              Edit
            </button>
          )}
          <label style={{ display: 'inline-flex' }}>
            <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Snooze
            </span>
            <select
              aria-label="Snooze"
              defaultValue=""
              onChange={(e) => e.target.value && onSnooze(e.target.value as SnoozeChoice)}
              style={{ ...btn, appearance: 'auto' }}
            >
              <option value="" disabled>
                Snooze…
              </option>
              <option value="3h">3 hours</option>
              <option value="tomorrow">Tomorrow 09:00</option>
              <option value="week">1 week</option>
            </select>
          </label>
          {item.assignee !== 'helper' && (
            <button type="button" style={btn} onClick={onHelper}>
              Give to helper
            </button>
          )}
          <button type="button" style={btn} onClick={onDone}>
            Mark done
          </button>
        </div>
      </div>
    </article>
  );
}

function Tickets({ guard, open }: { guard: Guard; open: (id: string) => void }) {
  const [stage, setStage] = useState<TicketStage | ''>('');
  const [rows, setRows] = useState<TicketRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    admin.list(stage || undefined).then((r) => {
      const d = guard(r);
      if (!d) return;
      setRows(d.tickets);
      const { ticket } = parseHash(window.location.hash);
      const hit = ticket && d.tickets.find((t) => t.number === ticket);
      if (hit) open(hit.id);
    });
  }, [stage, guard, open]);

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', ...small }}>
        Stage
        <select value={stage} onChange={(e) => setStage(e.target.value as TicketStage | '')} style={{ ...btn, appearance: 'auto' }}>
          <option value="">All</option>
          {TICKET_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      {!rows && <p style={small}>Loading tickets…</p>}
      {rows && !rows.length && <p style={small}>No tickets.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {rows?.map((t) => {
          const clock = t.kind === 'first_bug' && !t.firstReplySentAt ? timeLeft(t.createdAt) : null;
          return (
            <li key={t.id}>
              <button type="button" onClick={() => open(t.id)} style={{ ...box, width: '100%', textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
                <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <b style={{ font: '600 16px var(--bq-font-body)' }}>{t.number}</b>
                  <span style={small}>{kindLabel(t.kind)}</span>
                  <span style={small}>· {STAGE_LABEL[t.stage]}</span>
                  {t.hasBrief && <span style={small}>· brief</span>}
                  {clock && <span style={{ ...small, color: TONE[clock.tone], fontWeight: 600 }}>· {clock.label}</span>}
                </span>
                <span style={{ ...small, overflowWrap: 'anywhere' }}>
                  {t.clientName ?? t.clientEmail}
                  {t.appUrl ? ` · ${t.appUrl}` : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const asText = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join('; ') : v == null ? '' : JSON.stringify(v));
const hasCountryCode = (n: string) => n.trim().startsWith('+');

function TicketView({ id, focus, guard, back }: { id: string; focus?: string; guard: Guard; back: () => void }) {
  const [t, setT] = useState<TicketDetail | null>(null);
  const load = useCallback(async () => {
    const d = guard(await admin.get(id));
    if (d) setT(d.ticket);
  }, [id, guard]);
  useEffect(() => {
    load();
  }, [load]);

  if (!t) return <p style={small}>Loading ticket…</p>;
  const brief = (t.brief ?? {}) as Record<string, unknown>;
  const scan = (brief.scan ?? null) as { ok?: boolean; error?: string; readiness?: { score: number; topFixes: { label: string; fix?: string }[] }; headers?: { missing: string[] } | null } | null;
  const clock = t.kind === 'first_bug' && !t.messages.some((m) => m.status === 'sent') ? timeLeft(t.createdAt) : null;
  const drafts = t.messages.filter((m) => m.direction === 'out');

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <button type="button" style={{ ...btn, justifySelf: 'start' }} onClick={back}>
        ← Tickets
      </button>
      <div style={box}>
        <h2 style={{ ...h2, fontSize: 24 }}>
          {t.number} · {kindLabel(t.kind)}
        </h2>
        {clock && <p style={{ ...small, color: TONE[clock.tone], fontWeight: 600 }}>First reply: {clock.label}</p>}
        <p style={{ ...small, overflowWrap: 'anywhere' }}>
          {t.client.name ? `${t.client.name} · ` : ''}
          <a href={`mailto:${t.client.email}`}>{t.client.email}</a>
          {t.client.whatsapp &&
            (hasCountryCode(t.client.whatsapp) ? (
              <>
                {' · '}
                <a href={`https://wa.me/${t.client.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </>
            ) : (
              ` · ${t.client.whatsapp} (no country code)`
            ))}
          {t.appUrl ? ` · ${t.appUrl}` : ''}
        </p>
        <StagePicker ticket={t} guard={guard} onChanged={load} />
        {(t.stage === 'audit' || t.kind === 'audit') && (
          <button
            type="button"
            style={{ ...btn, justifySelf: 'start' }}
            onClick={async () => {
              if (guard(await admin.draftReport(t.id))) load();
            }}
          >
            Draft the audit report from a fresh scan
          </button>
        )}
      </div>

      <CoachBox ticket={t} guard={guard} onChanged={load} />

      {drafts.map((m) => (
        <DraftEditor key={m.id} ticketId={t.id} message={m} autoFocus={m.id === focus} guard={guard} onSent={load} />
      ))}

      {t.brief && (
        <div style={box}>
          <h2 style={h2}>Brief {brief.source === 'fallback' ? '(no AI)' : ''}</h2>
          {(['summary', 'situation', 'topRisk', 'approach', 'likelyPackage'] as const).map((k) =>
            asText(brief[k]) ? (
              <p key={k} style={{ margin: 0 }}>
                <b>{BRIEF_LABEL[k]}:</b> {asText(brief[k])}
              </p>
            ) : null,
          )}
          {(['risks', 'redFlags', 'missingInfo', 'questions'] as const).map((k) =>
            Array.isArray(brief[k]) && (brief[k] as unknown[]).length ? (
              <div key={k}>
                <b>{BRIEF_LABEL[k]}</b>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {(brief[k] as string[]).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          {scan && (
            <p style={small}>
              {scan.ok && scan.readiness
                ? `Readiness ${scan.readiness.score}/100. ${scan.readiness.topFixes.map((f) => f.label).join(' · ')}${scan.headers ? `. Missing headers: ${scan.headers.missing.join(', ') || 'none'}` : ''}`
                : `Not scanned: ${scan.error ?? 'unknown'}`}
            </p>
          )}
        </div>
      )}

      <div style={box}>
        <h2 style={h2}>Answers</h2>
        {Object.keys(t.answers).length === 0 && <p style={small}>None.</p>}
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(100px, auto) 1fr', gap: '4px 12px' }}>
          {Object.entries(t.answers).map(([k, v]) => (
            <Pair key={k} k={ANSWER_LABEL[k] ?? k} v={asText(v)} />
          ))}
          {t.stack && <Pair k="Stack" v={t.stack} />}
          {t.budget && <Pair k="Budget" v={t.budget} />}
        </dl>
      </div>

      <div style={box}>
        <h2 style={h2}>Timeline</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
          {t.events.map((e, i) => (
            <li key={i} style={small}>
              {new Date(e.at).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} · {e.type}
              {e.type === 'stage' ? ` → ${STAGE_LABEL[(e.data as { to: TicketStage }).to] ?? ''}` : ''}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const STATUS_TEXT: Record<Commitment['status'], string> = { open: 'On track', at_risk: 'At risk', kept: 'Kept', missed: 'Missed' };

function CoachBox({ ticket, guard, onChanged }: { ticket: TicketDetail; guard: Guard; onChanged: () => void }) {
  const tasks = ticket.tasks.filter((x) => x.stage === ticket.stage);
  if (!tasks.length && !ticket.commitments.length) return null;
  return (
    <div style={{ ...box, borderColor: 'var(--bq-ink)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Coach pose="calm" size={36} label="Coach" />
        <h2 style={h2}>Coach · {STAGE_LABEL[ticket.stage]}</h2>
      </div>
      {tasks.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {tasks.map((task) => (
            <li key={task.id} style={{ display: 'flex', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
              <span aria-hidden style={{ font: '600 16px var(--bq-font-body)' }}>
                {task.status === 'done' ? '✓' : '○'}
              </span>
              <span style={{ flex: 1, minWidth: 180 }}>
                <span style={{ textDecoration: task.status === 'done' ? 'line-through' : undefined }}>{task.title}</span>
                <span style={{ ...small, display: 'block' }}>
                  {task.owner === 'coach' ? 'Coach' : task.owner === 'helper' ? 'Helper' : 'You'} · done when: {task.doneWhen}
                </span>
              </span>
              {task.status === 'open' && task.owner !== 'coach' && (
                <button
                  type="button"
                  style={{ ...btn, minHeight: 32 }}
                  onClick={async () => {
                    if (guard(await admin.taskDone(ticket.id, task.key))) onChanged();
                  }}
                >
                  Done
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {ticket.commitments.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {ticket.commitments.map((c) => (
            <li key={c.id} style={{ display: 'grid', gap: 6 }}>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <b>{promiseLabel(c.promiseId)}</b>
                <span style={{ ...small, color: c.status === 'missed' || c.status === 'at_risk' ? 'var(--bq-brand)' : 'var(--bq-muted)', fontWeight: 600 }}>
                  {STATUS_TEXT[c.status]}
                </span>
                {(c.status === 'open' || c.status === 'at_risk') && <span style={small}>{dueLabel(c.dueAt)}</span>}
                {c.status === 'open' || c.status === 'at_risk' ? (
                  c.promiseId === 'daily_update' && (
                    <button
                      type="button"
                      style={{ ...btn, minHeight: 32 }}
                      onClick={async () => {
                        if (guard(await admin.keep(ticket.id, c.id))) onChanged();
                      }}
                    >
                      Logged today’s update
                    </button>
                  )
                ) : null}
              </span>
              {c.status === 'missed' &&
                (c.missReason ? <span style={small}>Reason: {c.missReason}</span> : <MissReason ticketId={ticket.id} commitmentId={c.id} guard={guard} onSaved={onChanged} />)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MissReason({ ticketId, commitmentId, guard, onSaved }: { ticketId: string; commitmentId: string; guard: Guard; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (guard(await admin.missReason(ticketId, commitmentId, reason))) onSaved();
      }}
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
    >
      <label style={{ flex: 1, minWidth: 200, ...small }}>
        Why was it missed? (needed before the ticket can move)
        <input
          value={reason}
          maxLength={1000}
          onChange={(e) => setReason(e.target.value)}
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '0 10px', font: '15px var(--bq-font-body)', border: 'var(--bq-border-thin)', background: 'var(--bq-bg)', color: 'var(--bq-ink)' }}
        />
      </label>
      <button type="submit" style={{ ...btn, alignSelf: 'end' }} disabled={!reason.trim()}>
        Save reason
      </button>
    </form>
  );
}

const BRIEF_LABEL: Record<string, string> = {
  summary: 'Summary',
  situation: 'Situation',
  topRisk: 'Top risk',
  approach: 'Approach',
  likelyPackage: 'Likely package',
  risks: 'Risks',
  redFlags: 'Red flags',
  missingInfo: 'Missing information',
  questions: 'Questions to ask',
};

const Pair = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt style={small}>{k}</dt>
    <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd>
  </>
);

function StagePicker({ ticket, guard, onChanged }: { ticket: TicketDetail; guard: Guard; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', ...small }}>
      Stage
      <select
        value={ticket.stage}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.value as TicketStage;
          const emails = next !== 'inbox' && next !== 'bug_review';
          if (emails && !window.confirm(`Move to ${STAGE_LABEL[next]}? This emails the client.`)) return;
          setBusy(true);
          if (guard(await admin.stage(ticket.id, next))) onChanged();
          setBusy(false);
        }}
        style={{ ...btn, appearance: 'auto' }}
      >
        {TICKET_STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
      <span>Audit, Fix, Live and Done email the client.</span>
    </label>
  );
}

function DraftEditor({ ticketId, message, autoFocus, guard, onSent }: { ticketId: string; message: Message; autoFocus: boolean; guard: Guard; onSent: () => void }) {
  const initial = splitDraft(message.body);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'sending'>('idle');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  if (message.status === 'sent')
    return (
      <div style={box}>
        <h2 style={h2}>Sent: {initial.subject || message.kind}</h2>
        <p style={small}>{message.sentAt ? new Date(message.sentAt).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : ''}</p>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: '14px/1.5 var(--bq-font-body)' }}>{initial.body}</pre>
      </div>
    );

  const blocked = hasPlaceholder(body) || hasPlaceholder(subject) || !subject.trim() || !body.trim();
  const field: CSSProperties = { font: '15px/1.5 var(--bq-font-body)', padding: 10, border: 'var(--bq-border-thin)', background: 'var(--bq-bg)', color: 'var(--bq-ink)', width: '100%', boxSizing: 'border-box' };
  return (
    <div style={{ ...box, borderColor: 'var(--bq-brand)' }}>
      <h2 style={h2}>Draft reply</h2>
      <label style={small}>
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} style={field} />
      </label>
      <label style={small}>
        Message
        <textarea ref={ref} value={body} onChange={(e) => setBody(e.target.value)} rows={12} style={field} />
      </label>
      {hasPlaceholder(body) && <p style={{ ...small, color: 'var(--bq-brand)' }}>Fill in or delete every [PASTE …], [PRICE] and [ANADI: …] placeholder before sending.</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          style={btn}
          disabled={state !== 'idle' && state !== 'saved'}
          onClick={async () => {
            setState('saving');
            setState(guard(await admin.saveDraft(ticketId, message.id, subject, body)) ? 'saved' : 'idle');
          }}
        >
          {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          style={primary}
          disabled={blocked || state === 'sending'}
          onClick={async () => {
            if (!window.confirm('Send this to the client now?')) return;
            setState('sending');
            if (guard(await admin.send(ticketId, message.id, subject, body))) onSent();
            else setState('idle');
          }}
        >
          {state === 'sending' ? 'Sending…' : 'Send to client'}
        </button>
      </div>
    </div>
  );
}
