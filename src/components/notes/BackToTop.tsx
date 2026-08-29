import { useEffect, useState } from 'react';
import { c, label, px, rule, s } from '@/components/portfolio/tokens';

/**
 * Appears once you are a screen and a half down, and not before.
 *
 * The long pages here are genuinely long — `/drops/prompts` is a hundred
 * records, `/drops/swipe` is twenty — and the rail's sticky TOC only helps
 * above 1200px. Below that the only way back to the filters or the header is a
 * flick, repeated.
 *
 * Rendered only after mount rather than hidden with CSS: a control that does
 * nothing until JavaScript runs has no business being in the server HTML, where
 * it would sit in the tab order of a page that cannot yet scroll on command.
 *
 * Scrolls with `behavior: 'smooth'` unless the reader has asked for less
 * motion, in which case it jumps.
 */
const BackToTop = () => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!shown) return null;

  const toTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      className="pf-to-top"
      style={{
        padding: px(s[3], s[5]),
        background: c.ink,
        color: c.accent,
        border: `${rule.base}px solid ${c.ink}`,
        ...label(10, 700, 0.12),
      }}
    >
      ↑ TOP
    </button>
  );
};

export default BackToTop;
