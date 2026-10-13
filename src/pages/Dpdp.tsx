import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { c, display, heading, label, px, rule, s } from '@/components/portfolio/tokens';
import { breadcrumbs, faqPage, graph, service, type Faq } from '@/lib/schema';
import {
  Cards,
  FaqSection,
  FinalBand,
  PaperPage,
  SectionHead,
  SiteHeader,
  Steps,
  TrustLine,
  auditHref,
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
 * `/dpdp`: DPDP readiness, as the engineer who builds it, not the lawyer who
 * interprets it. The positioning doc had a homepage card for this but no page
 * copy, so this page was written against the Act (2023) and the DPDP Rules
 * notified in November 2025: Board provisions took effect on notification,
 * Consent Manager provisions at 12 months (around November 2026) and the core
 * obligations at 18 months (around 13 May 2027).
 *
 * Every claim here describes what the law asks a product to *do*, never legal
 * advice about whether a particular business complies. Keep it that way: the
 * "are you a lawyer?" answer is the page's whole position.
 *
 * No prices yet: the doc gives none, so the page sells a fixed quote after the
 * free check. Add a pricing section once there are real numbers.
 */

const PAGE = 'dpdp';
const PATH = '/dpdp';
const URL = `https://anadithakur.in${PATH}`;
const AUDIT = auditHref('dpdp');
const TITLE = 'DPDP Act Compliance for Apps · Free Readiness Check';
const DESCRIPTION =
  "Is your app ready for India's DPDP Act by May 2027? Free readiness check, then I build consent, deletion and breach-alert flows into your product.";

const timeline = [
  { when: 'Nov 2025', what: 'DPDP Rules notified. The Data Protection Board provisions take effect.' },
  { when: 'Nov 2026', what: 'Consent Manager provisions take effect, about 12 months after notification.' },
  { when: 'May 2027', what: 'Core obligations apply: notice, consent, security, breach reporting, retention and user rights.' },
];

const builds = [
  {
    title: 'Notice & consent',
    body: 'A clear, standalone notice and a consent screen that asks for each purpose separately, logged so you can prove it later.',
    items: ['Itemised notice in plain language', 'Separate consent per purpose', 'Consent records with timestamps'],
  },
  {
    title: 'User rights',
    body: 'People can see, correct and delete their data, and withdraw consent as easily as they gave it.',
    items: ['Access and correction requests', 'Deletion that reaches backups and vendors', 'One-click consent withdrawal'],
  },
  {
    title: 'Breach readiness',
    body: 'Logging, alerting and a written runbook, so a breach is reported to users and the Board on time, not discovered weeks later.',
    items: ['Access logs kept for a year', 'Alerting on unusual access', 'Breach notice templates'],
  },
  {
    title: 'Retention & security',
    body: 'Data is kept only as long as its purpose needs, and protected while it is.',
    items: ['Retention rules and scheduled erasure', 'Encryption and access control', 'Children’s data handled separately'],
  },
];

const steps = [
  {
    title: 'Free readiness check',
    body: 'I go through your app and website as any user would: sign-up, consent, privacy notice, account deletion, cookies and trackers.',
  },
  {
    title: 'Gap report in 48 hours',
    body: 'A short video and a one-page report: what the product does today, what the law asks it to do, and what to build first.',
  },
  {
    title: 'Your lawyer signs off the policy',
    body: 'Your lawyer or compliance advisor decides what the policy says. If you don’t have one, I can introduce you.',
  },
  {
    title: 'I build it into the product',
    body: 'Fixed price, agreed upfront. Consent, rights, retention and breach flows, built into your web or mobile app.',
  },
];

const faqs: Faq[] = [
  {
    q: 'When does the DPDP Act actually apply?',
    a: 'The DPDP Rules were notified in November 2025 and phase in over 18 months. Most obligations that change how an app works, including notice, consent, security safeguards, breach reporting and user rights, apply from around 13 May 2027. Consent Manager provisions apply from around November 2026.',
  },
  {
    q: 'Are you a lawyer?',
    a: "No. For DPDP, I'm the implementation partner. I build what your lawyer or compliance advisor specifies, and I can introduce you to one.",
  },
  {
    q: 'Does the DPDP Act apply to my business?',
    a: 'It applies to digital personal data processed in India, and to processing outside India when it is connected to offering goods or services to people in India. Whether a specific exemption covers you is a question for your lawyer; the free check shows what your product would need to change if it does apply.',
  },
  {
    q: 'What are the penalties?',
    a: 'The Act sets penalties of up to ₹250 crore for failing to take reasonable security safeguards to prevent a personal data breach, with other breaches carrying their own caps. The Data Protection Board decides the amount in each case.',
  },
  {
    q: 'How fast do I have to report a data breach?',
    a: 'Under the Rules you must tell affected users and the Data Protection Board without delay, and send the Board a detailed report within 72 hours of becoming aware of the breach. That is only possible if logging and alerting are already in place.',
  },
  {
    q: 'We already follow GDPR. Are we covered?',
    a: 'Partly. Much of the engineering carries over, but DPDP has its own rules on consent notices, children’s data (under 18, with verifiable parental consent), breach timelines and erasure. The check shows exactly where the gaps are.',
  },
  {
    q: 'Do you need access to my systems?',
    a: 'Not for the free check. I only look at what any user of your app or website can see.',
  },
];

const jsonLd = graph([
  service({
    path: PATH,
    name: 'DPDP readiness audit and implementation',
    description: DESCRIPTION,
    serviceType: 'Privacy compliance implementation',
    areaServed: ['India'],
    offers: [{ name: 'Free DPDP readiness check', description: 'Gap report in 48 hours', min: 0, currency: 'INR' }],
  }),
  faqPage(faqs, `${URL}#faq`),
  breadcrumbs([{ name: 'DPDP Readiness', path: PATH }], `${URL}#breadcrumb`),
]);

const Dpdp = () => (
  <PaperPage header={<SiteHeader page={PAGE} current="dpdp" />}>
    <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />

    <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[10] }} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('7fr 5fr'), alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: s[6], alignContent: 'start' }}>
          <span style={{ ...label(11, 700, 0.14), color: p.gold }}>DPDP ACT 2023 · DPDP RULES 2025</span>
          <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
            India&apos;s data law gets real in May 2027. <span style={{ color: p.gold }}>Is your app ready?</span>
          </h1>
          <p style={{ ...lead, maxWidth: '52ch' }}>
            Consent screens, data deletion, breach alerts. Your lawyer writes the policy. I build it into your product,
            so what the policy promises is what the app actually does.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6] }}>
            <Link to={AUDIT} onClick={ctaClick(PAGE, 'hero', 'dpdp')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
              Get my free DPDP check<span aria-hidden>→</span>
            </Link>
            <Link to="/dpdp/check" onClick={ctaClick(PAGE, 'hero_quiz', 'dpdp')} className="pf-underline" style={textLink}>
              OR SCORE YOURSELF IN 3 MINUTES →
            </Link>
          </div>
          <TrustLine items={['Free', '48 hours', 'No access needed']} />
        </div>
        <ol aria-label="DPDP timeline" style={{ listStyle: 'none', margin: 0, padding: px(s[7], s[7]), background: c.plate, color: '#fff', display: 'grid', gap: s[5] }}>
          {timeline.map((t, i) => (
            <li key={t.when} style={{ display: 'grid', gridTemplateColumns: '6.5em 1fr', gap: s[4], alignItems: 'baseline' }}>
              <span style={{ ...label(11, 700, 0.12), color: i === timeline.length - 1 ? c.mark : c.dimOnInk }}>{t.when.toUpperCase()}</span>
              <span style={{ font: `400 15px/1.5 ${display}`, color: i === timeline.length - 1 ? '#fff' : c.bright }}>{t.what}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section aria-labelledby="h-gap" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('6fr 6fr'), alignItems: 'start' }}>
        <SectionHead id="h-gap" title="A privacy policy isn't compliance" />
        <div style={{ display: 'grid', gap: s[5] }}>
          <p style={lead}>
            Most apps will meet May 2027 with a new privacy policy and the same product underneath: one checkbox for
            everything, no way to delete an account, and no idea a breach happened until a customer says so.
          </p>
          <p style={body}>
            The DPDP Act asks the product to change, not only the paperwork. Consent has to be specific and as easy to
            withdraw as it was to give. Deletion has to actually delete. Breaches have to be reported to the Board
            within 72 hours. Those are engineering jobs.
          </p>
        </div>
      </div>
    </section>

    <section aria-labelledby="h-build" style={section} data-rescue-hpad>
      <SectionHead id="h-build" title="What I build into your product" />
      <Cards items={builds} />
    </section>

    <section aria-labelledby="h-how" style={section} data-rescue-hpad>
      <SectionHead id="h-how" title="From check to compliant product" />
      <Steps steps={steps} />
    </section>

    <section aria-labelledby="h-who" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('6fr 6fr'), alignItems: 'start' }}>
        <SectionHead id="h-who" title="Who this is for" />
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, font: `500 16px/1.4 ${display}`, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
          {[
            'Indian startups and D2C brands with sign-ups, orders or customer accounts',
            'Clinics, schools and services that collect personal details online',
            'Apps built with Lovable, Bolt or Cursor that never had a privacy pass',
            'Foreign businesses selling to people in India',
          ].map((item) => (
            <li key={item} style={{ padding: px(s[4], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section aria-labelledby="h-price" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('6fr 6fr'), alignItems: 'start' }}>
        <SectionHead id="h-price" title="Fixed price, after the free check" />
        <div style={{ display: 'grid', gap: s[5] }}>
          <p style={lead}>
            The check shows what your product needs, so the quote covers exactly that and nothing else. You see progress
            every week and own everything at the end.
          </p>
          <Link to={AUDIT} onClick={ctaClick(PAGE, 'price', 'dpdp')} className="pf-nudge" style={{ ...cta, justifySelf: 'start' }}>
            Start with the free check<span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>

    <FaqSection faqs={faqs} />

    <p style={{ ...body, maxWidth: 'none', padding: px(s[6], 0), textAlign: 'center', fontSize: 13 }} data-rescue-hpad>
      This page describes what the DPDP Act and Rules ask products to do. It isn&apos;t legal advice.
    </p>

    <FinalBand
      title="Find out what your app needs"
      accent="before May 2027."
      to={AUDIT}
      action="Get my free DPDP check"
      onClick={ctaClick(PAGE, 'final', 'dpdp')}
      small={
        <>
          Also want to know if ChatGPT recommends you?{' '}
          <Link to="/ai-visibility" className="pf-underline" style={{ color: c.bright, fontWeight: 600 }}>
            See AI Visibility →
          </Link>
        </>
      }
    />
  </PaperPage>
);

export default Dpdp;
