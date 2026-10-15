import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'vite-react-ssg';
import { PORTFOLIO_ORIGIN } from '@/components/Seo';
import { buttonType, c, display, gutter, heading, label, mono, pixel, px, rule, s, sectionY, stretch } from '@/components/brand/tokens';
import LegalLinks from '@/components/LegalLinks';
import { KIT } from '@/lib/kit/product';
import { trackRescue } from '@/lib/rescue/track';
import { site } from '@/data/portfolio';
import type { Faq } from '@/lib/schema';
import { TerminalHead, type THFace } from '@/components/brand/BitHead';
import { useInView } from '@/hooks/use-in-view';
import { NavLogo } from '@/components/brand/BitUI';

/**
 * The Bit's Quest pages' shared parts: the hub at `/`, the two service pages and the
 * unified audit form. `/production-ready` came first and still carries its own copies of
 * these (it predates the kit and has page-specific variants); the values here
 * are lifted from it unchanged, so the four pages and `/production-ready` read as one site.
 *
 * Responsive behaviour reuses the `data-rescue-*` hooks in portfolio.css: they
 * describe layout (split, four-up, gutter), not the rescue offer.
 */

/**
 * Every colour below is a CSS variable whose fallback is the shipped value, so
 * a page can re-theme itself by setting `--pp-*` on its root (see `PaperPage`'s
 * `theme`) and every other page renders exactly as before.
 */
const v = (name: string, fallback: string) => `var(--pp-${name}, ${fallback})`;

export const p = {
  bg: v('bg', c.paper),
  ink: v('ink', c.ink),
  body: v('body', '#4a4a4a'),
  dim: v('dim', c.dim),
  gold: v('gold', c.markOnPaper),
  /** The accent for small type, where a bright accent can't hold contrast. */
  goldText: v('gold-text', c.markOnPaper),
  tick: v('tick', c.markOnPaper),
  rule: v('rule', 'rgba(10,10,10,.14)'),
  panel: v('panel', c.accent),
  picked: v('picked', '#faf8f3'),
  /** White card on paper (Terminal Head theme). */
  card: v('card', '#ffffff'),
} as const;

/** The ink-side tokens: dark bands, the CTA, the footer. Same fallback rule as `p`. */
export const k = {
  ink: v('ink', c.ink),
  onInk: v('on-ink', c.accent),
  mark: v('mark', c.mark),
  dimOnInk: v('dim-on-ink', c.dimOnInk),
  rule: v('rule-on-ink', c.rule),
  ruleSoft: v('rule-soft', c.ruleSoft),
  plate: v('plate', c.plate),
  white: v('white', '#fff'),
  bright: v('bright', c.bright),
  ctaAlt: v('cta-alt', c.shell),
} as const;

export const section: CSSProperties = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${p.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
};

export const h2: CSSProperties = { margin: 0, ...heading('d3'), maxWidth: '20ch' };

export const body: CSSProperties = {
  margin: 0,
  font: `400 15px/1.55 ${display}`,
  color: p.body,
  textWrap: 'pretty',
  maxWidth: '62ch',
};

export const lead: CSSProperties = { ...body, font: `400 17px/1.5 ${display}` };

export const cta: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: s[3],
  minHeight: 52,
  padding: px(0, s[6]),
  background: c.shell,
  color: '#fff',
  boxShadow: `4px 4px 0 ${c.ink}`,
  ...buttonType(),
  textDecoration: 'none',
};

export const textLink: CSSProperties = { ...label(11, 700, 0.14), color: p.ink };

export const split = (columns: string): CSSProperties => ({ display: 'grid', gridTemplateColumns: columns, gap: s[10] });

export const Check = ({ color = p.tick, size = 14 }: { color?: string; size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ stroke: color }} strokeWidth={3} strokeLinecap="square">
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
);

/** One CTA event for every paper page, tagged with the page and where on it the click happened. */
export const ctaClick = (page: string, location: string, service?: string) => () =>
  trackRescue('cta_click', { page, location, ...(service ? { service } : {}) });

