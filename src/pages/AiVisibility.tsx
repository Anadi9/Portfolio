import { useState } from 'react';
import { Link } from 'vite-react-ssg';
import { TerminalHead, type THFace } from '@/components/brand/BitHead';
import { useInView } from '@/hooks/use-in-view';
import { Seo } from '@/components/Seo';
import { c, display, heading, label, mono, px, rule, s } from '@/components/brand/tokens';
import { breadcrumbs, faqPage, graph, service, type Faq, type PricedOffer } from '@/lib/schema';
import {
  Cards,
  FaqSection,
  FinalBand,
  PaperPage,
  SectionHead,
  SiteHeader,
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
 * `/ai-visibility`: does ChatGPT recommend your business, and the fixes if not.
 *
 * Copy is the "AI Visibility" section of the positioning doc. Two of its claims
 * were checked before going on the page: the Shopify 15× figure is Shopify's
 * own (AI-driven orders, January to December 2025, on what Shopify calls a
 * small base), and "people can buy inside the AI chat" was softened, because
 * in-chat checkout was largely shelved and most AI shopping still hands off to
 * the store.
 *
 * Prices are repeated in `scripts/generate-feeds.mjs` (llms.txt). Change both.
 */

const PAGE = 'ai_visibility';
const PATH = '/ai-visibility';
const URL = `https://anadithakur.in${PATH}`;
const AUDIT = auditHref('ai');
const TITLE = 'Does ChatGPT Recommend Your Business? Free Check';
const DESCRIPTION =
  'See if ChatGPT, Gemini and Perplexity mention your brand, who they recommend instead, and how to fix it. Free report in 48 hours.';

const SHOPIFY_SOURCE = 'https://www.digitalcommerce360.com/2026/02/17/shopify-revenue-gmv-q4-2025/';

const gets = [
  {
    title: '10 real customer questions',
    body: 'Asked in ChatGPT, Gemini and Perplexity, like "best [your category] in [your city or market]".',
  },
  {
    title: 'Who shows up instead',
    body: 'The competitors AI recommends in your place, with screenshots of the answers.',
  },
  {
    title: 'Your AI readability score',
    body: 'Whether your site gives AI what it needs: structured data, product details and clear pages.',
  },
  {
    title: 'Top 3 fixes',
    body: 'In plain English, ranked by impact. Delivered as a short video walkthrough plus a one-page report.',
  },
];

const fixes = [
  { title: 'Structured data', body: 'Product, business, FAQ and review markup that AI and Google can read.' },
  { title: 'AI-readable pages', body: 'Clear product, service, pricing, shipping and returns pages, rendered so crawlers see the content.' },
  { title: 'Store and catalog setup', body: 'Google Merchant Center and the AI shopping channels your platform supports.' },
  { title: 'Content gaps', body: 'Pages that answer the exact questions your customers ask AI.' },
];

/** The sample report: a fictional brand, so the competitors are fictional too. */
const sampleQuestions = [
  { q: 'Best organic skincare brand in India', hit: false },
  { q: 'Natural face wash for oily skin under ₹500', hit: true },
  { q: 'Cruelty-free moisturiser brands made in India', hit: false },
  { q: 'Is [brand] skincare any good?', hit: true },
  { q: 'Organic sunscreen that ships to Bangalore', hit: false },
];

const plans: (PricedOffer & { price: string; includes: string })[] = [
  { name: 'Free check', includes: '10 AI questions, readability score, top 3 fixes', price: 'Free', min: 0, currency: 'INR', description: '10 AI questions, readability score, top 3 fixes' },
  { name: 'Deep audit', includes: '30 questions across AI tools, full site review, 90-day action plan', price: '₹15,000 / $300', min: 15000, currency: 'INR', description: '30 questions across AI tools, full site review, 90-day action plan' },
  { name: 'Fix it for me', includes: 'All fixes built, then a re-test after 30 days', price: 'From ₹40,000 / $1,000', min: 40000, currency: 'INR', description: 'All fixes built, then a re-test after 30 days' },
  { name: 'Stay visible', includes: 'Monthly re-test, new pages, updates as AI tools change', price: 'From ₹10,000 / $250 a month', min: 10000, currency: 'INR', monthly: true, description: 'Monthly re-test, new pages, updates as AI tools change' },
];

const faqs: Faq[] = [
  {
    q: 'Is this the same as SEO?',
    a: "It overlaps, but it's not the same. SEO helps you rank in a list of links. AI visibility (sometimes called GEO or AEO) helps you get named in the answer. Good AI visibility work usually helps your Google rankings too.",
  },
  {
    q: 'Can you guarantee ChatGPT will recommend us?',
    a: 'No one honestly can. AI answers change. I fix everything that is in your control and re-test so you can see the change.',
  },
  {
    q: 'How long until results show?',
    a: "Some changes appear within weeks; others take a few months as AI tools refresh what they know. That's why the re-test is built in.",
  },
  {
    q: 'Which platforms do you work with?',
    a: 'Shopify, WordPress, Webflow, custom sites built with React or Next.js, and most others. Apps built with Lovable or Bolt often need prerendering first, which I also do.',
  },
  {
    q: 'Do you need access to my website?',
    a: 'Not for the free check. I only use what any visitor, or any AI tool, can see. For the fixes, I work in your site or a copy of it, whichever you prefer.',
  },
];

const jsonLd = graph([
  service({
    path: PATH,
    name: 'AI Visibility audit and fixes',
    description: DESCRIPTION,
    serviceType: 'Generative engine optimisation (GEO)',
    areaServed: ['India', 'United States', 'Worldwide'],
    offers: plans.map(({ name, description, min, currency, monthly }) => ({ name, description, min, currency, monthly })),
  }),
  faqPage(faqs, `${URL}#faq`),
  breadcrumbs([{ name: 'AI Visibility', path: PATH }], `${URL}#breadcrumb`),
]);

/**
 * The sample report. A `found` head sits by the score and peeks in when the
 * report scrolls into view; hovering or focusing a question swaps it to that
 * row's verdict (`found` for a miss, `fixed` tick for a mention).
 */
const SampleReport = () => {
  const { ref, entered } = useInView<HTMLDivElement>();
  const [face, setFace] = useState<THFace>('found');
  return (
  <div ref={ref} style={{ border: `${rule.base}px solid ${c.ink}`, minWidth: 0, background: p.card }}>
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
      <span>AI VISIBILITY REPORT · FICTIONAL BRAND</span>
      <span style={{ color: p.dim }}>SAMPLE</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: s[4], padding: px(s[6], s[6], s[4]) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: s[4] }}>
        <span style={{ ...heading('d3'), color: p.ink }}>34</span>
        <span style={{ ...label(11, 700, 0.14), color: p.dim }}>/ 100 AI VISIBILITY</span>
      </div>
      <TerminalHead key={String(entered)} face={face} prop="clipboard" size={60} motion={entered ? 'peek' : 'still'} label="" />
    </div>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {sampleQuestions.map((r) => (
        <li
          key={r.q}
          data-rescue-finding
          className="th-finding"
          tabIndex={0}
          onMouseEnter={() => setFace(r.hit ? 'fixed' : 'found')}
          onFocus={() => setFace(r.hit ? 'fixed' : 'found')}
          onMouseLeave={() => setFace('found')}
          onBlur={() => setFace('found')}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: s[5],
            alignItems: 'center',
            padding: px(s[4], s[6]),
            borderTop: `${rule.hair}px solid ${p.rule}`,
          }}
        >
          <span style={{ font: `500 15px/1.4 ${display}` }}>&ldquo;{r.q}&rdquo;</span>
          <span style={{ font: `500 13px/1.4 ${mono}`, color: r.hit ? p.ink : p.gold, whiteSpace: 'nowrap' }}>
            {r.hit ? '✓ mentioned' : '✗ ████████ instead'}
          </span>
        </li>
      ))}
    </ul>
    <div style={{ padding: px(s[5], s[6]), borderTop: `${rule.base}px solid ${c.ink}`, display: 'grid', gap: s[2] }}>
      <span style={{ ...label(10, 700, 0.14), color: p.dim }}>TOP FIXES</span>
      {['1. Add product and review structured data', '2. Publish an ingredients and sourcing page', '3. Get listed in Google Merchant Center'].map((f) => (
        <span key={f} style={{ font: `500 14px/1.4 ${display}` }}>
          {f}
        </span>
      ))}
    </div>
  </div>
  );
};

