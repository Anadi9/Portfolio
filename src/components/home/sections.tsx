import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { BitChat } from './BitChat';
import { ServicePicker } from './ServicePicker';
import { PackageBuilder } from './BitGuide';
import { Bit, PixelIcon } from '@/components/brand/Bit';
import portrait from '@/assets/portrait.webp';
import { trackRescue } from '@/lib/rescue/track';
import { loadProfile, PROFILE_EVENT, type Profile } from '@/lib/bit/profile';
import { useInView } from '@/hooks/use-in-view';
import { site } from '@/data/portfolio';
import {
  about,
  blog,
  board,
  checks,
  demo,
  faq,
  free,
  hero,
  pricing,
  process,
  report,
  services,
  type BlogTopic,
  type DemoBug,
} from '@/data/bitsQuest';

/**
 * The Bit's Quest homepage sections, top to bottom, as in
 * `design/bits-quest/README.md`. Copy lives in `data/bitsQuest.ts`; layout in
 * `styles/home.css`. Bit's chat, the package builder, the dock and the tour are
 * not built yet, so their buttons go to the real first-bug form or email.
 */

const track = (location: string) => () => trackRescue('cta_click', { page: 'home', location });

/** Router link for app routes, plain anchor for hashes, mail and other hosts. */
export function Go({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const internal = href.startsWith('/') && !href.startsWith('/#');
  return internal ? (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

function Head({ id, eyebrow, title, intro }: { id: string; eyebrow?: string; title: ReactNode; intro?: string }) {
  return (
    <>
      {eyebrow && <p className="hq-eyebrow">{eyebrow}</p>}
      <div className="hq-head">
        <h2 id={id}>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
    </>
  );
}

/** Sections rise in as they scroll into view; prerendered HTML and reduced motion stay fully visible (see useInView). */
function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const { ref, revealProps } = useInView<HTMLElement>();
  return (
    <section ref={ref} id={id} aria-labelledby={label} className="hq-section" data-in={revealProps['data-in']}>
      <div className="hq-wrap">{children}</div>
    </section>
  );
}

/** `?bit=` topics, each the label of a start option in Bit's chat. */
const BIT_TOPICS: Record<string, string> = { ai: 'Add AI to my product', care: 'Look after my live app' };

/* 1 · Hero: Bit pointing at the menu board. Picking an option turns the hero into Bit's chat. */
export function Hero() {
  const [chat, setChat] = useState<{ first?: string } | null>(null);
  /** "Start with Bit" opens the service picker first, as in the design; the menu board and links go straight to the chat. */
  const [picking, setPicking] = useState(false);
  const { search } = useLocation();
  // "Talk to Bit" from any page lands on `/?bit=1`; the homepage's own button fires `bq:chat`.
  // `?bit=ai` and `?bit=care` (the Build and Care "ask" buttons) open the chat on that topic.
  useEffect(() => {
    const bit = new URLSearchParams(search).get('bit');
    if (bit === null) return;
    setChat({ first: BIT_TOPICS[bit] });
    document.getElementById('top')?.scrollIntoView({ block: 'start' });
  }, [search]);
  useEffect(() => {
    const open = () => {
      setChat({});
      document.getElementById('top')?.scrollIntoView({ block: 'start' });
    };
    window.addEventListener('bq:chat', open);
    return () => window.removeEventListener('bq:chat', open);
  }, []);
  const start = (first?: string, where?: string) => (e: { preventDefault: () => void }) => {
    e.preventDefault();
    trackRescue('cta_click', { page: 'home', location: where ?? 'hero' });
    setChat({ first });
  };
  return (
    <section id="top" aria-labelledby="h-top" className="hq-hero">
      <div className="hq-wrap">
        <h1 id="h-top">{hero.title}</h1>
        {chat ? (
          <BitChat key={chat.first ?? ''} first={chat.first} onClose={() => setChat(null)} />
        ) : picking ? (
          <ServicePicker
            onPick={(first) => {
              trackRescue('cta_click', { page: 'home', location: `picker:${first ?? 'other'}` });
              setPicking(false);
              setChat({ first });
            }}
          />
        ) : (
          <>
            <div className="hq-stage">
              <Bit pose="point" size={198} bob label="Bit, the site's assistant, pointing at the menu" />
              <nav aria-label="What do you need?" className="hq-board">
                {hero.menu.map((m) => (
                  <a key={m.label} href={m.href} onClick={start(m.start, `hero-menu:${m.icon}`)}>
                    <PixelIcon name={m.icon} size={27} />
                    <span>{m.label}</span>
                    <span aria-hidden>✓</span>
                  </a>
                ))}
                <span className="hq-lab" style={{ textAlign: 'center', color: 'var(--bq-muted)', paddingTop: 4 }}>
                  {hero.menuHint}
                </span>
              </nav>
            </div>
            <div className="hq-ctas">
              <a
                href={hero.primary.href}
                className="bq-btn"
                onClick={(e) => {
                  e.preventDefault();
                  trackRescue('cta_click', { page: 'home', location: 'hero' });
                  setPicking(true);
                }}
              >
                <span aria-hidden>▶</span> {hero.primary.text}
              </a>
              <a href={hero.secondary.href} className="bq-btn-ghost" onClick={start(hero.secondary.start, 'hero-secondary')}>
                {hero.secondary.text} <span aria-hidden>▶</span>
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/** What the visitor told Bit in this tab, or null. Read after mount, so prerendered HTML is the same for everyone. */
function useBitProfile(): Profile | null {
  const [p, setP] = useState<Profile | null>(null);
  useEffect(() => {
    setP(loadProfile());
    const on = (e: Event) => setP((e as CustomEvent<Profile>).detail ?? null);
    window.addEventListener(PROFILE_EVENT, on);
    return () => window.removeEventListener(PROFILE_EVENT, on);
  }, []);
  return p;
}

/* 2 · Bug-fix demo: four bugs in a mock app; click one and it's fixed. */
function BugButton({ id, fixed, onFix, name }: { id: DemoBug; fixed: boolean; onFix: (b: DemoBug) => void; name: string }) {
  const yours = useBitProfile()?.bug === id;
  return (
    <button
      type="button"
      className="hq-bug"
      data-yours={yours ? '' : undefined}
      aria-pressed={fixed}
      aria-label={`${fixed ? `${name}: fixed` : `Fix bug: ${name}`}${yours ? ' (the one you told Bit about)' : ''}`}
      onClick={() => !fixed && onFix(id)}
    >
      {fixed ? <span aria-hidden style={{ color: '#0e7a45', fontSize: 20 }}>✓</span> : <PixelIcon name="bug" size={27} />}
    </button>
  );
}

export function BugDemo() {
  const [fixed, setFixed] = useState<Set<DemoBug>>(new Set());
  const [last, setLast] = useState<DemoBug | null>(null);
  const fix = (b: DemoBug) => {
    setFixed((prev) => new Set(prev).add(b));
    setLast(b);
  };
  const n = fixed.size;
  const on = (b: DemoBug) => fixed.has(b);
  const says = n === 4 ? demo.bubble.done : last ? demo.fixed[last] : demo.bubble.start;
  return (
    <Section id="stomp" label="h-stomp">
      <p className="hq-eyebrow">{demo.eyebrow}</p>
      <h2 id="h-stomp" style={{ font: '400 var(--bq-h2)/0.95 var(--bq-font-display)', margin: '0 0 24px' }}>
        {demo.title} <span style={{ color: 'var(--bq-brand)' }}>{demo.accent}</span>
      </h2>
      <div className="hq-demo-top">
        <div>
          <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>Bugs fixed</span>
          <div aria-live="polite" style={{ font: '400 56px/1 var(--bq-font-display)' }}>
            {n}/4
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bit pose={n === 4 ? 'happy' : 'scan'} size={72} />
          <p className="hq-bubble" role="status">
            {says}
          </p>
        </div>
        {n === 4 && (
          <Go href={hero.secondary.href} className="bq-btn" onClick={track('demo-done')}>
            <span aria-hidden>▶</span> Find my app’s first bug — free
          </Go>
        )}
      </div>
      <div className="hq-app">
        <div className="hq-appbar">
          <span className="hq-lab">■ [your-app].com</span>
          <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>Click a bug to fix it</span>
        </div>
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid var(--bq-ink)', padding: '10px 14px', fontWeight: 600 }}>
            <span>
              <span style={{ color: 'var(--bq-brand)' }}>■</span> YourApp
            </span>
            <span>Hi, Sam ▾</span>
          </div>
        </div>
        <div className="hq-appgrid">
          <div className="hq-pane">
            <BugButton id="leak" fixed={on('leak')} onFix={fix} name="other customers' orders are visible" />
            <span className="hq-lab">My orders</span>
            <div className="hq-row">
              <span>#1041 · Sam (you)</span>
              <span>$49</span>
            </div>
            {on('leak') ? (
              <span className="hq-fixline">✓ Only your orders are shown.</span>
            ) : (
              <>
                <div className="hq-row leak">
                  <span>#1042 · Priya K. · 14 Lake St</span>
                  <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>Not yours</span>
                </div>
                <div className="hq-row leak">
                  <span>#1043 · Tom R. · card ••42</span>
                  <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>Not yours</span>
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="hq-pane">
              <BugButton id="checkout" fixed={on('checkout')} onFix={fix} name="checkout hangs and fails" />
              <span className="hq-lab">Checkout</span>
              <span>
                Pro plan · <b>$49/mo</b>
              </span>
              {on('checkout') ? (
                <span className="hq-fixline">✓ Paid. Receipt sent.</span>
              ) : (
                <>
                  <div className="hq-row" style={{ justifyContent: 'center', background: 'var(--bq-grid)' }}>Processing… 0:47</div>
                  <span className="hq-errline">Something went wrong. Please try again.</span>
                </>
              )}
            </div>
            <div className="hq-pane">
              <BugButton id="ai" fixed={on('ai')} onFix={fix} name="AI assistants don't mention the app" />
              <span className="hq-lab">Ask AI ▸ “best app to manage client invoices?”</span>
              {on('ai') ? (
                <>
                  <span>
                    Try <b>YourApp</b>, <b>InvoiceCo</b> or <b>BillFast</b>.
                  </span>
                  <span className="hq-fixline">✓ YourApp: mentioned</span>
                </>
              ) : (
                <>
                  <span>
                    Try <b>InvoiceCo</b> or <b>BillFast</b> — both are popular with freelancers.
                  </span>
                  <span className="hq-errline">YourApp: not mentioned</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div className="hq-pane" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <BugButton id="consent" fixed={on('consent')} onFix={fix} name="data sharing is pre-ticked" />
            <span>We use your data to improve your experience.</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden style={{ width: 18, height: 18, border: '2px solid var(--bq-ink)', display: 'grid', placeItems: 'center', fontSize: 12, background: on('consent') ? 'transparent' : 'var(--bq-ink)', color: '#fff' }}>
                {on('consent') ? '' : '✓'}
              </span>
              Share my data with partners
              {on('consent') && <span className="hq-fixline">✓ opt-in</span>}
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* 3 · Services: three dark pillars. */
export function Services() {
  const profile = useBitProfile();
  return (
    <Section id="services" label="h-services">
      <Head id="h-services" eyebrow={services.eyebrow} title={services.title} intro={services.intro} />
      <div className="hq-three">
        {services.cards.map((sv) => (
          <article key={sv.tag} className="hq-dark hq-svc" data-pick={profile?.service === sv.tag ? '' : undefined}>
            {profile?.service === sv.tag && <span className="hq-bitpick">Bit’s pick</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="hq-iconbox">
                <PixelIcon name={sv.icon} size={27} />
              </span>
              <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>{sv.tag}</span>
            </div>
            <h3>{sv.title}</h3>
            <div>
              <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>For you if</span>
              <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{sv.forYou}</p>
            </div>
            <div>
              <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>What gets done</span>
              <ul className="hq-check" style={{ marginTop: 8 }}>
                {sv.fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
            <div className="hq-stats">
              {sv.stats.map(([k, v]) => (
                <div key={k}>
                  <span className="hq-lab" style={{ color: 'var(--bq-secondary)', fontSize: 9 }}>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div className="hq-btnrow">
              <Go href={sv.ask} className="bq-btn" onClick={track(`services:${sv.tag}`)}>
                Is this me? Ask
              </Go>
              <Go href={sv.more} className="bq-btn-ghost">
                More <span aria-hidden>▶</span>
              </Go>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* 4 · Sample report: Bit's scan beam and a dark report that scans row by row. */
export function SampleReport() {
  const [step, setStep] = useState(report.rows.length);
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(timer.current), []);
  const run = () => {
    clearInterval(timer.current);
    setStep(0);
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= report.rows.length) {
          clearInterval(timer.current);
          return s;
        }
        return s + 1;
      });
    }, 700);
  };
  const tone = { ok: '#35d48a', warn: 'var(--bq-secondary)', bad: '#ff7a70' } as const;
  return (
    <Section id="report" label="h-report">
      <Head id="h-report" eyebrow={report.eyebrow} title={report.title} intro={report.intro} />
      <div className="hq-split">
        <div className="hq-scan" aria-hidden>
          <Bit pose="scan" size={126} bob />
          <span className="hq-beam" />
          <span className="hq-doc">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="hq-dark hq-rep">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>// sample-audit-report</span>
            <span className="hq-lab" style={{ color: 'var(--bq-secondary)' }}>Example app</span>
          </div>
          {report.rows.map((r, i) => (
            <div key={r.area} className="hq-reprow" data-on={i === step} data-dim={i > step}>
              <PixelIcon name={r.icon} size={22} />
              <div>
                <div className="hq-lab">{r.area}</div>
                <div style={{ fontSize: 15, color: '#c9c9c9', marginTop: 4 }}>{r.line}</div>
              </div>
              <span className="hq-tag" style={{ color: i < step ? tone[r.tone] : 'var(--bq-secondary)' }}>
                {i < step ? r.state : i === step ? 'Scanning…' : '—'}
              </span>
            </div>
          ))}
          <p aria-live="polite" className="hq-lab" style={{ color: 'var(--bq-secondary)', margin: 0, textTransform: 'none' }}>
            {step >= report.rows.length ? report.done : '> scanning example-app.com …_'}
          </p>
          <div className="hq-btnrow">
            <Go href={hero.secondary.href} className="bq-btn" onClick={track('report')}>
              <span aria-hidden>▶</span> Find my first bug — free
            </Go>
            <button type="button" className="bq-btn-ghost" onClick={run}>
              ↻ Run sample scan
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* 5 · Process: see ./Process (the animated mission-control run). */
export { Process } from './Process';

/* 6 · What the audit covers. */
export function AuditChecklist() {
  const profile = useBitProfile();
  return (
    <Section id="checks" label="h-checks">
      <Head id="h-checks" eyebrow={checks.eyebrow} title={checks.title} intro={checks.intro} />
      <div className="hq-three">
        {checks.areas.map((a) => (
          <article key={a.area} className="hq-card hq-area" data-yours={profile?.area === a.area ? '' : undefined}>
            {profile?.area === a.area && <span className="hq-bitpick">Yours</span>}
            <span className="hq-stamp" aria-hidden>
              Checked
            </span>
            <h3 className="hq-lab" style={{ color: 'var(--bq-brand)', fontSize: 11, margin: 0 }}>{a.area}</h3>
            <ul>
              {a.items.map(([t, d]) => (
                <li key={t}>
                  <span>
                    <b>{t}</b>
                    <span className="hq-small">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <footer>
              <span className="hq-small" style={{ fontWeight: 600, color: 'var(--bq-ink)' }}>{a.note}</span>
              <Go href={a.more.href} className="hq-link">
                {a.more.text} →
              </Go>
            </footer>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* 7 · Pricing: guarantees, then four groups holding six packages. */
export function Pricing() {
  const profile = useBitProfile();
  return (
    <Section id="pricing" label="h-pricing">
      <Head id="h-pricing" eyebrow={pricing.eyebrow} title={pricing.title} intro={pricing.intro} />
      <ul className="hq-four" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {pricing.guarantees.map(([t, d]) => (
          <li key={t} className="hq-guar">
            <span>
              <b style={{ display: 'block' }}>{t}</b>
              <span className="hq-small">{d}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="hq-four hq-plans">
        {pricing.groups.map((g) => (
          <article key={g.title} className={`hq-plan ${g.style === 'dark' ? 'hq-dark' : 'hq-card'}`} data-style={g.style}>
            <span className="hq-lab" style={{ color: g.style === 'dark' ? 'var(--bq-secondary)' : 'var(--bq-brand)' }}>{g.label}</span>
            <h3>{g.title}</h3>
            <p className="hq-small" style={g.style === 'dark' ? { color: '#c9c9c9' } : undefined}>{g.blurb}</p>
            {g.packages.map((pk) => (
              <div key={pk.name} className="hq-pkg" data-pick={profile?.pkg === pk.name ? '' : undefined}>
                {profile?.pkg === pk.name ? <span className="hq-bitpick">Bit’s pick</span> : pk.badge && <span className="hq-badge">{pk.badge}</span>}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                  <b style={{ fontSize: 17 }}>{pk.name}</b>
                  <span className="hq-small" style={{ whiteSpace: 'nowrap' }}>{pk.duration}</span>
                </div>
                <span className="price">{pk.price}</span>
                <span className="hq-small">{pk.detail}</span>
              </div>
            ))}
            <ul className="hq-check grow" style={{ fontSize: 15 }}>
              {g.includes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <Go href={g.cta.href} className={g.style === 'plain' ? 'bq-btn-ghost' : 'bq-btn'} onClick={track(`pricing:${g.title}`)}>
              <span aria-hidden>▶</span> {g.cta.text}
            </Go>
            {g.secondary && (
              <Go href={g.secondary.href} className="hq-small" onClick={track('pricing:audit')}>
                <span style={{ color: '#fff', textDecoration: 'underline', display: 'block', textAlign: 'center', minHeight: 32 }}>{g.secondary.text}</span>
              </Go>
            )}
          </article>
        ))}
      </div>
      <p className="hq-small" style={{ marginTop: 24 }}>{pricing.footnote}</p>
      <PackageBuilder />
    </Section>
  );
}

/* 8 · Request tracking: an example ticket and the four promises. */
export function TrackingBoard() {
  return (
    <Section id="board" label="h-board">
      <Head id="h-board" eyebrow={board.eyebrow} title={board.title} intro={board.intro} />
      <div className="hq-track">
        <article className="hq-card" style={{ padding: 22, boxShadow: 'var(--bq-shadow-brand)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>Example ticket</span>
            <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>{board.ticket.stack}</span>
          </div>
          <h3 style={{ font: '400 34px/1 var(--bq-font-display)', margin: '12px 0 0' }}>{board.ticket.id}</h3>
          <ol className="hq-tl">
            {board.ticket.steps.map(([t, d, s], i) => (
              <li key={t} data-s={s}>
                <span className="dot" aria-hidden>
                  {s === 'done' ? '✓' : s === 'now' ? '▶' : i + 1}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 17 }}>{t}</span>
                  <span className="hq-small" style={{ fontSize: 13 }}>{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </article>
        <div>
          <h3 style={{ font: '400 34px/1 var(--bq-font-display)', margin: 0 }}>{board.loopTitle}</h3>
          <ol className="hq-loop">
            {board.loop.map(([b, rest], i) => (
              <li key={b}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <b>{b}</b> {rest}
                </span>
              </li>
            ))}
          </ol>
          <Go href={board.cta.href} className="bq-btn" onClick={track('board')}>
            <span aria-hidden>▶</span> {board.cta.text}
          </Go>
        </div>
      </div>
    </Section>
  );
}

/* 9 · Free tools. */
export function FreeTools() {
  return (
    <Section id="free" label="h-free">
      <div className="hq-head">
        <h2 id="h-free">{free.title}</h2>
        <p className="hq-lab" style={{ color: 'var(--bq-muted)' }}>{free.tag}</p>
      </div>
      <div className="hq-three">
        {free.cards.map((t) => (
          <article key={t.title} className={`hq-tool ${t.style === 'dark' ? 'hq-dark' : 'hq-card'}`} data-style={t.style}>
            {t.style === 'feature' && (
              <div aria-hidden style={{ display: 'grid', justifyItems: 'center', paddingBottom: 14, borderBottom: '2px dashed #ddd' }}>
                <Bit pose="scan" size={72} />
              </div>
            )}
            <span className="hq-lab" style={{ color: t.style === 'dark' ? 'var(--bq-secondary)' : 'var(--bq-brand)' }}>{t.kind}</span>
            <h3>{t.title}</h3>
            <p className="hq-body grow" style={t.style === 'dark' ? { color: '#c9c9c9' } : undefined}>{t.body}</p>
            <div>
              <Go
                href={t.cta.href}
                className={t.style === 'feature' ? 'bq-btn' : t.style === 'plain' ? 'hq-link' : 'bq-btn-ghost'}
                onClick={track(`free:${t.title}`)}
              >
                {t.style === 'feature' && <span aria-hidden>▶</span>} {t.cta.text}
              </Go>
            </div>
          </article>
        ))}
      </div>
      <p className="hq-small" style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center' }}>
        <span className="hq-lab">More free checks:</span>
        {free.more.map((m) => (
          <Go key={m.href} href={m.href} className="hq-link">
            {m.text}
          </Go>
        ))}
      </p>
    </Section>
  );
}

/* 10 · Blog: real posts, filterable by audit area. */
export function Blog() {
  const [topic, setTopic] = useState<BlogTopic | 'All'>('All');
  const profile = useBitProfile();
  // Start on the visitor's topic; their own chip clicks win afterwards.
  const chose = useRef(false);
  useEffect(() => {
    if (profile?.topic && !chose.current) setTopic(profile.topic);
  }, [profile]);
  useEffect(() => {
    const onTopic = (e: Event) => setTopic(((e as CustomEvent).detail as BlogTopic | 'All') ?? 'All');
    window.addEventListener('bq:blog', onTopic);
    return () => window.removeEventListener('bq:blog', onTopic);
  }, []);
  const posts = blog.posts.filter((p) => topic === 'All' || p.topic === topic).slice(0, 6);
  return (
    <Section id="blog" label="h-blog">
      <Head id="h-blog" eyebrow={blog.eyebrow} title={blog.title} intro={blog.intro} />
      <div className="hq-chips" role="group" aria-label="Filter posts">
        {(['All', ...blog.topics] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={topic === t}
            onClick={() => {
              chose.current = true;
              setTopic(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="hq-three">
        {posts.map((p) => (
          <Link key={p.href} to={p.href} className="hq-card hq-post">
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span className="hq-lab" style={{ color: 'var(--bq-brand)' }}>{p.topic}</span>
              <span className="hq-lab" style={{ color: 'var(--bq-muted)' }}>{p.date}</span>
            </span>
            <h3>{p.title}</h3>
            <span className="hq-small grow">{p.dek}</span>
            <span className="hq-lab">
              Read <span aria-hidden>▶</span>
            </span>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <Go href={blog.all.href} className="bq-btn-ghost">
          {blog.all.text} <span aria-hidden>▶</span>
        </Go>
      </div>
    </Section>
  );
}

/* 11 · About. */
export function About() {
  return (
    <Section id="about" label="h-about">
      <Head id="h-about" eyebrow={about.eyebrow} title={about.title} intro={about.intro} />
      <div className="hq-about">
        <div className="hq-card hq-idcard">
          <img src={portrait} alt="Anadi Thakur" width={220} height={220} loading="lazy" />
          <b style={{ font: '400 28px/1 var(--bq-font-display)' }}>{about.name}</b>
          <span className="hq-lab" style={{ background: 'var(--bq-brand)', color: '#fff', padding: '4px 8px', fontSize: 9 }}>
            {about.role}
          </span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55 }}>{about.bio}</p>
          <div className="hq-statgrid">
            {about.stats.map(([k, v]) => (
              <div key={k}>
                <span className="hq-lab" style={{ color: 'var(--bq-brand)', fontSize: 9 }}>{k}</span>
                <b>{v}</b>
              </div>
            ))}
          </div>
          <p className="hq-small">
            <b style={{ color: 'var(--bq-ink)' }}>Worked on:</b> {about.worked}
          </p>
          <div className="hq-btnrow" style={{ marginTop: 18 }}>
            {about.links.map((l) => (
              <a key={l.href} href={l.href} className="bq-btn-ghost">
                {l.text}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* 12 · FAQ. The same items feed the page's FAQPage JSON-LD. */
export function Faq() {
  return (
    <Section id="faq" label="h-faq">
      <div className="hq-head">
        <div>
          <p className="hq-eyebrow">{faq.eyebrow}</p>
          <h2 id="h-faq">{faq.title}</h2>
        </div>
        <a href={`mailto:${site.email}`} className="bq-btn-ghost" onClick={track('faq')}>
          Not here? Email Anadi <span aria-hidden>▶</span>
        </a>
      </div>
      <div className="hq-faq">
        {faq.items.map((f, i) => (
          <details key={f.q} open={i === 0}>
            <summary>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <span>{f.q}</span>
              <span aria-hidden />
            </summary>
            <p className="hq-body">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
