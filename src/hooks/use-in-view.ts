import { useEffect, useRef, useState } from 'react';

/**
 * Once-only "has this scrolled into view" flag, for Terminal Head `peek`
 * reveals and the `.th-reveal` class in index.css.
 *
 * `inView` is `undefined` during SSR and the first client render, so
 * prerendered HTML is never hidden: spread `revealProps` onto the element and
 * it only gets `data-in="false"` (hidden) once the observer is attached. With
 * no IntersectionObserver, or reduced motion, it reports true immediately.
 */
export function useInView<T extends Element = HTMLDivElement>(rootMargin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState<boolean>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    // Already on screen at mount (e.g. a short page): show it without a flash.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      setInView(true);
      return;
    }
    setInView(false);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  const revealProps = { ref, className: 'th-reveal', 'data-in': inView === undefined ? undefined : String(inView) };
  /**
   * `visible`: safe to render content (true unless the observer says off-screen).
   * `entered`: the element has actually been seen on the client, so use it to
   * switch a head from `motion="still"` to `motion="peek"` and replay the rise.
   */
  return { ref, visible: inView !== false, entered: inView === true, revealProps };
}
