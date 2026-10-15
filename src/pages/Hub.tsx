import { useEffect, useState } from 'react';
import { Link } from 'vite-react-ssg';
import { TerminalHead, type THFace } from '@/components/brand/BitHead';
import { LOADOUT, StatusBadge } from '@/components/brand/BitUI';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, mono, px, rule, s } from '@/components/brand/tokens';
import portrait from '@/assets/portrait.webp';
import Testimonials from '@/components/Testimonials';
import { site } from '@/data/portfolio';
import { BUSINESS_TAGLINE, faqPage, graph, service, type Faq } from '@/lib/schema';
import {
  Cards,
  FaqSection,
  FinalBand,
  PaperPage,
  SERVICES,
  SectionHead,
  SiteHeader,
  Steps,
  TrustLine,
  body,
  cta,
  ctaClick,
  lead,
  p,
  section,
  split,
  textLink,
} from '@/components/site/kit';

/**
 * `/`: the hub. One promise ("get your business ready for the AI era") and
 * three ways in: AI visibility, DPDP readiness and production readiness. Each
 * service has its own page that does the selling; this page's job is to route
 * a visitor to the right one, or straight to the audit if they already know.
 *
 * Most visitors never see it (they land on a note or a service page from a
 * search or an AI answer), which is why it carries the site's entity graph:
 * it is the page every other page's `@id`s resolve to.
 */

const PAGE = 'home';
const TITLE = 'AI Visibility, DPDP & Production Readiness · Anadi Thakur';
const DESCRIPTION =
  'Free audits that show if AI recommends your business, if your app is ready for India’s data law, and if your app is ready for real users. Then I build the fixes.';

const steps = [
  {
    title: 'Free check',
    body: "Tell me your website or app. I check what's publicly visible. No access to your systems needed.",
  },
  {
    title: 'Plain-English report in 48 hours',
    body: "A short video and a one-page report: what's missing, what it costs you, what to fix first.",
  },
  {
    title: 'I build the fixes',
    body: 'Fixed price, agreed upfront. You see progress every week and own everything at the end.',
  },
];

const why = [
  {
    title: 'Finds the gap',
    body: 'Most agencies tell you what is wrong and stop there. The audit ranks every finding by what it costs you.',
  },
  {
    title: 'Builds the fix',
    body: 'Most developers wait to be told what to build. I do both: find the gap, then fix it in your website or app.',
  },
  {
    title: 'Fixed price',
    body: 'Every quote is agreed before work starts. If scope changes, we agree on it before I bill anything.',
  },
];

const faqs: Faq[] = [
  {
    q: 'Is the audit really free?',
    a: 'Yes. The free check covers the basics and shows you exactly where you stand. A deeper paid audit is optional.',
  },
  {
    q: 'Do you need access to my website or app?',
    a: 'Not for the free check. I only look at what any visitor can see.',
  },
  {
    q: 'Are you a lawyer?',
    a: "No. For DPDP, I'm the implementation partner. I build what your lawyer or compliance advisor specifies, and I can introduce you to one.",
  },
  {
    q: 'What if I just need a developer?',
    a: 'I also build and fix web apps, mobile apps and dashboards. If your app or software is breaking, Production Readiness is the fixed-price way in; for anything else, ask for the free audit and describe the job.',
  },
  {
    q: 'Do you work with US businesses?',
    a: "Yes. I'm based in India and work with Indian and US businesses, and I'm available 8am to 12pm US Eastern every weekday.",
  },
];

const jsonLd = graph(
  [
    {
      '@type': 'WebSite',
      '@id': 'https://anadithakur.in/#website',
      url: 'https://anadithakur.in/',
      name: 'Anadi Thakur',
      description: BUSINESS_TAGLINE,
      publisher: { '@id': 'https://anadithakur.in/#business' },
    },
    service({
      path: '/ai-visibility',
      name: 'AI Visibility audit and fixes',
      description: 'Checks whether ChatGPT, Gemini and Perplexity recommend a business, then builds the fixes.',
      serviceType: 'Generative engine optimisation',
    }),
    service({
      path: '/dpdp',
      name: 'DPDP readiness audit and implementation',
      description: "Checks an app against India's DPDP Act and builds consent, deletion and breach-alert flows.",
      serviceType: 'Privacy compliance implementation',
    }),
    service({
      path: '/production-ready',
      name: 'Production Readiness',
      description: 'Fixed-price fixes that make a broken app or software ready for real users, hand-coded or AI-built.',
      serviceType: 'Production fixes for web apps and software',
    }),
    faqPage(faqs, 'https://anadithakur.in/#faq'),
  ],
  true,
);

