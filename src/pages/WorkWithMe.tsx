import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'vite-react-ssg';
import { Seo } from '@/components/Seo';
import { c, display, gutter, heading, label, px, rule, s, sectionY } from '@/components/portfolio/tokens';

/**
 * `/work-with-me`: the Teardown and the Build.
 *
 * A sales plate, not a portfolio section, and deliberately not linked from any
 * nav: it is shared by link (DM, bio) and reached on purpose. It prerenders
 * like every other route, so the link resolves to real HTML rather than an
 * empty root div.
 *
 * Built out of `portfolio/tokens` on gold, which is why there is no stylesheet
 * beside this file. The page arrived as a standalone document with its own
 * palette and two extra font families; rendered through the ramp and the space
 * scale instead, it costs no new CSS and no new fonts (Archivo and JetBrains
 * Mono are already in `index.html`) and it moves with the rest of the site the
 * next time a token changes.
 *
 * Note what is deliberately absent: no `data-*` attributes. Those are the motion
 * contract for `usePortfolioMotion`, which mounts on the front page alone. An
 * element here marked `data-stack-col` would simply never animate, so the hover
 * and focus states are the CSS ones (`pf-nudge`, `pf-outline`, `pf-underline`)
 * that work without the engine.
 *
 * `c.signal` is untouched on purpose. It is reserved for claims about
 * availability, and a green tick against a feature list is exactly the
 * decorative use that would stop a status light reading as a status light.
 */

const TITLE = 'Work with me · Anadi Thakur';
const DESCRIPTION =
  'AI architecture teardowns and fixed-scope builds for founders and small teams. A recorded review of your AI feature in 48 hours, then the fix built at an agreed price.';

/** Instagram's DM deep link. Every CTA on the page is this one destination:
 *  there is no form, which is the point the copy makes. */
const DM = 'https://ig.me/m/the.anadi';

/** The page ground. Gold, not ink: the route is a sales plate shared by link,
 *  and it announces itself as one before a word is read. Everything set on it
 *  is ink or near-ink, since `c.mark` would disappear into its own hue here, which
 *  is why the accent role moves to black on this route. */
const GOLD = '#C9A24A';

/** Dim body copy on gold. `c.dimOnInk` is tuned for a black ground and greys
 *  out to nothing here, so the dim tier is ink at reduced alpha instead. */
const dimOnGold = 'rgba(10, 10, 10, 0.72)';

/** Section shell. One rule at the joint, the page's vertical rhythm. */
const section: CSSProperties = {
  containerType: 'inline-size',
  borderTop: `${rule.edge}px solid ${c.rule}`,
  padding: px(sectionY.top, gutter, sectionY.bottom),
};

/** The small caps line that opens each section. */
const eyebrow: CSSProperties = { ...label(10, 700, 0.16), color: dimOnGold, margin: 0 };

/** Body copy on gold, held to a readable measure. */
const body: CSSProperties = {
  margin: 0,
  font: `400 15px/1.55 ${display}`,
  color: dimOnGold,
  textWrap: 'pretty',
  maxWidth: '62ch',
};

/** The same measure and size inside the dark offer cards, where the ground
 *  goes back to ink and the dim tier goes back with it. */
const bodyOnPlate: CSSProperties = { ...body, color: c.dimOnInk };

/** Solid CTA: ink on cream. It has to hold on both grounds the page has (the
 *  gold field and the ink offer card), and ink does; cream on gold did not. */
const ctaSolid: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: s[3],
  padding: px(s[4], s[5]),
  background: c.ink,
  color: c.accent,
  ...label(11, 700, 0.12),
  textDecoration: 'none',
};

/** Outline CTA: the second of two, never the only one on a screen. */
const ctaOutline: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: s[3],
  padding: px(s[4], s[5]),
  border: `${rule.base}px solid ${c.ruleSoft}`,
  color: '#fff',
  ...label(11, 700, 0.12),
  textDecoration: 'none',
};