const AiVisibility = () => (
  <PaperPage header={<SiteHeader page={PAGE} current="ai" />}>
    <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />

    <section style={{ ...section, borderTop: 'none', paddingTop: s[11], paddingBottom: s[10] }} data-rescue-hpad>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: s[8] }}>
      <div style={{ display: 'grid', gap: s[6], maxWidth: 900 }}>
        <span style={{ ...label(11, 700, 0.14), color: p.gold }}>AI VISIBILITY · GEO · AEO</span>
        <h1 style={{ margin: 0, ...heading('d3'), textTransform: 'uppercase', maxWidth: '16ch' }}>
          When customers ask AI, <span style={{ color: p.gold }}>does it recommend you?</span>
        </h1>
        <p style={{ ...lead, maxWidth: '56ch' }}>
          People now ask ChatGPT, Gemini and Perplexity which brand to buy, which clinic to visit, which tool to use.
          I&apos;ll show you whether AI mentions your business, who it recommends instead, and fix it.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: s[6] }}>
          <Link to={AUDIT} onClick={ctaClick(PAGE, 'hero', 'ai')} className="pf-nudge pf-nudge-lg" style={{ ...cta, minHeight: 56, padding: px(0, s[7]) }}>
            Get my free AI visibility check<span aria-hidden>→</span>
          </Link>
          <Link to="/ai-readiness" onClick={ctaClick(PAGE, 'hero_tool', 'ai')} className="pf-underline" style={textLink}>
            OR TEST YOUR SITE IN 10 SECONDS →
          </Link>
        </div>
        <TrustLine items={['Free', '48 hours', 'No access needed']} />
      </div>
      {/* The Inspector: lens + scan, the hero's one animated head. */}
      <TerminalHead face="scan" prop="lens" motion="type" size={160} label="Terminal Head scanning with a magnifying lens" />
      </div>
    </section>

    <section aria-labelledby="h-problem" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('6fr 6fr'), alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: s[5] }}>
          <SectionHead id="h-problem" title="Your customers stopped scrolling search results" />
          <p style={lead}>
            They ask one question and trust the answer. AI tools pick a few businesses to mention. If yours isn&apos;t one
            of them, you don&apos;t lose a ranking position. You disappear from the conversation.
          </p>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
          {[
            <>
              AI shopping is growing fast: Shopify reported AI-driven orders on its platform grew 15× during 2025, from a
              small base.{' '}
              <a href={SHOPIFY_SOURCE} className="pf-underline" style={{ color: p.ink, fontWeight: 600 }} rel="noopener">
                Source
              </a>
            </>,
            <>ChatGPT, Gemini, Copilot and Perplexity now recommend products and send shoppers straight to stores.</>,
            <>
              AI reads your website differently from a person. Missing product data, unclear pages and no structured
              information mean it skips you.
            </>,
          ].map((item, i) => (
            <li key={i} style={{ ...body, maxWidth: 'none', padding: px(s[5], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section aria-labelledby="h-get" style={section} data-rescue-hpad>
      <SectionHead id="h-get" title="What you get in 48 hours" intro="The free check. Delivered as a short video walkthrough plus a one-page report." />
      <Cards items={gets} />
    </section>

    <section aria-labelledby="h-sample" style={section} data-rescue-hpad>
      <div data-rescue-split style={{ ...split('7fr 5fr'), alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: s[6] }}>
          <SectionHead id="h-sample" title="Here's what a report looks like" />
          <SampleReport />
        </div>
        <div style={{ display: 'grid', gap: s[6], alignContent: 'start', paddingTop: s[11] }}>
          <p style={{ ...lead, color: p.ink }}>
            Every question, every answer, and who got named in your place. Then the three changes that would move the
            score most.
          </p>
          <p style={body}>
            This sample is a fictional skincare brand, and the competitor names are blacked out. Yours names them.
          </p>
          <Link to={AUDIT} onClick={ctaClick(PAGE, 'sample', 'ai')} className="pf-underline" style={{ ...textLink, justifySelf: 'start' }}>
            GET YOUR OWN REPORT →
          </Link>
        </div>
      </div>
    </section>

    <section aria-labelledby="h-fix" style={section} data-rescue-hpad>
      <SectionHead
        id="h-fix"
        title="Then I build the fixes"
        intro="Then a re-test after 30 days: the same 10 questions again, so you see the difference."
      />
      <Cards items={fixes} />
    </section>

    <section aria-labelledby="h-price" style={section} data-rescue-hpad>
      <SectionHead id="h-price" title="Clear prices, agreed upfront" />
      <ul style={{ listStyle: 'none', margin: px(s[9], 0, 0), padding: 0, borderBottom: `${rule.hair}px solid ${p.rule}` }}>
        {plans.map((pl) => (
          <li
            key={pl.name}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'baseline', gap: s[5], padding: px(s[5], 0), borderTop: `${rule.hair}px solid ${p.rule}` }}
          >
            <div style={{ display: 'grid', gap: s[1] }}>
              <span style={{ font: `600 17px/1.3 ${display}`, color: p.ink }}>{pl.name}</span>
              <span style={{ ...body, fontSize: 14 }}>{pl.includes}</span>
            </div>
            <span style={{ ...heading('d6'), color: p.ink, textAlign: 'right' }}>{pl.price}</span>
          </li>
        ))}
      </ul>
      <p style={{ ...body, marginTop: s[6] }}>Every quote is fixed before work starts. US clients are billed in dollars.</p>
    </section>

    <FaqSection faqs={faqs} />

    <FinalBand
      title="Find out what AI"
      accent="says about you."
      to={AUDIT}
      action="Get my free AI visibility check"
      onClick={ctaClick(PAGE, 'final', 'ai')}
      small={
        <>
          Also need your app ready for India&apos;s data law?{' '}
          <Link to="/dpdp" className="pf-underline" style={{ color: c.bright, fontWeight: 600 }}>
            See DPDP Readiness →
          </Link>
        </>
      }
    />
  </PaperPage>
);

export default AiVisibility;