/** The hero's right side: what the free check comes back with, across all three services. */
const sample = [
  { area: 'AI visibility', line: 'Named in 2 of 10 ChatGPT answers', state: 'GAP' },
  { area: 'AI visibility', line: 'No product or business structured data', state: 'GAP' },
  { area: 'DPDP', line: 'Consent bundled into terms of service', state: 'RISK' },
  { area: 'DPDP', line: 'No way to request data deletion', state: 'RISK' },
  { area: 'App', line: 'Database tables readable with the public key', state: 'BROKEN' },
];

/** Seconds between findings typing in (CSS animation-delay), and when the first starts. */
const ROW_GAP = 0.35;
const ROW_START = 0.5;
/** Rounded so the inline style reads cleanly (0.5 + 0.35 * 4 is 1.9000000000000001). */
const rowDelay = (i: number) => `${(ROW_START + ROW_GAP * i).toFixed(2)}s`;
const ROW_FACE: Record<string, THFace> = { GAP: 'found', RISK: 'found', BROKEN: 'error' };

/**
 * The hero's Terminal Head runs the sample check: it scans while the findings
 * type in, then lands on `found`. Hovering or focusing a finding swaps the face
 * to match it. The rows animate in CSS, so the prerendered HTML already plays;
 * the face sequence is client-only and starts from `prompt`, the SSR face.
 */
const SampleCheck = () => {
  const [face, setFace] = useState<THFace>('prompt');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const scan = setTimeout(() => setFace('scan'), ROW_START * 1000);
    const found = setTimeout(() => {
      setFace('found');
      setDone(true);
    }, (ROW_START + ROW_GAP * sample.length + 0.4) * 1000);
    return () => {
      clearTimeout(scan);
      clearTimeout(found);
    };
  }, []);
  const rest = () => done && setFace('found');
  return (
  <div style={{ display: 'grid', minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: s[6], marginBottom: -rule.base }}>
      <TerminalHead face={face} motion="type" size={120} label={`Terminal Head, ${face === 'scan' ? 'scanning' : face === 'prompt' ? 'ready' : 'found issues'}`} />
    </div>
  <div
    aria-label="An example of what the free check finds"
    style={{ font: `400 13px/1.9 ${mono}`, background: c.plate, border: `${rule.base}px solid ${c.ink}`, minWidth: 0 }}
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
      <span>~/your-business · ai-era check</span>
      <span style={{ color: c.mark }}>SAMPLE</span>
    </div>
    <div style={{ padding: px(s[5], s[6], s[5]) }}>
      {sample.map((r, i) => (
        <div
          key={r.line}
          className="th-row"
          tabIndex={0}
          onMouseEnter={() => setFace(ROW_FACE[r.state])}
          onFocus={() => setFace(ROW_FACE[r.state])}
          onMouseLeave={rest}
          onBlur={rest}
          style={{ display: 'grid', gridTemplateColumns: '5.5em minmax(0, 1fr)', columnGap: s[2], animationDelay: rowDelay(i), cursor: 'default' }}
        >
          <span style={{ fontWeight: 500, color: c.mark }}>{r.state.toLowerCase()}</span>
          <span style={{ overflowWrap: 'anywhere', color: '#fff' }}>
            <span style={{ color: c.dimOnInk }}>{r.area}: </span>
            {r.line}
          </span>
        </div>
      ))}
      <div className="th-row" style={{ marginTop: s[4], color: c.dimOnInk, animationDelay: rowDelay(sample.length) }}>
        ready for the AI era: <b style={{ fontWeight: 500, color: c.mark }}>not yet</b>
      </div>
    </div>
  </div>
  </div>
  );
};