/** The three services, in the order the hub shows them. Paths are the single source for every cross-link. */
export const SERVICES = [
  {
    key: 'ai',
    path: '/ai-visibility',
    nav: 'AI VISIBILITY',
    name: 'AI Visibility',
    tag: 'Be found',
    title: 'Customers ask AI what to buy. Are you in the answer?',
    body: "More people now ask ChatGPT, Gemini and Perplexity for recommendations instead of searching Google. If AI doesn't know your business, it recommends your competitor.",
    action: 'Check my AI visibility',
  },
  {
    key: 'dpdp',
    path: '/dpdp',
    nav: 'DPDP',
    name: 'DPDP Readiness',
    tag: 'Be compliant',
    title: "India's data law gets real in May 2027. Is your app ready?",
    body: 'Consent screens, data deletion, breach alerts. Your lawyer writes the policy. I build it into your product.',
    action: 'Check my DPDP readiness',
  },
  {
    key: 'app',
    path: '/production-ready',
    nav: 'PRODUCTION READY',
    name: 'Production Readiness',
    tag: 'Be production-ready',
    title: 'App or software breaking? Make it ready for real users.',
    body: 'Auth, database security, payments, deployment and speed, fixed for a fixed price in 7 days, with 7 days of follow-up fixes.',
    action: 'Check my app',
  },
] as const;

export type ServiceKey = (typeof SERVICES)[number]['key'];

export const auditHref = (type?: ServiceKey) => (type ? `/audit?type=${type}` : '/audit');

/** Brand nav: section anchors on the homepage (work from any page). */
const NAV = [
  ['SERVICES', '/#services'],
  ['PROCESS', '/#quest'],
  ['PRICING', '/#pricing'],
  ['TRACKING', '/#board'],
  ['FREE TOOLS', '/#free'],
  ['BLOG', '/notes'],
  ['ABOUT', '/#about'],
  ['FAQ', '/#faq'],
] as const;

/** Sticky header (design: nav): mini Bit + wordmark, section links, red "Talk to Bit". */
export const SiteHeader = ({ page, current, auditType }: { page: string; current?: ServiceKey; auditType?: ServiceKey }) => (
  <header
    data-rescue-header
    style={{ position: 'sticky', top: 0, zIndex: 20, background: p.bg, borderBottom: `${rule.edge}px solid ${p.ink}` }}
  >
    <div
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: s[4],
        padding: `${s[3]}px var(--bq-gutter)`,
      }}
    >
      <NavLogo />
      <nav aria-label="Site" className="bq-navlinks" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
        {NAV.map(([text, href]) => (
          <a
            key={href}
            href={href}
            data-rescue-navlink
            className="pf-underline"
            style={{ ...label(12), color: p.ink, textDecoration: 'none' }}
          >
            {text}
          </a>
        ))}
      </nav>
      <Link
        to="/?bit=1"
        onClick={(e) => {
          ctaClick(page, 'header', auditType ?? current)();
          // Already on the homepage: open the chat in place rather than re-navigating.
          if (window.location.pathname === '/') {
            e.preventDefault();
            window.dispatchEvent(new Event('bq:chat'));
          }
        }}
        className="bq-btn"
      >
        <span aria-hidden>▶</span> Talk to Bit
      </Link>
    </div>
  </header>
);

const footLink: CSSProperties = { ...label(11), color: p.ink, textDecoration: 'none' };
const footHead: CSSProperties = { ...label(10), color: p.goldText };

