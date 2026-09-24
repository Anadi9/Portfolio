import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { c } from '@/components/portfolio/tokens';

gsap.registerPlugin(ScrollTrigger);

const SECTION_IDS = ['home', 'work', 'journey', 'stack', 'contact'];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Disposer = () => void;

/**
 * Drives every scroll-linked behaviour on the portfolio: rail inversion,
 * reveals, the pinned hero hand-off, the horizontal work reel, the timeline
 * draw, section wipes and the custom cursor.
 *
 * The DOM contract is the `data-*` attributes the section components render, so
 * markup and motion stay decoupled, so a section can move without touching this.
 *
 * `ready` is the hand-off from the intro loader. Everything scroll-linked is
 * wired up on mount, but the hero's entrance is held paused until the curtain
 * actually lifts.
 */
export function usePortfolioMotion(rootRef: React.RefObject<HTMLElement>, ready = true) {
  const heroIntro = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = prefersReducedMotion();
    const disposers: Disposer[] = [];
    const triggers: ScrollTrigger[] = [];
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
    const qa = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    /* ---- one activation, three input modes -------------------------------
       Every rich "hover" state on the page is bound through here, because
       hover is only one of the ways a person singles out an element, and it
       is the one a phone doesn't have at all.

         pointer   mouseenter / mouseleave, but only where hover genuinely
                   exists. Bound unconditionally, a tap on a touch screen fires
                   a synthetic mouseenter with no matching mouseleave, so the
                   last thing you touched stays lit until you touch something
                   else, which is exactly the bug this replaces.
         keyboard  focusin / focusout, so tabbing gets the same feedback the
                   mouse does. Focus moving between two children of the same
                   element is not a leave, or the state flickers off and on.
         touch     the element being the one you are looking at. With neither
                   hover nor focus available, an observer over the middle band
                   of the viewport gives the state a trigger that matches how a
                   phone is actually used: scroll it to the centre, it lights.

       `on` and `off` fire once per transition however many events arrive. */
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const inViewOf = new Map<Element, { on: () => void; off: () => void }>();
    let inViewIO: IntersectionObserver | null = null;
    if (!canHover) {
      inViewIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            const a = inViewOf.get(e.target);
            if (a) (e.isIntersecting ? a.on : a.off)();
          });
        },
        // Middle band on both axes: the work reel moves its plates through
        // horizontally while everything else arrives vertically.
        { rootMargin: '-38% -22% -38% -22%' },
      );
      disposers.push(() => inViewIO?.disconnect());
    }

    /**
     * @param inView opt out for anything permanently on screen: the rail is
     * sticky, so an in-view trigger there would simply latch on and stay.
     */
    const bindActive = (
      el: HTMLElement,
      on: () => void,
      off: () => void,
      { inView = true }: { inView?: boolean } = {},
    ) => {
      let active = false;
      const enter = () => {
        if (active) return;
        active = true;
        on();
      };
      const exit = () => {
        if (!active) return;
        active = false;
        off();
      };
      const onFocusOut = (e: FocusEvent) => {
        if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
        exit();
      };

      if (canHover) {
        el.addEventListener('mouseenter', enter);
        el.addEventListener('mouseleave', exit);
      }
      el.addEventListener('focusin', enter);
      el.addEventListener('focusout', onFocusOut);
      disposers.push(() => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', exit);
        el.removeEventListener('focusin', enter);
        el.removeEventListener('focusout', onFocusOut);
      });

      if (inViewIO && inView) {
        inViewOf.set(el, { on: enter, off: exit });
        inViewIO.observe(el);
        disposers.push(() => {
          inViewOf.delete(el);
          inViewIO?.unobserve(el);
        });
      }
    };

    /* ---- reveal on enter ------------------------------------------------ */
    const revealItems = qa<HTMLElement>('[data-reveal]');
    if (!reduced && revealItems.length) {
      revealItems.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(34px)';
        el.style.transition =
          'opacity .75s cubic-bezier(.2,.75,.2,1), transform .75s cubic-bezier(.2,.75,.2,1)';
      });
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'none';
            io.unobserve(el);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      revealItems.forEach((el) => io.observe(el));
      disposers.push(() => io.disconnect());
    }

    /* ---- rail inverts over the dark sections ----------------------------
       One band per dark section, resized every frame to the overlap between
       that section and the rail, each running
       `backdrop-filter: invert(1) hue-rotate(180deg)`.

       The hue-rotate is load-bearing. A plain invert, equivalently
       `mix-blend-mode: difference` against white, swings every warm hue by
       180 degrees: the cream comes out navy (#E4DED0 to #1B212F) and the gold
       comes out cornflower (#C9A24B to #365DB4). Inverting lightness and
       rotating the hue back leaves the palette where it started.

       This replaces a boolean that repainted a dozen elements' inline colours
       whenever a dark section crossed the viewport midpoint. That flipped the
       whole rail at once while it was physically straddling both sections, and
       being driven off IntersectionObserver thresholds it went stale if you
       stopped mid-scroll. The seam now tracks the actual section edge, so the
       inversion sweeps through the rail exactly where the boundary is. */
    const rail = q<HTMLElement>('[data-rail]');
    const invertHost = q<HTMLElement>('[data-rail-invert]');
    const darkSections = qa<HTMLElement>('[data-dark]');
    const navs = qa<HTMLElement>('[data-nav]');
    const copyLabel = q<HTMLElement>('[data-copy-label]');

    const bands = invertHost
      ? darkSections.map(() => {
          const band = document.createElement('span');
          band.style.cssText =
            'position:absolute;left:0;right:0;display:block;' +
            '-webkit-backdrop-filter:invert(1) hue-rotate(180deg);' +
            'backdrop-filter:invert(1) hue-rotate(180deg);';
          invertHost.appendChild(band);
          return band;
        })
      : [];

    const paintSeam = () => {
      if (!rail || !bands.length) return;
      const r = rail.getBoundingClientRect();
      darkSections.forEach((sec, i) => {
        const box = sec.getBoundingClientRect();
        const top = Math.max(0, box.top - r.top);
        const height = Math.min(r.height, box.bottom - r.top) - top;
        const band = bands[i];
        if (height <= 0) {
          band.style.display = 'none';
          return;
        }
        band.style.display = 'block';
        band.style.top = `${top.toFixed(1)}px`;
        band.style.height = `${height.toFixed(1)}px`;
      });
    };

    const state = { active: 'home', hover: '' };

    const paintNav = () => {
      navs.forEach((a) => {
        const id = a.getAttribute('data-nav');
        const on = id === state.active;
        a.style.color = on || id === state.hover ? c.markOnPaper : c.ink;
        const dot = a.querySelector<HTMLElement>('[data-navdot]');
        if (dot) dot.style.background = on ? c.markOnPaper : 'transparent';
      });
    };

    /**
     * Bring the active section's nav item into view.
     *
     * Below the breakpoint the rail lies down into a bar and the nav becomes a
     * horizontal scroller too narrow to hold all five sections, so marking the
     * active one is not enough on its own: the mark can easily be sitting off
     * the left edge while you read. Only runs when the nav actually overflows,
     * which is exactly the narrow layout.
     */
    const navEl = q<HTMLElement>('[data-rail-nav]');
    const revealActiveNav = () => {
      if (!navEl || navEl.scrollWidth <= navEl.clientWidth) return;
      const a = navs.find((n) => n.getAttribute('data-nav') === state.active);
      if (!a) return;
      const box = a.getBoundingClientRect();
      const view = navEl.getBoundingClientRect();
      navEl.scrollTo({
        left: Math.max(0, navEl.scrollLeft + (box.left - view.left) - (view.width - box.width) / 2),
        behavior: reduced ? 'auto' : 'smooth',
      });
    };

    /* ---- copy email ----------------------------------------------------- */
    const copyBtn = q<HTMLButtonElement>('[data-copy]');
    if (copyBtn && copyLabel) {
      let resetTimer: number | undefined;
      const onCopy = () => {
        const value = copyBtn.getAttribute('data-copy') ?? '';
        const original = copyBtn.getAttribute('data-copy') ?? '';
        const done = () => {
          copyLabel.textContent = 'COPIED TO CLIPBOARD';
          window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(() => {
            copyLabel.textContent = original;
          }, 1400);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, done);
        else done();
      };
      copyBtn.addEventListener('click', onCopy);
      disposers.push(() => {
        copyBtn.removeEventListener('click', onCopy);
        window.clearTimeout(resetTimer);
      });
    }

    /* ---- rail hovers ----------------------------------------------------
       All in paper tone now. Whatever is under the seam gets inverted along
       with the rest of the rail, so hover feedback needs one set of colours
       rather than one per background. */
    qa<HTMLElement>('[data-rail-chip]').forEach((chip) => {
      bindActive(
        chip,
        () => {
          chip.style.background = c.ink;
          chip.style.color = c.paper;
        },
        () => {
          chip.style.background = 'transparent';
          chip.style.color = c.ink;
        },
        { inView: false },
      );
    });

    navs.forEach((a) => {
      // The scrollspy already marks the current section, so an in-view state
      // here would only fight it.
      bindActive(
        a,
        () => {
          state.hover = a.getAttribute('data-nav') ?? '';
          paintNav();
        },
        () => {
          state.hover = '';
          paintNav();
        },
        { inView: false },
      );
    });

    /* ---- plate hover: torn slices of the screenshot ---------------------- */
    const BANDS = ['inset(0 0 66% 0)', 'inset(34% 0 34% 0)', 'inset(68% 0 0 0)'];
    const FACTORS = [-1, 0.62, -0.42];
    qa<HTMLElement>('[data-plate]').forEach((plate) => {
      const arrow = plate.querySelector<HTMLElement>('[data-arrow]');
      const shot = plate.querySelector<HTMLElement>('[data-shot]');
      let layers: HTMLElement[] = [];

      const clear = () => {
        shot?.querySelectorAll('[data-glitch]').forEach((n) => n.remove());
        layers = [];
      };
      const build = () => {
        if (!shot) return;
        clear();
        const base = shot.cloneNode(true) as HTMLElement;
        base.removeAttribute('data-shot');
        layers = BANDS.map((band, i) => {
          const l = base.cloneNode(true) as HTMLElement;
          l.setAttribute('data-glitch', '1');
          l.style.position = 'absolute';
          l.style.inset = '0';
          l.style.margin = '0';
          l.style.border = '0';
          l.style.clipPath = band;
          l.style.transition = 'transform .12s linear';
          if (i === 1) l.style.filter = 'contrast(1.25) brightness(1.15)';
          shot.appendChild(l);
          return l;
        });
        const flood = document.createElement('div');
        flood.setAttribute('data-glitch', '1');
        flood.style.cssText = `position:absolute;inset:0;clip-path:${BANDS[1]};background:${c.accent};mix-blend-mode:overlay;opacity:.55;pointer-events:none`;
        shot.appendChild(flood);
      };

      const enter = () => {
        plate.style.borderColor = c.accent;
        if (arrow) {
          arrow.style.background = c.accent;
          arrow.style.borderColor = c.accent;
          arrow.style.color = c.ink;
        }
        if (!reduced) build();
      };
      const move = (e: MouseEvent) => {
        if (reduced || !shot || !layers.length) return;
        const r = shot.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
        layers.forEach((l, i) => {
          l.style.transform = `translate3d(${(dx * 34 * FACTORS[i]).toFixed(1)}px,${(dy * 6 * FACTORS[i]).toFixed(1)}px,0)`;
        });
      };
      const leave = () => {
        plate.style.borderColor = c.rule;
        if (arrow) {
          arrow.style.background = 'transparent';
          arrow.style.borderColor = c.mark;
          arrow.style.color = c.mark;
        }
        clear();
      };

      bindActive(plate, enter, leave);
      // Parallax is the one part with no keyboard or touch equivalent: it
      // tracks a pointer position that doesn't exist. The torn slices still
      // build on focus and in view; they just sit still.
      if (canHover) {
        plate.addEventListener('mousemove', move);
        disposers.push(() => plate.removeEventListener('mousemove', move));
      }
      disposers.push(clear);
    });

    /* ---- scrollspy (+ timeline draw before GSAP takes over) -------------- */
    const path = q<SVGPathElement>('[data-path]');
    const timelineEl = q<HTMLElement>('[data-timeline]');
    const sections = SECTION_IDS.map((id) => ({ id, el: document.getElementById(id) })).filter(
      (s): s is { id: string; el: HTMLElement } => Boolean(s.el),
    );
    let gsapDrawsPath = false;
    let raf: number | null = null;

    const tick = () => {
      raf = null;
      paintSeam();
      const vh = window.innerHeight;
      if (path && timelineEl && !gsapDrawsPath) {
        const r = timelineEl.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.25)));
        path.style.strokeDashoffset = String(1 - p);
      }
      let current = sections[0]?.id ?? 'home';
      sections.forEach((s) => {
        if (s.el.getBoundingClientRect().top <= vh * 0.42) current = s.id;
      });
      if (current !== state.active) {
        state.active = current;
        paintNav();
        revealActiveNav();
      }
    };
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Pins change section heights on refresh, which moves the seam.
    ScrollTrigger.addEventListener('refresh', paintSeam);
    disposers.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ScrollTrigger.removeEventListener('refresh', paintSeam);
      if (raf != null) cancelAnimationFrame(raf);
      bands.forEach((b) => b.remove());
    });
    tick();
    paintNav();

    /* ---- smooth scroll --------------------------------------------------- */
    let lenis: Lenis | null = null;
    let tickerFn: ((time: number) => void) | null = null;
    if (!reduced) {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
        /* The work reel becomes a real horizontal scroller below the
           breakpoint, and Lenis would otherwise swallow the wheel events that
           drive it. This defers per axis: a sideways gesture over the reel goes
           to the reel, a vertical one stays smooth. Touch is native either way,
           and on the wide layout the track has no overflow at all, so nothing
           about the pinned reel changes. */
        allowNestedScroll: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      tickerFn = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tickerFn);
      gsap.ticker.lagSmoothing(0);

      qa<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
        const onClick = (e: MouseEvent) => {
          const target = document.querySelector(a.getAttribute('href') ?? '');
          if (!target) return;
          e.preventDefault();
          lenis?.scrollTo(target as HTMLElement, { offset: 0, duration: 1.2 });
        };
        a.addEventListener('click', onClick);
        disposers.push(() => a.removeEventListener('click', onClick));
      });
    }

    const ctx = gsap.context(() => {
      const heroName = q<HTMLElement>('[data-hero-name]');
      const heroPortrait = q<HTMLElement>('[data-hero-portrait]');
      const heroInfo = q<HTMLElement>('[data-hero-info]');
      const wipe = q<HTMLElement>('[data-wipe]');
      const flood = q<HTMLElement>('[data-portrait-flood]');
      const chars = qa<HTMLElement>('[data-hchar]');

      /* 1: the name cuts in, the portrait wipes down behind it.
         Built paused and parked in `heroIntro`: it used to run on mount, which
         meant it finished at ~1.45s while the loader was still up until ~2.6s,
         so the wipe uncovered a hero that had already played. The ready effect
         below starts it the moment the curtain is actually gone. */
      if (!reduced && (chars.length || heroPortrait)) {
        gsap.set(chars, { yPercent: 112 });
        if (heroPortrait) {
          gsap.set(heroPortrait, { clipPath: 'inset(0 0 100% 0)' });
          gsap.set(flood, { opacity: 1 });
        }

        const intro = gsap.timeline({ paused: true });
        if (chars.length) {
          intro.to(chars, { yPercent: 0, duration: 1.05, ease: 'expo.out', stagger: 0.035 }, 0.08);
        }
        if (heroPortrait) {
          intro
            .to(heroPortrait, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power4.inOut' }, 0.35)
            .to(flood, { opacity: 0, duration: 0.6, ease: 'power2.out' }, 1.15);
        }
        heroIntro.current = intro;
      }

      /* 2: hero pins, then hands off on a hard wipe */
      if (!reduced && heroName && window.innerWidth > 680) {
        const t = gsap.timeline({
          scrollTrigger: {
            trigger: '#home',
            start: 'top top',
            end: '+=72%',
            pin: true,
            pinSpacing: true,
            scrub: 0.4,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        if (t.scrollTrigger) triggers.push(t.scrollTrigger);
        t.to(heroName, { scale: 1.1, yPercent: -6, transformOrigin: 'left top', ease: 'none' }, 0);
        if (heroPortrait) t.to(heroPortrait, { yPercent: -14, ease: 'none' }, 0);
        if (heroInfo) t.to(heroInfo, { yPercent: 40, opacity: 0, ease: 'power1.in' }, 0);
        if (wipe) {
          gsap.set(wipe, { y: 0, yPercent: 100 });
          t.fromTo(wipe, { yPercent: 100 }, { yPercent: 0, ease: 'steps(7)', duration: 0.45 }, 0.55);
        }
      }

      /* 3: the work reel moves sideways, by one of two mechanisms.

         Which one is CSS's call: `--reel-swipe` on the wrapper is 0 on the wide
         layout and 1 below the breakpoint, the same contract `--spine-x` uses
         for the timeline further down. The breakpoint is written once, in the
         stylesheet, and this asks the stylesheet which layout is on screen
         instead of keeping its own copy of the number.

           pinned  the section pins and the page's vertical scroll drags the
                   track. There is no touch equivalent of that gesture.
           swipe   the track is a horizontal scroller and the finger drives it.

         The counter and the bar read the same progress either way, so the
         indicator under the reel means one thing across both. */
      const wrap = q<HTMLElement>('[data-hwrap]');
      const track = q<HTMLElement>('[data-htrack]');
      const bar = q<HTMLElement>('[data-hbar]');
      const count = q<HTMLElement>('[data-hcount]');
      if (wrap && track) {
        const panels = track.children.length;

        const showProgress = (p: number) => {
          if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
          if (count) {
            const i = Math.min(panels, Math.floor(p * (panels - 0.001)) + 1);
            count.textContent = `${String(i).padStart(2, '0')} / ${String(panels).padStart(2, '0')}`;
          }
        };

        const swipeMode = () =>
          parseFloat(getComputedStyle(wrap).getPropertyValue('--reel-swipe')) > 0;

        const mountPinned = (): Disposer => {
          const dist = () => Math.max(1, track.scrollWidth - wrap.clientWidth);
          const tween = gsap.to(track, {
            x: () => -dist(),
            ease: 'none',
            scrollTrigger: {
              trigger: wrap,
              start: 'top top',
              end: () => `+=${dist()}`,
              pin: true,
              scrub: 0.5,
              invalidateOnRefresh: true,
              onUpdate: (self) => showProgress(self.progress),
            },
          });
          return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
            gsap.set(track, { clearProps: 'transform' });
          };
        };

        const mountSwipe = (): Disposer => {
          // A pin leaves the track under a transform; a scroller needs it clean.
          gsap.set(track, { clearProps: 'transform' });
          const read = () => {
            const dist = track.scrollWidth - track.clientWidth;
            showProgress(dist > 1 ? track.scrollLeft / dist : 0);
          };
          track.addEventListener('scroll', read, { passive: true });
          read();
          return () => track.removeEventListener('scroll', read);
        };

        let swiping = swipeMode();
        let unmount = swiping ? mountSwipe() : mountPinned();

        /* Crossing the breakpoint swaps the mechanism outright, so the old one
           is torn down: a surviving pin would hold a section that no longer
           pins, and a surviving scroll listener would fight the tween. */
        const remount = () => {
          if (swipeMode() === swiping) return;
          swiping = !swiping;
          unmount();
          unmount = swiping ? mountSwipe() : mountPinned();
          ScrollTrigger.refresh();
        };
        window.addEventListener('resize', remount);
        disposers.push(() => {
          window.removeEventListener('resize', remount);
          unmount();
        });
      }

      /* 4: the route, a curve measured from the cards, drawn by a moving pen.
         The path is generated at runtime so every bend lands on a card's inner
         edge, and each card is played by the pen reaching its node, so line and
         cards stay in lockstep however the cards reflow. */
      const routeSvg = q<SVGSVGElement>('[data-path-svg]');
      const routeTrack = q<SVGPathElement>('[data-path-track]');
      const routeHead = q<SVGGElement>('[data-path-head]');
      const miles = qa<HTMLElement>('[data-mile]');

      type RouteNode = {
        group: SVGGElement;
        mark: SVGRectElement | null;
        stub: SVGLineElement | null;
        card: HTMLElement;
        left: boolean;
        y: number;
        tl: gsap.core.Timeline | null;
        on: boolean;
      };

      const nodes: RouteNode[] = miles
        .map((card, i) => {
          const group = q<SVGGElement>(`[data-node="${i}"]`);
          if (!group) return null;
          return {
            group,
            mark: group.querySelector<SVGRectElement>('[data-node-mark]'),
            stub: group.querySelector<SVGLineElement>('[data-node-stub]'),
            card,
            left: card.getAttribute('data-side') === 'left',
            y: 0,
            tl: null,
            on: false,
          };
        })
        .filter((n): n is RouteNode => Boolean(n));

      /** Breathing room between a card's inner edge and the line. */
      const GAP = 26;

      /**
       * The narrow layout's spine offset, in px, or 0 for the wide one.
       *
       * Declared by the media query in portfolio.css as `--spine-x` and read
       * back here, so the breakpoint exists in exactly one place. The route
       * used to be `display: none` below 1024px, and the section's whole premise
       * ("scroll, the line draws itself") simply switched off on the devices
       * most people were reading it on. It isn't hidden now: the cards stack
       * into one column and the weave straightens into a vertical spine down
       * their left edge, with the same pen, the same nodes and the same
       * card-by-card playback.
       */
      const spineX = () =>
        timelineEl ? parseFloat(getComputedStyle(timelineEl).getPropertyValue('--spine-x')) || 0 : 0;

      /** On the spine every card sits to the right of the line. */
      let onSpine = spineX() > 0;
      const sideOf = (n: { left: boolean }) => (onSpine ? false : n.left);

      /**
       * A card's box in timeline-local coordinates. Offsets rather than
       * `getBoundingClientRect`, because the cards carry GSAP transforms
       * (entry slide, hover lean) that must not feed back into the geometry.
       */
      const localBox = (el: HTMLElement) => {
        let left = 0;
        let top = 0;
        let n: HTMLElement | null = el;
        while (n && n !== timelineEl) {
          left += n.offsetLeft;
          top += n.offsetTop;
          n = n.offsetParent as HTMLElement | null;
        }
        return { left, top, width: el.offsetWidth, height: el.offsetHeight };
      };

      /**
       * Measure the cards and regenerate the curve, the node positions and the
       * stub that connects each node to its card. Returns false when the SVG is
       * not rendered (below 1024px the route is hidden and cards go full width).
       */
      const buildRoute = () => {
        if (!path || !timelineEl || !routeSvg || !nodes.length) return false;
        if (!routeSvg.getClientRects().length) return false;
        const w = timelineEl.offsetWidth;
        const h = timelineEl.offsetHeight;
        if (!w || !h) return false;

        const spine = spineX();
        onSpine = spine > 0;

        const anchors = nodes.map((n) => {
          const r = localBox(n.card);
          const left = sideOf(n);
          const edgeX = left ? r.left + r.width : r.left;
          // Every node shares one x on the spine, which is what collapses the
          // weave into a straight vertical run through the generator below.
          const x = onSpine ? spine : left ? edgeX + GAP : edgeX - GAP;
          n.y = r.top + r.height / 2;
          n.group.setAttribute('transform', `translate(${x.toFixed(1)} ${n.y.toFixed(1)})`);
          // stub runs from the node back to the card, overlapping the border by 2
          n.stub?.setAttribute('x2', (edgeX - x + (left ? 2 : -2)).toFixed(1));
          return { x, y: n.y };
        });

        // enter and exit on the line's own axis, weave through every anchor
        const mid = onSpine ? spine : w / 2;
        const pts = [{ x: mid, y: 0 }, ...anchors, { x: mid, y: h }];

        // vertical control handles keep it a smooth top-to-bottom S-weave
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 1; i < pts.length; i += 1) {
          const a = pts[i - 1];
          const b = pts[i];
          const k = (b.y - a.y) * 0.5;
          d += ` C ${a.x.toFixed(1)} ${(a.y + k).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        }

        routeSvg.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`);
        path.setAttribute('d', d);
        routeTrack?.setAttribute('d', d);
        return true;
      };

      if (path && timelineEl && nodes.length) {
        gsapDrawsPath = true;
        let hasRoute = buildRoute();

        /* Crossing the breakpoint flips which side of the line the cards live
           on, and that direction is baked into their entry tweens, so the
           card timelines are rebuilt, not just the geometry. Set below. */
        let resyncNodes: (() => void) | null = null;

        const rebuild = () => {
          const was = onSpine;
          hasRoute = buildRoute();
          if (onSpine !== was) resyncNodes?.();
        };
        ScrollTrigger.addEventListener('refresh', rebuild);
        disposers.push(() => ScrollTrigger.removeEventListener('refresh', rebuild));

        const ro = new ResizeObserver(() => {
          rebuild();
          ScrollTrigger.refresh();
        });
        ro.observe(timelineEl);
        disposers.push(() => ro.disconnect());

        // web fonts land after first paint and move every card
        document.fonts?.ready?.then(() => {
          rebuild();
          ScrollTrigger.refresh();
        });

        if (reduced) {
          /* reduced motion: the whole route is simply there */
          path.style.strokeDashoffset = '0';
          nodes.forEach((n) => {
            n.group.style.opacity = '1';
            n.stub?.style.setProperty('stroke-dashoffset', '0');
            gsap.set(n.mark, { scale: 1, rotation: 45, transformOrigin: 'center center' });
          });
        } else {
          /**
           * The card's landing, built fresh against whichever side of the line
           * it currently sits on: it wipes out of the line rather than into it,
           * so `left` decides the entry offset, the clip direction and which
           * way the ink bar sweeps.
           */
          const buildNodeTl = (n: RouteNode) => {
            const left = sideOf(n);
            const flash = n.card.querySelector<HTMLElement>('[data-mile-flash]');
            const lines = Array.from(n.card.querySelectorAll<HTMLElement>('[data-mile-line]'));
            const yearEl = n.card.querySelector<HTMLElement>('[data-yearnum]');
            const shadow = n.card.getAttribute('data-mile-shadow') ?? c.ink;

            gsap.set(n.card, { opacity: 0, boxShadow: `0px 0px 0px ${shadow}` });
            gsap.set(n.mark, { scale: 0, rotation: 0, transformOrigin: 'center center' });

            // year digits roll as the card lands, not while it is still hidden
            const target = parseInt(yearEl?.getAttribute('data-yearnum') ?? '', 10);
            const fmt = (v: number) => `'${String(Math.round(v)).padStart(2, '0')}`;
            const o = { v: Math.max(0, target - 9) };
            if (yearEl && !Number.isNaN(target)) yearEl.textContent = fmt(o.v);

            const tl = gsap.timeline({ paused: true });

            /* the pen touches down: node spins open, stub reaches for the card */
            tl.set(n.group, { opacity: 1 }, 0)
              .fromTo(n.mark, { scale: 0, rotation: 0 }, { scale: 1, rotation: 45, duration: 0.5, ease: 'back.out(2.6)' }, 0)
              .fromTo(n.stub, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.26, ease: 'power2.out' }, 0.08);

            /* the card prints: wipes out of the line, ink bar sweeps across */
            tl.fromTo(
              n.card,
              { opacity: 0, x: left ? -34 : 34, clipPath: left ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' },
              { opacity: 1, x: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.62, ease: 'power4.out' },
              0.16,
            );

            if (flash) {
              tl.fromTo(
                flash,
                { scaleX: 0, transformOrigin: left ? 'right center' : 'left center' },
                { scaleX: 1, duration: 0.24, ease: 'steps(5)' },
                0.16,
              ).to(
                flash,
                { transformOrigin: left ? 'left center' : 'right center', scaleX: 0, duration: 0.34, ease: 'steps(6)' },
                0.42,
              );
            }

            if (lines.length) {
              tl.fromTo(
                lines,
                { yPercent: 115, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.06 },
                0.34,
              );
            }

            if (yearEl && !Number.isNaN(target)) {
              tl.to(
                o,
                {
                  v: target,
                  duration: 0.7,
                  ease: 'steps(9)',
                  onUpdate: () => {
                    yearEl.textContent = fmt(o.v);
                  },
                },
                0.42,
              );
            }

            return tl;
          };

          /* Breakpoint crossed: rebuild every card timeline against the new
             side, and jump, not replay, the ones already landed, so a resize
             doesn't re-animate the section under the reader. */
          resyncNodes = () => {
            nodes.forEach((n) => {
              n.tl?.kill();
              n.tl = buildNodeTl(n);
              if (n.on) n.tl.progress(1);
            });
          };

          nodes.forEach((n) => {
            n.tl = buildNodeTl(n);

            /* the pen drives playback; this is the fallback for when the route
               SVG isn't measurable, not for the narrow layout; that has a
               spine of its own now */
            triggers.push(
              ScrollTrigger.create({
                trigger: n.card,
                start: 'top 88%',
                onEnter: () => {
                  if (hasRoute || n.on) return;
                  n.on = true;
                  n.tl?.play();
                },
              }),
            );

            /* active: the card leans into the line and drops a hard shadow.
               Which way "into the line" points is read live, because it
               depends on the layout the card is currently in.

               `overwrite: 'auto'` matters on touch, where the in-view trigger
               can fire while the entry timeline is still running: both write
               `x`, and auto hands that one property over to the lean while
               leaving the entry's opacity and clip to finish. */
            const shadow = n.card.getAttribute('data-mile-shadow') ?? c.ink;
            bindActive(
              n.card,
              () =>
                gsap.to(n.card, {
                  x: sideOf(n) ? 8 : -8,
                  y: -5,
                  boxShadow: `${sideOf(n) ? '-10px' : '10px'} 10px 0px ${shadow}`,
                  duration: 0.35,
                  ease: 'power3.out',
                  overwrite: 'auto',
                }),
              () =>
                gsap.to(n.card, {
                  x: 0,
                  y: 0,
                  boxShadow: `0px 0px 0px ${shadow}`,
                  duration: 0.4,
                  ease: 'power3.out',
                  overwrite: 'auto',
                }),
            );
            disposers.push(() => n.tl?.kill());
          });

          /* the draw itself: scrubbed, with the pen riding the tip */
          triggers.push(
            ScrollTrigger.create({
              trigger: timelineEl,
              start: 'top 78%',
              end: 'bottom 72%',
              scrub: 0.35,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const p = self.progress;
                path.style.strokeDashoffset = String(1 - p);
                if (!hasRoute) return;

                const total = path.getTotalLength();
                if (!total) return;
                const pt = path.getPointAtLength(total * p);

                if (routeHead) {
                  routeHead.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(45)`);
                  routeHead.style.opacity = p > 0.004 && p < 0.996 ? '1' : '0';
                }

                // cards fire the moment the pen reaches their node, and rewind
                // on the way back up so the section replays cleanly
                nodes.forEach((n) => {
                  if (!n.tl) return;
                  if (!n.on && pt.y >= n.y) {
                    n.on = true;
                    n.tl.play();
                  } else if (n.on && pt.y < n.y - 24) {
                    n.on = false;
                    n.tl.reverse();
                  }
                });
              },
            }),
          );
        }
      }
      if (reduced) return;

      /* 6: the marquee accelerates and skews with scroll velocity */
      const marquee = q<HTMLElement>('[data-marquee]');
      if (marquee) {
        marquee.style.animation = 'none';
        const loop = gsap.to(marquee, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
        const skew = gsap.quickTo(marquee, 'skewX', { duration: 0.5, ease: 'power3' });
        let settle: number | undefined;
        triggers.push(
          ScrollTrigger.create({
            onUpdate: (self) => {
              const v = self.getVelocity();
              const ts = gsap.utils.clamp(1, 7, 1 + Math.abs(v) / 650);
              loop.timeScale(v < 0 ? -ts : ts);
              skew(gsap.utils.clamp(-9, 9, -v / 420));
              window.clearTimeout(settle);
              settle = window.setTimeout(() => {
                loop.timeScale(1);
                skew(0);
              }, 220);
            },
          }),
        );
        disposers.push(() => window.clearTimeout(settle));
      }

      /* 7: hard full-bleed wipes between sections */
      qa<HTMLElement>('[data-swipe]').forEach((el) => {
        const target = document.getElementById(el.getAttribute('data-swipe') ?? '');
        if (!target) return;
        gsap.set(el, { y: 0, yPercent: 100 });
        const t = gsap.timeline({
          scrollTrigger: { trigger: target, start: 'top 90%', end: 'top 44%', scrub: 0.25, invalidateOnRefresh: true },
        });
        t.fromTo(el, { yPercent: 100 }, { yPercent: 0, ease: 'steps(6)', duration: 0.5 }).to(el, {
          yPercent: -100,
          ease: 'steps(6)',
          duration: 0.5,
        });
        if (t.scrollTrigger) triggers.push(t.scrollTrigger);
      });

      /* 8: inverting square cursor that becomes a VIEW plate over plates */
      const cursor = q<HTMLElement>('[data-cursor]');
      const cursorLabel = cursor?.querySelector<HTMLElement>('[data-cursor-label]');
      if (cursor && cursorLabel && window.matchMedia('(pointer: fine)').matches) {
        gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -200, y: -200 });
        const xTo = gsap.quickTo(cursor, 'x', { duration: 0.3, ease: 'power3' });
        const yTo = gsap.quickTo(cursor, 'y', { duration: 0.3, ease: 'power3' });
        let shown = false;

        const onMove = (e: MouseEvent) => {
          xTo(e.clientX);
          yTo(e.clientY);
          if (shown) return;
          shown = true;
          gsap.to(cursor, { opacity: 1, duration: 0.2 });
          root.style.cursor = 'none';
          qa<HTMLElement>('[style*="cursor:pointer"],[style*="cursor: pointer"]').forEach((n) => {
            n.style.cursor = 'none';
          });
        };
        const onLeave = () => gsap.to(cursor, { opacity: 0, duration: 0.2 });
        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mouseleave', onLeave);
        disposers.push(() => {
          window.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseleave', onLeave);
          root.style.cursor = '';
        });

        const small = () => {
          cursor.style.mixBlendMode = 'difference';
          cursor.style.background = '#fff';
          gsap.to(cursor, { width: 14, height: 14, duration: 0.28, ease: 'power3' });
          gsap.to(cursorLabel, { opacity: 0, duration: 0.12 });
        };
        const medium = () => {
          cursor.style.mixBlendMode = 'difference';
          cursor.style.background = '#fff';
          gsap.to(cursor, { width: 34, height: 34, duration: 0.25, ease: 'power3' });
          gsap.to(cursorLabel, { opacity: 0, duration: 0.12 });
        };
        const big = (text: string) => {
          cursorLabel.textContent = text;
          cursor.style.mixBlendMode = 'normal';
          cursor.style.background = c.accent;
          gsap.to(cursor, { width: 88, height: 88, duration: 0.3, ease: 'power3' });
          gsap.to(cursorLabel, { opacity: 1, duration: 0.2, delay: 0.05 });
        };

        qa<HTMLElement>('[data-plate]').forEach((p) => {
          const enter = () => big(p.getAttribute('data-plate-cta') ?? 'VIEW ↗');
          p.addEventListener('mouseenter', enter);
          p.addEventListener('mouseleave', small);
          disposers.push(() => {
            p.removeEventListener('mouseenter', enter);
            p.removeEventListener('mouseleave', small);
          });
        });
        qa<HTMLElement>('a,button').forEach((el) => {
          if (el.hasAttribute('data-plate') || el.closest('[data-plate]')) return;
          el.addEventListener('mouseenter', medium);
          el.addEventListener('mouseleave', small);
          disposers.push(() => {
            el.removeEventListener('mouseenter', medium);
            el.removeEventListener('mouseleave', small);
          });
        });
      }

      /* 9: the stack prints: heading cuts up, the rule draws, then each column
         wipes down carrying its meter, its rating and its rows. Hovering a
         column floods it and inverts the type. */
      const stackSection = q<HTMLElement>('#stack');
      const stackCols = qa<HTMLElement>('[data-stack-col]');
      if (stackSection && stackCols.length) {
        const stackLines = qa<HTMLElement>('[data-stack-line]');
        const stackBadge = q<HTMLElement>('[data-stack-badge]');
        const stackCopy = q<HTMLElement>('[data-stack-copy]');
        const stackRule = q<HTMLElement>('[data-stack-rule]');

        const colParts = stackCols.map((col) => ({
          col,
          strong: col.getAttribute('data-strong') === '1',
          fill: col.querySelector<HTMLElement>('[data-stack-fill]'),
          heading: col.querySelector<HTMLElement>('[data-stack-heading]'),
          track: col.querySelector<HTMLElement>('[data-stack-track]'),
          meter: col.querySelector<HTMLElement>('[data-stack-meter]'),
          pct: col.querySelector<HTMLElement>('[data-stack-pct]'),
          items: Array.from(col.querySelectorAll<HTMLElement>('[data-stack-item]')),
        }));

        gsap.set(stackLines, { yPercent: 118 });
        gsap.set([stackBadge, stackCopy], { opacity: 0, y: 18 });
        gsap.set(stackRule, { scaleX: 0 });
        gsap.set(stackCols, { clipPath: 'inset(0% 0% 100% 0%)' });
        colParts.forEach((p) => {
          gsap.set(p.items, { yPercent: 120, opacity: 0 });
          gsap.set(p.meter, { scaleX: 0 });
          if (p.pct) p.pct.textContent = '0%';
        });

        const stackIn = gsap.timeline({
          scrollTrigger: { trigger: stackSection, start: 'top 72%', invalidateOnRefresh: true },
        });
        if (stackIn.scrollTrigger) triggers.push(stackIn.scrollTrigger);

        stackIn
          .to(stackBadge, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0)
          .to(stackLines, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.09 }, 0.06)
          .to(stackCopy, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.28)
          .to(stackRule, { scaleX: 1, duration: 0.8, ease: 'power4.inOut' }, 0.3)
          .to(stackCols, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'power3.out', stagger: 0.1 }, 0.5);

        colParts.forEach((p, i) => {
          const at = 0.62 + i * 0.1;
          const level = parseFloat(p.meter?.getAttribute('data-stack-meter') ?? '0');
          stackIn.to(p.items, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.055 }, at);
          stackIn.to(p.meter, { scaleX: level, duration: 0.8, ease: 'power3.inOut' }, at);
          if (p.pct) {
            const o = { v: 0 };
            stackIn.to(
              o,
              {
                v: level * 100,
                duration: 0.8,
                ease: 'steps(14)',
                onUpdate: () => {
                  if (p.pct) p.pct.textContent = `${Math.round(o.v)}%`;
                },
              },
              at,
            );
          }
        });

        colParts.forEach((p) => {
          const enter = () => {
            gsap.to(p.fill, { scaleY: 1, duration: 0.42, ease: 'power4.out', transformOrigin: 'bottom center' });
            gsap.to(p.heading, { color: c.ink, duration: 0.3, ease: 'power2.out' });
            gsap.to(p.items, { color: c.ink, x: 7, duration: 0.4, ease: 'power3.out', stagger: 0.035 });
            gsap.to(p.track, { backgroundColor: 'rgba(10,10,10,.22)', duration: 0.3 });
            gsap.to(p.meter, { backgroundColor: c.ink, duration: 0.3 });
            gsap.to(p.pct, { color: c.ink, duration: 0.3 });
          };
          const leave = () => {
            gsap.to(p.fill, { scaleY: 0, duration: 0.38, ease: 'power4.in', transformOrigin: 'top center' });
            gsap.to(p.heading, { color: p.strong ? c.mark : c.dim, duration: 0.3, ease: 'power2.out' });
            gsap.to(p.items, {
              color: p.strong ? c.bright : c.dimOnInk,
              x: 0,
              duration: 0.4,
              ease: 'power3.out',
              stagger: { each: 0.035, from: 'end' },
            });
            gsap.to(p.track, { backgroundColor: c.rule, duration: 0.3 });
            gsap.to(p.meter, { backgroundColor: p.strong ? c.mark : c.dimOnInk, duration: 0.3 });
            gsap.to(p.pct, { color: p.strong ? c.bright : c.dim, duration: 0.3 });
          };
          bindActive(p.col, enter, leave);
        });
      }

      /* 10: say hello, the headline cuts up letter by letter and then leans
         toward the cursor, the ghost line drifts on scroll, and the four cells
         print in and flood with ink on hover. */
      const contactSection = q<HTMLElement>('#contact');
      const contactChars = qa<HTMLElement>('[data-contact-char]');
      if (contactSection) {
        const contactCopy = q<HTMLElement>('[data-contact-copy]');
        const contactFoot = q<HTMLElement>('[data-contact-foot]');
        const contactCells = qa<HTMLElement>('[data-contact-cell]');
        const ghost = q<HTMLElement>('[data-contact-ghost]');

        gsap.set(contactChars, { yPercent: 122, rotate: 5 });
        gsap.set([contactCopy, contactFoot], { opacity: 0, y: 18 });
        gsap.set(contactCells, { clipPath: 'inset(0% 100% 0% 0%)' });

        const contactIn = gsap.timeline({
          scrollTrigger: { trigger: contactSection, start: 'top 68%', invalidateOnRefresh: true },
        });
        if (contactIn.scrollTrigger) triggers.push(contactIn.scrollTrigger);

        contactIn
          .to(contactChars, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.028 }, 0.08)
          .to(contactCopy, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.4)
          .to(contactCells, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.42, ease: 'steps(6)', stagger: 0.08 }, 0.5)
          .to(contactFoot, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, 0.9);

        /* the ghost line slides the opposite way to the scroll */
        if (ghost) {
          const drift = gsap.fromTo(
            ghost,
            { xPercent: 4 },
            {
              xPercent: -26,
              ease: 'none',
              scrollTrigger: { trigger: contactSection, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
            },
          );
          if (drift.scrollTrigger) triggers.push(drift.scrollTrigger);
        }

        /* the ink floods up, the type inverts, the arrow steps in */
        contactCells.forEach((cell) => {
          const fill = cell.querySelector<HTMLElement>('[data-cell-fill]');
          const arrow = cell.querySelector<HTMLElement>('[data-cell-arrow]');
          const kind = cell.querySelector<HTMLElement>('[data-cell-kind]');
          const value = cell.querySelector<HTMLElement>('[data-cell-value]');
          const enter = () => {
            gsap.to(fill, { scaleY: 1, duration: 0.4, ease: 'power4.out', transformOrigin: 'bottom center' });
            gsap.to(kind, { color: c.accent, opacity: 1, duration: 0.25 });
            gsap.to(value, { color: c.paper, x: 5, duration: 0.35, ease: 'power3.out' });
            gsap.fromTo(arrow, { opacity: 0, x: -6, y: 6 }, { opacity: 1, x: 0, y: 0, duration: 0.3, ease: 'power3.out' });
          };
          const leave = () => {
            gsap.to(fill, { scaleY: 0, duration: 0.36, ease: 'power4.in', transformOrigin: 'top center' });
            gsap.to(kind, { color: c.ink, opacity: 0.65, duration: 0.25 });
            gsap.to(value, { color: c.ink, x: 0, duration: 0.35, ease: 'power3.out' });
            gsap.to(arrow, { opacity: 0, duration: 0.18 });
          };
          bindActive(cell, enter, leave);
        });

        /* magnetic headline: each letter leans toward the pointer and settles
           back. Centres are cached per hover (with the live transform removed)
           so the letters can't chase their own offsets. */
        const headBlock = q<HTMLElement>('[data-contact-head]');
        if (headBlock && contactChars.length && window.matchMedia('(pointer: fine)').matches) {
          const RADIUS = 300;
          const PULL = 0.3;
          const movers = contactChars.map((el) => ({
            el,
            cx: 0,
            cy: 0,
            x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }),
            y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' }),
          }));

          const measure = () => {
            const hr = headBlock.getBoundingClientRect();
            movers.forEach((m) => {
              const r = m.el.getBoundingClientRect();
              m.cx = r.left + r.width / 2 - hr.left - (Number(gsap.getProperty(m.el, 'x')) || 0);
              m.cy = r.top + r.height / 2 - hr.top - (Number(gsap.getProperty(m.el, 'y')) || 0);
            });
          };

          let frame: number | null = null;
          let px = 0;
          let py = 0;
          const apply = () => {
            frame = null;
            const hr = headBlock.getBoundingClientRect();
            movers.forEach((m) => {
              const dx = px - (hr.left + m.cx);
              const dy = py - (hr.top + m.cy);
              const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / RADIUS);
              const k = PULL * falloff * falloff;
              m.x(dx * k);
              m.y(dy * k);
            });
          };
          const onMove = (e: MouseEvent) => {
            px = e.clientX;
            py = e.clientY;
            if (frame == null) frame = requestAnimationFrame(apply);
          };
          const onEnter = () => measure();
          const onLeave = () => {
            if (frame != null) cancelAnimationFrame(frame);
            frame = null;
            movers.forEach((m) => {
              m.x(0);
              m.y(0);
            });
          };

          headBlock.addEventListener('mouseenter', onEnter);
          headBlock.addEventListener('mousemove', onMove);
          headBlock.addEventListener('mouseleave', onLeave);
          disposers.push(() => {
            headBlock.removeEventListener('mouseenter', onEnter);
            headBlock.removeEventListener('mousemove', onMove);
            headBlock.removeEventListener('mouseleave', onLeave);
            if (frame != null) cancelAnimationFrame(frame);
          });
        }
      }
    }, root);

    ScrollTrigger.refresh();

    return () => {
      disposers.forEach((d) => d());
      triggers.forEach((t) => t.kill());
      ctx.revert();
      heroIntro.current = null;
      if (tickerFn) gsap.ticker.remove(tickerFn);
      lenis?.destroy();
    };
  }, [rootRef]);

  /* The curtain is gone: re-measure, then play the hero in. */
  useEffect(() => {
    if (!ready) return;

    /* Two frames, deliberately. The loader restores `html { overflow }` on its
       way out, which brings the scrollbar back and changes the document width.
       Every pin above was measured against the locked layout, so the refresh
       has to wait until the unlocked one has actually been laid out, or
       the hero and reel pins start a scrollbar's width off. */
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        heroIntro.current?.play(0);
      });
    });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [ready]);
}
