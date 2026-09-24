import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { Link } from 'vite-react-ssg';
import { PORTFOLIO_ORIGIN, Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, mono, px, rule, s, sectionY, stretch } from '@/components/portfolio/tokens';
import portrait from '@/assets/portrait.webp';
import { SYMPTOMS as symptoms } from '@/lib/rescue/intake';
import { trackRescue } from '@/lib/rescue/track';

/**
 * `/`: Vibe Code Rescue, fixed-price production fixes for apps built with
 * Lovable, Bolt, Cursor and v0.
 *
 * This is the homepage. The domain sells one thing, so the offer is the front
 * door: `routes.tsx` mounts it as the index route, `/rescue` 301s here from
 * `vercel.json`, and the portfolio that used to live at `/` is its own site at
 * `PORTFOLIO_ORIGIN`. Links that meant "back to the portfolio" are therefore
 * absolute `<a>`s, not router links, and the logo is just `/`. As the page a
 * search engine now meets first, it carries the site's service JSON-LD
 * (a `ProfessionalService` offered by the Person, plus the FAQ as `FAQPage`),
 * built from the same arrays the page renders so the two cannot drift.
 *
 * Everything after the offer is aimed at one action, the free audit. Each CTA
 * reports `audit_cta_click` with where it sat, so the placements can be judged
 * against each other. The two quiet exits near the end (the Supabase check at
 * `/scan`, the Wrapper Test at `/teardown`) are for visitors who aren't that
 * buyer yet, and are deliberately set as text links, not buttons.
 *
 * Like `/work-with-me`, this arrived as a standalone document with its own
 * palette (a red and a blue for the error log) and its own stylesheet. It is
 * rendered through `portfolio/tokens` instead, on paper: the light ground
 * the Journey section and the Teardown report already use, with the gold moved
 * to `c.markOnPaper` for small type and cream kept for panels.
 *
 * The exceptions are ink plates: the error log, the symptom tally, the hours
 * card and the closing band. The log is a terminal and the page's one moving
 * part; on white it is also the thing the eye lands on first, which is the job
 * it has. Inside it the site's dark-ground accent applies: an open error is set
 * in `c.mark`, a fixed one drops to the dim tier with a cream strike.
 * `c.signal` stays out of it, since "production: ready" is a claim about a
 * hypothetical app, not about availability. The hours card is the one place it
 * does appear, because that card is an availability claim.
 *
 * Responsive behaviour lives in portfolio.css under the `data-rescue-*` hooks:
 * the split grids stack, the four-up grids step down, and a sticky audit bar
 * takes over on phones once the hero's own button has scrolled away.
 */

const TITLE = 'Vibe Code Rescue · Anadi Thakur';
const ORIGIN_URL = 'https://anadithakur.in/';
const DESCRIPTION =
  'I take apps built with Lovable, Bolt, Cursor and v0 and make them production-ready. Fixed price, done in 7 days. Free audit first.';

const AUDIT = '/rescue/audit';
const EMAIL = 'anadithakur99@gmail.com';
const GITHUB = 'https://github.com/Anadi9';
const LINKEDIN = 'https://www.linkedin.com/in/anadi-thakur-92163316b/';

/** The light ground. Body copy is the Journey section's grey rather than
 *  `c.dim`, which is tuned for labels and reads thin at paragraph length. */
const p = {
  bg: c.paper,
  ink: c.ink,
  body: '#4a4a4a',
  dim: c.dim,
  gold: c.markOnPaper,
  rule: 'rgba(10,10,10,.14)',
  /** Cream. `gold` drops to 3.8:1 on it, so labels on a panel take `body`. */
  panel: c.accent,
  /** A checked symptom row: one step off paper toward the cream. */
  picked: '#faf8f3',
} as const;

const section: CSSProperties = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${p.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
};

const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: p.gold, margin: 0 };

const h2: CSSProperties = { margin: px(s[5], 0, 0), ...heading('d4'), textTransform: 'uppercase', maxWidth: '18ch' };

const body: CSSProperties = {
  margin: 0,
  font: `400 15px/1.55 ${display}`,
  color: p.body,
  textWrap: 'pretty',
  maxWidth: '62ch',
};

const lead: CSSProperties = { ...body, font: `400 17px/1.5 ${display}` };

const cta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: s[3],
  minHeight: 52,
  padding: px(0, s[6]),
  background: c.ink,
  color: c.accent,
  ...label(11, 700, 0.12),
  textDecoration: 'none',
};

