import { Seo } from '@/components/Seo';
import { PaperPage, SiteHeader } from '@/components/site/kit';
import { About } from '@/components/home/sections';
import { about } from '@/data/bitsQuest';
import { site } from '@/data/portfolio';
import { breadcrumbs, graph, PERSON_REF } from '@/lib/schema';
import '@/styles/home.css';

/**
 * `/about`: one page that answers "who is Anadi Thakur?" for people and for
 * answer engines. Every fact here is already published elsewhere on the site
 * (the homepage's "Meet Anadi", the portfolio's numbers, llms.txt); this page
 * just puts them at one URL with the Person entity behind it.
 */

const PATH = '/about';
const TITLE = 'Who is Anadi Thakur? · Senior full-stack engineer';
const ANSWER = `Anadi Thakur is a senior full-stack engineer based in India with ${Number(site.years)}+ years shipping production web and mobile apps, including the ZEISS Microscopy product platform. He fixes and hardens React, Next.js, React Native, Node.js and PostgreSQL products, whether people or AI tools wrote them, and adds AI features that hold up in production. He works remotely with Indian and US businesses, at fixed prices, and does the work himself.`;

const jsonLd = graph(
  [
    { '@type': 'ProfilePage', '@id': 'https://anadithakur.in/about#page', url: 'https://anadithakur.in/about', name: TITLE, mainEntity: PERSON_REF, about: PERSON_REF },
    breadcrumbs([{ name: 'About', path: PATH }], 'https://anadithakur.in/about#breadcrumbs'),
  ],
  true,
);

export default function AboutPage() {
  return (
    <>
      <Seo title={TITLE} description={ANSWER.slice(0, 155).replace(/\s+\S*$/, '') + '.'} path={PATH} type="website" jsonLd={jsonLd} />
      <PaperPage themeable header={<SiteHeader page="about" themeToggle />}>
        <section aria-labelledby="h-who" className="hq-section">
          <div className="hq-wrap" style={{ display: 'grid', gap: 18, maxWidth: 820 }}>
            <p className="hq-eyebrow">About</p>
            <h1 id="h-who" style={{ margin: 0, font: '400 var(--bq-h1)/0.95 var(--bq-font-display)' }}>
              Who is Anadi Thakur?
            </h1>
            <p style={{ margin: 0, fontSize: 19, lineHeight: 1.55 }}>{ANSWER}</p>
            <p className="hq-small" style={{ margin: 0 }}>
              Clients include {site.clients.map((c) => c.charAt(0) + c.slice(1).toLowerCase()).join(', ')}. {about.role}, {Number(site.releases)} releases in production. Contact:{' '}
              <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </div>
        </section>
        <About />
      </PaperPage>
    </>
  );
}