/** Footer (design: footer), on paper, with the site map underneath. */
export const SiteFooter = () => (
  <footer data-rescue-footer style={{ borderTop: `${rule.edge}px solid ${p.ink}`, background: p.bg }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: s[9], padding: px(s[10], gutter, s[10]) }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: s[5], justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: s[3] }}>
          <TerminalHead face="hello" size={36} label="" motion="still" />
          <span style={{ font: `400 26px/1 ${pixel}`, color: p.ink }}>anadi.thakur</span>
        </span>
        <span style={{ ...label(11), color: p.dim }}>Bit is an AI assistant · Anadi reads every request</span>
      </div>
      <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: s[8] }}>
        <div style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
          <span style={footHead}>Anadi Thakur</span>
          <p style={{ ...body, fontSize: 14 }}>
            Your app, made production-ready. Fixed, built with AI and kept running by a senior full-stack engineer, at
            fixed prices.
          </p>
        </div>
        <nav aria-label="Services" style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
          <span style={footHead}>Services</span>
          <Link to="/production-ready" className="pf-underline" style={footLink}>Fix &amp; launch-ready</Link>
          <a href="/#services" className="pf-underline" style={footLink}>Build with AI</a>
          <a href="/#pricing" className="pf-underline" style={footLink}>Care plan</a>
          <a href="/#pricing" className="pf-underline" style={footLink}>Pricing</a>
          <Link to="/audit?type=app" className="pf-underline" style={footLink}>First bug free</Link>
        </nav>
        <nav aria-label="Free tools" style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
          <span style={footHead}>Free tools</span>
          <Link to="/teardown" className="pf-underline" style={footLink}>The Wrapper Test</Link>
          <Link to="/scan" className="pf-underline" style={footLink}>Supabase security check</Link>
          <Link to="/ai-readiness" className="pf-underline" style={footLink}>AI readiness checker</Link>
          <Link to="/dpdp/check" className="pf-underline" style={footLink}>Privacy self-check</Link>
          <Link to={KIT.path} className="pf-underline" style={footLink}>Production Kit</Link>
        </nav>
        <nav aria-label="More" style={{ display: 'grid', gap: s[3], alignContent: 'start' }}>
          <span style={footHead}>More</span>
          <Link to="/ai-visibility" className="pf-underline" style={footLink}>Search &amp; AI visibility</Link>
          <Link to="/dpdp" className="pf-underline" style={footLink}>Privacy &amp; compliance</Link>
          <Link to="/notes" className="pf-underline" style={footLink}>Blog</Link>
          <Link to="/work" className="pf-underline" style={footLink}>Case studies</Link>
          <a href={PORTFOLIO_ORIGIN} className="pf-underline" style={footLink}>Portfolio ↗</a>
          <a href={site.linkedin} className="pf-underline" style={footLink}>LinkedIn ↗</a>
          <a href={`mailto:${site.email}`} className="pf-underline" style={footLink}>Email</a>
        </nav>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: s[6], paddingTop: s[6], borderTop: `${rule.base}px solid ${p.rule}` }}>
        <span style={{ ...label(11), color: p.ink }}>© 2026 Anadi Thakur</span>
        <LegalLinks />
      </div>
    </div>
  </footer>
);

/** A section heading with an optional short intro under it. */
export const SectionHead = ({ id, title, intro }: { id: string; title: ReactNode; intro?: ReactNode }) => (
  <>
    <h2 id={id} style={h2}>
      {title}
    </h2>
    {intro && <p style={{ ...lead, marginTop: s[5] }}>{intro}</p>}
  </>
);

/** Ticked trust line under a hero CTA. */
export const TrustLine = ({ items }: { items: string[] }) => (
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
    {items.map((t) => (
      <li key={t} style={{ display: 'flex', alignItems: 'center', gap: s[2] }}>
        <Check />
        {t.toUpperCase()}
      </li>
    ))}
  </ul>
);

/**
 * Numbered steps, three or four across. Pass `faces` (one per step) to put a
 * still Terminal Head beside each number; they peek up once the list scrolls
 * into view, which is a one-shot, so the one-animated-head rule holds.
 */
