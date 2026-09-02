import { useState } from 'react';
import { ClientOnly } from 'vite-react-ssg';
import Index from './Index';
import IntroLoader from '@/components/IntroLoader';
import { Seo, ORIGIN } from '@/components/Seo';
import { site } from '@/data/portfolio';

const TITLE = `${site.name} · ${site.role}`;
const DESCRIPTION =
  'AI full-stack engineer with a UI specialty. Enterprise platforms for ZEISS, React Native apps, and LLM pipelines that do real work instead of demos.';

/**
 * The front page, and the only route the intro takes over.
 *
 * The loader used to be mounted in `App` outside the router, which meant it
 * played on every URL: someone landing on `/drops/system` from a search result
 * would have sat through a full-screen takeover before seeing the thing they
 * clicked. Scoping it to this route is what makes the notes routes viable.
 *
 * `ClientOnly` keeps the curtain out of the prerendered HTML: statically it
 * would be a black plate covering the page, which is the last thing a crawler
 * or a slow connection should get handed first.
 */
const Home = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {/*
        The front page's own head. It used to live as static tags in
        `index.html`, which meant every route rendered them *and* its own: two
        titles and two descriptions in one document, with the crawler left to
        choose. `index.html` now carries only what is genuinely invariant.
      */}
      <Seo
        title={TITLE}
        description={DESCRIPTION}
        path="/"
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: site.name,
          jobTitle: site.role,
          url: ORIGIN,
          email: `mailto:${site.email}`,
          sameAs: [site.github, site.linkedin],
        }}
      />

      {/*
        The page mounts under the loader so the wipe uncovers the real hero,
        but the hero's own entrance has to wait for the curtain, or it plays out
        behind it and the reveal lands on an already-finished frame. `ready` is
        what hands the moment over.
      */}
      <Index ready={!isLoading} />
      <ClientOnly>
        {() => (isLoading ? <IntroLoader onLoadingComplete={() => setIsLoading(false)} /> : null)}
      </ClientOnly>
    </>
  );
};

export default Home;
