import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'vite-react-ssg';
import { Bit } from '@/components/brand/Bit';
import { ask, choose, initial, optionsFor, type ChatState, type Message, type Option } from '@/lib/bit/chat';
import { trackRescue } from '@/lib/rescue/track';

/**
 * Bit's chat: the hero turns into this once a visitor picks a menu option,
 * presses "Start with Bit", or arrives via "Talk to Bit" (`/?bit=1`).
 * The conversation lives in `lib/bit/chat`; this file only renders it and
 * carries out the options that leave the chat (links, mail, page sections).
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Scroll to a homepage section and tell its component what to do (filter the blog, open the builder, start the tour). */
export function goSection(section: string, event?: { name: string; detail?: unknown }) {
  if (event) window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail }));
  document.getElementById(section)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

function OptionButton({ opt, onPick, primary }: { opt: Option; onPick: (o: Option) => void; primary?: boolean }) {
  const cls = primary ? 'bq-btn' : 'hq-opt';
  const t = opt.to;
  const track = () => trackRescue('cta_click', { page: 'home', location: `bit:${opt.label}` });
  if ('href' in t) {
    return t.href.startsWith('/') ? (
      <Link to={t.href} className={cls} onClick={track}>
        {opt.label} <span aria-hidden>▶</span>
      </Link>
    ) : (
      <a href={t.href} className={cls} onClick={track}>
        {opt.label} <span aria-hidden>✉</span>
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => onPick(opt)}>
      {opt.label}
    </button>
  );
}

function Bubble({ m, onPick }: { m: Message; onPick: (o: Option) => void }) {
  if (m.who === 'you') return <p className="hq-msg you">{m.text}</p>;
  if (m.who === 'bit') return <p className="hq-msg bit">{m.text}</p>;
  if (m.who === 'links')
    return (
      <div className="hq-msg-links">
        {m.links.map((l, i) => (
          <OptionButton key={l.label} opt={l} onPick={onPick} primary={i === 0 && m.links.length === 1} />
        ))}
      </div>
    );
  return (
    <div className="hq-rec">
      <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>Bit’s pick</span>
      <b style={{ font: '400 28px/1 var(--bq-font-display)' }}>{m.rec.title}</b>
      <span style={{ font: '400 22px/1 var(--bq-font-display)', color: 'var(--bq-secondary)' }}>{m.rec.price}</span>
      <ul className="hq-check" style={{ fontSize: 14 }}>
        {m.rec.notes.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
      <div className="hq-msg-links">
        {m.rec.actions.map((a, i) => (
          <OptionButton key={a.label} opt={a} onPick={onPick} primary={i === 0} />
        ))}
      </div>
    </div>
  );
}

export function BitChat({ first, onClose }: { first?: string; onClose: () => void }) {
  const [state, setState] = useState<ChatState>(initial);
  const [typing, setTyping] = useState(false);
  const [q, setQ] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const opened = useRef(false);
  const optsRef = useRef<HTMLDivElement>(null);
  /** Set when a reply is picked, so focus can follow into the new replies instead of dropping to <body>. */
  const refocus = useRef(false);

  // Bit "types" for a moment before answering; instant under reduced motion.
  const commit = (next: ChatState) => {
    clearTimeout(timer.current);
    if (reduced()) return setState(next);
    const youOnly = { ...next, log: next.log.slice(0, state.log.length + 1) };
    setState(youOnly);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setState(next);
    }, 600);
  };

  const pick = (opt: Option) => {
    const t = opt.to;
    refocus.current = opened.current;
    if ('section' in t) {
      goSection(t.section, t.event);
      return;
    }
    const next = choose(state, opt);
    if (next) commit(next);
  };

  // A hero menu choice arrives as the label of a start option; play it as the first tap.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const opt = first ? optionsFor('start').find((o) => o.label === first) : undefined;
    if (opt) pick(opt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (!typing && refocus.current) {
      refocus.current = false;
      optsRef.current?.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
    }
  }, [state.log.length, typing]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = ask(state, q);
    setQ('');
    if (r === 'tour') return goSection('services', { name: 'bq:tour' });
    if (r !== state) commit(r);
  };

  const opts = optionsFor(state.node);

  return (
    <section className="hq-chat" aria-label="Chat with Bit">
      <div className="hq-chat-side" aria-hidden>
        <Bit pose={typing ? 'scan' : 'wave'} size={126} bob />
      </div>
      <div className="hq-dark hq-chat-box">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>Bit · Anadi’s AI assistant</span>
          <button type="button" className="hq-chat-x" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </header>
        <div ref={logRef} className="hq-chat-log" role="log" aria-live="polite">
          {state.log.map((m, i) => (
            <Bubble key={i} m={m} onPick={pick} />
          ))}
          {typing && <p className="hq-msg bit" aria-label="Bit is typing">…</p>}
        </div>
        {!typing && (
          <div ref={optsRef} className="hq-chat-opts" role="group" aria-label="Replies">
            {opts.map((o) => (
              <OptionButton key={o.label} opt={o} onPick={pick} />
            ))}
          </div>
        )}
        <form onSubmit={submit} className="hq-chat-ask">
          <label htmlFor="bit-q" className="hq-sr">
            Ask Bit anything
          </label>
          <input id="bit-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Or type it: “my login is broken”…" autoComplete="off" />
          <button type="submit" className="bq-btn">
            Ask
          </button>
        </form>
        <p className="hq-lab" style={{ color: '#a3a3a3', margin: 0, fontSize: 9 }}>
          Bit is a scripted AI assistant. Anadi reads every request.
        </p>
      </div>
    </section>
  );
}
