import { Seo } from '@/components/Seo';
import { ServicePage, type ServicePageProps } from '@/components/home/ServicePage';
import { offers, QUOTE_AI } from '@/data/bitsQuest';
import { breadcrumbs, faqPage, graph, service } from '@/lib/schema';

/**
 * `/build-with-ai`: the Build with AI service (AI build, MVP build). Copy from
 * the Bit's Quest services card, pricing group and Bit's recommendation notes.
 */

const PATH = '/build-with-ai';
const URL = `https://anadithakur.in${PATH}`;
const TITLE = 'Build with AI: AI features and MVPs at a fixed quote · Anadi Thakur';
const DESCRIPTION =
  'Add AI that actually works: assistants that answer from your data, smart search, agents and automations, with guardrails and cost limits. AI builds in 1–4 weeks, MVPs in 4–8 weeks, at one fixed quote.';

const content: ServicePageProps = {
  page: 'build_with_ai',
  icon: 'spark',
  pose: 'happy',
  eyebrow: 'Build with AI',
  title: 'Add AI that actually works.',
  lead: 'You want AI in your product or workflow — without runaway costs, wrong answers or a demo that breaks in real use.',
  primary: { text: 'Get a fixed quote', href: QUOTE_AI },
  included: {
    title: 'What gets built.',
    items: [
      ['Assistants that answer from your data', 'Support, sales or internal assistants grounded in your docs and records, not guesses.'],
      ['Smart search and document reading', 'Search that understands questions, and documents read into structured data.'],
      ['Agents and workflow automations', 'Repetitive steps handed to an agent, with a person in the loop where it matters.'],
      ['Guardrails, fallbacks and cost limits', 'Built in, not extras: wrong answers caught, outages handled, spend capped.'],
    ],
  },
  packages: [
    { name: 'AI build', duration: '1–4 weeks', price: 'Fixed quote', detail: 'An assistant, smart search or automation — with guardrails and cost limits.' },
    { name: 'MVP build', duration: '4–8 weeks', price: 'Fixed quote', detail: 'A complete web or mobile product, ready for real users.' },
  ],
  terms: ['Fixed quote after a short scoping call', 'Weekly demos as it’s built', 'Guardrails and cost limits built in', 'Ships behind a switch'],
  steps: [
    { title: 'Scoping call', body: 'A short call about what the AI should do and for whom. You get one fixed quote.' },
    { title: 'Build', body: 'Weekly demos on your real data, so you see it working before it ships.' },
    { title: 'Ship behind a switch', body: 'Live products get the feature behind a switch, so users never see it half-built.' },
    { title: 'Keep it running', body: 'Optional Care plan: monitoring, monthly fixes and model re-checks.' },
  ],
  faq: [
    { q: 'What does it cost?', a: 'Every build gets one fixed quote after a short scoping call. An AI build usually takes 1–4 weeks and an MVP 4–8 weeks.' },
    { q: 'How do you keep AI costs under control?', a: 'Guardrails, fallbacks and cost limits are part of every build: model calls are capped, cached where it helps, and fall back cleanly when a provider is slow or down.' },
    { q: 'We already have an AI feature that misbehaves. Can you fix it?', a: 'Yes. Start with the $349 production audit, which includes the AI checks and ranks what to fix first.' },
    { q: 'Which stacks do you work with?', a: 'React, Next.js, React Native, Node.js and PostgreSQL products, plus Supabase and Firebase — hand-written or built with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit.' },
    { q: 'Is my product live? Does that change anything?', a: 'If it is live, the AI part ships behind a switch so your users never see a half-built feature. If you are still building, it is shaped to be cheap to run from day one.' },
  ],
  closing: { title: 'Add AI that holds up in production.', body: 'One fixed quote after a short scoping call. Weekly demos while it’s built.' },
};

const jsonLd = graph([
  service({
    path: PATH,
    name: 'Build with AI',
    description: DESCRIPTION,
    serviceType: 'AI feature and MVP development',
    areaServed: ['Worldwide'],
    offers: offers.build,
  }),
  faqPage(content.faq, `${URL}#faq`),
  breadcrumbs([{ name: 'Build with AI', path: PATH }], `${URL}#breadcrumb`),
]);

const BuildWithAi = () => (
  <>
    <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />
    <ServicePage {...content} />
  </>
);

export default BuildWithAi;