/**
 * A service path card. Its loadout head (wrench / lens / shield) sits still
 * until the card is hovered or focused, then wakes up, so the grid reads calm
 * and responds to the pointer.
 */
const ServiceCard = ({ sv }: { sv: (typeof SERVICES)[number] }) => {
  const [awake, setAwake] = useState(false);
  const l = LOADOUT[sv.key];
  return (
    <Link
      to={sv.path}
      onClick={ctaClick(PAGE, 'path_card', sv.key)}
      onMouseEnter={() => setAwake(true)}
      onMouseLeave={() => setAwake(false)}
      onFocus={() => setAwake(true)}
      onBlur={() => setAwake(false)}
      className="pf-nudge"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto auto auto 1fr auto',
        gap: s[4],
        padding: px(s[7], s[6]),
        background: p.panel,
        border: `${rule.base}px solid ${c.ink}`,
        color: p.ink,
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: s[3] }}>
        <TerminalHead face={l.face} prop={l.prop} size={60} motion={awake ? 'hop' : 'still'} key={String(awake)} label="" />
        <span style={{ ...label(10, 700, 0.14), color: p.goldText }}>{l.tag}</span>
      </div>
      <span style={{ ...label(10, 700, 0.14), color: p.body }}>
        {sv.name.toUpperCase()} · {sv.tag.toUpperCase()}
      </span>
      <h3 style={{ margin: 0, ...heading('d6'), textTransform: 'uppercase' }}>{sv.title}</h3>
      <p style={body}>{sv.body}</p>
      <span style={{ ...textLink, paddingTop: s[3], borderTop: `${rule.hair}px solid ${p.rule}` }}>
        {sv.action.toUpperCase()} <span aria-hidden>→</span>
      </span>
    </Link>
  );
};

/** One face per step: ready, working, done. */
const STEP_FACES: THFace[] = ['prompt', 'think', 'fixed'];