const textLink: CSSProperties = { ...label(11, 700, 0.14), color: p.ink };

/** Two-column split that stacks below 900px (portfolio.css). */
const split = (columns: string): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: columns,
  gap: s[10],
});

const Check = ({ color = p.gold, size = 14 }: { color?: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="square">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const errors = [
  'auth: session lost after login',
  'db: RLS disabled on users table',
  'env: SUPABASE_KEY exposed in client',
  'build: failed on Vercel, works locally',
  'perf: dashboard takes 9s to load',
];

const builders = ['Lovable', 'Bolt', 'Cursor', 'v0', 'Replit'];


const fixes = [
  {
    tag: 'Auth',
    title: 'Auth and user flows',
    body: 'The things that have to just work.',
    items: ['Signup and login', 'Sessions that persist', 'Password reset', 'Roles and permissions'],
  },
  {
    tag: 'Database',
    title: 'Database and security',
    body: "Close what's open before someone finds it.",
    items: ['Supabase RLS policies', 'Exposed API keys', 'Open endpoints', 'Messy schemas'],
  },
  {
    tag: 'Deployment',
    title: 'Deployment',
    body: "A setup that doesn't break when you push.",
    items: ['Env variables', 'Build errors', 'Domains', 'Safe, repeatable pushes'],
  },
  {
    tag: 'Stability',
    title: 'Performance and stability',
    body: 'Stop the code that keeps breaking.',
    items: ['Slow pages', 'Crashing components', 'Fix-one-break-two loops', 'Regressions after prompts'],
  },
];

/** `span` is each phase's share of the day track above the steps. */
const steps = [
  {
    num: '01',
    title: 'Free audit',
    when: 'Day 0–2',
    span: 2,
    body: "Send your app link or repo. You get a plain-English report: what's broken, what's risky, what can wait.",
  },
  { num: '02', title: 'Fixed quote', when: 'Same day', span: 1, body: 'One price, clear scope. No hourly billing surprises.' },
  { num: '03', title: 'The fix', when: '7 days', span: 7, body: 'Daily written updates so you always know where things stand.' },
  {
    num: '04',
    title: 'Handover',
    when: '+7 days support',
    span: 7,
    body: 'Working code, a short doc of what changed, and a week of free follow-up fixes.',
  },
];

/** Illustrative findings, set under a SAMPLE label. The rank names are the
 *  audit's own three buckets from step 01. */
const findings = [
  { rank: 'Fix now', solid: true, line: 'RLS is off on the users table. Any visitor can read every row.', area: 'Database' },
  { rank: 'Fix now', solid: true, line: 'A secret Supabase key ships in the client bundle.', area: 'Security' },
  { rank: 'Risky', solid: false, line: "Sessions aren't refreshed, so users get logged out on reload.", area: 'Auth' },
  { rank: 'Can wait', solid: false, line: 'The dashboard fetches every record on load.', area: 'Performance' },
];

const included = [
  'A free audit report first',
  'One fixed price, agreed up front',
  'Daily written updates',
  'A handover doc of what changed',
  '7 days of free follow-up fixes',
];

const faqs = [
  {
    q: 'Do you rebuild everything from scratch?',
    a: "No. I fix what's there and only rewrite what's actually broken. Your app stays your app.",
  },
  {
    q: 'What if my app is too far gone?',
    a: "The audit will tell you honestly. Sometimes a partial rebuild is cheaper, and I'll say so.",
  },
  {
    q: 'Is my code safe with you?',
    a: "Yes. I'm happy to sign an NDA, and you can revoke repo access the day we're done.",
  },
  {
    q: 'What tools do you support?',
    a: 'Lovable, Bolt, Cursor, v0, Replit — anything that ends up as React or Next.js plus a database.',
  },
  {
    q: 'What do you need from me to start?',
    a: 'Your app link, and access to the repo if you have one. That is enough for the audit.',
  },
];

/** Sold on top of a rescue, or on their own. Prices are starting points; the
 *  app conversion is quoted with the audit because its size depends on the app. */
const addons = [
  {
    tag: 'Visibility',
    title: 'Search & AI visibility fix',
    body: 'Prerendering or SSR, meta tags, JSON-LD, a sitemap and Search Console, so Google and AI answer engines see real pages.',
    price: '$199',
    unit: null,
    note: null,
  },
  {
    tag: 'Mobile',
    title: 'Web app → iOS & Android app',
    body: 'Your web app as a store-ready iOS and Android build.',
    price: '$800',
    unit: null,
    note: 'Quoted with the audit.',
  },
  {
    tag: 'Monthly',
    title: 'Production care',
    body: 'Code review of every change you ship, monitoring, and small fixes.',
    price: '$249',
    unit: '/month',
    note: null,
  },
];

/** `ProfessionalService` + `FAQPage`, from the arrays above. */
const PROVIDER = {
  '@type': 'Person',
  '@id': `${PORTFOLIO_ORIGIN}/#person`,
  name: 'Anadi Thakur',
  jobTitle: 'Full-stack engineer',
  url: PORTFOLIO_ORIGIN,
  sameAs: [GITHUB, LINKEDIN],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfessionalService',
      '@id': `${ORIGIN_URL}#service`,
      name: 'Vibe Code Rescue',
      description: DESCRIPTION,
      url: ORIGIN_URL,
      image: `${ORIGIN_URL}og.png`,
      email: EMAIL,
      priceRange: '$800–$1,500',
      areaServed: { '@type': 'Place', name: 'Worldwide' },
      serviceType: 'Production fixes for AI-built web apps',
      provider: PROVIDER,
      founder: PROVIDER,
      makesOffer: {
        '@type': 'Offer',
        name: 'Vibe Code Rescue: fixed-price production fix',
        priceSpecification: { '@type': 'PriceSpecification', minPrice: 800, priceCurrency: 'USD' },
        areaServed: { '@type': 'Place', name: 'Worldwide' },
      },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Add-ons',
        itemListElement: addons.map((a) => ({
          '@type': 'Offer',
          name: a.title,
          description: a.body,
          priceSpecification: {
            '@type': a.unit ? 'UnitPriceSpecification' : 'PriceSpecification',
            minPrice: Number(a.price.replace(/\D/g, '')),
            priceCurrency: 'USD',
            ...(a.unit ? { unitText: 'MONTH' } : {}),
          },
        })),
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${ORIGIN_URL}#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

/** Fires the CTA event. Only ever called from a click, so never in the prerender. */
const clicked = (location: string) => () => trackRescue('audit_cta_click', { location });

/** The hero's error log. Rows flip from error to fixed one at a time after
 *  mount. The prerendered HTML is the unfixed state, which is also the state
 *  the argument starts from; reduced motion jumps straight to the end. */
const ErrorLog = () => {
  const [fixed, setFixed] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFixed(errors.length);
      return;
    }
    const timers = errors.map((_, i) => window.setTimeout(() => setFixed(i + 1), 900 + i * 650));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  const done = fixed === errors.length;
  const fade = 'color 0.4s ease, text-decoration-color 0.4s ease';

  return (
    <div
      aria-label="Example production errors that get fixed"
      style={{
        font: `400 13px/1.9 ${mono}`,
        background: c.plate,
        border: `${rule.base}px solid ${c.ink}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[3], s[5]),
          borderBottom: `${rule.hair}px solid ${c.rule}`,
          ...label(10, 500, 0.06),
          lineHeight: 1.4,
          color: c.dimOnInk,
        }}
      >
        <span>~/your-app · production check</span>
        <span style={{ color: done ? c.accent : c.mark, transition: fade }}>
          {fixed} / {errors.length} FIXED
        </span>
      </div>
      <div style={{ padding: px(s[5], s[6], s[5]), overflowX: 'auto' }}>
        {errors.map((msg, i) => {
          const isFixed = i < fixed;
          return (
            <div key={msg} style={{ display: 'grid', gridTemplateColumns: '5.5em 1fr', whiteSpace: 'nowrap' }}>
              <span style={{ fontWeight: 500, color: isFixed ? c.accent : c.mark, transition: fade }}>
                {isFixed ? 'fixed' : 'error'}
              </span>
              <span
                style={{
                  color: isFixed ? c.dimOnInk : '#fff',
                  textDecoration: 'line-through',
                  textDecorationColor: isFixed ? c.accent : 'transparent',
                  transition: fade,
                }}
              >
                {msg}
              </span>
            </div>
          );
        })}
        <div aria-hidden style={{ marginTop: s[4], height: 4, background: c.rule }}>
          <div
            style={{
              height: '100%',
              width: `${(fixed / errors.length) * 100}%`,
              background: done ? c.accent : c.mark,
              transition: 'width 0.5s ease, background 0.4s ease',
            }}
          />
        </div>
        <div style={{ marginTop: s[3], color: c.dimOnInk }}>
          production:{' '}
          <b style={{ fontWeight: 500, color: done ? c.accent : c.mark, transition: fade }}>
            {done ? 'ready' : 'not ready'}
          </b>
        </div>
      </div>
    </div>
  );
};

/** Symptoms as a self-check. Each row toggles; the tally beside them turns the
 *  count into the next step. Prerenders with nothing ticked. */
const Symptoms = () => {
  const [picked, setPicked] = useState<boolean[]>(() => symptoms.map(() => false));
  const count = picked.filter(Boolean).length;
  // What was ticked here arrives pre-ticked on the audit form.
  const ticked = picked.flatMap((on, i) => (on ? [i] : []));
  const auditHref = ticked.length ? `${AUDIT}?s=${ticked.join(',')}` : AUDIT;
  const verdict =
    count === 0
      ? 'Tick any that apply to your app.'
      : count < 3
        ? 'Worth a free audit before it gets worse. It takes 48 hours and costs nothing.'
        : "That's the full rescue. Start with the audit and you'll have a fixed quote the same day.";

  return (
    <div data-rescue-split style={{ ...split('8fr 4fr'), marginTop: s[9], alignItems: 'start' }}>
      <div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderTop: `${rule.hair}px solid ${p.rule}` }}>
          {symptoms.map((sym, i) => (
            <li key={sym.line} style={{ borderBottom: `${rule.hair}px solid ${p.rule}` }}>
              <button
                type="button"
                aria-pressed={picked[i]}
                onClick={() => setPicked((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: s[5],
                  width: '100%',
                  minHeight: 72,
                  padding: px(s[4], s[4]),
                  background: picked[i] ? p.picked : 'transparent',
                  border: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: p.ink,
                  transition: 'background 0.2s ease',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 26,
                    height: 26,
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    border: `${rule.base}px solid ${c.ink}`,
                    background: picked[i] ? c.ink : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {picked[i] && <Check color={c.accent} size={15} />}
                </span>
                <span style={{ flex: 1, ...heading('d7', { weight: 800 }) }}>{sym.line}</span>
                <span data-rescue-area style={{ ...label(10, 700, 0.14), color: p.dim, whiteSpace: 'nowrap' }}>
                  → {sym.area.toUpperCase()}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p style={{ ...lead, marginTop: s[8], maxWidth: '52ch' }}>
          AI tools are great at getting you to 80%. The last 20% is where apps actually break, and that part still
          needs an engineer.
        </p>
      </div>
      <div
        aria-live="polite"
        style={{
          position: 'sticky',
          top: s[6],
          display: 'grid',
          gap: s[5],
          padding: px(s[8], s[7]),
          background: c.plate,
          color: '#fff',
        }}
      >
        <span style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>YOUR TALLY</span>
        <div style={{ ...heading('d2', { stretch: stretch.bleed }), color: c.mark }}>
          {count}
          <span style={{ color: c.ruleSoft }}>/{symptoms.length}</span>
        </div>
        <p style={{ ...body, color: c.bright }}>{verdict}</p>
        <Link
          to={auditHref}
          onClick={clicked('tally')}
          className="pf-nudge"
          style={{ ...cta, background: c.accent, color: c.ink }}
        >
          GET A FREE AUDIT<span aria-hidden>→</span>
        </Link>
        <p style={{ ...body, fontSize: 14, color: c.dimOnInk }}>
          Not ready to talk?{' '}
          <Link to="/scan" className="pf-underline" style={{ color: c.bright, fontWeight: 600 }}>
            Run the free Supabase security check →
          </Link>
        </p>
      </div>
    </div>
  );
};

/** Phone-only audit bar. It stays out of the way until the hero's own button
 *  has scrolled off, so there is never a second CTA on screen next to the first. */
const StickyBar = ({ watch }: { watch: RefObject<HTMLElement | null> }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // A scroll check rather than an IntersectionObserver: a jump from below
    // the button to above the fold (Home key, anchor link) never crosses it, so
    // an observer would leave the bar showing over the hero.
    const el = watch.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setShow(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [watch]);

  return (
    <div
      data-rescue-bar
      aria-hidden={!show}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        display: 'none',
        alignItems: 'center',
        gap: s[3],
        padding: px(s[3], s[4], s[5]),
        background: p.bg,
        borderTop: `${rule.base}px solid ${c.ink}`,
        transform: show ? 'none' : 'translateY(110%)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div style={{ flex: 1, display: 'grid', gap: s[1] }}>
        <span style={{ ...label(10, 700, 0.14), color: p.dim }}>FREE · 48 HOURS</span>
        <span style={{ font: `600 14px/1.2 ${display}` }}>Production audit</span>
      </div>
      <Link to={AUDIT} onClick={clicked('sticky_bar')} tabIndex={show ? undefined : -1} style={cta}>
        GET AUDIT<span aria-hidden>→</span>
      </Link>
    </div>
  );
};

const Rescue = () => {
  const heroCta = useRef<HTMLAnchorElement>(null);

  return (
    <div style={{ background: p.bg, color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={TITLE} description={DESCRIPTION} path="/" type="website" jsonLd={jsonLd} />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: s[4],
          padding: px(s[3], gutter),
          borderBottom: `${rule.edge}px solid ${p.rule}`,
        }}
        data-rescue-header
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
          <span aria-hidden style={{ width: 22, height: 22, background: c.ink, display: 'block' }} />
          <span style={{ ...label(11, 700, 0.12), color: p.ink }}>ANADI THAKUR</span>
        </Link>
        <nav aria-label="Page" style={{ display: 'flex', alignItems: 'center', gap: s[6] }}>
          {[
            ['#h-fix', 'WHAT I FIX'],
            ['#h-how', 'HOW IT WORKS'],
            ['#h-price', 'PRICE'],
            ['#h-faq', 'FAQ'],
          ].map(([href, text]) => (
            <a key={href} href={href} data-rescue-navlink className="pf-underline" style={{ ...label(11, 700, 0.14), color: p.ink }}>
              {text}
            </a>
          ))}
          <Link to={AUDIT} onClick={clicked('header')} className="pf-nudge" style={{ ...cta, minHeight: 44, padding: px(0, s[5]) }}>
            FREE AUDIT<span aria-hidden>→</span>
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[10] }} data-rescue-hpad>
          <div data-rescue-split style={{ ...split('7fr 5fr'), alignItems: 'end' }}>
            <div style={{ display: 'grid', gap: s[6], alignContent: 'start' }}>
              <p style={eyebrow}>VIBE CODE RESCUE · FIXED PRICE · 7 DAYS</p>
              <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '14ch' }}>
                Works in the demo. <span style={{ color: p.gold }}>Breaks in production.</span>
              </h1>
              <p style={{ ...lead, maxWidth: '44ch' }}>
                I take apps built with Lovable, Bolt, Cursor and v0 and make them production-ready: auth, database,
                deployment, performance. Fixed price. Done in 7 days.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6] }}>
                <Link ref={heroCta} to={AUDIT} onClick={clicked('hero')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
                  GET A FREE AUDIT<span aria-hidden>→</span>
                </Link>
                <a href="#h-proof" className="pf-underline" style={textLink}>
                  SEE A SAMPLE REPORT ↓
                </a>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: px(s[3], s[6]),
                  ...label(10, 700, 0.14),
                  color: p.body,
                }}
              >
                {['NO CALL REQUIRED', 'REPORT IN 48 HOURS', 'NDA ON REQUEST'].map((t) => (
                  <li key={t} style={{ display: 'flex', alignItems: 'center', gap: s[2] }}>
                    <Check />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <ErrorLog />
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: px(s[4], s[10]),
            padding: px(s[5], gutter),
            borderTop: `${rule.hair}px solid ${p.rule}`,
          }}
          data-rescue-hpad
        >
          <span style={{ ...label(10, 700, 0.16), color: p.dim }}>APPS I RESCUE</span>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: px(s[2], s[9]) }}>
            {builders.map((b) => (
              <li key={b} style={{ ...heading('d7', { weight: 800 }), textTransform: 'uppercase' }}>
                {b}
              </li>
            ))}
          </ul>
          <span style={{ ...body, fontSize: 14, marginLeft: 'auto', maxWidth: '36ch' }}>
            Anything that ends up as React or Next.js plus a database.
          </span>
        </div>

        <section aria-labelledby="h-familiar" style={section} data-rescue-hpad>
          <p style={eyebrow}>THE SYMPTOMS · TICK WHAT APPLIES</p>
          <h2 id="h-familiar" style={h2}>
            Sound familiar?
          </h2>
          <Symptoms />
        </section>

        <section aria-labelledby="h-fix" style={section} data-rescue-hpad>
          <p style={eyebrow}>THE SCOPE</p>
          <h2 id="h-fix" style={h2}>
            What I fix
          </h2>
          <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: s[8], marginTop: s[9] }}>
            {fixes.map((fix, i) => (
              <div key={fix.title} style={{ display: 'grid', gap: s[4], alignContent: 'start', paddingTop: s[6], borderTop: `${rule.base}px solid ${c.ink}` }}>
                <span style={{ ...label(10, 700, 0.14), color: p.gold }}>
                  0{i + 1} · {fix.tag.toUpperCase()}
                </span>
                <h3 style={{ margin: 0, ...heading('d6'), textTransform: 'uppercase', color: p.ink }}>{fix.title}</h3>
                <p style={body}>{fix.body}</p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `500 14px/1.4 ${display}` }}>
                  {fix.items.map((item) => (
                    <li key={item} style={{ padding: px(s[3], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-how" style={section} data-rescue-hpad>
          <p style={eyebrow}>HOW IT WORKS</p>
          <h2 id="h-how" style={h2}>
            Two weeks, start to finish
          </h2>
          <div
            aria-hidden
            data-rescue-track
            style={{
              display: 'grid',
              gridTemplateColumns: steps.map((st) => `${st.span}fr`).join(' '),
              gap: s[1],
              marginTop: s[10],
            }}
          >
            {steps.map((st) => (
              <div
                key={st.num}
                style={{ height: 8, background: st.num === '03' ? c.ink : st.num === '04' ? c.accent : c.accentEdge }}
              />
            ))}
          </div>
          <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: s[8], marginTop: s[8] }}>
            {steps.map((step) => (
              <div key={step.num} style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
                <span style={{ ...label(10, 700, 0.14), color: step.num === '03' ? p.ink : p.dim }}>
                  {step.when.toUpperCase()}
                </span>
                <div style={{ ...heading('d6'), color: p.gold }}>{step.num}</div>
                <h3 style={{ margin: 0, font: `600 17px/1.3 ${display}` }}>{step.title}</h3>
                <p style={body}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-proof" style={section} data-rescue-hpad>
          <p style={eyebrow}>WHAT YOU GET</p>
          <h2 id="h-proof" style={h2}>
            The audit, before you pay
          </h2>
          <div data-rescue-split style={{ ...split('7fr 5fr'), marginTop: s[9], alignItems: 'start' }}>
            <div style={{ border: `${rule.base}px solid ${c.ink}`, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: s[4],
                  padding: px(s[4], s[6]),
                  borderBottom: `${rule.base}px solid ${c.ink}`,
                  ...label(10, 700, 0.14),
                  lineHeight: 1.4,
                }}
              >
                <span>AUDIT REPORT · YOUR-APP.LOVABLE.APP</span>
                <span style={{ color: p.dim }}>SAMPLE</span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {findings.map((f, i) => (
                  <li
                    key={f.line}
                    data-rescue-finding
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '96px 1fr auto',
                      gap: s[5],
                      alignItems: 'center',
                      padding: px(s[5], s[6]),
                      borderTop: i ? `${rule.hair}px solid ${p.rule}` : 'none',
                    }}
                  >
                    <span
                      style={{
                        justifySelf: 'start',
                        padding: px(s[1] + 2, s[2]),
                        ...label(10, 700, 0.12),
                        background: f.solid ? c.ink : 'transparent',
                        color: f.solid ? '#fff' : f.rank === 'Can wait' ? p.dim : p.ink,
                        border: f.solid ? 'none' : `${rule.hair}px solid ${f.rank === 'Can wait' ? c.accentEdge : c.ink}`,
                      }}
                    >
                      {f.rank.toUpperCase()}
                    </span>
                    <span style={{ font: `500 16px/1.4 ${display}`, color: f.rank === 'Can wait' ? p.body : p.ink }}>{f.line}</span>
                    <span data-rescue-area style={{ ...label(10, 700, 0.12), color: p.dim }}>
                      {f.area.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'grid', gap: s[6], alignContent: 'start' }}>
              <p style={{ ...lead, color: p.ink }}>
                Every finding is ranked: what's broken, what's risky, what can wait. You see the whole list before you
                spend anything.
              </p>
              <p style={body}>
                Plain English, no jargon dump. If you only want the critical items fixed, the quote covers only those.
              </p>
              <Link to={AUDIT} onClick={clicked('sample_report')} className="pf-underline" style={{ ...textLink, justifySelf: 'start' }}>
                GET YOUR OWN REPORT →
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-price" style={section} data-rescue-hpad>
          <div data-rescue-split style={{ ...split('1fr 1fr'), alignItems: 'center' }}>
            <div style={{ display: 'grid', gap: s[4] }}>
              <p style={eyebrow}>THE PRICE</p>
              <h2 id="h-price" style={{ margin: px(s[3], 0, 0), ...label(11, 700, 0.14), color: p.dim }}>
                FIXES FROM
              </h2>
              <div style={{ ...heading('d1', { stretch: stretch.bleed }), color: p.ink }}>$800</div>
              <p style={{ ...lead, color: p.ink, marginTop: s[4] }}>Most projects land between $800 and $1,500.</p>
              <p style={{ ...body, maxWidth: '46ch' }}>
                Every quote is fixed before work starts. If scope changes, we agree on it before I bill a cent.
              </p>
            </div>
            <div style={{ display: 'grid', gap: s[6], padding: px(s[8], s[8], s[7]), border: `${rule.base}px solid ${c.ink}` }}>
              <span style={{ ...label(10, 700, 0.16), color: p.dim }}>EVERY PROJECT INCLUDES</span>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `500 17px/1.4 ${display}`, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
                {included.map((item) => (
                  <li
                    key={item}
                    style={{ display: 'flex', alignItems: 'center', gap: s[4], padding: px(s[4], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}
                  >
                    <Check size={18} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={AUDIT} onClick={clicked('price')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56 }}>
                START WITH THE FREE AUDIT<span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-addons" style={section} data-rescue-hpad>
          <p style={eyebrow}>ADD-ONS</p>
          <h2 id="h-addons" style={h2}>
            On top of the fix
          </h2>
          <p style={{ ...body, marginTop: s[5] }}>Add any of these to a rescue, or ask for one on its own.</p>
          <div
            data-rescue-split
            style={{ ...split('repeat(3, minmax(0, 1fr))'), gap: s[8], marginTop: s[9] }}
          >
            {addons.map((a, i) => (
              <div
                key={a.title}
                style={{ display: 'grid', gap: s[4], alignContent: 'start', paddingTop: s[6], borderTop: `${rule.base}px solid ${c.ink}` }}
              >
                <span style={{ ...label(10, 700, 0.14), color: p.gold }}>
                  0{i + 1} · {a.tag.toUpperCase()}
                </span>
                <h3 style={{ margin: 0, ...heading('d6'), textTransform: 'uppercase', color: p.ink }}>{a.title}</h3>
                <p style={body}>{a.body}</p>
                <div style={{ display: 'grid', gap: s[1], paddingTop: s[3], borderTop: `${rule.hair}px solid ${p.rule}` }}>
                  <span style={{ ...label(10, 700, 0.14), color: p.dim }}>FROM</span>
                  <span style={{ ...heading('d5'), color: p.ink }}>
                    {a.price}
                    {a.unit && <span style={{ ...label(11, 700, 0.12), color: p.dim }}> {a.unit.toUpperCase()}</span>}
                  </span>
                  {a.note && <span style={{ font: `500 14px/1.4 ${display}`, color: p.body }}>{a.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="h-who" style={section} data-rescue-hpad>
          <div data-rescue-split style={{ ...split('3fr 5fr 4fr'), alignItems: 'start' }}>
            <img
              src={portrait}
              alt="Anadi Thakur"
              loading="lazy"
              data-rescue-portrait
              style={{
                width: '100%',
                aspectRatio: '4 / 5',
                objectFit: 'cover',
                display: 'block',
                border: `${rule.base}px solid ${c.accentEdge}`,
                background: p.panel,
              }}
            />
            <div style={{ display: 'grid', gap: s[5], alignContent: 'start' }}>
              <p style={eyebrow}>THE ENGINEER</p>
              <h2 id="h-who" style={{ ...h2, ...heading('d5'), margin: 0, textTransform: 'uppercase' }}>
                Who&apos;s fixing it
              </h2>
              <p style={body}>
                I&apos;m Anadi, a full-stack engineer. I&apos;ve spent 4+ years shipping production React, Next.js,
                React Native and Node apps, including the ZEISS Microscopy product platform, an enterprise build on AEM.
              </p>
              <p style={body}>
                I run PostgreSQL and Supabase in production, deploy on Vercel and Netlify with CI/CD, and work on
                performance, Core Web Vitals and technical SEO. I also put the Claude API into production: I built{' '}
                <a href="https://antasignal.vercel.app/" className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>
                  Signal
                </a>
                , an AI lead-scoring pipeline, on my own.
              </p>
              <p style={body}>I use AI tools every day too. That&apos;s exactly why I know where they fall short.</p>
              <p style={{ ...label(10, 700, 0.14), lineHeight: 1.7, color: p.dim, margin: 0 }}>
                REACT · NEXT.JS · REACT NATIVE · NODE.JS · SUPABASE · POSTGRESQL · VERCEL · CLAUDE API
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[6] }}>
                <a href={GITHUB} className="pf-underline" style={textLink}>
                  GITHUB ↗
                </a>
                <a href={LINKEDIN} className="pf-underline" style={textLink}>
                  LINKEDIN ↗
                </a>
                <a href={PORTFOLIO_ORIGIN} className="pf-underline" style={textLink}>
                  MORE ABOUT ME ↗
                </a>
              </div>
            </div>
            <div style={{ display: 'grid', gap: s[4], padding: px(s[8], s[7]), background: c.plate, color: '#fff' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: s[2], ...label(10, 700, 0.16), color: c.signalOnInk }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: c.signalOnInk }} />
                YOUR MORNING, MY EVENING
              </span>
              <div style={{ ...heading('d5'), textTransform: 'uppercase' }}>8am–12pm EST</div>
              <div style={{ ...label(10, 700, 0.14), color: c.dimOnInk }}>EVERY US WEEKDAY MORNING</div>
              <p style={{ ...body, color: c.bright }}>
                I&apos;m based in India, so your fixes usually move forward overnight while you sleep.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="h-faq" style={{ ...section, background: p.panel }} data-rescue-hpad>
          <div data-rescue-split style={{ ...split('4fr 8fr'), alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: s[5] }}>
              <p style={{ ...eyebrow, color: p.body }}>QUESTIONS</p>
              <h2 id="h-faq" style={{ ...h2, ...heading('d5'), margin: 0, textTransform: 'uppercase' }}>
                Before you send the link
              </h2>
              <p style={body}>
                Something else?{' '}
                <a href={`mailto:${EMAIL}`} className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>
                  Email me
                </a>
                .
              </p>
            </div>
            <div style={{ borderTop: `${rule.hair}px solid ${p.rule}` }}>
              {faqs.map((faq, i) => (
                <details key={faq.q} data-rescue-faq open={i === 0} style={{ borderBottom: `${rule.hair}px solid ${p.rule}` }}>
                  <summary
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: s[6],
                      minHeight: 64,
                      padding: px(s[4], 0),
                      cursor: 'pointer',
                      font: `600 17px/1.3 ${display}`,
                      listStyle: 'none',
                    }}
                  >
                    {faq.q}
                    <span aria-hidden data-rescue-faq-sign style={{ font: `500 22px/1 ${mono}` }} />
                  </summary>
                  <p style={{ ...body, paddingBottom: s[6] }}>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="h-final"
          style={{ ...section, borderTop: 'none', background: c.ink, color: '#fff', paddingTop: s[13] }}
          data-rescue-hpad
        >
          <h2 id="h-final" style={{ margin: 0, ...heading('d2', { stretch: stretch.bleed }), textTransform: 'uppercase', maxWidth: '15ch' }}>
            Find out what&apos;s breaking <span style={{ color: c.mark }}>before your users do.</span>
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6], marginTop: s[10] }}>
            <Link to={AUDIT} onClick={clicked('final')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 60, padding: px(0, s[8]), background: c.accent, color: c.ink }}>
              GET MY FREE AUDIT<span aria-hidden>→</span>
            </Link>
            <a href={`mailto:${EMAIL}`} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
              OR EMAIL {EMAIL.toUpperCase()}
            </a>
          </div>
          <p style={{ ...body, color: c.dimOnInk, marginTop: s[10], fontSize: 14 }}>
            Building an AI feature instead?{' '}
            <Link to="/teardown" className="pf-underline" style={{ color: c.bright, fontWeight: 600 }}>
              Take the 3-minute Wrapper Test →
            </Link>
          </p>
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
          <a href={PORTFOLIO_ORIGIN} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            ABOUT ME ↗
          </a>
          <a href={GITHUB} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            GITHUB ↗
          </a>
          <a href={LINKEDIN} className="pf-underline" style={{ ...label(11, 700, 0.12), color: c.dimOnInk }}>
            LINKEDIN ↗
          </a>
        </nav>
      </footer>

      <StickyBar watch={heroCta} />
    </div>
  );
};

export default Rescue;