const stats = [
  { figure: '48h', caption: 'turnaround on reviews' },
  { figure: '2', caption: 'ways to work together' },
  { figure: 'Async', caption: 'first, any timezone' },
];

const offers = [
  {
    fig: 'FIG. 01 · START HERE',
    name: 'The Teardown 🪚',
    price: '$50',
    terms: 'flat, one-time',
    blurb:
      "A recorded, screen-by-screen review of your AI feature or product. I run it against the same wrapper-vs-real-product test I post about: where it's solid, where it'll break, and exactly what to change first.",
    points: [
      '30–40 min recorded walkthrough, not a call you have to schedule',
      'Written fix-it plan, prioritized',
      'Delivered within 48 hours',
    ],
    cta: 'REQUEST A TEARDOWN',
    solid: true,
  },
  {
    fig: "FIG. 02 · WHEN YOU'RE READY TO FIX IT",
    name: 'The Build 🧱',
    price: 'From $550',
    terms: 'fixed scope',
    blurb:
      'I implement the fix myself (the AI feature, the integration, or the automation), scoped and priced up front from the teardown (or from a short brief if you already know what you need).',
    points: [
      'Fixed price, agreed before work starts',
      "Built around Claude, GPT, or whatever's already in your stack",
      'Handoff includes documentation, not just working code',
    ],
    cta: 'ASK ABOUT A BUILD',
    solid: false,
  },
];

const steps = [
  {
    num: '01',
    title: 'Message me',
    body: "Tell me what you've built and what's worrying you about it. No form to fill out.",
  },
  {
    num: '02',
    title: 'I record the teardown',
    body: 'You get a video walkthrough and a written plan, both async, so timezone never blocks it.',
  },
  {
    num: '03',
    title: 'You decide what’s next',
    body: 'Fix it yourself with the plan, or have me build it under a fixed-price scope.',
  },
];

const faqs = [
  {
    q: "What if I don't know exactly what's wrong yet?",
    a: "That's what the teardown is for. Send me what you have and I'll find it; you don't need the diagnosis before you book it.",
  },
  {
    q: 'Do you sign NDAs?',
    a: "Yes, happy to sign one before I look at anything you'd consider sensitive.",
  },
  {
    q: 'What if the Build turns out bigger than expected?',
    a: "You'll always see the fixed price before anything starts; if scope grows mid-project, we agree on the change before I touch it, not after.",
  },
];

/** Where the hero's moving ground lives. Three files, one clip: the WebM for
 *  everything that takes VP9, the MP4 behind it for Safari, and the poster,
 *  which is frame one rather than a prettier frame from the middle, so nothing
 *  jumps at the moment playback starts. */
const backdrop = {
  poster: '/media/summit-loop.jpg',
  webm: '/media/summit-loop.webm',
  mp4: '/media/summit-loop.mp4',
} as const;

/** The hero's moving ground: a summit timelapse, held back far enough that it
 *  reads as weather behind the type rather than a photograph the type is sitting
 *  on. The source is a 23s sunrise, re-encoded forward-then-reversed so the loop
 *  has no cut in it, and downscaled hard: at a quarter opacity the detail a
 *  bigger file buys is detail nobody sees.
 *
 *  One layer, no scrim over it. The clip blends in `luminosity`, so it
 *  contributes its light and takes GOLD for its hue: the page's palette does not
 *  grow by one colour, and the field stays the flat gold the route is built on.
 *  With nothing tinted on top, the opacity is the only thing keeping ink legible,
 *  which is what sets it at 0.25: that is the point where the darkest pixel of
 *  the clip still holds 4.7:1 against ink, and the 17px body copy needs 4.5.
 *
 *  The `<video>` is client-only and mounts only if the visitor hasn't asked for
 *  less motion. The prerendered HTML and the reduced-motion render both stop at
 *  the poster, which is why the still is set as a background on the layer rather
 *  than left to the element's own `poster` attribute. */