const Hub = () => (
  <PaperPage header={<SiteHeader page={PAGE} />}>
    <Seo title={TITLE} description={DESCRIPTION} path="/" type="website" jsonLd={jsonLd} />

    <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[10] }} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('7fr 5fr'), alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: s[6], alignContent: 'start' }}>
          <div>
            <StatusBadge available={site.available} />
          </div>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '15ch' }}>
            Get your business ready <span style={{ color: p.gold }}>for the AI era.</span>
          </h1>
          <p style={{ ...lead, maxWidth: '48ch' }}>
            Be found when customers ask ChatGPT and Google AI. Be compliant with India&apos;s new data law. Make your
            app ready for real users. I check where you stand for free, then build the fixes myself.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: s[4] }}>
            <img
              src={portrait}
              alt=""
              width={52}
              height={52}
              fetchPriority="high"
              style={{ width: 52, height: 52, objectFit: 'cover', objectPosition: 'center 20%', display: 'block', border: `${rule.base}px solid ${c.ink}`, background: p.panel }}
            />
            <span style={{ display: 'grid', gap: s[1] }}>
              <span style={{ font: `600 16px/1.2 ${display}` }}>{site.name}</span>
              <span style={{ font: `400 14px/1.3 ${display}`, color: p.body }}>Full-stack engineer · India, working worldwide</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6] }}>
            <Link to="/audit" onClick={ctaClick(PAGE, 'hero')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
              Get my free audit<span aria-hidden>→</span>
            </Link>
            <a href="#h-paths" className="pf-underline" style={textLink}>
              WHAT DO YOU NEED? ↓
            </a>
          </div>
          <TrustLine items={['No calls needed', 'Report in 48 hours', "Based only on what's public"]} />
        </div>
        <SampleCheck />
      </div>
    </section>

    {/* Proof strip, from the portfolio's own data. */}
    <div
      aria-label="Track record"
      style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: px(s[3], s[6]), padding: px(s[6], gutter), borderTop: `${rule.hair}px solid ${p.rule}` }}
      data-rescue-hpad
    >
      <span style={{ ...label(10, 700, 0.16), color: p.dim }}>SHIPPED PRODUCTION WORK AT</span>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: px(s[2], s[5]) }}>
        {site.clients.map((client) => (
          <li key={client} style={{ ...label(12, 700, 0.12), color: p.ink }}>
            {client}
          </li>
        ))}
      </ul>
    </div>

    <section aria-labelledby="h-paths" style={section} data-rescue-hpad>
      <SectionHead id="h-paths" title="What do you need help with?" />
      <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: s[5], marginTop: s[9] }}>
        {SERVICES.map((sv) => (
          <ServiceCard key={sv.key} sv={sv} />
        ))}
      </div>
      <p style={{ ...body, marginTop: s[8] }}>
        Not sure which? <Link to="/audit" onClick={ctaClick(PAGE, 'paths_unsure')} className="pf-underline" style={{ color: p.ink, fontWeight: 600 }}>Ask for the free audit</Link> and
        tick &ldquo;not sure&rdquo;. I&apos;ll check all three.
      </p>
    </section>

    <section aria-labelledby="h-how" style={section} data-rescue-hpad>
      <SectionHead id="h-how" title="Simple, from first check to fix" />
      <Steps steps={steps} faces={STEP_FACES} />
    </section>

    <section aria-labelledby="h-why" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('5fr 7fr'), alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: s[5] }}>
          <SectionHead id="h-why" title="An engineer, not just an advisor" />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `500 16px/1.4 ${display}`, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
            {[
              `${Number(site.years)}+ years shipping production web and mobile apps`,
              'Shipped production work at ZEISS, ZenQua and more',
              'Based in India, working with Indian and US businesses',
              'Available 8am–12pm US Eastern for US clients',
            ].map((item) => (
              <li key={item} style={{ padding: px(s[4], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <Cards items={why} />
      </div>
    </section>

    <section aria-labelledby="h-free" style={section} data-rescue-hpad>
      <SectionHead id="h-free" title="Free, before anything else" intro="No call and no card. Start with whichever fits where you are." />
      <div data-rescue-four style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: s[5], marginTop: s[9] }}>
        {[
          { to: '/ai-readiness', tag: '10 seconds', title: 'AI Readiness Checker', body: 'Paste your URL and see whether AI tools can read your site at all.' },
          { to: '/dpdp/check', tag: '3 minutes', title: 'DPDP self-check', body: '13 questions that score how ready your app is for the May 2027 obligations.' },
          { to: '/scan', tag: '30 seconds', title: 'Supabase security check', body: 'See whether anyone can read your database tables with your public key.' },
          { to: '/products/production-kit', tag: 'Download', title: 'The Production Kit', body: 'Checklists, rules files and SQL for taking an AI-built app to production.' },
        ].map((tool) => (
          <Link
            key={tool.to}
            to={tool.to}
            onClick={ctaClick(PAGE, 'free_tool', tool.to)}
            className="pf-nudge"
            style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: s[4], padding: px(s[7], s[6]), border: `${rule.base}px solid ${c.ink}`, color: p.ink, textDecoration: 'none' }}
          >
            <span style={{ ...label(10, 700, 0.14), color: p.body }}>FREE · {tool.tag.toUpperCase()}</span>
            <h3 style={{ margin: 0, ...heading('d6'), textTransform: 'uppercase' }}>{tool.title}</h3>
            <p style={body}>{tool.body}</p>
            <span style={{ ...textLink, paddingTop: s[3], borderTop: `${rule.hair}px solid ${p.rule}` }}>
              OPEN <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>

    <Testimonials hpadAttr={{ 'data-rescue-hpad': '' }} />

    <FaqSection faqs={faqs} />

    <FinalBand
      title="Find out where you stand."
      accent="It takes 2 minutes to ask."
      to="/audit"
      action="Get my free audit"
      onClick={ctaClick(PAGE, 'final')}
      small="Report in 48 hours. No sales call unless you want one."
    />
  </PaperPage>
);

export default Hub;
