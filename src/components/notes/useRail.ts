import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Which heading the reader is currently under.
 *
 * IntersectionObserver rather than a scroll handler measuring every heading in
 * a loop: the notes routes carry no scroll engine at all — no GSAP, no Lenis —
 * and this is not the place to reintroduce one.
 *
 * The bottom margin of -70% means a heading counts as current from the moment
 * it reaches the top band of the viewport until the next one does, rather than
 * flickering between two whenever both happen to be on screen.
 */
export const useActiveHeading = (ids: string[]): string | null => {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order, so the topmost visible heading wins rather than
        // whichever one the observer happened to report last.
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
};

/** How far down the document the reader is, 0 to 1. */
export const useReadProgress = (): number => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return progress;
};

/**
 * Whether a disclosure should start open, from a media query.
 *
 * The rail is a `<details>` so that it works below 1200px, where the grid gives
 * it no track and it has to present as a CONTENTS bar instead. Above that the
 * summary is hidden by CSS — but a `<details>` with an invisible summary still
 * needs `open` to show its body, so the breakpoint has to be readable from
 * JavaScript too.
 *
 * Starts closed, which is what the server renders and what a reader on a phone
 * should get. The closed body is still in the DOM, so nothing is hidden from a
 * crawler either way.
 */
export const useDisclosureOpen = (query = '(min-width: 1200px)'): boolean => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const sync = () => setOpen(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return open;
};

/**
 * Copy to clipboard, with the label flip that tells you it worked.
 *
 * Shared by the code blocks and the prompt library, which want the same
 * behaviour for the same reason: both hold text whose entire purpose is to end
 * up somewhere else.
 *
 * `navigator.clipboard` is absent on insecure origins and in some embedded
 * browsers. The button still renders — it is in the server HTML either way —
 * and simply does nothing rather than throwing, which is the quieter failure.
 */
export const useCopy = (resetAfter = 1600) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    (text: string, key = 'default') => {
      if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopiedKey(null), resetAfter);
      });
    },
    [resetAfter],
  );

  return { copy, copiedKey };
};
