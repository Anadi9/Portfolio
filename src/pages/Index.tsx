import { useRef } from 'react';
import Rail from '@/components/portfolio/Rail';
import Hero from '@/components/portfolio/Hero';
import Work from '@/components/portfolio/Work';
import Journey from '@/components/portfolio/Journey';
import Stack from '@/components/portfolio/Stack';
import Contact from '@/components/portfolio/Contact';
import Testimonials from '@/components/Testimonials';
import Overlays from '@/components/portfolio/Overlays';
import { usePortfolioMotion } from '@/hooks/use-portfolio-motion';
import { c } from '@/components/portfolio/tokens';

/** `ready` flips when the intro loader has finished and uncovered the page. */
const Index = ({ ready = true }: { ready?: boolean }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  usePortfolioMotion(rootRef, ready);

  return (
    <div
      ref={rootRef}
      data-portfolio="1"
      style={{ display: 'flex', alignItems: 'flex-start', background: c.paper, minHeight: '100vh' }}
    >
      <Rail />
      <main style={{ flex: 1, minWidth: 0 }}>
        <Hero />
        <Work />
        <Journey />
        <Testimonials />
        <Stack />
        <Contact />
      </main>
      <Overlays />
    </div>
  );
};

export default Index;