export const Steps = ({ steps, faces }: { steps: { title: string; body: string }[]; faces?: THFace[] }) => {
  const { ref, entered } = useInView<HTMLOListElement>();
  return (
  <ol
    ref={ref}
    data-rescue-four
    style={{
      listStyle: 'none',
      margin: px(s[9], 0, 0),
      padding: 0,
      display: 'grid',
      gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
      gap: s[8],
    }}
  >
    {steps.map((st, i) => (
      <li key={st.title} style={{ display: 'grid', gap: s[3], alignContent: 'start', paddingTop: s[6], borderTop: `${rule.base}px solid ${p.ink}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: s[3] }}>
          <div style={{ ...heading('d6'), color: p.gold }}>{String(i + 1).padStart(2, '0')}</div>
          {faces?.[i] && <TerminalHead key={String(entered)} face={faces[i]} size={40} motion={entered ? 'peek' : 'still'} label="" />}
        </div>
        <h3 style={{ margin: 0, font: `600 17px/1.3 ${display}` }}>{st.title}</h3>
        <p style={body}>{st.body}</p>
      </li>
    ))}
  </ol>
  );
};

/** Bordered cards with a title, body and optional bullet list; they lift with a red shadow on hover (`.th-card`). */
export const Cards = ({ items }: { items: { title: string; body: string; items?: string[] }[] }) => (
  <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`, gap: s[6], marginTop: s[9] }}>
    {items.map((it) => (
      <div
        key={it.title}
        className="th-card"
        style={{ display: 'grid', gap: s[4], alignContent: 'start', padding: s[6], background: p.card, border: `${rule.edge}px solid ${p.ink}`, boxShadow: `6px 6px 0 ${c.ink}` }}
      >
        <h3 style={{ margin: 0, ...heading('d5'), color: p.ink }}>{it.title}</h3>
        <p style={body}>{it.body}</p>
        {it.items && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `500 14px/1.4 ${display}` }}>
            {it.items.map((x) => (
              <li key={x} style={{ padding: px(s[3], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>
    ))}
  </div>
);

/** The FAQ block. The questions and answers are the same array the page's `FAQPage` JSON-LD is built from. */
export const FaqSection = ({ faqs, title = 'Questions' }: { faqs: Faq[]; title?: string }) => (
  <section aria-labelledby="h-faq" style={{ ...section, background: p.panel }} data-rescue-hpad>
    <div data-rescue-split style={{ ...split('4fr 8fr'), alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: s[5] }}>
        <h2 id="h-faq" style={{ ...h2, margin: 0 }}>
          {title}
        </h2>
        <p style={body}>
          Something else?{' '}
          <a href={`mailto:${site.email}`} className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>
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
);

/** The ink closing band with one CTA. */
export const FinalBand = ({
  title,
  accent,
  to,
  action,
  onClick,
  small,
}: {
  title: string;
  accent?: string;
  to: string;
  action: string;
  onClick?: () => void;
  small?: ReactNode;
}) => (
  <section
    aria-labelledby="h-final"
    style={{ ...section, borderTop: 'none', background: k.ink, color: k.white, paddingTop: s[13] }}
    data-rescue-hpad
  >
    <h2 id="h-final" style={{ margin: 0, ...heading('d2', { stretch: stretch.bleed }), maxWidth: '18ch' }}>
      {title} {accent && <span style={{ color: k.mark }}>{accent}</span>}
    </h2>
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6], marginTop: s[10] }}>
      <Link to={to} onClick={onClick} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 60, padding: px(0, s[8]), background: k.ctaAlt, color: '#fff', boxShadow: `4px 4px 0 ${c.bright}` }}>
        {action}
        <span aria-hidden>→</span>
      </Link>
    </div>
    {small && <p style={{ ...body, color: k.dimOnInk, marginTop: s[8], fontSize: 14 }}>{small}</p>}
  </section>
);

/** The page frame: graph-paper ground, header, main, footer. `theme` is accepted and ignored: one brand now. */
export const PaperPage = ({ header, children }: { header: ReactNode; children: ReactNode; theme?: CSSProperties }) => (
  <div className="bq-page" style={{ color: p.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    {header}
    <main style={{ flex: 1 }}>{children}</main>
    <SiteFooter />
  </div>
);