const HeroBackdrop = () => {
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotion(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        // mixBlendMode: 'luminosity',
        opacity: 0.25,
        backgroundImage: `url(${backdrop.poster})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {motion && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={backdrop.poster}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        >
          <source src={backdrop.webm} type="video/webm" />
          <source src={backdrop.mp4} type="video/mp4" />
        </video>
      )}
    </div>
  );
};

/** Figure over caption: the hero stats, at one ramp step. */
const Stat = ({ figure, caption }: { figure: string; caption: string }) => (
  <div style={{ display: 'grid', gap: s[2], maxWidth: '26ch' }}>
    <span style={{ ...heading('d6'), textTransform: 'uppercase', color: c.ink }}>{figure}</span>
    <span style={{ ...label(10, 700, 0.14), lineHeight: 1.5, color: dimOnGold }}>{caption}</span>
  </div>
);

const WorkWithMe = () => (
  <div style={{ background: GOLD, color: c.ink, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Seo title={TITLE} description={DESCRIPTION} path="/work-with-me" type="website" />

    {/* The notes-shell bar, inverted. Same mark, same wordmark, same two links, so
        someone who lands here from a DM gets the same way back into the site
        that a reader of a note gets. */}
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: s[4],
        padding: px(s[4], gutter),
        borderBottom: `${rule.edge}px solid ${c.rule}`,
      }}
    >
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: s[3], textDecoration: 'none' }}>
        <span
          aria-hidden
          style={{ width: 22, height: 22, background: c.ink, border: `${rule.hair}px solid ${c.rule}`, display: 'block' }}
        />
        <span style={{ ...label(11, 700, 0.12), color: c.ink }}>ANADI THAKUR</span>
      </Link>
      <nav aria-label="Site" style={{ display: 'flex', alignItems: 'center', gap: s[6] }}>
        <Link to="/notes" className="pf-underline" style={{ ...label(11, 700, 0.14), color: c.ink }}>
          NOTES
        </Link>
        <Link to="/#work" className="pf-underline" style={{ ...label(11, 700, 0.14), color: dimOnGold }}>
          WORK
        </Link>
      </nav>
    </header>

    <main style={{ flex: 1 }}>
      <section
        style={{
          ...section,
          borderTop: 'none',
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
          background: GOLD,
          /* The first screen is the hero and nothing else: `svh` rather than `vh`
             so a phone's collapsing address bar can't let the offer section peek
             in under it, and `minHeight` rather than `height` so a short landscape
             screen grows the section instead of clipping the stats off it. */
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <HeroBackdrop />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={eyebrow}>BEFORE YOU SCALE IT</p>
          <h1 style={{ margin: px(s[5], 0, 0), ...heading('d2'), textTransform: 'uppercase', maxWidth: '15ch', color: c.accent }}>
            Is it a real product❓,
            <br />
            or just <span style={{ color: c.plate }}>a wrapper 🤔</span>
          </h1>
          <p style={{ ...body, marginTop: s[6], font: `400 17px/1.5 ${display}` }}>
            I review AI features and product architecture for founders and small teams: the same test
            I run on my own builds, applied to yours. You get a plain-English diagnosis and a fix-it
            plan before a small problem becomes a rebuild.
          </p>
          <div style={{ display: 'flex', gap: s[3], flexWrap: 'wrap', marginTop: s[8] }}>
            <a href={DM} className="pf-nudge pf-nudge-lg" style={ctaSolid}>
              MESSAGE ME ON INSTAGRAM<span>↗</span>
            </a>
          </div>
          <div style={{ display: 'flex', gap: s[11], flexWrap: 'wrap', marginTop: s[10] }}>
            {stats.map((stat) => (
              <Stat key={stat.figure} {...stat} />
            ))}
          </div>
        </div>
      </section>

      <section id="offers" style={section}>
        <p style={eyebrow}>THE OFFER</p>
        <h2 style={{ margin: px(s[5], 0, 0), ...heading('d4'), textTransform: 'uppercase', maxWidth: '16ch' }}>
          Two ways in, in order
        </h2>

        {/* Two plates, side by side, in the order you take them. The ordering is
            carried by the FIG. numbers and by which card gets the solid CTA;
            the original's dashed "then" connector was a third divider between
            two cards that already sit in sequence. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: s[6],
            marginTop: s[9],
          }}
        >
          {offers.map((offer) => (
            <article
              key={offer.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: s[5],
                padding: px(s[8], s[7]),
                background: c.plate,
                border: `${rule.base}px solid ${c.rule}`,
              }}
            >
              <div style={{ ...label(10, 700, 0.16), color: c.dimOnInk }}>{offer.fig}</div>
              <h3 style={{ margin: 0, ...heading('d5'), textTransform: 'uppercase', color: c.accentEdge }}>{offer.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: s[3], flexWrap: 'wrap' }}>
                <span style={{ ...heading('d6'), color: c.mark }}>{offer.price}</span>
                <span style={{ ...label(10, 700, 0.14), color: c.dimOnInk }}>{offer.terms}</span>
              </div>
              <p style={bodyOnPlate}>{offer.blurb}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: s[3] }}>
                {offer.points.map((point) => (
                  <li key={point} style={{ display: 'flex', gap: s[3], font: `400 14px/1.5 ${display}`, color: '#fff' }}>
                    <span aria-hidden style={{ color: c.mark, flexShrink: 0 }}>
                      ·
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <a
                href={DM}
                className={offer.solid ? 'pf-nudge pf-nudge-lg' : 'pf-outline'}
                style={{
                  ...(offer.solid ? ctaSolid : ctaOutline),
                  marginTop: 'auto',
                  alignSelf: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                {offer.cta}
                <span>↗</span>
              </a>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="How it works" style={section}>
        <p style={eyebrow}>HOW IT WORKS</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: s[7],
            marginTop: s[8],
          }}
        >
          {steps.map((step) => (
            <div key={step.num} style={{ borderLeft: `${rule.base}px solid ${c.rule}`, paddingLeft: s[5] }}>
              <div style={{ ...heading('d6'), color: c.accentEdge }}>{step.num}</div>
              <h3 style={{ margin: px(s[3], 0, s[2]), font: `600 16px/1.3 ${display}`, textTransform: 'none', }}>
                {step.title}
              </h3>
              <p style={body}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Questions" style={{...section, background: c.plate, color: c.dimOnInk}}>
        <p style={{...eyebrow, color: c.accentEdge}}>QUESTIONS</p>
        <div style={{ marginTop: s[8], borderTop: `${rule.hair}px solid ${c.rule}` }}>
          {faqs.map((faq) => (
            <div key={faq.q} style={{ padding: px(s[6], 0), borderBottom: `${rule.hair}px solid ${c.rule}` }}>
              <h3 style={{ margin: px(0, 0, s[3]), font: `600 16px/1.3 ${display}`, textTransform: 'none' }}>
                {faq.q}
              </h3>
              <p style={{...body, color: c.dimOnInk}}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>

    <footer
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: "center",
        flexWrap: 'wrap',
        gap: s[6],
        padding: px(sectionY.top, gutter, s[10]),
        borderTop: `${rule.edge}px solid ${c.rule}`,
      }}
    >
      <div>
        <span style={{ ...label(11, 700, 0.12), color: c.ink }}>ANADI THAKUR</span>
      </div>
      <a href={DM} className="pf-underline" style={{ ...label(11, 700, 0.12), color: dimOnGold }}>
        MESSAGE ON INSTAGRAM ↗
      </a>
    </footer>
  </div>
);

export default WorkWithMe;
